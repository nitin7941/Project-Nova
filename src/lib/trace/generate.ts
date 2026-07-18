import { designPrompt, testsPrompt, docsPrompt } from "@/lib/prompts";
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
    instruction: (_k, content) => `Turn these requirements into a system design:\n\n${content}`,
  },
  tests: {
    title: "Tests",
    // Greenfield-style: parent is a requirement or design, not source code.
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
