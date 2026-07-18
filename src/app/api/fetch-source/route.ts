import { NextResponse } from "next/server";

/** Convert a github.com blob URL to its raw.githubusercontent.com equivalent. */
function toRawUrl(url: string): string {
  const u = new URL(url);
  if (u.hostname === "raw.githubusercontent.com") return url;
  if (u.hostname === "github.com" || u.hostname === "www.github.com") {
    // /owner/repo/blob/branch/path -> raw.githubusercontent.com/owner/repo/branch/path
    const parts = u.pathname.split("/").filter(Boolean);
    const blobIdx = parts.indexOf("blob");
    if (blobIdx !== -1) {
      const [owner, repo] = parts;
      const rest = parts.slice(blobIdx + 1).join("/");
      return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
    }
  }
  return url;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Provide a valid http(s) URL." }, { status: 400 });
    }

    const rawUrl = toRawUrl(url);
    const res = await fetch(rawUrl, { headers: { "User-Agent": "project-nova" } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch file (${res.status}). Use a link to a specific file.` },
        { status: 400 },
      );
    }

    const text = await res.text();
    if (text.length > 200_000) {
      return NextResponse.json({ error: "File is too large to review (>200KB)." }, { status: 400 });
    }

    return NextResponse.json({ content: text, source: rawUrl });
  } catch (err) {
    console.error("[fetch-source]", err);
    return NextResponse.json({ error: "Failed to fetch the file." }, { status: 500 });
  }
}
