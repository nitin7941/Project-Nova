import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { designPrompt } from "@/lib/prompts";
import { getProjectContext, withProjectContext } from "@/lib/rag/context";

export async function POST(req: Request) {
  try {
    const { code: requirements, indexId } = await req.json();
    if (!requirements || typeof requirements !== "string") {
      return NextResponse.json({ error: "Field 'code' (requirements) is required." }, { status: 400 });
    }

    const { context, sources } = await getProjectContext(indexId, requirements);

    const result = await complete({
      system: designPrompt.system,
      user: withProjectContext(context, `Turn these requirements into a system design:\n\n${requirements}`),
      mock: designPrompt.mock,
      maxTokens: 3000,
    });

    return NextResponse.json({ ...result, sources });
  } catch (err) {
    console.error("[design]", err);
    return NextResponse.json({ error: "Failed to generate system design." }, { status: 500 });
  }
}
