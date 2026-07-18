import { NextResponse } from "next/server";
import { complete, parseProviderChoice, type ChatMessage } from "@/lib/claude";
import { designPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

function isChatHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code: requirements, refinement, history, provider, indexId } = body as {
      code?: string;
      refinement?: string;
      history?: unknown;
      provider?: unknown;
      indexId?: string;
    };

    if (!requirements || typeof requirements !== "string") {
      return NextResponse.json(
        { error: "Field 'code' (requirements) is required." },
        { status: 400 },
      );
    }

    const prior = isChatHistory(history) ? history : [];
    const isRefine = typeof refinement === "string" && refinement.trim().length > 0;

    const { context, sources } = await getProjectContext(indexId, requirements);

    const baseUser = isRefine
      ? `Refine the previous system design based on this feedback. Return a full updated Markdown design (keep the Mermaid diagram, updating it if needed):\n\n${refinement}`
      : `Turn these requirements into a system design:\n\n${requirements}`;

    const result = await complete({
      system: designPrompt.system,
      user: withProjectContext(context, baseUser),
      maxTokens: 3000,
      history: isRefine ? prior : undefined,
      provider: parseProviderChoice(provider),
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[design]", err);
    const message = err instanceof Error ? err.message : "Failed to generate system design.";
    const status = /not configured|No LLM provider/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
