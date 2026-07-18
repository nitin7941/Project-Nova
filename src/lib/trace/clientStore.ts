import type { TraceGraph, TraceProjectSummary } from "./types";

const KEY = "nova-trace-projects-v1";

type Store = Record<string, TraceGraph>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function saveTraceGraph(graph: TraceGraph) {
  const store = read();
  store[graph.id] = graph;
  write(store);
}

export function getTraceGraph(id: string): TraceGraph | null {
  return read()[id] ?? null;
}

export function listTraceSummaries(): TraceProjectSummary[] {
  return Object.values(read())
    .map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      artifactCount: g.artifacts.length,
      staleCount: g.staleCount,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function removeTraceGraph(id: string) {
  const store = read();
  delete store[id];
  write(store);
}
