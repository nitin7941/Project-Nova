/**
 * Supported unit-test frameworks for the Test Generator module.
 * Keep IDs stable — they are sent to /api/tests and used in prompts.
 */

export const TEST_FRAMEWORKS = ["jest", "vitest", "pytest", "junit"] as const;

export type TestFramework = (typeof TEST_FRAMEWORKS)[number];

export const TEST_FRAMEWORK_OPTIONS: { id: TestFramework; label: string }[] = [
  { id: "jest", label: "Jest" },
  { id: "vitest", label: "Vitest" },
  { id: "pytest", label: "pytest" },
  { id: "junit", label: "JUnit" },
];

export function isTestFramework(value: unknown): value is TestFramework {
  return typeof value === "string" && (TEST_FRAMEWORKS as readonly string[]).includes(value);
}

/** Sensible download filename + extension per framework. */
export function downloadMeta(framework: TestFramework): { filename: string; mime: string } {
  switch (framework) {
    case "pytest":
      return { filename: "test_subject.py", mime: "text/x-python" };
    case "junit":
      return { filename: "SubjectTest.java", mime: "text/x-java-source" };
    case "vitest":
      return { filename: "subject.test.ts", mime: "text/typescript" };
    case "jest":
    default:
      return { filename: "subject.test.ts", mime: "text/typescript" };
  }
}

/** Pull the first fenced code block out of Markdown (for copy/download). */
export function extractCodeBlock(markdown: string): string {
  const match = markdown.match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1].trimEnd() : markdown.trim();
}
