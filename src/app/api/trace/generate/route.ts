import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";
import { addArtifact, getProject, regenerateArtifact } from "@/lib/trace/store";
import { GEN } from "@/lib/trace/generate";
import type { ArtifactKind } from "@/lib/trace/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { projectId, parentId, targetKind, replaceArtifactId } = await req.json();

    if (!projectId || !parentId || !targetKind) {
      return NextResponse.json(
        { error: "'projectId', 'parentId' and 'targetKind' are required." },
        { status: 400 },
      );
    }

    const spec = GEN[targetKind as Exclude<ArtifactKind, "requirement">];
    if (!spec) {
      return NextResponse.json({ error: `Cannot generate a '${targetKind}'.` }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const parent = project.artifacts.find((a) => a.id === parentId);
    if (!parent) return NextResponse.json({ error: "Parent artifact not found." }, { status: 404 });

    // Ground generation in the linked repo (if any) — the same RAG the rest of
    // Nova uses, so traceability artifacts reflect how the project really works.
    const { context } = await getProjectContext(project.indexId, parent.content);

    const system = (spec.system ?? "").trim();
    if (!system) {
      return NextResponse.json(
        { error: `No system prompt configured for '${targetKind}'.` },
        { status: 500 },
      );
    }

    const result = await complete({
      system,
      user: withProjectContext(context, spec.instruction(parent.kind, parent.content)),
      maxTokens: spec.maxTokens,
    });

    // Map LLM mode ("live" | "free") onto the artifact mode union.
    const mode = result.mode === "free" ? "free" : "live";

    // Regenerate in place (clears staleness) or create a fresh linked artifact.
    const graph = replaceArtifactId
      ? await regenerateArtifact(projectId, String(replaceArtifactId), result.text, mode)
      : await addArtifact(projectId, {
          kind: targetKind as ArtifactKind,
          title: spec.title,
          content: result.text,
          parentId,
          mode,
        });

    return NextResponse.json(graph);
  } catch (err) {
    console.error("[trace/generate]", err);
    const message = err instanceof Error ? err.message : "Failed to generate artifact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
