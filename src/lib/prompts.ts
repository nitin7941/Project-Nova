/**
 * System prompts + mock outputs for each Project Nova capability.
 * Keeping them here lets teammates tune a module's behaviour in one place.
 */

export const reviewPrompt = {
  system: `You are Project Nova's senior code reviewer. Analyze the provided code and return a concise, actionable review in Markdown.
Structure your answer with these sections:
## Summary
## Bugs & Correctness
## Security Issues
## Performance
## Style & Maintainability
For each finding use a bullet with a severity tag [critical] [high] [medium] [low], the location, and a suggested fix. If a section has no findings, write "None found".`,
  mock: `## Summary
Reviewed the snippet in **mock mode** (no API key set). Overall structure is reasonable but there are a few correctness and security concerns.

## Bugs & Correctness
- [high] Missing input validation before use — guard against \`null\`/\`undefined\` at the entry point.
- [medium] Off-by-one risk in the loop bound; verify the terminal condition.

## Security Issues
- [critical] User input appears to be interpolated directly into a query/command — use parameterized queries to prevent injection.
- [low] Errors are swallowed; log with context so failures are observable.

## Performance
- [low] Repeated work inside the loop could be hoisted out.

## Style & Maintainability
- Extract the nested logic into a named helper for readability.

> Set \`ANTHROPIC_API_KEY\` to get a real, code-specific review.`,
};

export const testsPrompt = {
  system: `You are Project Nova's test engineer. Generate a thorough unit test suite for the provided code.
Rules:
- Detect the language/framework from the code and use the idiomatic test framework (e.g. Jest/Vitest for JS/TS, pytest for Python, JUnit for Java).
- Cover happy paths, edge cases, and error handling.
- Return ONLY a single fenced code block containing the tests, preceded by one short sentence naming the framework used.`,
  mock: `Using **Jest** (mock mode — no API key set):

\`\`\`ts
import { describe, it, expect } from "@jest/globals";
import { subject } from "./subject";

describe("subject", () => {
  it("handles the happy path", () => {
    expect(subject(2, 3)).toBe(5);
  });

  it("handles zero", () => {
    expect(subject(0, 0)).toBe(0);
  });

  it("throws on invalid input", () => {
    // @ts-expect-error testing runtime guard
    expect(() => subject(null, 3)).toThrow();
  });
});
\`\`\`

> Set \`ANTHROPIC_API_KEY\` to generate tests tailored to your actual code.`,
};

export const docsPrompt = {
  system: `You are Project Nova's technical writer. Produce clear developer documentation in Markdown for the provided code or API.
Include:
## Overview
## Usage
## API Reference (functions/endpoints, parameters, return values)
## Examples (with fenced code blocks)
Be accurate and concise. If it is an HTTP API, document method, path, request/response shapes.`,
  mock: `## Overview
Auto-generated documentation (**mock mode** — no API key set). This module exposes a small, focused API.

## Usage
\`\`\`ts
import { subject } from "./subject";
const result = subject(2, 3); // 5
\`\`\`

## API Reference
### \`subject(a: number, b: number): number\`
- **a** — first operand.
- **b** — second operand.
- **returns** — the sum of \`a\` and \`b\`.
- **throws** — \`TypeError\` if either argument is not a number.

## Examples
\`\`\`ts
subject(10, 5);  // 15
subject(-1, 1);  // 0
\`\`\`

> Set \`ANTHROPIC_API_KEY\` to generate documentation from your real code.`,
};

export const designPrompt = {
  system: `You are Project Nova's principal software architect. Turn the given product/feature requirements into a pragmatic system design in Markdown.
Include:
## Restated Requirements (functional + non-functional)
## Proposed Architecture (components and how they interact)
## Data Model (key entities & relationships)
## API Surface (key endpoints)
## Tech Stack Recommendation (with brief rationale)
## Risks & Open Questions
Add a Mermaid diagram in a \`\`\`mermaid\`\`\` block for the architecture. Keep it hackathon-pragmatic.`,
  mock: `## Restated Requirements
**Functional:** users submit requirements; system returns a design. **Non-functional:** fast, secure, role-based access.

## Proposed Architecture
A web client talks to an API gateway, which routes to stateless services backed by a database and an LLM provider.

\`\`\`mermaid
flowchart LR
  U[User] --> W[Web App]
  W --> API[API Layer]
  API --> DB[(Database)]
  API --> LLM[LLM Provider]
  API --> VDB[(Vector Store)]
\`\`\`

## Data Model
- **User**(id, name, role)
- **Project**(id, name, ownerId)
- **Artifact**(id, projectId, type, content)

## API Surface
- \`POST /api/design\` — generate a system design.
- \`GET /api/projects/:id\` — fetch project artifacts.

## Tech Stack Recommendation
Next.js + TypeScript for one-codebase velocity; PostgreSQL for relational data; a managed vector store for RAG; Claude for generation.

## Risks & Open Questions
- Scope creep across the SDLC — pick one hero flow for the demo.
- LLM latency/cost — cache and stream responses.

> Set \`ANTHROPIC_API_KEY\` to generate a design specific to your requirements.`,
};
