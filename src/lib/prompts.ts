/**
 * System prompts + mock outputs for each Project Nova capability.
 * Keeping them here lets teammates tune a module's behaviour in one place.
 */

import type { TestFramework } from "@/lib/testFrameworks";

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
  systemExisting: `You are Project Nova's test engineer for an EXISTING codebase.
Given (1) a requirements file and (2) source code from a repo/branch, generate idiomatic unit tests.
Rules:
- Use EXACTLY the requested framework (Jest, Vitest, pytest, or JUnit).
- Tests must exercise the PROVIDED source APIs only — do not invent symbols.
- Map requirements/acceptance criteria to concrete test cases where they apply to this module.
- Honor coverage focus, test style, entry point, and mock-dependencies preferences.
- Return ONLY a single fenced code block of tests, preceded by one short sentence naming the framework.`,

  systemNew: `You are Project Nova's QA analyst for a NEW (greenfield) system.
Given a requirements file only (no implementation yet), produce a test-case package.
Rules:
- Derive clear, testable cases from the requirements (functional + key non-functional if stated).
- Structure the Markdown answer as:
## Traceability
(brief map of requirement → test areas)
## Test case catalogue
For each case: ID, title, type (unit|acceptance), preconditions, steps, expected result, priority (P0–P2)
## Suggested unit-test skeleton
One fenced code block using EXACTLY the requested framework (placeholders OK where APIs do not exist yet).
- Be concrete and measurable — avoid vague "works correctly" expectations.`,

  systemValidate: `You are Project Nova's test validator for an EXISTING project.
Given requirements, source under test, and a generated test suite, validate the tests.
Structure your Markdown answer as:
## Verdict
PASS | PASS_WITH_GAPS | FAIL — one-line reason
## Coverage vs requirements
Which requirements are covered / partially covered / missing
## Alignment with source
API mismatches, brittle assertions, missing mocks, unreachable paths
## Suggested fixes
Concrete edits or additional cases (bullet list; include short code snippets only when essential)
Be strict but practical.`,

  mockExisting(framework: TestFramework): string {
    return this._suiteMock(framework, "existing project · requirements + source");
  },

  mockNew(framework: TestFramework): string {
    return `## Traceability
Requirements R1–R3 mapped to unit/acceptance cases below (**mock mode** — new project).

## Test case catalogue
| ID | Title | Type | Priority | Expected |
|----|-------|------|----------|----------|
| TC-01 | Creates resource with valid input | acceptance | P0 | 201 + resource body |
| TC-02 | Rejects missing required field | unit | P0 | 400 validation error |
| TC-03 | Handles empty collection | unit | P1 | returns empty list |

### TC-01 — Creates resource with valid input
- **Preconditions:** Auth user exists.
- **Steps:** Submit valid payload per requirements.
- **Expected:** Resource persisted; response matches schema.

### TC-02 — Rejects missing required field
- **Preconditions:** None.
- **Steps:** Omit required field from payload.
- **Expected:** Validation error; nothing persisted.

## Suggested unit-test skeleton
Using **${frameworkLabel(framework)}** (mock mode — no API key set):

${skeletonBlock(framework)}

> Set \`ANTHROPIC_API_KEY\` for requirement-specific test cases.`;
  },

  mockValidate(): string {
    return `## Verdict
**PASS_WITH_GAPS** — suite covers happy path; edge/error requirements not fully asserted (**mock mode**).

## Coverage vs requirements
- Covered: core success path for the primary operation.
- Partial: input validation mentioned in requirements but only one negative case.
- Missing: concurrency / empty-collection behaviour if required.

## Alignment with source
- Imports and public API names look consistent with the provided module.
- Prefer asserting on observable outputs rather than internal private helpers.

## Suggested fixes
- Add a case for empty / null input if the source guards it.
- Add a case mapping directly to each P0 acceptance criterion in the requirements file.

> Set \`ANTHROPIC_API_KEY\` for a live validation against your real suite.`;
  },

  mockFor(framework: TestFramework): string {
    return this.mockExisting(framework);
  },

  _suiteMock(framework: TestFramework, context: string): string {
    return `Using **${frameworkLabel(framework)}** (mock mode — ${context}):

${skeletonBlock(framework)}

> Set \`ANTHROPIC_API_KEY\` to generate tests tailored to your requirements and source.`;
  },
};

function frameworkLabel(framework: TestFramework): string {
  switch (framework) {
    case "pytest":
      return "pytest";
    case "junit":
      return "JUnit";
    case "vitest":
      return "Vitest";
    default:
      return "Jest";
  }
}

function skeletonBlock(framework: TestFramework): string {
  switch (framework) {
    case "pytest":
      return `\`\`\`python
import pytest
from subject import subject

def test_happy_path():
    assert subject(2, 3) == 5

def test_zero():
    assert subject(0, 0) == 0

def test_invalid_input():
    with pytest.raises(TypeError):
        subject(None, 3)
\`\`\``;
    case "junit":
      return `\`\`\`java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SubjectTest {
  @Test
  void handlesHappyPath() {
    assertEquals(5, Subject.subject(2, 3));
  }

  @Test
  void handlesZero() {
    assertEquals(0, Subject.subject(0, 0));
  }

  @Test
  void throwsOnInvalidInput() {
    assertThrows(IllegalArgumentException.class, () -> Subject.subject(null, 3));
  }
}
\`\`\``;
    case "vitest":
      return `\`\`\`ts
import { describe, it, expect } from "vitest";
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
\`\`\``;
    default:
      return `\`\`\`ts
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
\`\`\``;
  }
}

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
