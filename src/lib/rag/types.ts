export interface Chunk {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  text: string;
}

export interface IndexRecord {
  id: string;
  source: string;
  createdAt: number;
  fileCount: number;
  chunks: Chunk[];
  vectors: number[][];
}

/** Lightweight view returned to the client (no vectors / chunk text). */
export interface IndexSummary {
  id: string;
  source: string;
  createdAt: number;
  fileCount: number;
  chunkCount: number;
}

export interface RetrievedChunk {
  file: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;
}
