import { NextResponse } from "next/server";
import {
  buildFileRef,
  buildFileRefResolved,
  fetchGitHubFile,
  fetchGitHubSource,
  looksLikeGitHubUrl,
  resolveGitHubUrl,
} from "@/lib/github";

/**
 * POST /api/github/fetch
 * Body: { url?: string, repo?: string, path?: string, ref?: string, token?: string, mode?: "file" | "source" }
 *
 * Resolves branch names that contain slashes (e.g. feat/tests):
 *   https://github.com/nitin7941/Project-Nova/tree/feat/tests/src
 *   → ref=feat/tests, path=src
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, repo, path, ref, token, mode } = body as {
      url?: string;
      repo?: string;
      path?: string;
      ref?: string;
      token?: string;
      mode?: "file" | "source";
    };

    const fetchMode = mode === "file" ? "file" : "source";
    const preferredRef = typeof ref === "string" && ref.trim() ? ref.trim() : undefined;
    const auth = (typeof token === "string" && token.trim()) || process.env.GITHUB_TOKEN;

    let fileRef =
      (typeof url === "string" && url.trim()
        ? await resolveGitHubUrl(url, preferredRef, auth || undefined)
        : null) ||
      (typeof path === "string" && looksLikeGitHubUrl(path)
        ? await resolveGitHubUrl(path, preferredRef, auth || undefined)
        : null) ||
      (typeof repo === "string" && looksLikeGitHubUrl(repo)
        ? await buildFileRefResolved(repo, typeof path === "string" ? path : "", preferredRef || "main", auth || undefined)
        : null);

    if (!fileRef && typeof repo === "string") {
      fileRef = buildFileRef(
        repo,
        typeof path === "string" ? path : "",
        preferredRef || "main",
      );
    }

    if (!fileRef) {
      return NextResponse.json(
        {
          error:
            "Provide a GitHub file or folder URL (…/tree/feat/tests/src) or owner/repo + path. Branch names with slashes are supported.",
        },
        { status: 400 },
      );
    }

    if (fetchMode === "file") {
      const file = await fetchGitHubFile(fileRef, auth || undefined);
      return NextResponse.json({
        content: file.content,
        name: file.name,
        htmlUrl: file.htmlUrl,
        kind: "file",
        owner: fileRef.owner,
        repo: fileRef.repo,
        path: fileRef.path,
        ref: fileRef.ref,
      });
    }

    const source = await fetchGitHubSource(fileRef, auth || undefined);
    return NextResponse.json({
      content: source.content,
      name: source.name,
      htmlUrl: source.htmlUrl,
      kind: source.kind,
      tree: source.tree,
      fileCount: source.fileCount,
      owner: source.owner,
      repo: source.repo,
      path: source.path,
      ref: source.ref,
    });
  } catch (err) {
    console.error("[github/fetch]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch from GitHub.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
