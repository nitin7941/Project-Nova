import { designPrompt, testsPrompt, docsPrompt, reviewPrompt } from "@/lib/prompts";
import type { ArtifactKind } from "./types";

interface GenSpec {
  title: string;
  system: string;
  /** Build the instruction for turning a parent artifact into this kind. */
  instruction: (parentKind: ArtifactKind, parentContent: string) => string;
  maxTokens: number;
}

/** How each downstream artifact is produced from its parent. Reuses the same
 * prompts as the standalone features, so behaviour stays consistent. */
export const GEN: Record<Exclude<ArtifactKind, "requirement">, GenSpec> = {
  design: {
    title: "Design",
    system: designPrompt.system,
    maxTokens: 3000,
    instruction: (_k, content) =>
      `Design for the following requirements. Match the user's focus — if they ask for database tables / schema / ERD, lead with concrete table designs (columns, types, keys, relationships), not a generic API+microservices document.\n\n${content}`,
  },
  review: {
    title: "Review",
    system:
      reviewPrompt.system +
      `\n\nWhen the subject is a requirement or design document (not application source), ` +
      `adapt the same severity sections to that artifact: correctness vs stated goals, ` +
      `security/privacy gaps, performance risks, and maintainability of the proposed approach. ` +
      `If project code context is provided, ground findings in how THIS repo actually works.`,
    maxTokens: 2048,
    instruction: (k, content) =>
      k === "design" || k === "requirement"
        ? `Produce a structured engineering review of this ${k}. ` +
          `It is the subject under review (not necessarily raw source code).\n\n${content}`
        : `Review the following ${k}:\n\n${content}`,
  },
  tests: {
    title: "Tests",
    // Greenfield-style: parent is a requirement, design, or review — not source code.
    system: testsPrompt.systemNew,
    maxTokens: 2048,
    instruction: (k, content) =>
      `Generate a test-case package that verifies the following ${k}. ` +
      `Use Vitest for the suggested unit-test skeleton unless another framework is clearly implied.\n\n${content}`,
  },
  docs: {
    title: "Docs",
    system: docsPrompt.system,
    maxTokens: 2048,
    instruction: (k, content) =>
      `Write developer documentation for the following ${k}:\n\n${content}`,
  },
};
