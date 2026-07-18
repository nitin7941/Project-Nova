import { designPrompt, testsPrompt, docsPrompt } from "@/lib/prompts";
import type { ArtifactKind } from "./types";

interface GenSpec {
  title: string;
  system: string;
  mock: string;
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
    mock: designPrompt.mock,
    maxTokens: 3000,
    instruction: (_k, content) => `Turn these requirements into a system design:\n\n${content}`,
  },
  tests: {
    title: "Tests",
    system: testsPrompt.system,
    mock: testsPrompt.mock,
    maxTokens: 2048,
    instruction: (k, content) =>
      `Generate a unit test suite that verifies the following ${k}:\n\n${content}`,
  },
  docs: {
    title: "Docs",
    system: docsPrompt.system,
    mock: docsPrompt.mock,
    maxTokens: 2048,
    instruction: (k, content) => `Write developer documentation for the following ${k}:\n\n${content}`,
  },
};
