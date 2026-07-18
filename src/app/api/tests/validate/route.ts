import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";

/**
 * POST /api/tests/validate
 * Existing-project only: validate generated tests against requirements + source.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requirements, code, tests, repo, branch, sourceLabel, framework } = body as {
      requirements?: string;
      code?: string;
      tests?: string;
      repo?: string;
      branch?: string;
      sourceLabel?: string;
      framework?: string;
    };

    const reqText = typeof requirements === "string" ? requirements.trim() : "";
    const source = typeof code === "string" ? code.trim() : "";
    const suite = typeof tests === "string" ? tests.trim() : "";

    if (!reqText || !source || !suite) {
      return NextResponse.json(
        {
          error:
            "Validation needs requirements, source under test, and the generated test suite.",
        },
        { status: 400 },
      );
    }

    const result = await complete({
      system: testsPrompt.systemValidate,
      user: [
        framework ? `Framework: ${framework}` : null,
        repo ? `Repository: ${repo}` : null,
        branch ? `Branch / ref: ${branch}` : null,
        sourceLabel ? `Source file: ${sourceLabel}` : null,
        "",
        "## Requirements file",
        reqText,
        "",
        "## Source under test",
        source,
        "",
        "## Generated tests to validate",
        suite,
      ]
        .filter(Boolean)
        .join("\n"),
      mock: testsPrompt.mockValidate(),
      maxTokens: 2048,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[tests/validate]", err);
    return NextResponse.json({ error: "Failed to validate tests." }, { status: 500 });
  }
}
