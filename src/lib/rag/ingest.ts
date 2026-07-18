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

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (!/^(www\.)?github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function gitAvailable(): Promise<boolean> {
  try {
    await exec("git", ["--version"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch a public GitHub repo via the Trees + raw APIs (no local `git` binary).
 * Used on Vercel where `spawn git` fails with ENOENT.
 */
async function ingestGithubApi(owner: string, repo: string, label: string): Promise<IngestResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "project-nova",
  };
  if (process.env.GITHUB_TOKEN?.trim()) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  }

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(
      `GitHub repo lookup failed (${repoRes.status}). Use a public github.com/owner/repo URL` +
        (repoRes.status === 404 ? "." : ", or set GITHUB_TOKEN for private repos."),
    );
  }
  const repoMeta = (await repoRes.json()) as { default_branch?: string };
  const branch = repoMeta.default_branch || "main";

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub tree fetch failed (${treeRes.status}) for ${owner}/${repo}@${branch}.`);
  }
  const treeJson = (await treeRes.json()) as {
    tree?: { path: string; type: string; size?: number }[];
    truncated?: boolean;
  };

  const blobs = (treeJson.tree ?? []).filter((t) => {
    if (t.type !== "blob") return false;
    if ((t.size ?? 0) === 0 || (t.size ?? 0) > MAX_FILE_BYTES) return false;
    const base = path.basename(t.path);
    if (IGNORE_FILES.has(base)) return false;
    const segments = t.path.split("/");
    if (segments.some((s) => IGNORE_DIRS.has(s))) return false;
    const ext = path.extname(base).toLowerCase();
    return ALLOWED_EXT.has(ext) || base.endsWith(".example");
  });

  const files: IngestedFile[] = [];
  for (const blob of blobs) {
    if (files.length >= MAX_FILES) break;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${blob.path}`;
    const res = await fetch(rawUrl, { headers: { "User-Agent": "project-nova" } });
    if (!res.ok) continue;
    const content = await res.text();
    if (!content || content.includes("\u0000")) continue;
    files.push({ relPath: blob.path, content });
  }

  if (files.length === 0) {
    throw new Error("No indexable source files were found in that GitHub repository.");
  }

  return { label, files };
}

async function resolveRoot(source: string): Promise<{ root: string; label: string; cleanup?: () => Promise<void> }> {
  const trimmed = source.trim();

  if (looksLikeGitUrl(trimmed)) {
    const hash = createHash("sha1").update(trimmed).digest("hex").slice(0, 12);
    const dir = path.join(os.tmpdir(), "nova-repos", hash);
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(dir), { recursive: true });

    if (await gitAvailable()) {
      await exec("git", ["clone", "--depth", "1", trimmed, dir], { timeout: 120_000 });
      return {
        root: dir,
        label: trimmed,
        cleanup: () => fs.rm(dir, { recursive: true, force: true }),
      };
    }

    // No git binary (typical on Vercel) — caller will use GitHub API path instead.
    throw new Error("NO_GIT");
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Local folder paths cannot be indexed on Vercel. Use a public GitHub URL (https://github.com/owner/repo).",
    );
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
        if (content === null || content.includes("\u0000")) continue;
        files.push({ relPath: path.relative(root, full), content });
      }
    }
  }

  await recurse(root);
  return files;
}

/** Clone (Git URL), fetch (GitHub API on serverless), or read (local path). */
export async function ingest(source: string): Promise<IngestResult> {
  const trimmed = source.trim();
  const gh = looksLikeGitUrl(trimmed) ? parseGithubRepo(trimmed) : null;

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Prefer GitHub HTTP ingest when git is missing or spawn fails (ENOENT).
    if (gh && (msg === "NO_GIT" || /ENOENT|spawn git/i.test(msg))) {
      return ingestGithubApi(gh.owner, gh.repo, trimmed);
    }
    if (/ENOENT|spawn git/i.test(msg)) {
      throw new Error(
        "git is not available in this environment. Use a public https://github.com/owner/repo URL.",
      );
    }
    throw err;
  }
}
