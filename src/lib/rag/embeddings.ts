/**
 * Local embeddings via transformers.js.
 *
 * IMPORTANT: do not statically import `@huggingface/transformers` — on Vercel
 * serverless the native ONNX runtime (`libonnxruntime.so.1`) is unavailable and
 * a top-level import crashes every API route that pulls this module in.
 * We dynamic-import only when embeddings are actually needed (local/dev RAG).
 */

export const EMBEDDING_DIM = 384;
const MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH_SIZE = 32;

type FeatureExtractionPipeline = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let unavailableReason: string | null = null;

/** True when the ONNX embedding runtime can be loaded in this environment. */
export function embeddingsUnavailableReason(): string | null {
  return unavailableReason;
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (unavailableReason) {
    throw new Error(unavailableReason);
  }
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const mod = await import("@huggingface/transformers");
        return (await mod.pipeline("feature-extraction", MODEL)) as unknown as FeatureExtractionPipeline;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        unavailableReason =
          "Local embeddings are unavailable in this environment " +
          "(ONNX runtime missing — typical on Vercel serverless). " +
          "Run Nova locally for RAG indexing/chat, or use features without project context. " +
          `Details: ${detail.slice(0, 160)}`;
        extractorPromise = null;
        throw new Error(unavailableReason);
      }
    })();
  }
  return extractorPromise;
}

/** Embed a batch of texts into L2-normalized 384-dim vectors. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
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
