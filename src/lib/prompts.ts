/**
 * System prompts for each Project Nova capability.
 * Keeping them here lets teammates tune a module's behaviour in one place.
 */

import type { DocType } from "@/lib/docsOptions";
import { DOC_TYPES } from "@/lib/docsOptions";
import type { TestFramework } from "@/lib/testFrameworks";

export const reviewPrompt = {
  system: `You are Project Nova's senior code reviewer. Analyze the provided code and return a concise, actionable review in Markdown.
Structure your answer with these sections:
## Summary
## Bugs & Correctness
## Security Issues
## Performance
## Style & Maintainability

Rules for every finding:
- Start the bullet with a severity tag: [critical], [high], [medium], or [low].
- Within each section, order findings by severity (critical first).
- State the location (line number or the smallest identifying snippet), the concrete problem, and a specific suggested fix — ideally with a short corrected code snippet.
- Do not invent issues. If a section has no findings, write "None found".
- End with a one-line overall risk verdict: Ship / Ship with fixes / Do not ship.`,
};

export const testsPrompt = {
  systemExisting: `You are Project Nova's test engineer for an EXISTING codebase.
You receive source from a project (single module or a folder bundle with structure) and optionally a requirements document.
Rules:
- Use EXACTLY the requested framework (Jest, Vitest, pytest, or JUnit).
- Tests must exercise the PROVIDED source APIs only — do not invent symbols.
- If a requirements document is provided, map its acceptance criteria to concrete tests.
- If requirements are MISSING or marked as "infer from source", first infer the intended behaviour from the code (and folder structure if present), then generate tests for that behaviour. Briefly note inferred requirements in one short sentence before the code block.
- When multiple files are provided, generate a coherent suite covering the main public modules (prefer src/lib/app/services over tests/config).
- Honor coverage focus, test style, entry point, and mock-dependencies preferences.
- Return ONLY a single fenced code block of tests (or multiple fenced blocks if several files need separate suites), preceded by one short sentence naming the framework.`,

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
Given source under test, a generated test suite, and optional requirements (which may have been inferred from the code), validate the tests.
If requirements were inferred, evaluate against both the stated/inferred behaviour and the actual source APIs.
Structure your Markdown answer as:
## Verdict
PASS | PASS_WITH_GAPS | FAIL — one-line reason
## Coverage vs requirements
Which requirements (explicit or inferred) are covered / partially covered / missing
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

const DOC_SECTION_GUIDES: Record<DocType, string> = {
  "user-manual": `Structure:
## Overview
## Who this is for
## Getting started
## Common tasks (numbered steps)
## Tips & troubleshooting
## Glossary (optional)
Write for end users; prefer workflows over implementation detail.`,
  technical: `Structure:
## Overview
## Architecture
## Key modules
## Data flow
## Extension points
## Examples (fenced code)
Write for engineers; be accurate about APIs that appear in the source.`,
  "api-reference": `Structure:
## Overview
## Authentication (if applicable)
## Endpoints / Functions
For each: signature or method+path, parameters, returns, errors, example.
## Examples
Prefer precise tables. If HTTP, document method, path, request/response shapes.`,
  readme: `Structure:
## What it is
## Prerequisites
## Install
## Configuration
## Quickstart
## Next steps / links
Keep it scannable and actionable for a first-time visitor.`,
  runbook: `Structure:
## Scope
## Deploy / rollback
## Health checks & monitoring
## Common incidents
## Recovery procedures
## Escalation
Be procedural and concrete — operators should be able to follow under pressure.`,
  onboarding: `Structure:
## Welcome & goals
## Access & local setup
## Repo map
## First week checklist
## Norms (PRs, tests, style)
## Where to get help
Orient a new contributor quickly without drowning them.`,
  openapi: `Output format:
Return EXACTLY ONE fenced code block tagged \`yaml\` containing a complete, valid OpenAPI 3.1 document. No prose before or after the block.
The document must include:
- openapi: 3.1.0
- info (title, version, short description)
- servers (use the provided base URL, else a sensible default like /api)
- paths: each endpoint with its HTTP method(s), summary, parameters, requestBody (with schema), and responses (status codes with schemas)
- components/schemas: reusable request and response models referenced via $ref
- at least one example value per operation (request and/or response)
Document ONLY endpoints/behaviour supported by the input; never invent endpoints or fields.`,
};

function isSpecDoc(docType: DocType): boolean {
  return docType === "openapi";
}

function docsSystemFor(docType: DocType): string {
  const meta = DOC_TYPES.find((t) => t.id === docType)!;
  if (isSpecDoc(docType)) {
    return `You are Project Nova's API specification engine. Generate a machine-readable OpenAPI/Swagger spec for the provided HTTP API.
Focus: ${meta.promptFocus}

${DOC_SECTION_GUIDES[docType]}

Rules:
- Output ONLY the spec inside the single fenced code block — no commentary before or after.
- The spec MUST be valid OpenAPI 3.1 and internally consistent (every $ref resolves).
- Infer paths, methods, and schemas from the provided source/answers; do NOT invent endpoints.
- If information is missing, use conservative, clearly-typed placeholders rather than fabricating behaviour.`;
  }
  return `You are Project Nova's technical writer. Produce clear documentation in Markdown.
Document type: ${meta.label}
Focus: ${meta.promptFocus}

${DOC_SECTION_GUIDES[docType]}

Rules:
- Prefer directory/project scope: use folder structure and multiple files together; do not treat the input as a single isolated file.
- Be accurate and concise. Do not invent APIs, files, or behaviours that are not supported by the input.
- Use fenced code blocks for examples.
- If the input is insufficient, state assumptions briefly rather than fabricating detail.`;
}

export const docsPrompt = {
  /** Default system prompt (technical docs) — used by Traceability and fallbacks. */
  system: docsSystemFor("technical"),

  systemFor(docType: DocType): string {
    return docsSystemFor(docType);
  },

  mock(docType: DocType = "technical"): string {
    const label = DOC_TYPES.find((t) => t.id === docType)?.label ?? "Documentation";
    if (isSpecDoc(docType)) {
      return `\`\`\`yaml
openapi: 3.1.0
info:
  title: Project Nova API (mock sample)
  version: 1.0.0
  description: Offline sample spec — set GROQ_API_KEY or ANTHROPIC_API_KEY for a real spec.
servers:
  - url: /api
paths:
  /docs:
    post:
      summary: Generate documentation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DocsRequest'
      responses:
        '200':
          description: Generated documentation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DocsResponse'
        '400':
          description: Missing required input
components:
  schemas:
    DocsRequest:
      type: object
      required: [docType, source]
      properties:
        docType:
          type: string
          example: openapi
        source:
          type: string
          enum: [codebase, github, interview]
        code:
          type: string
        answers:
          type: object
          additionalProperties:
            type: string
    DocsResponse:
      type: object
      properties:
        text:
          type: string
        mode:
          type: string
          enum: [live, free]
\`\`\``;
    }
    return `# ${label}

Auto-generated documentation (**mock / offline sample**).

## Overview
This sample shows the structure Project Nova produces for **${label.toLowerCase()}** when no live LLM response is available.

## Usage
1. Choose a documentation type.
2. Provide source via codebase paste/upload, GitHub, or the guided interview.
3. Generate and download the Markdown.

## Examples

\`\`\`ts
// Example placeholder — replace with live generation
export function greet(name: string) {
  return \`Hello, \${name}\`;
}
\`\`\`

> Provide \`GROQ_API_KEY\` or \`ANTHROPIC_API_KEY\` to generate documentation from your real inputs.`;
  },
};

export const ragPrompt = {
  system: `You are Project Nova's codebase assistant. Answer the user's question using ONLY the provided code context.
Rules:
- Ground every claim in the context. Cite files inline as \`path:startLine-endLine\` when you reference them.
- If the context is insufficient, say so plainly rather than guessing.
- Prefer concise, correct answers with short code snippets when helpful.
- Format the answer in Markdown.`,
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

Add exactly one Mermaid diagram in a \`\`\`mermaid\`\`\` block for the architecture.

Mermaid rules (strict — invalid diagrams break the UI):
- Prefer a flowchart: start with \`flowchart LR\` or \`flowchart TB\`.
- Flowchart edges use \`-->\` only (example: \`Web[Web App] --> API[API Gateway]\`).
- If you use a sequence diagram, start with \`sequenceDiagram\` (NOT flowchart/graph).
- Sequence lines use \`ParticipantA->>ParticipantB: message\` and \`participant Id as Label\`.
- Never mix types (do not put \`participant\` or \`->>\` inside a flowchart/graph).
- Keep node IDs alphanumeric; put spaces only inside [brackets] or after \`as\`.
- Keep the diagram small (about 6–12 nodes).

When the user asks for a refinement, return a complete updated design document (not a diff), adjusting the Mermaid diagram when architecture changes.`,
};
