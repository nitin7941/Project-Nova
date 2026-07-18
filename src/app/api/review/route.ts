import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { reviewPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

export async function POST(req: Request) {
  try {
    const { code, language, indexId } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Field 'code' is required." }, { status: 400 });
    }

    const { context, sources } = await getProjectContext(indexId, code);

    const result = await complete({
      system: reviewPrompt.system,
      user: withProjectContext(context, `Language: ${language || "auto-detect"}\n\nReview this code:\n\n${code}`),
      mock: reviewPrompt.mock,
      maxTokens: 2048,
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[review]", err);
    return NextResponse.json({ error: "Failed to generate review." }, { status: 500 });
  }
}
