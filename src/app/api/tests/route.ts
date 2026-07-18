import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { code, language } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Field 'code' is required." }, { status: 400 });
    }

    const result = await complete({
      system: testsPrompt.system,
      user: `Language/framework hint: ${language || "auto-detect"}\n\nGenerate unit tests for:\n\n${code}`,
      mock: testsPrompt.mock,
      maxTokens: 2048,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[tests]", err);
    return NextResponse.json({ error: "Failed to generate tests." }, { status: 500 });
  }
}
