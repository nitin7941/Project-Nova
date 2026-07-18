/**
 * Parse GitHub blob / raw / tree / clone URLs into Contents API coordinates.
 * Supports:
 *   https://github.com/owner/repo/blob/ref/path/to/file.ts
 *   https://github.com/owner/repo/tree/ref/path/to/dir
 *   https://github.com/owner/repo/raw/ref/path/to/file.ts
 *   https://raw.githubusercontent.com/owner/repo/ref/path/to/file.ts
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo
 *   owner/repo  (via buildFileRef)
 */

export interface GitHubFileRef {
  owner: string;
  repo: string;
  /** File or directory path; empty string = repo root */
  path: string;
  ref: string;
}

const SKIP_DIRS = new Set([
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
]);

const MAX_FILES = 35;
const MAX_TOTAL_CHARS = 90_000;
const MAX_FILE_CHARS = 12_000;

function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "project-nova-test-generator",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function stripGitSuffix(repo: string): string {
  return repo.replace(/\.git$/i, "");
}

/** True if the string looks like a GitHub http(s) URL. */
export function looksLikeGitHubUrl(value: string): boolean {
  return /^https?:\/\/(www\.)?(github\.com|raw\.githubusercontent\.com)\//i.test(value.trim());
}

interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  /** Everything after /tree/|/blob/|/raw/ — branch may contain slashes (e.g. feat/tests/src). */
  rest: string;
  /** Hint only — first path segment; may be wrong when branch has slashes. */
  tentativeRef: string;
  tentativePath: string;
}

/**
 * Pull owner/repo + remainder after tree|blob|raw.
 * Does NOT fully resolve branch names that contain slashes — use resolveGitHubRef.
 */
export function parseGitHubUrlParts(url: string): ParsedGitHubUrl | null {
  const trimmed = url.trim().replace(/\/+$/, "");

  const raw = trimmed.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i,
  );
  if (raw) {
    const rest = raw[3];
    const slash = rest.indexOf("/");
    return {
      owner: raw[1],
      repo: stripGitSuffix(raw[2]),
      rest,
      tentativeRef: slash === -1 ? rest : rest.slice(0, slash),
      tentativePath: slash === -1 ? "" : rest.slice(slash + 1),
    };
  }

  const withKind = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(blob|raw|tree)\/(.+)$/i,
  );
  if (withKind) {
    const rest = withKind[4];
    const slash = rest.indexOf("/");
    return {
      owner: withKind[1],
      repo: stripGitSuffix(withKind[2]),
      rest,
      tentativeRef: slash === -1 ? rest : rest.slice(0, slash),
      tentativePath: slash === -1 ? "" : rest.slice(slash + 1),
    };
  }

  const weird = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)\.git(?:\/(.*))?$/i,
  );
  if (weird) {
    return {
      owner: weird[1],
      repo: weird[2],
      rest: weird[3] ? `main/${weird[3]}` : "main",
      tentativeRef: "main",
      tentativePath: weird[3] || "",
    };
  }

  const root = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (root) {
    return {
      owner: root[1],
      repo: stripGitSuffix(root[2]),
      rest: "main",
      tentativeRef: "main",
      tentativePath: "",
    };
  }

  return null;
}

async function refExists(
  owner: string,
  repo: string,
  ref: string,
  token?: string,
): Promise<boolean> {
  // Works for branch names with slashes (feat/tests) and commit SHAs (40 hex).
  const encoded = ref.split("/").map(encodeURIComponent).join("/");
  const urls = [
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encoded}`,
    `https://api.github.com/repos/${owner}/${repo}/git/ref/tags/${encoded}`,
  ];
  if (/^[0-9a-f]{7,40}$/i.test(ref)) {
    urls.push(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);
  }

  for (const apiUrl of urls) {
    const res = await fetch(apiUrl, {
      headers: githubHeaders(token),
      method: "GET",
      next: { revalidate: 0 },
    });
    if (res.status === 200) return true;
  }

  // Fallback: branches API (handles slashes in branch names)
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${encoded}`,
    { headers: githubHeaders(token), next: { revalidate: 0 } },
  );
  return branchRes.status === 200;
}

async function contentsExist(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string,
): Promise<boolean> {
  const apiPath = path
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : `https://api.github.com/repos/${owner}/${repo}/contents`;
  const res = await fetch(`${apiPath}?ref=${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token),
    method: "HEAD",
    next: { revalidate: 0 },
  });
  // Some GitHub endpoints don't support HEAD well — fall back to GET
  if (res.status === 200) return true;
  if (res.status !== 404 && res.status !== 405) return false;
  const getRes = await fetch(`${apiPath}?ref=${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token),
    next: { revalidate: 0 },
  });
  return getRes.status === 200;
}

/**
 * Resolve branch/path when the branch name itself contains slashes
 * (e.g. tree/feat/tests/src → ref=feat/tests, path=src).
 */
export async function resolveGitHubRef(
  owner: string,
  repo: string,
  rest: string,
  preferredRef?: string,
  token?: string,
): Promise<GitHubFileRef> {
  const clean = rest.replace(/^\/+|\/+$/g, "");
  if (!clean) {
    return { owner, repo, ref: preferredRef || "main", path: "" };
  }

  const parts = clean.split("/");

  // 1) Prefer explicit UI branch only when it actually matches the URL remainder.
  const pref = preferredRef?.trim();
  if (pref && (clean === pref || clean.startsWith(pref + "/"))) {
    return {
      owner,
      repo,
      ref: pref,
      path: clean === pref ? "" : clean.slice(pref.length + 1),
    };
  }

  // 2) Match against real branch names (handles feat/tests).
  try {
    const branches = await listBranchNames(owner, repo, token);
    const matched = branches
      .filter((b) => clean === b || clean.startsWith(b + "/"))
      .sort((a, b) => b.length - a.length)[0];
    if (matched) {
      return {
        owner,
        repo,
        ref: matched,
        path: clean === matched ? "" : clean.slice(matched.length + 1),
      };
    }
  } catch {
    // ignore — fall through to probing
  }

  // 3) Probe longest → shortest prefix as the git ref.
  for (let i = parts.length; i >= 1; i--) {
    const candidateRef = parts.slice(0, i).join("/");
    const candidatePath = parts.slice(i).join("/");
    try {
      if (await refExists(owner, repo, candidateRef, token)) {
        return { owner, repo, ref: candidateRef, path: candidatePath };
      }
    } catch {
      // continue
    }
  }

  // 4) If the second segment looks like a continuation of a topic branch
  //    (feat/x, fix/x, chore/x, …), prefer two-segment refs.
  if (parts.length >= 2 && /^(feat|feature|fix|bugfix|chore|hotfix|release|docs)$/i.test(parts[0])) {
    return {
      owner,
      repo,
      ref: `${parts[0]}/${parts[1]}`,
      path: parts.slice(2).join("/"),
    };
  }

  // 5) Last resort: first segment as ref
  return {
    owner,
    repo,
    ref: parts[0],
    path: parts.slice(1).join("/"),
  };
}

async function listBranchNames(
  owner: string,
  repo: string,
  token?: string,
): Promise<string[]> {
  const names: string[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=${page}`,
      { headers: githubHeaders(token), next: { revalidate: 0 } },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as { name: string }[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    names.push(...batch.map((b) => b.name));
    if (batch.length < 100) break;
  }
  return names;
}

/**
 * Parse any supported GitHub URL into owner/repo/ref/path.
 * For branch names with slashes, call resolveGitHubUrl instead.
 */
export function parseGitHubUrl(url: string): GitHubFileRef | null {
  const parts = parseGitHubUrlParts(url);
  if (!parts) return null;
  return {
    owner: parts.owner,
    repo: parts.repo,
    ref: parts.tentativeRef,
    path: parts.tentativePath,
  };
}

/** Fully resolve a GitHub URL, including branches like feat/tests. */
export async function resolveGitHubUrl(
  url: string,
  preferredRef?: string,
  token?: string,
): Promise<GitHubFileRef | null> {
  const parts = parseGitHubUrlParts(url);
  if (!parts) return null;
  // Ignore preferredRef when it doesn't appear in the URL (e.g. default "main").
  const pref =
    preferredRef &&
    (parts.rest === preferredRef || parts.rest.startsWith(`${preferredRef}/`))
      ? preferredRef
      : undefined;
  return resolveGitHubRef(parts.owner, parts.repo, parts.rest, pref, token);
}

/** @deprecated use parseGitHubUrl / resolveGitHubUrl */
export function parseGitHubFileUrl(url: string): GitHubFileRef | null {
  return parseGitHubUrl(url);
}

/** owner/repo + path + optional ref (default main). Path may be empty for repo root. */
export function buildFileRef(
  repo: string,
  path: string,
  ref = "main",
): GitHubFileRef | null {
  // Allow pasting a full URL into the path field (sync tentative parse).
  if (looksLikeGitHubUrl(path)) {
    return parseGitHubUrl(path);
  }
  if (looksLikeGitHubUrl(repo)) {
    const parsed = parseGitHubUrl(repo);
    if (!parsed) return null;
    const extra = path.trim().replace(/^\//, "");
    return {
      ...parsed,
      path: extra || parsed.path,
      ref: ref.trim() || parsed.ref || "main",
    };
  }

  const m = repo.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) return null;
  return {
    owner: m[1],
    repo: stripGitSuffix(m[2]),
    path: path.trim().replace(/^\//, ""),
    ref: ref.trim() || "main",
  };
}

/** Async: build ref, resolving slashy branch names when path/repo is a full URL. */
export async function buildFileRefResolved(
  repo: string,
  path: string,
  ref = "main",
  token?: string,
): Promise<GitHubFileRef | null> {
  if (looksLikeGitHubUrl(path)) {
    return resolveGitHubUrl(path, ref, token);
  }
  if (looksLikeGitHubUrl(repo)) {
    const parts = parseGitHubUrlParts(repo);
    if (!parts) return null;
    const extra = path.trim().replace(/^\//, "");
    const rest = extra ? `${parts.rest.replace(/\/$/, "")}/${extra}` : parts.rest;
    return resolveGitHubRef(parts.owner, parts.repo, rest, ref, token);
  }
  return buildFileRef(repo, path, ref);
}

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i).toLowerCase() : "";
}

function isSourceFile(path: string): boolean {
  return SOURCE_EXT.has(extOf(path));
}

function shouldSkipPath(path: string): boolean {
  return path.split("/").some((p) => SKIP_DIRS.has(p) || (p.startsWith(".") && p !== "."));
}

type GhContentItem = {
  type: "file" | "dir" | string;
  name: string;
  path: string;
  size?: number;
  download_url?: string | null;
};

async function listContents(
  ref: GitHubFileRef,
  token?: string,
): Promise<GhContentItem[] | GhContentItem> {
  const apiPath = ref.path
    ? `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(ref.path)}`
    : `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents`;
  const apiUrl = `${apiPath}?ref=${encodeURIComponent(ref.ref)}`;

  const res = await fetch(apiUrl, { headers: githubHeaders(token), next: { revalidate: 0 } });
  if (res.status === 404) {
    throw new Error(
      `Path not found: ${ref.path || "(repo root)"} @ ${ref.ref}. Check owner/repo, branch/commit, and path.`,
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "GitHub denied access. For private repos, set GITHUB_TOKEN (or paste a PAT).",
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub fetch failed (${res.status}).`);
  }
  return (await res.json()) as GhContentItem[] | GhContentItem;
}

async function fetchRawFile(
  ref: GitHubFileRef,
  token?: string,
): Promise<string> {
  const apiUrl =
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(ref.path)}` +
    `?ref=${encodeURIComponent(ref.ref)}`;

  const headers = {
    ...githubHeaders(token),
    Accept: "application/vnd.github.raw+json",
  };
  const res = await fetch(apiUrl, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Failed to read ${ref.path} (${res.status}).`);
  }
  return res.text();
}

async function collectSourceFiles(
  root: GitHubFileRef,
  token?: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 6) return [];
  const listed = await listContents(root, token);

  // Single file object
  if (!Array.isArray(listed)) {
    if (listed.type === "file" && isSourceFile(listed.path) && !shouldSkipPath(listed.path)) {
      return [listed.path];
    }
    return [];
  }

  const files: string[] = [];
  for (const item of listed) {
    if (shouldSkipPath(item.path)) continue;
    if (item.type === "file") {
      if (isSourceFile(item.path) && (item.size ?? 0) < 80_000) {
        files.push(item.path);
      }
    } else if (item.type === "dir") {
      const nested = await collectSourceFiles(
        { ...root, path: item.path },
        token,
        depth + 1,
      );
      files.push(...nested);
    }
    if (files.length >= MAX_FILES) break;
  }
  return files.slice(0, MAX_FILES);
}

export interface GitHubFetchResult {
  content: string;
  name: string;
  htmlUrl: string;
  kind: "file" | "directory";
  tree?: string;
  fileCount?: number;
  owner: string;
  repo: string;
  path: string;
  ref: string;
}

/**
 * Fetch a single file or an entire directory (source files bundled) from GitHub.
 */
export async function fetchGitHubSource(
  ref: GitHubFileRef,
  token?: string,
): Promise<GitHubFetchResult> {
  const listed = await listContents(ref, token);

  // Directory listing
  if (Array.isArray(listed)) {
    const paths = await collectSourceFiles(ref, token);
    if (!paths.length) {
      throw new Error(
        `No source files found under "${ref.path || "/"}". Try a path like src/ or a specific file.`,
      );
    }

    const parts: string[] = [
      `## Project: ${ref.owner}/${ref.repo}`,
      `## Ref: ${ref.ref}`,
      `## Folder: ${ref.path || "(root)"}`,
      "## Folder structure (selected source files)",
      "```",
      paths.map((p) => `  ${p}`).join("\n"),
      "```",
      "",
    ];

    let total = 0;
    let used = 0;
    for (const filePath of paths) {
      const text = await fetchRawFile({ ...ref, path: filePath }, token);
      if (!text.trim()) continue;
      const clipped =
        text.length > MAX_FILE_CHARS
          ? text.slice(0, MAX_FILE_CHARS) + "\n/* … truncated … */\n"
          : text;
      if (total + clipped.length > MAX_TOTAL_CHARS) break;
      parts.push(`## File: ${filePath}`, "```", clipped, "```", "");
      total += clipped.length;
      used += 1;
    }

    const treeLabel = ref.path || "root";
    const htmlUrl = ref.path
      ? `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.ref}/${ref.path}`
      : `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.ref}`;

    return {
      content: parts.join("\n"),
      name: `${treeLabel}/ (${used} files)`,
      htmlUrl,
      kind: "directory",
      tree: paths.map((p) => `  ${p}`).join("\n"),
      fileCount: used,
      owner: ref.owner,
      repo: ref.repo,
      path: ref.path,
      ref: ref.ref,
    };
  }

  // Single file metadata object
  if (listed.type !== "file") {
    throw new Error("Unexpected GitHub content type.");
  }

  const content = await fetchRawFile(ref, token);
  if (!content.trim()) {
    throw new Error("File is empty.");
  }
  if (content.length > 120_000) {
    throw new Error("File is too large (>120KB). Pick a smaller module or a folder of sources.");
  }

  const name = ref.path.split("/").pop() || ref.path;
  const htmlUrl = `https://github.com/${ref.owner}/${ref.repo}/blob/${ref.ref}/${ref.path}`;
  return {
    content,
    name,
    htmlUrl,
    kind: "file",
    owner: ref.owner,
    repo: ref.repo,
    path: ref.path,
    ref: ref.ref,
  };
}

/** Fetch a single file (requirements etc.). Rejects directories. */
export async function fetchGitHubFile(
  ref: GitHubFileRef,
  token?: string,
): Promise<{ content: string; name: string; htmlUrl: string }> {
  const result = await fetchGitHubSource(ref, token);
  if (result.kind === "directory") {
    throw new Error(
      "That path is a folder. For requirements, pick a file (…/blob/branch/file.md) or upload a local requirements file.",
    );
  }
  return { content: result.content, name: result.name, htmlUrl: result.htmlUrl };
}
