/**
 * Docs & API Generator options:
 * - doc types (user manual, technical, API ref, …)
 * - sources (local project folder, GitHub directory, guided interview)
 */

import { LANGUAGE_OPTIONS } from "@/lib/testOptions";

export { LANGUAGE_OPTIONS };

export const DOC_TYPES = [
  {
    id: "user-manual",
    label: "User Manual",
    summary: "End-user how-tos, workflows, and task-oriented guides.",
    promptFocus:
      "Write for end users. Emphasize goals, step-by-step workflows, screens/UI concepts, and what success looks like. Avoid deep implementation detail.",
  },
  {
    id: "technical",
    label: "Technical Docs",
    summary: "Architecture, modules, internals for developers.",
    promptFocus:
      "Write for engineers. Cover architecture, key modules, data flow, extension points, and important invariants.",
  },
  {
    id: "api-reference",
    label: "API Reference",
    summary: "Endpoints, params, request/response shapes.",
    promptFocus:
      "Produce a precise API reference: methods/paths or function signatures, parameters, return values, errors, and examples. Prefer tables where helpful.",
  },
  {
    id: "readme",
    label: "README / Getting Started",
    summary: "Install, setup, and a quickstart path.",
    promptFocus:
      "Produce a README-style getting started guide: what it is, prerequisites, install, configuration, quickstart, and common next steps.",
  },
  {
    id: "runbook",
    label: "Runbook / Ops Guide",
    summary: "Deploy, monitor, and incident procedures.",
    promptFocus:
      "Write an operations runbook: deploy/rollback, health checks, monitoring signals, common incidents, and recovery steps.",
  },
  {
    id: "onboarding",
    label: "Onboarding Guide",
    summary: "New-hire or new-contributor path through the project.",
    promptFocus:
      "Write an onboarding guide for new contributors: repo map, local setup, first useful tasks, coding norms, and where to ask for help.",
  },
] as const;

export type DocType = (typeof DOC_TYPES)[number]["id"];

export const DOC_SOURCES = [
  {
    id: "codebase",
    label: "Local folder",
    hint: "Select a project directory — Nova reads structure and source files",
  },
  {
    id: "github",
    label: "GitHub folder",
    hint: "Load a directory from a GitHub repo and branch",
  },
  {
    id: "interview",
    label: "Ask me questions",
    hint: "Answer a short interview — no code required",
  },
] as const;

export type DocSource = (typeof DOC_SOURCES)[number]["id"];

export interface InterviewQuestion {
  id: string;
  label: string;
  placeholder: string;
}

/** Guided questions per documentation type for interview mode. */
export const INTERVIEW_QUESTIONS: Record<DocType, InterviewQuestion[]> = {
  "user-manual": [
    {
      id: "product",
      label: "What product or feature are you documenting?",
      placeholder: "e.g. Nova Docs Generator — helps teams turn code into manuals",
    },
    {
      id: "audience",
      label: "Who is the primary audience?",
      placeholder: "e.g. Non-technical product managers and support staff",
    },
    {
      id: "goals",
      label: "What should readers be able to accomplish?",
      placeholder: "e.g. Generate a user manual from a GitHub folder in under 5 minutes",
    },
    {
      id: "workflows",
      label: "List the main workflows or screens to cover",
      placeholder: "e.g. Pick doc type → choose source → generate → download Markdown",
    },
    {
      id: "constraints",
      label: "Any constraints, warnings, or out-of-scope items?",
      placeholder: "e.g. Large monorepos may be truncated; English only for now",
    },
  ],
  technical: [
    {
      id: "system",
      label: "What system or module should the docs describe?",
      placeholder: "e.g. /api/docs route + DocsWorkbench client",
    },
    {
      id: "audience",
      label: "Who will read this (role / experience level)?",
      placeholder: "e.g. Mid-level full-stack engineers joining the team",
    },
    {
      id: "architecture",
      label: "Key components and how they interact",
      placeholder: "e.g. UI → POST /api/docs → Claude/Groq → Markdown",
    },
    {
      id: "internals",
      label: "Important internals, invariants, or extension points",
      placeholder: "e.g. Doc types live in docsOptions.ts; add types there first",
    },
    {
      id: "mustCover",
      label: "Topics that must be covered",
      placeholder: "e.g. Prompt selection, validation rules, GitHub folder fetch",
    },
  ],
  "api-reference": [
    {
      id: "surface",
      label: "What API surface are you documenting?",
      placeholder: "e.g. REST /api/docs and /api/github/fetch",
    },
    {
      id: "auth",
      label: "Auth / tenancy model (if any)",
      placeholder: "e.g. No auth in local hackathon build; optional GitHub PAT for private repos",
    },
    {
      id: "endpoints",
      label: "List endpoints or functions to document",
      placeholder: "e.g. POST /api/docs { docType, source, code?, answers? }",
    },
    {
      id: "errors",
      label: "Important error cases or status codes",
      placeholder: "e.g. 400 when folder source is missing for codebase/github",
    },
    {
      id: "examples",
      label: "Example requests you want included",
      placeholder: "Paste a sample JSON body or curl",
    },
  ],
  readme: [
    {
      id: "project",
      label: "Project name and one-line purpose",
      placeholder: "e.g. Project Nova — AI copilot across the software lifecycle",
    },
    {
      id: "prereqs",
      label: "Prerequisites (runtime, accounts, tools)",
      placeholder: "e.g. Node 20+, GROQ_API_KEY or ANTHROPIC_API_KEY",
    },
    {
      id: "install",
      label: "How should someone install and run it?",
      placeholder: "e.g. npm install && npm run dev",
    },
    {
      id: "quickstart",
      label: "First successful path you want readers to take",
      placeholder: "e.g. Open /docs, pick README type, select a folder, Generate",
    },
    {
      id: "config",
      label: "Key configuration / env vars",
      placeholder: "e.g. ANTHROPIC_API_KEY, GROQ_API_KEY",
    },
  ],
  runbook: [
    {
      id: "service",
      label: "What service or environment is this runbook for?",
      placeholder: "e.g. Project Nova web app on staging Vercel",
    },
    {
      id: "deploy",
      label: "How do you deploy / roll back?",
      placeholder: "e.g. Push to main → Vercel deploy; rollback via previous deployment",
    },
    {
      id: "health",
      label: "Health checks and monitoring signals",
      placeholder: "e.g. /api/providers returns 200; watch LLM error rate",
    },
    {
      id: "incidents",
      label: "Common incidents and first responses",
      placeholder: "e.g. Docs 400 No LLM provider → check env keys and restart",
    },
    {
      id: "contacts",
      label: "Escalation / ownership",
      placeholder: "e.g. Docs owner: Vishal; on-call: #nova-ops",
    },
  ],
  onboarding: [
    {
      id: "role",
      label: "Who is joining (role) and what should they ship first?",
      placeholder: "e.g. Frontend engineer — improve DocsWorkbench UX",
    },
    {
      id: "setup",
      label: "Local setup steps and access they need",
      placeholder: "e.g. Clone repo, npm install, copy .env.example, ask for Groq key",
    },
    {
      id: "map",
      label: "Key folders / modules to learn first",
      placeholder: "e.g. src/app/docs, src/components/DocsWorkbench, src/lib/docsOptions",
    },
    {
      id: "norms",
      label: "Team norms (PRs, tests, style)",
      placeholder: "e.g. Small PRs, match existing dark UI patterns, no drive-by refactors",
    },
    {
      id: "firstTasks",
      label: "Suggested first tasks or good first issues",
      placeholder: "e.g. Add a FAQ doc type; improve interview question copy",
    },
  ],
};

export function isDocType(value: unknown): value is DocType {
  return (
    typeof value === "string" &&
    (DOC_TYPES as readonly { id: string }[]).some((t) => t.id === value)
  );
}

export function isDocSource(value: unknown): value is DocSource {
  return (
    typeof value === "string" &&
    (DOC_SOURCES as readonly { id: string }[]).some((s) => s.id === value)
  );
}

export function docTypeLabel(id: DocType): string {
  return DOC_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function downloadFilename(docType: DocType): string {
  return `${docType}.md`;
}
