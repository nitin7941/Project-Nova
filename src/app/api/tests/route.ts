import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

export async function POST(req: Request) {
  try {
    const { code, language, indexId } = await req.json();
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
      mock: testsPrompt.mock,
      maxTokens: 2048,
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[tests]", err);
    return NextResponse.json({ error: "Failed to generate tests." }, { status: 500 });
  }
}
