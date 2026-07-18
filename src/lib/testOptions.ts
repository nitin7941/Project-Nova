/**
 * Dual-mode Unit Test Generator:
 * - existing: requirements + source → generate tests → validate
 * - new: requirements only → generate test cases
 * Input method (paste / upload / GitHub) is a user choice — not a prerequisite step.
 */

export const PROJECT_MODES = [
  {
    id: "existing",
    label: "Existing project",
    summary: "Requirements + source → unit tests, then validate.",
  },
  {
    id: "new",
    label: "New project",
    summary: "Requirements only → test cases before implementation exists.",
  },
] as const;

export type ProjectMode = (typeof PROJECT_MODES)[number]["id"];

/** How the user supplies content — chosen in UI, not listed as process steps. */
export const INPUT_METHODS = [
  {
    id: "paste",
    label: "Paste",
    hint: "Paste requirements and source into text areas",
  },
  {
    id: "upload",
    label: "Upload",
    hint: "Upload local requirements and source files",
  },
  {
    id: "github",
    label: "GitHub",
    hint: "Load files from a GitHub repo and branch",
  },
] as const;

export type InputMethod = (typeof INPUT_METHODS)[number]["id"];

export const LANGUAGE_OPTIONS = [
  { id: "", label: "Auto-detect" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
] as const;

export const COVERAGE_FOCI = [
  { id: "balanced", label: "Balanced", description: "Happy path + edges + errors" },
  { id: "happy", label: "Happy path", description: "Core success scenarios first" },
  { id: "edge", label: "Edge cases", description: "Boundaries, empties, extremes" },
  { id: "errors", label: "Error handling", description: "Invalid input & failure paths" },
] as const;

export type CoverageFocus = (typeof COVERAGE_FOCI)[number]["id"];

export const TEST_STYLES = [
  { id: "unit", label: "Unit tests" },
  { id: "integration", label: "Integration-leaning" },
] as const;

export type TestStyle = (typeof TEST_STYLES)[number]["id"];

/** What you need — not how you provide it (paste/upload/GitHub). */
export const EXISTING_PREREQUISITES = [
  {
    id: "requirements",
    label: "Requirements",
    detail: "Feature / acceptance criteria for the behaviour under test.",
  },
  {
    id: "source",
    label: "Source under test",
    detail: "Existing module or code you want unit tests for.",
  },
  {
    id: "framework",
    label: "Test framework",
    detail: "Jest, Vitest, pytest, or JUnit.",
  },
  {
    id: "actions",
    label: "Generate & validate",
    detail: "Generate unit tests, then validate them against requirements + source.",
  },
] as const;

export const NEW_PREREQUISITES = [
  {
    id: "requirements",
    label: "Requirements",
    detail: "Product / feature requirements for the new system.",
  },
  {
    id: "framework",
    label: "Intended framework",
    detail: "So skeletons match the stack you will build.",
  },
  {
    id: "actions",
    label: "Generate test cases",
    detail: "Catalogue + skeleton derived from requirements alone.",
  },
] as const;

export function isProjectMode(value: unknown): value is ProjectMode {
  return value === "existing" || value === "new";
}

export function isCoverageFocus(value: unknown): value is CoverageFocus {
  return (
    typeof value === "string" &&
    (COVERAGE_FOCI as readonly { id: string }[]).some((f) => f.id === value)
  );
}

export function isTestStyle(value: unknown): value is TestStyle {
  return (
    typeof value === "string" &&
    (TEST_STYLES as readonly { id: string }[]).some((s) => s.id === value)
  );
}

export const COVERAGE_FOCUS_HINTS: Record<CoverageFocus, string> = {
  balanced: "Cover happy paths, edge cases, and error handling roughly equally.",
  happy: "Prioritize happy-path / success scenarios; keep a couple of edges.",
  edge: "Prioritize boundary values, empty inputs, and unusual cases.",
  errors: "Prioritize invalid input, thrown errors, and failure paths.",
};
