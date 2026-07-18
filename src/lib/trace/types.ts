/**
 * Types for Project Nova's artifact traceability graph.
 *
 * The thesis: a requirement flows through the lifecycle
 * (requirement → design → review → tests → docs) and Nova keeps the *links*
 * between every artifact. Because the links are stored, Nova can detect drift:
 * when a parent artifact changes, everything generated from it is flagged stale.
 *
 * Chat stays outside the graph (discovery layer). Review is a first-class node.
 */

export type ArtifactKind = "requirement" | "design" | "review" | "tests" | "docs";

export const ARTIFACT_KINDS: ArtifactKind[] = [
  "requirement",
  "design",
  "review",
  "tests",
  "docs",
];

/** Which downstream artifacts can be generated from a given kind. */
export const DOWNSTREAM: Record<ArtifactKind, ArtifactKind[]> = {
  requirement: ["design", "review", "tests", "docs"],
  design: ["review", "tests", "docs"],
  review: ["tests", "docs"],
  tests: ["docs"],
  docs: [],
};

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  /** Artifact this one was generated from (null for the root requirement). */
  parentId: string | null;
  /** Hash of the parent's content at generation time — the drift anchor. */
  parentHash: string | null;
  /** How the content was produced. */
  mode: "live" | "free" | "manual";
}

export interface TraceProject {
  id: string;
  name: string;
  /** Optional RAG index so generation is grounded in a real codebase. */
  indexId?: string | null;
  createdAt: number;
  updatedAt: number;
  artifacts: Artifact[];
}

/** Lightweight project row for the sidebar (no artifact contents). */
export interface TraceProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  artifactCount: number;
  staleCount: number;
}

/** An artifact enriched with graph info for the client. */
export interface ArtifactView extends Artifact {
  /** True when the parent changed since this artifact was generated. */
  stale: boolean;
  childIds: string[];
}

export interface TraceGraph {
  id: string;
  name: string;
  indexId?: string | null;
  createdAt: number;
  updatedAt: number;
  artifacts: ArtifactView[];
  staleCount: number;
}
