/**
 * Embeddings for RAG.
 *
 * Prefer transformers.js (MiniLM) when the ONNX runtime is available (local Node).
 * On Vercel serverless, fall back to a deterministic hashed bag-of-words vector so
 * indexing/chat still work without libonnxruntime.so.1.
 */

export const EMBEDDING_DIM = 384;
const MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH_SIZE = 32;

type FeatureExtractionPipeline = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<FeatureExtractionPipeline | null> | null = null;
let useHashFallback = false;

function normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

/** Lightweight embedding used when ONNX/transformers cannot load. */
export function hashEmbed(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9_./+-]+/).filter((t) => t.length > 1);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dim;
    vec[idx] += 1;
    // Bigram bump for a bit more signal
    if (token.length > 3) {
      const idx2 = Math.abs(h >>> 8) % dim;
      vec[idx2] += 0.5;
    }
  }
  return normalize(vec);
}

async function getExtractor(): Promise<FeatureExtractionPipeline | null> {
  if (useHashFallback) return null;
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const mod = await import("@huggingface/transformers");
        return (await mod.pipeline("feature-extraction", MODEL)) as unknown as FeatureExtractionPipeline;
      } catch (err) {
        useHashFallback = true;
        console.warn(
          "[embeddings] transformers/ONNX unavailable — using hash fallback.",
          err instanceof Error ? err.message : err,
        );
        return null;
      }
    })();
  }
  return extractorPromise;
}

/** Embed a batch of texts into L2-normalized 384-dim vectors. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  if (!extractor) {
    return texts.map((t) => hashEmbed(t));
  }

  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    vectors.push(...(output.tolist() as number[][]));
  }
  return vectors;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}
