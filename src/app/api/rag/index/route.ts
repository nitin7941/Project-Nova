import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ingest } from "@/lib/rag/ingest";
import { chunkFiles } from "@/lib/rag/chunk";
import { saveIndex } from "@/lib/rag/store";

// Indexing (clone + embed) can take a while for larger repos.
export const maxDuration = 300;

export async function POST(req: Request) {
  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { source } = await req.json();
    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { error: "Provide a Git URL or a local folder path in 'source'." },
        { status: 400 },
      );
    }

    const result = await ingest(source);
    cleanup = result.cleanup;

    const chunks = chunkFiles(result.files);
    // Dynamic import so this route can load even when ONNX isn't present;
    // embed() then returns a clear JSON error on Vercel serverless.
    const { embed } = await import("@/lib/rag/embeddings");
    const vectors = await embed(chunks.map((c) => c.text));

    const record = {
      id: randomUUID(),
      source: result.label,
      createdAt: Date.now(),
      fileCount: result.files.length,
      chunks,
      vectors,
    };
    const summary = await saveIndex(record);

    // Include the full record so the browser can rehydrate on the next
    // serverless instance (Vercel /tmp is not shared).
    return NextResponse.json({ ...summary, record });
  } catch (err) {
    console.error("[rag/index]", err);
    const message = err instanceof Error ? err.message : "Failed to index the codebase.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // The vectors are persisted; the cloned working tree is no longer needed.
    if (cleanup) await cleanup().catch(() => {});
  }
}
