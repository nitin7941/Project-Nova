import { NextResponse } from "next/server";
import { complete } from "@/lib/claude";
import { testsPrompt } from "@/lib/prompts";
import { isTestFramework, type TestFramework } from "@/lib/testFrameworks";
import {
  COVERAGE_FOCUS_HINTS,
  isCoverageFocus,
  isProjectMode,
  isTestStyle,
  type CoverageFocus,
  type ProjectMode,
  type TestStyle,
} from "@/lib/testOptions";

/**
 * POST /api/tests
 * projectMode=existing → requirements + source → unit tests
 * projectMode=new      → requirements only → test-case catalogue + skeleton
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectMode,
      requirements,
      code,
      language,
      framework,
      coverageFocus,
      testStyle,
      entryPoint,
      mockDependencies,
      repo,
      branch,
      sourceLabel,
    } = body as {
      projectMode?: string;
      requirements?: string;
      code?: string;
      language?: string;
      framework?: string;
      coverageFocus?: string;
      testStyle?: string;
      entryPoint?: string;
      mockDependencies?: boolean;
      repo?: string;
      branch?: string;
      sourceLabel?: string;
    };

    const mode: ProjectMode = isProjectMode(projectMode) ? projectMode : "existing";
    const selected: TestFramework = isTestFramework(framework) ? framework : "jest";
    const focus: CoverageFocus = isCoverageFocus(coverageFocus) ? coverageFocus : "balanced";
    const style: TestStyle = isTestStyle(testStyle) ? testStyle : "unit";
    const entry =
      typeof entryPoint === "string" && entryPoint.trim() ? entryPoint.trim() : null;
    const shouldMock = mockDependencies !== false;
    const reqText = typeof requirements === "string" ? requirements.trim() : "";
    const source = typeof code === "string" ? code.trim() : "";

    if (!reqText) {
      return NextResponse.json(
        { error: "Requirements file content is required." },
        { status: 400 },
      );
    }

    if (mode === "existing" && !source) {
      return NextResponse.json(
        {
          error:
            "Existing project mode needs source from the repo/branch (load a module or paste code).",
        },
        { status: 400 },
      );
    }

    if (mode === "new") {
      const result = await complete({
        system: testsPrompt.systemNew,
        user: [
          `Framework for skeleton: ${selected}`,
          `Language hint: ${language || "auto-detect"}`,
          `Coverage focus: ${focus} — ${COVERAGE_FOCUS_HINTS[focus]}`,
          `Preferred test style emphasis: ${style}`,
          "",
          "## Requirements file",
          reqText,
        ].join("\n"),
        mock: testsPrompt.mockNew(selected),
        maxTokens: 3072,
      });

      return NextResponse.json({
        ...result,
        projectMode: mode,
        framework: selected,
        coverageFocus: focus,
        testStyle: style,
      });
    }

    const result = await complete({
      system: testsPrompt.systemExisting,
      user: [
        `Framework (required): ${selected}`,
        `Language hint: ${language || "auto-detect"}`,
        `Test style: ${style}`,
        `Coverage focus: ${focus} — ${COVERAGE_FOCUS_HINTS[focus]}`,
        `Mock external dependencies: ${shouldMock ? "yes" : "no"}`,
        entry ? `Focus entry point / symbol: ${entry}` : "Focus entry point: (entire provided source)",
        repo ? `Repository: ${repo}` : null,
        branch ? `Branch / ref: ${branch}` : null,
        sourceLabel ? `Source file: ${sourceLabel}` : null,
        "",
        "## Requirements file",
        reqText,
        "",
        "## Source under test (existing project)",
        source,
      ]
        .filter(Boolean)
        .join("\n"),
      mock: testsPrompt.mockExisting(selected),
      maxTokens: 3072,
    });

    return NextResponse.json({
      ...result,
      projectMode: mode,
      framework: selected,
      coverageFocus: focus,
      testStyle: style,
    });
  } catch (err) {
    console.error("[tests]", err);
    return NextResponse.json({ error: "Failed to generate tests." }, { status: 500 });
  }
}
