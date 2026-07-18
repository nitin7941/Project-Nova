import { embedOne } from "./embeddings";
import { search } from "./store";
import type { RetrievedChunk } from "./types";

export interface ProjectContext {
  context: string;
  sources: RetrievedChunk[];
}

/**
 * Retrieve project context for any feature (review, tests, docs, design).
 * Given an indexed project and a query (the code/requirements), return the
 * most relevant repo snippets formatted for prompt injection. This is what
 * makes every feature "grounded in your codebase" instead of generic.
 */
export async function getProjectContext(
  indexId: string | undefined | null,
  query: string,
  k = 5,
): Promise<ProjectContext> {
  if (!indexId) return { context: "", sources: [] };

  const queryVector = await embedOne(query);
  const sources = await search(indexId, queryVector, k);

  const context = sources
    .map((c) => `### ${c.file}:${c.startLine}-${c.endLine}\n\`\`\`\n${c.text}\n\`\`\``)
    .join("\n\n");

  return { context, sources };
}

/** Prefix a feature's user prompt with retrieved project context, if any. */
export function withProjectContext(context: string, userPrompt: string): string {
  if (!context) return userPrompt;
  return (
    `Relevant context from the team's indexed repository. Use it to ground your answer ` +
    `in how THIS project actually works (conventions, existing helpers, patterns):\n\n` +
    `${context}\n\n---\n\n${userPrompt}`
  );
}
