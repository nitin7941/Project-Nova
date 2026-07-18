import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const exec = promisify(execFile);

/** Hackathon-scale caps to keep indexing fast and memory bounded. */
export const MAX_FILES = 400;
export const MAX_FILE_BYTES = 100 * 1024;

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".nova", "vendor", ".venv", "venv", "__pycache__", ".idea", ".vscode",
  "target", ".turbo", ".cache",
]);

const IGNORE_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "composer.lock",
  "poetry.lock", "Cargo.lock",
]);

const ALLOWED_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rb", ".go", ".rs",
  ".java", ".kt", ".c", ".h", ".cpp", ".hpp", ".cs", ".php", ".swift",
  ".scala", ".sh", ".sql", ".html", ".css", ".scss", ".vue", ".svelte",
  ".json", ".yaml", ".yml", ".toml", ".md", ".txt", ".env.example",
]);

export interface IngestedFile {
  relPath: string;
  content: string;
}

export interface IngestResult {
  label: string;
  files: IngestedFile[];
  cleanup?: () => Promise<void>;
}

function looksLikeGitUrl(s: string): boolean {
  return /^https?:\/\/.+/i.test(s.trim());
}

async function resolveRoot(source: string): Promise<{ root: string; label: string; cleanup?: () => Promise<void> }> {
  const trimmed = source.trim();

  if (looksLikeGitUrl(trimmed)) {
    const hash = createHash("sha1").update(trimmed).digest("hex").slice(0, 12);
    const dir = path.join(os.tmpdir(), "nova-repos", hash);
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(dir), { recursive: true });
    // execFile (not a shell) so the URL cannot inject shell commands.
    await exec("git", ["clone", "--depth", "1", trimmed, dir], { timeout: 120_000 });
    return {
      root: dir,
      label: trimmed,
      cleanup: () => fs.rm(dir, { recursive: true, force: true }),
    };
  }

  const abs = path.resolve(trimmed);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Not a Git URL and not an existing directory: ${source}`);
  }
  return { root: abs, label: abs };
}

async function walk(root: string): Promise<IngestedFile[]> {
  const files: IngestedFile[] = [];

  async function recurse(dir: string) {
    if (files.length >= MAX_FILES) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_FILES) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        await recurse(full);
      } else if (entry.isFile()) {
        if (IGNORE_FILES.has(entry.name)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXT.has(ext) && !entry.name.endsWith(".example")) continue;
        const stat = await fs.stat(full);
        if (stat.size > MAX_FILE_BYTES || stat.size === 0) continue;
        const content = await fs.readFile(full, "utf8").catch(() => null);
        if (content === null || content.includes("\u0000")) continue; // skip binaries
        files.push({ relPath: path.relative(root, full), content });
      }
    }
  }

  await recurse(root);
  return files;
}

/** Clone (Git URL) or read (local path) a codebase into an in-memory file list. */
export async function ingest(source: string): Promise<IngestResult> {
  const { root, label, cleanup } = await resolveRoot(source);
  try {
    const files = await walk(root);
    if (files.length === 0) {
      throw new Error("No indexable source files were found.");
    }
    return { label, files, cleanup };
  } catch (err) {
    if (cleanup) await cleanup().catch(() => {});
    throw err;
  }
}
