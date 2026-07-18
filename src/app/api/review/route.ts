import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { reviewPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { code, language } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Field 'code' is required." }, { status: 400 });
    }

    const result = await complete({
      system: reviewPrompt.system,
      user: `Language: ${language || "auto-detect"}\n\nReview this code:\n\n${code}`,
      mock: reviewPrompt.mock,
      maxTokens: 2048,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[review]", err);
    return NextResponse.json({ error: "Failed to generate review." }, { status: 500 });
  }
}
