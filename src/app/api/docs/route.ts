import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { docsPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

export async function POST(req: Request) {
  try {
    const { code, language, indexId } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Field 'code' is required." }, { status: 400 });
    }

    const { context, sources } = await getProjectContext(indexId, code);

    const result = await complete({
      system: docsPrompt.system,
      user: withProjectContext(
        context,
        `Language/context: ${language || "auto-detect"}\n\nDocument this code/API:\n\n${code}`,
      ),
      mock: docsPrompt.mock,
      maxTokens: 2048,
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[docs]", err);
    return NextResponse.json({ error: "Failed to generate documentation." }, { status: 500 });
  }
}
