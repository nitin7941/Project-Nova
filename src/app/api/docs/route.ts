import { NextResponse } from "next/server";
import { complete, parseProviderChoice } from "@/lib/claude";
import {
  docTypeLabel,
  isDocSource,
  isDocType,
  type DocSource,
  type DocType,
} from "@/lib/docsOptions";
import { docsPrompt } from "@/lib/prompts";

/**
 * POST /api/docs
 * Generate Markdown documentation from a project folder (local or GitHub) or an interview.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      docType,
      source,
      code,
      language,
      answers,
      sourceLabel,
      projectTree,
      repo,
      branch,
      provider,
    } = body as {
      docType?: string;
      source?: string;
      code?: string;
      language?: string;
      answers?: Record<string, string>;
      sourceLabel?: string;
      projectTree?: string;
      repo?: string;
      branch?: string;
      provider?: string;
    };

    const type: DocType = isDocType(docType) ? docType : "technical";
    const src: DocSource = isDocSource(source) ? source : "codebase";
    const sourceText = typeof code === "string" ? code.trim() : "";
    const tree = typeof projectTree === "string" ? projectTree.trim() : "";
    const answerMap =
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? Object.fromEntries(
            Object.entries(answers)
              .filter(([, v]) => typeof v === "string" && v.trim())
              .map(([k, v]) => [k, (v as string).trim()]),
          )
        : {};

    if (src === "interview") {
      if (Object.keys(answerMap).length === 0) {
        return NextResponse.json(
          { error: "Interview mode needs at least one answered question." },
          { status: 400 },
        );
      }
    } else if (!sourceText) {
      return NextResponse.json(
        {
          error:
            src === "github"
              ? "Load a GitHub folder before generating."
              : "Select a local project folder before generating.",
        },
        { status: 400 },
      );
    }

    const userParts: string[] = [
      `Documentation type: ${docTypeLabel(type)} (${type})`,
      `Generation source: ${src}`,
      `Language hint: ${language || "auto-detect"}`,
      "Scope: document the PROJECT DIRECTORY as a whole (structure + modules), not a single file in isolation.",
    ];

    if (typeof repo === "string" && repo.trim()) {
      userParts.push(`Repository: ${repo.trim()}`);
    }
    if (typeof branch === "string" && branch.trim()) {
      userParts.push(`Branch / ref: ${branch.trim()}`);
    }
    if (typeof sourceLabel === "string" && sourceLabel.trim()) {
      userParts.push(`Source label: ${sourceLabel.trim()}`);
    }

    userParts.push("");

    if (src === "interview") {
      userParts.push("## Interview answers");
      for (const [key, value] of Object.entries(answerMap)) {
        userParts.push(`### ${key}`, value, "");
      }
      userParts.push(
        "Build complete documentation from these answers. Invent only what is necessary to fill structural gaps, and mark assumptions clearly.",
      );
    } else {
      if (tree) {
        userParts.push("## Folder structure", "```", tree, "```", "");
      }
      userParts.push(
        "## Project source (directory bundle)",
        "Document this codebase as a cohesive project. Use the folder structure and multiple files together.",
        sourceText,
      );
    }

    const result = await complete({
      system: docsPrompt.systemFor(type),
      user: userParts.join("\n"),
      maxTokens: 3072,
      provider: parseProviderChoice(provider),
    });

    return NextResponse.json({
      ...result,
      docType: type,
      source: src,
    });
  } catch (err) {
    console.error("[docs]", err);
    const message = err instanceof Error ? err.message : "Failed to generate documentation.";
    const status = /not configured|No LLM provider/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
