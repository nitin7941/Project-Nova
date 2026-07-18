import { NextResponse } from "next/server";
import { completeStream, isLiveMode } from "@/lib/claude";
import { ragPrompt } from "@/lib/prompts";
import { search } from "@/lib/rag/store";
import type { RetrievedChunk } from "@/lib/rag/types";

export const maxDuration = 120;

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c) => `### ${c.file}:${c.startLine}-${c.endLine}\n\`\`\`\n${c.text}\n\`\`\``,
    )
    .join("\n\n");
}

function buildMock(question: string, chunks: RetrievedChunk[]): string {
  const cites = chunks
    .slice(0, 3)
    .map((c) => `- \`${c.file}:${c.startLine}-${c.endLine}\` (score ${c.score.toFixed(2)})`)
    .join("\n");
  return `**Mock answer** (no \`ANTHROPIC_API_KEY\` set — retrieval is real, generation is stubbed).

For _"${question}"_, the most relevant code Nova retrieved from your repository is:

${cites || "- (no matches)"}

Set \`ANTHROPIC_API_KEY\` to have Claude answer using this context.`;
}

export async function POST(req: Request) {
  try {
    const { indexId, question } = await req.json();
    if (!indexId || typeof indexId !== "string") {
      return NextResponse.json({ error: "Field 'indexId' is required." }, { status: 400 });
    }
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Field 'question' is required." }, { status: 400 });
    }

    const { embedOne } = await import("@/lib/rag/embeddings");
    const queryVector = await embedOne(question);
    const sources = await search(indexId, queryVector, 6);

    const deltas = completeStream({
      system: ragPrompt.system,
      user: `Question: ${question}\n\nCode context:\n\n${buildContext(sources)}`,
      mock: buildMock(question, sources),
      maxTokens: 1500,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // First line: JSON header with retrieval sources + mode.
        controller.enqueue(
          encoder.encode(JSON.stringify({ sources, mode: isLiveMode ? "live" : "mock" }) + "\n"),
        );
        try {
          for await (const delta of deltas) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`\n[stream error: ${e instanceof Error ? e.message : "failed"}]`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error("[rag/chat]", err);
    const message = err instanceof Error ? err.message : "Failed to answer the question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
