/**
 * Dual-mode Unit Test Generator:
 * - existing: local folder or GitHub → generate + validate (requirements optional)
 * - new: requirements (typed or from GitHub) → test cases
 */

export const PROJECT_MODES = [
  {
    id: "existing",
    label: "Existing project",
    summary: "Local folder or GitHub → unit tests → validate.",
  },
  {
    id: "new",
    label: "New project",
    summary: "Requirements → test cases before implementation exists.",
  },
] as const;

export type ProjectMode = (typeof PROJECT_MODES)[number]["id"];

export const INPUT_METHODS = [
  {
    id: "folder",
    label: "Local folder",
    hint: "Select a project folder — Nova reads structure and source files",
    existingOnly: true,
  },
  {
    id: "github",
    label: "GitHub",
    hint: "Load files from a GitHub repo and branch",
    existingOnly: false,
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

export const EXISTING_PREREQUISITES = [
  {
    id: "source",
    label: "Project source",
    detail: "Local folder or GitHub — Nova reads the code.",
  },
  {
    id: "requirements",
    label: "Requirements (optional)",
    detail: "If present, used as reference. If missing, inferred from the code.",
  },
  {
    id: "framework",
    label: "Test framework",
    detail: "Jest, Vitest, pytest, or JUnit.",
  },
  {
    id: "actions",
    label: "Generate & validate",
    detail: "Generate unit tests, then validate against source (+ requirements if any).",
  },
] as const;

export const NEW_PREREQUISITES = [
  {
    id: "requirements",
    label: "Requirements",
    detail: "Type them here or load from GitHub.",
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
