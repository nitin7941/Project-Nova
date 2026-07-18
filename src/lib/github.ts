/**
 * Parse GitHub blob / raw / tree URLs into Contents API coordinates.
 * Supports:
 *   https://github.com/owner/repo/blob/ref/path/to/file.ts
 *   https://github.com/owner/repo/raw/ref/path/to/file.ts
 *   https://raw.githubusercontent.com/owner/repo/ref/path/to/file.ts
 */

export interface GitHubFileRef {
  owner: string;
  repo: string;
  path: string;
  ref: string;
}

export function parseGitHubFileUrl(url: string): GitHubFileRef | null {
  const trimmed = url.trim();

  const raw = trimmed.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i,
  );
  if (raw) {
    return { owner: raw[1], repo: raw[2], ref: raw[3], path: raw[4] };
  }

  const blobOrRaw = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/([^/]+)\/(.+)$/i,
  );
  if (blobOrRaw) {
    return { owner: blobOrRaw[1], repo: blobOrRaw[2], ref: blobOrRaw[4], path: blobOrRaw[5] };
  }

  return null;
}

/** owner/repo + path + optional ref (default main). */
export function buildFileRef(
  repo: string,
  path: string,
  ref = "main",
): GitHubFileRef | null {
  const m = repo.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  const filePath = path.trim().replace(/^\//, "");
  if (!m || !filePath) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, ""), path: filePath, ref: ref.trim() || "main" };
}

export async function fetchGitHubFile(
  ref: GitHubFileRef,
  token?: string,
): Promise<{ content: string; name: string; htmlUrl: string }> {
  const apiUrl =
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(ref.path)}` +
    `?ref=${encodeURIComponent(ref.ref)}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
    "User-Agent": "project-nova-test-generator",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl, { headers, next: { revalidate: 0 } });
  if (res.status === 404) {
    throw new Error("File not found. Check owner/repo, branch/ref, and path.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "GitHub denied access. For private repos, set GITHUB_TOKEN (or paste a PAT).",
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub fetch failed (${res.status}).`);
  }

  const content = await res.text();
  if (!content.trim()) {
    throw new Error("File is empty.");
  }
  // Guard oversized payloads for the LLM context window.
  if (content.length > 120_000) {
    throw new Error("File is too large (>120KB). Pick a smaller module or paste a snippet.");
  }

  const name = ref.path.split("/").pop() || ref.path;
  const htmlUrl = `https://github.com/${ref.owner}/${ref.repo}/blob/${ref.ref}/${ref.path}`;
  return { content, name, htmlUrl };
}
