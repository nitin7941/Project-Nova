import { NextResponse } from "next/server";
import { complete, parseProviderChoice } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

export async function POST(req: Request) {
  try {
    const { code, language, provider, indexId } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Field 'code' is required." }, { status: 400 });
    }

    const { context, sources } = await getProjectContext(indexId, code);

    const result = await complete({
      system: testsPrompt.system,
      user: withProjectContext(
        context,
        `Language/framework hint: ${language || "auto-detect"}\n\nGenerate unit tests for:\n\n${code}`,
      ),
      maxTokens: 2048,
      provider: parseProviderChoice(provider),
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[tests]", err);
    const message = err instanceof Error ? err.message : "Failed to generate tests.";
    const status = /not configured|No LLM provider/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
