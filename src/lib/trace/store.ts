import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { novaDataDir } from "@/lib/novaPaths";
import type {
  Artifact,
  ArtifactKind,
  ArtifactView,
  TraceGraph,
  TraceProject,
  TraceProjectSummary,
} from "./types";

const PROJECT_DIR = path.join(novaDataDir(), "projects");

// In-memory cache; disk is the source of truth so projects survive restarts.
const cache = new Map<string, TraceProject>();

export function hashContent(content: string): string {
  return createHash("sha1").update(content).digest("hex").slice(0, 16);
}

function projectPath(id: string): string {
  return path.join(PROJECT_DIR, `${id}.json`);
}

async function persist(project: TraceProject): Promise<void> {
  project.updatedAt = Date.now();
  cache.set(project.id, project);
  try {
    await fs.mkdir(PROJECT_DIR, { recursive: true });
    await fs.writeFile(projectPath(project.id), JSON.stringify(project, null, 2));
  } catch (err) {
    // On multi-instance serverless, disk is best-effort; clients also keep a snapshot.
    console.warn("[trace/store] disk persist skipped:", err instanceof Error ? err.message : err);
  }
}

export async function getProject(id: string): Promise<TraceProject | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  try {
    const raw = await fs.readFile(projectPath(id), "utf8");
    const project = JSON.parse(raw) as TraceProject;
    cache.set(id, project);
    return project;
  } catch {
    return null;
  }
}

/** Rehydrate a project from a client snapshot (needed on Vercel when /tmp isn't shared). */
export async function ensureProject(snapshot: TraceProject | TraceGraph): Promise<TraceProject> {
  const existing = await getProject(snapshot.id);
  if (existing) {
    // Prefer newer client snapshot when it has more artifacts / later update.
    const incomingArts =
      "artifacts" in snapshot ? snapshot.artifacts.length : 0;
    if (incomingArts >= existing.artifacts.length && snapshot.updatedAt >= existing.updatedAt) {
      const project = stripGraph(snapshot);
      await persist(project);
      return project;
    }
    return existing;
  }
  const project = stripGraph(snapshot);
  await persist(project);
  return project;
}

function stripGraph(snapshot: TraceProject | TraceGraph): TraceProject {
  return {
    id: snapshot.id,
    name: snapshot.name,
    indexId: snapshot.indexId ?? null,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    artifacts: snapshot.artifacts.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      content: a.content,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      parentId: a.parentId,
      parentHash: a.parentHash,
      mode: a.mode,
    })),
  };
}

function findArtifact(project: TraceProject, artifactId: string): Artifact | undefined {
  return project.artifacts.find((a) => a.id === artifactId);
}

/** An artifact is stale when its parent's current content differs from the
 * snapshot taken when this artifact was generated. */
function isStale(project: TraceProject, artifact: Artifact): boolean {
  if (!artifact.parentId || !artifact.parentHash) return false;
  const parent = findArtifact(project, artifact.parentId);
  if (!parent) return false;
  return hashContent(parent.content) !== artifact.parentHash;
}

export function toGraph(project: TraceProject): TraceGraph {
  const childIds = new Map<string, string[]>();
  for (const a of project.artifacts) {
    if (a.parentId) {
      const list = childIds.get(a.parentId) ?? [];
      list.push(a.id);
      childIds.set(a.parentId, list);
    }
  }

  const artifacts: ArtifactView[] = project.artifacts.map((a) => ({
    ...a,
    stale: isStale(project, a),
    childIds: childIds.get(a.id) ?? [],
  }));

  return {
    id: project.id,
    name: project.name,
    indexId: project.indexId ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    artifacts,
    staleCount: artifacts.filter((a) => a.stale).length,
  };
}

function summarize(project: TraceProject): TraceProjectSummary {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    artifactCount: project.artifacts.length,
    staleCount: project.artifacts.filter((a) => isStale(project, a)).length,
  };
}

export async function listProjects(): Promise<TraceProjectSummary[]> {
  const files = await fs.readdir(PROJECT_DIR).catch(() => [] as string[]);
  const summaries: TraceProjectSummary[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const project = await getProject(file.replace(/\.json$/, ""));
    if (project) summaries.push(summarize(project));
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Create a project seeded with a root requirement artifact. */
export async function createProject(
  name: string,
  requirement: string,
  indexId?: string | null,
): Promise<TraceGraph> {
  const now = Date.now();
  const project: TraceProject = {
    id: randomUUID(),
    name: name.trim() || "Untitled project",
    indexId: indexId || null,
    createdAt: now,
    updatedAt: now,
    artifacts: [
      {
        id: randomUUID(),
        kind: "requirement",
        title: "Requirement",
        content: requirement.trim(),
        createdAt: now,
        updatedAt: now,
        parentId: null,
        parentHash: null,
        mode: "manual",
      },
    ],
  };
  await persist(project);
  return toGraph(project);
}

interface AddArtifactInput {
  kind: ArtifactKind;
  title: string;
  content: string;
  parentId: string;
  mode: "live" | "free" | "manual";
}

/** Attach a generated artifact to a parent, snapshotting the parent's hash. */
export async function addArtifact(
  projectId: string,
  input: AddArtifactInput,
): Promise<TraceGraph> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const parent = findArtifact(project, input.parentId);
  if (!parent) throw new Error(`Parent artifact not found: ${input.parentId}`);

  const now = Date.now();
  project.artifacts.push({
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
    parentId: parent.id,
    parentHash: hashContent(parent.content),
    mode: input.mode,
  });
  await persist(project);
  return toGraph(project);
}

/** Edit an artifact's content. Downstream artifacts become stale automatically
 * because their stored parentHash no longer matches. */
export async function updateArtifactContent(
  projectId: string,
  artifactId: string,
  content: string,
): Promise<TraceGraph> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const artifact = findArtifact(project, artifactId);
  if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);

  artifact.content = content;
  artifact.updatedAt = Date.now();
  await persist(project);
  return toGraph(project);
}

/** Replace an artifact's content (e.g. after regenerating from its parent) and
 * re-anchor it to the parent's current hash, clearing staleness. */
export async function regenerateArtifact(
  projectId: string,
  artifactId: string,
  content: string,
  mode: "live" | "free" | "manual",
): Promise<TraceGraph> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const artifact = findArtifact(project, artifactId);
  if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);

  artifact.content = content;
  artifact.mode = mode;
  artifact.updatedAt = Date.now();
  if (artifact.parentId) {
    const parent = findArtifact(project, artifact.parentId);
    if (parent) artifact.parentHash = hashContent(parent.content);
  }
  await persist(project);
  return toGraph(project);
}

/** Re-anchor an artifact to its parent's current content, clearing staleness
 * without regenerating (a manual "mark as reviewed / still valid"). */
export async function acknowledgeArtifact(
  projectId: string,
  artifactId: string,
): Promise<TraceGraph> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const artifact = findArtifact(project, artifactId);
  if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);
  if (artifact.parentId) {
    const parent = findArtifact(project, artifact.parentId);
    if (parent) {
      artifact.parentHash = hashContent(parent.content);
      artifact.updatedAt = Date.now();
      await persist(project);
    }
  }
  return toGraph(project);
}

export async function deleteProject(id: string): Promise<void> {
  cache.delete(id);
  await fs.rm(projectPath(id), { force: true }).catch(() => {});
}
