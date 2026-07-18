/**
 * Client-side helpers for "Local folder" input on the Test Generator.
 * Browsers expose a directory via <input webkitdirectory> as a FileList.
 */

export interface ProjectFile {
  path: string;
  content: string;
  size: number;
}

export interface ScannedProject {
  rootName: string;
  tree: string;
  files: ProjectFile[];
  /** Concatenated source payload for the LLM. */
  sourceBundle: string;
  requirements: string;
  requirementsPath: string | null;
  requirementsInferred: boolean;
  skippedCount: number;
  truncated: boolean;
}

const SKIP_DIR_PARTS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "__pycache__",
  ".turbo",
  ".cache",
  "target",
  "venv",
  ".venv",
  "Pods",
]);

const SOURCE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".kt",
  ".cs",
  ".rb",
  ".php",
  ".swift",
]);

const REQUIREMENTS_NAMES = [
  "requirements.md",
  "requirement.md",
  "reqs.md",
  "spec.md",
  "specs.md",
  "acceptance.md",
  "user-stories.md",
  "prd.md",
];

const MAX_FILES = 35;
const MAX_FILE_BYTES = 80_000;
const MAX_TOTAL_CHARS = 90_000;

function normalizePath(file: File): string {
  // webkitRelativePath is like "my-app/src/index.ts"
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return rel.replace(/\\/g, "/");
}

function shouldSkip(path: string): boolean {
  const parts = path.split("/");
  return parts.some((p) => SKIP_DIR_PARTS.has(p) || p.startsWith("."));
}

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i).toLowerCase() : "";
}

function isSourceFile(path: string): boolean {
  return SOURCE_EXT.has(extOf(path));
}

function isRequirementsCandidate(path: string): boolean {
  const base = path.split("/").pop()?.toLowerCase() || "";
  if (REQUIREMENTS_NAMES.includes(base)) return true;
  if (base === "readme.md" || base === "readme") return true;
  if (path.toLowerCase().includes("/docs/") && (base.endsWith(".md") || base.endsWith(".txt"))) {
    return true;
  }
  return false;
}

function scoreSource(path: string): number {
  // Prefer application source over tests/config.
  let score = 0;
  const lower = path.toLowerCase();
  if (lower.includes("/src/") || lower.startsWith("src/")) score += 20;
  if (lower.includes("/lib/") || lower.includes("/app/") || lower.includes("/services/")) score += 10;
  if (/\.(test|spec)\./i.test(path) || lower.includes("__tests__") || lower.includes("/tests/")) {
    score -= 30;
  }
  if (lower.endsWith(".d.ts") || lower.includes("config.")) score -= 15;
  return score;
}

function buildTree(paths: string[]): string {
  const sorted = [...paths].sort();
  return sorted.map((p) => `  ${p}`).join("\n");
}

async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Scan a directory FileList from <input webkitdirectory>.
 * Picks source files, detects an optional requirements doc, builds a tree + bundle.
 */
export async function scanLocalProject(fileList: FileList | File[]): Promise<ScannedProject> {
  const files = Array.from(fileList);
  if (!files.length) {
    throw new Error("No files found in the selected folder.");
  }

  const rootName = normalizePath(files[0]).split("/")[0] || "project";
  let skippedCount = 0;

  const candidates: { path: string; file: File }[] = [];
  const reqCandidates: { path: string; file: File; priority: number }[] = [];

  for (const file of files) {
    const path = normalizePath(file);
    if (shouldSkip(path)) {
      skippedCount += 1;
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      skippedCount += 1;
      continue;
    }

    if (isRequirementsCandidate(path)) {
      const base = path.split("/").pop()?.toLowerCase() || "";
      let priority = 1;
      if (REQUIREMENTS_NAMES.includes(base)) priority = 100;
      else if (path.toLowerCase().includes("requirement")) priority = 80;
      else if (path.toLowerCase().includes("/docs/")) priority = 40;
      else if (base.startsWith("readme")) priority = 10;
      reqCandidates.push({ path, file, priority });
    }

    if (isSourceFile(path)) {
      candidates.push({ path, file });
    }
  }

  candidates.sort((a, b) => scoreSource(b.path) - scoreSource(a.path));
  const selected = candidates.slice(0, MAX_FILES);
  let truncated = candidates.length > selected.length;

  // Prefer dedicated requirements over README.
  reqCandidates.sort((a, b) => b.priority - a.priority);
  let requirements = "";
  let requirementsPath: string | null = null;
  if (reqCandidates.length) {
    const top = reqCandidates[0];
    const text = (await readTextFile(top.file)).trim();
    // Only treat README as requirements if nothing better and it's not huge empty noise.
    if (text && (top.priority >= 40 || text.length < 12_000)) {
      requirements = text.slice(0, 20_000);
      requirementsPath = top.path;
    }
  }

  const projectFiles: ProjectFile[] = [];
  let total = 0;
  for (const item of selected) {
    const content = await readTextFile(item.file);
    if (!content.trim()) continue;
    const clipped =
      content.length > 12_000 ? content.slice(0, 12_000) + "\n/* … truncated … */\n" : content;
    if (total + clipped.length > MAX_TOTAL_CHARS) {
      truncated = true;
      break;
    }
    projectFiles.push({ path: item.path, content: clipped, size: item.file.size });
    total += clipped.length;
  }

  if (!projectFiles.length) {
    throw new Error(
      "No readable source files found (looked for .ts/.js/.py/.java/…). Try another folder.",
    );
  }

  const treePaths = projectFiles.map((f) => f.path);
  const tree = `${rootName}/\n${buildTree(treePaths.map((p) => p.replace(new RegExp(`^${rootName}/`), "")))}`;

  const sourceBundle = [
    `## Project: ${rootName}`,
    "## Folder structure (selected source files)",
    "```",
    tree,
    "```",
    "",
    ...projectFiles.flatMap((f) => [
      `## File: ${f.path}`,
      "```",
      f.content,
      "```",
      "",
    ]),
  ].join("\n");

  return {
    rootName,
    tree,
    files: projectFiles,
    sourceBundle,
    requirements,
    requirementsPath,
    requirementsInferred: !requirements,
    skippedCount,
    truncated: truncated,
  };
}
