import fs from "node:fs/promises";
import path from "node:path";
import type { IndexRecord, IndexSummary, RetrievedChunk } from "./types";

const INDEX_DIR = path.join(process.cwd(), ".nova", "index");

// In-memory cache; disk is the source of truth so indexes survive dev restarts.
const cache = new Map<string, IndexRecord>();

function summarize(rec: IndexRecord): IndexSummary {
  return {
    id: rec.id,
    source: rec.source,
    createdAt: rec.createdAt,
    fileCount: rec.fileCount,
    chunkCount: rec.chunks.length,
  };
}

export async function saveIndex(rec: IndexRecord): Promise<IndexSummary> {
  cache.set(rec.id, rec);
  await fs.mkdir(INDEX_DIR, { recursive: true });
  await fs.writeFile(path.join(INDEX_DIR, `${rec.id}.json`), JSON.stringify(rec));
  return summarize(rec);
}

export async function getIndex(id: string): Promise<IndexRecord | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  try {
    const raw = await fs.readFile(path.join(INDEX_DIR, `${id}.json`), "utf8");
    const rec = JSON.parse(raw) as IndexRecord;
    cache.set(id, rec);
    return rec;
  } catch {
    return null;
  }
}

export async function listIndexes(): Promise<IndexSummary[]> {
  const files = await fs.readdir(INDEX_DIR).catch(() => [] as string[]);
  const summaries: IndexSummary[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const rec = await getIndex(file.replace(/\.json$/, ""));
    if (rec) summaries.push(summarize(rec));
  }
  return summaries.sort((a, b) => b.createdAt - a.createdAt);
}

function cosine(a: number[], b: number[]): number {
  // Vectors are already L2-normalized, so the dot product is the cosine.
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Return the top-k most similar chunks for a query vector. */
export async function search(
  id: string,
  queryVector: number[],
  k = 6,
): Promise<RetrievedChunk[]> {
  const rec = await getIndex(id);
  if (!rec) throw new Error(`Index not found: ${id}`);

  const scored = rec.chunks.map((chunk, i) => ({
    chunk,
    score: cosine(queryVector, rec.vectors[i]),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map(({ chunk, score }) => ({
    file: chunk.file,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    text: chunk.text,
    score,
  }));
}
