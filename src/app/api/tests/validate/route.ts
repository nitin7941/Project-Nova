import { NextResponse } from "next/server";
import { complete, parseProviderChoice } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";

/**
 * POST /api/tests/validate
 * Existing-project: validate generated tests against source (+ optional requirements).
 * provider: auto | anthropic | groq
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      requirements,
      code,
      tests,
      repo,
      branch,
      sourceLabel,
      framework,
      projectTree,
      requirementsInferred,
      provider,
    } = body as {
      requirements?: string;
      code?: string;
      tests?: string;
      repo?: string;
      branch?: string;
      sourceLabel?: string;
      framework?: string;
      projectTree?: string;
      requirementsInferred?: boolean;
      provider?: string;
    };

    const reqText = typeof requirements === "string" ? requirements.trim() : "";
    const source = typeof code === "string" ? code.trim() : "";
    const suite = typeof tests === "string" ? tests.trim() : "";
    const tree = typeof projectTree === "string" ? projectTree.trim() : "";
    const inferReqs = Boolean(requirementsInferred) || !reqText;

    if (!source || !suite) {
      return NextResponse.json(
        { error: "Validation needs source under test and the generated test suite." },
        { status: 400 },
      );
    }

    const reqSection = inferReqs
      ? [
          "## Requirements",
          "No explicit requirements document. Infer intended behaviour from the source and validate the suite against that + the APIs present.",
          reqText ? `Notes:\n${reqText}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : ["## Requirements file", reqText].join("\n");

    const result = await complete({
      system: testsPrompt.systemValidate,
      user: [
        framework ? `Framework: ${framework}` : null,
        repo ? `Repository: ${repo}` : null,
        branch ? `Branch / ref: ${branch}` : null,
        sourceLabel ? `Source label: ${sourceLabel}` : null,
        `Requirements mode: ${inferReqs ? "infer from source" : "explicit document"}`,
        tree ? `## Folder structure\n\`\`\`\n${tree}\n\`\`\`` : null,
        "",
        reqSection,
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
      provider: parseProviderChoice(provider),
    });

    return NextResponse.json({ ...result, requirementsInferred: inferReqs });
  } catch (err) {
    console.error("[tests/validate]", err);
    const message = err instanceof Error ? err.message : "Failed to validate tests.";
    const status = /not configured|No LLM provider/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
