import { NextResponse } from "next/server";
import {
  buildFileRef,
  fetchGitHubFile,
  parseGitHubFileUrl,
} from "@/lib/github";

/**
 * POST /api/github/fetch
 * Body: { url?: string, repo?: string, path?: string, ref?: string, token?: string }
 * Returns source file content from a (public or token-authorized) GitHub repo.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, repo, path, ref, token } = body as {
      url?: string;
      repo?: string;
      path?: string;
      ref?: string;
      token?: string;
    };

    const fromUrl = typeof url === "string" && url.trim() ? parseGitHubFileUrl(url) : null;
    const fromParts =
      typeof repo === "string" && typeof path === "string"
        ? buildFileRef(repo, path, typeof ref === "string" ? ref : "main")
        : null;

    const fileRef = fromUrl || fromParts;
    if (!fileRef) {
      return NextResponse.json(
        {
          error:
            "Provide a GitHub file URL (…/blob/branch/path) or owner/repo + file path.",
        },
        { status: 400 },
      );
    }

    const auth = (typeof token === "string" && token.trim()) || process.env.GITHUB_TOKEN;
    const file = await fetchGitHubFile(fileRef, auth || undefined);

    return NextResponse.json({
      content: file.content,
      name: file.name,
      htmlUrl: file.htmlUrl,
      owner: fileRef.owner,
      repo: fileRef.repo,
      path: fileRef.path,
      ref: fileRef.ref,
    });
  } catch (err) {
    console.error("[github/fetch]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch from GitHub.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
