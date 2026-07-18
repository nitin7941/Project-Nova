import { createHash } from "node:crypto";
import type { Chunk } from "./types";
import type { IngestedFile } from "./ingest";

const CHUNK_LINES = 60;
const OVERLAP_LINES = 10;
/** Cap lower on Vercel so client can rehydrate the index across serverless instances. */
export const MAX_CHUNKS = process.env.VERCEL ? 150 : 3000;

/** Split a single file into overlapping line windows. */
export function chunkFile(file: IngestedFile): Chunk[] {
  const lines = file.content.split("\n");
  const chunks: Chunk[] = [];
  const step = Math.max(1, CHUNK_LINES - OVERLAP_LINES);

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const text = lines.slice(start, end).join("\n").trim();
    if (text.length === 0) {
      if (end >= lines.length) break;
      continue;
    }
    const id = createHash("sha1")
      .update(`${file.relPath}:${start}`)
      .digest("hex")
      .slice(0, 16);
    chunks.push({
      id,
      file: file.relPath,
      startLine: start + 1,
      endLine: end,
      text,
    });
    if (end >= lines.length) break;
  }

  return chunks;
}

/** Chunk every file, capped so indexing stays fast for a hackathon demo. */
export function chunkFiles(files: IngestedFile[]): Chunk[] {
  const all: Chunk[] = [];
  for (const file of files) {
    for (const chunk of chunkFile(file)) {
      all.push(chunk);
      if (all.length >= MAX_CHUNKS) return all;
    }
  }
  return all;
}
