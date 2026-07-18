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
 * projectMode=existing → source (required) + optional requirements → unit tests
 *   If requirements omitted, infer behaviour from source/folder.
 * projectMode=new → requirements required → test-case catalogue + skeleton
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
      projectTree,
      requirementsInferred,
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
      projectTree?: string;
      requirementsInferred?: boolean;
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
    const tree = typeof projectTree === "string" ? projectTree.trim() : "";
    const inferReqs = Boolean(requirementsInferred) || !reqText;

    if (mode === "new" && !reqText) {
      return NextResponse.json(
        { error: "New project mode needs a requirements file." },
        { status: 400 },
      );
    }

    if (mode === "existing" && !source) {
      return NextResponse.json(
        {
          error:
            "Existing project needs source code — select a local folder or load from GitHub.",
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
        requirementsInferred: false,
      });
    }

    const reqSection = inferReqs
      ? [
          "## Requirements",
          "No requirements document was provided. INFER intended behaviour from the source (and folder structure if present), then generate unit tests for that behaviour.",
          reqText ? `(Optional notes from user/README)\n${reqText}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : ["## Requirements file", reqText].join("\n");

    const result = await complete({
      system: testsPrompt.systemExisting,
      user: [
        `Framework (required): ${selected}`,
        `Language hint: ${language || "auto-detect"}`,
        `Test style: ${style}`,
        `Coverage focus: ${focus} — ${COVERAGE_FOCUS_HINTS[focus]}`,
        `Mock external dependencies: ${shouldMock ? "yes" : "no"}`,
        entry ? `Focus entry point / symbol: ${entry}` : "Focus entry point: (main public APIs in provided source)",
        repo ? `Repository: ${repo}` : null,
        branch ? `Branch / ref: ${branch}` : null,
        sourceLabel ? `Source label: ${sourceLabel}` : null,
        `Requirements mode: ${inferReqs ? "infer from source" : "explicit document"}`,
        tree ? `## Folder structure\n\`\`\`\n${tree}\n\`\`\`` : null,
        "",
        reqSection,
        "",
        "## Source under test (existing project)",
        source,
      ]
        .filter(Boolean)
        .join("\n"),
      mock: testsPrompt.mockExisting(selected),
      maxTokens: 4096,
    });

    return NextResponse.json({
      ...result,
      projectMode: mode,
      framework: selected,
      coverageFocus: focus,
      testStyle: style,
      requirementsInferred: inferReqs,
    });
  } catch (err) {
    console.error("[tests]", err);
    return NextResponse.json({ error: "Failed to generate tests." }, { status: 500 });
  }
}
