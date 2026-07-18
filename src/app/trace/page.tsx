"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { ARTIFACT_KINDS, DOWNSTREAM } from "@/lib/trace/types";
import type { ArtifactKind, ArtifactView, TraceGraph } from "@/lib/trace/types";

interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  artifactCount: number;
  staleCount: number;
}

interface IndexOption {
  id: string;
  source: string;
  chunkCount: number;
}

const KIND_META: Record<ArtifactKind, { label: string; icon: string; accent: string; badge: string }> = {
  requirement: { label: "Requirement", icon: "📋", accent: "from-amber-500 to-orange-600", badge: "bg-amber-500/15 text-amber-300" },
  design: { label: "Design", icon: "🏗️", accent: "from-sky-500 to-blue-600", badge: "bg-sky-500/15 text-sky-300" },
  tests: { label: "Tests", icon: "🧪", accent: "from-emerald-500 to-teal-600", badge: "bg-emerald-500/15 text-emerald-300" },
  docs: { label: "Docs", icon: "📚", accent: "from-violet-500 to-fuchsia-600", badge: "bg-violet-500/15 text-violet-300" },
};

export default function TracePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [indexes, setIndexes] = useState<IndexOption[]>([]);
  const [graph, setGraph] = useState<TraceGraph | null>(null);
  const [error, setError] = useState("");

  // New project form
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [requirement, setRequirement] = useState("");
  const [indexId, setIndexId] = useState("");
  const [creating, setCreating] = useState(false);

  // Per-artifact busy flag (generating / regenerating)
  const [busy, setBusy] = useState<string>("");

  // Detail panel
  const [selected, setSelected] = useState<ArtifactView | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    refreshProjects();
    fetch("/api/rag/indexes")
      .then((r) => r.json())
      .then((d) => setIndexes(d.indexes ?? []))
      .catch(() => setIndexes([]));
  }, []);

  async function refreshProjects() {
    try {
      const d = await fetch("/api/trace/project").then((r) => r.json());
      setProjects(d.projects ?? []);
    } catch {
      setProjects([]);
    }
  }

  function applyGraph(g: TraceGraph) {
    setGraph(g);
    // Keep the detail panel in sync with the freshly returned graph.
    setSelected((prev) => (prev ? g.artifacts.find((a) => a.id === prev.id) ?? null : null));
  }

  async function openProject(id: string) {
    setError("");
    setSelected(null);
    try {
      const res = await fetch(`/api/trace/project/${id}`);
      const g = await res.json();
      if (!res.ok) throw new Error(g.error || "Could not load project");
      setGraph(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load project.");
    }
  }

  async function createProject() {
    if (!requirement.trim()) {
      setError("Enter a requirement to start the chain.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/trace/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, requirement, indexId: indexId || undefined }),
      });
      const g = await res.json();
      if (!res.ok) throw new Error(g.error || "Could not create project");
      setGraph(g);
      setShowNew(false);
      setName("");
      setRequirement("");
      setIndexId("");
      refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  async function generate(parent: ArtifactView, targetKind: ArtifactKind, replaceArtifactId?: string) {
    if (!graph) return;
    setBusy(replaceArtifactId ?? `${parent.id}:${targetKind}`);
    setError("");
    try {
      const res = await fetch("/api/trace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: graph.id, parentId: parent.id, targetKind, replaceArtifactId }),
      });
      const g = await res.json();
      if (!res.ok) throw new Error(g.error || "Generation failed");
      applyGraph(g);
      refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy("");
    }
  }

  async function patchArtifact(artifactId: string, body: Record<string, unknown>) {
    if (!graph) return;
    setError("");
    try {
      const res = await fetch(`/api/trace/project/${graph.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId, ...body }),
      });
      const g = await res.json();
      if (!res.ok) throw new Error(g.error || "Update failed");
      applyGraph(g);
      refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  function parentOf(a: ArtifactView): ArtifactView | undefined {
    return a.parentId ? graph?.artifacts.find((x) => x.id === a.parentId) : undefined;
  }

  function openDetail(a: ArtifactView, edit = false) {
    setSelected(a);
    setEditing(edit);
    setDraft(a.content);
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-2xl">
          🕸️
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Traceability &amp; Drift</h1>
          <p className="text-zinc-400">
            Link a requirement to its design, tests, and docs — then let Nova flag what goes{" "}
            <span className="text-amber-300">stale</span> when an upstream artifact changes.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar: projects */}
        <aside className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Projects</h2>
            <button
              onClick={() => setShowNew((v) => !v)}
              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
            >
              {showNew ? "Close" : "+ New"}
            </button>
          </div>

          {showNew && (
            <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-[#0d0d15] p-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-rose-500/60"
              />
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="The requirement to trace, e.g. 'Users can reset their password via email.'"
                className="h-24 w-full resize-none rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-rose-500/60"
              />
              <select
                value={indexId}
                onChange={(e) => setIndexId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-rose-500/60"
              >
                <option value="">Ground in a repo (optional)</option>
                {indexes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.source.replace(/\.git$/, "").split("/").slice(-2).join("/")}
                  </option>
                ))}
              </select>
              <button
                onClick={createProject}
                disabled={creating}
                className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create chain"}
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {projects.length === 0 && (
              <li className="text-xs text-zinc-500">No projects yet. Create one to start a chain.</li>
            )}
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openProject(p.id)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-white/5 ${
                    graph?.id === p.id ? "bg-white/5 text-white" : "text-zinc-300"
                  }`}
                >
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="text-zinc-500">
                    {p.artifactCount} artifacts
                    {p.staleCount > 0 && (
                      <span className="ml-1 text-amber-400">· {p.staleCount} stale</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main: graph */}
        <section>
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {!graph ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-white/10 bg-[#12121b] text-sm text-zinc-500">
              Select a project, or create one to trace a requirement through the lifecycle.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{graph.name}</h2>
                {graph.indexId && (
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400">
                    grounded in repo
                  </span>
                )}
                {graph.staleCount > 0 ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                    ⚠ {graph.staleCount} stale — regenerate to sync
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    ✓ all artifacts in sync
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {ARTIFACT_KINDS.map((kind) => {
                  const items = graph.artifacts.filter((a) => a.kind === kind);
                  const meta = KIND_META[kind];
                  return (
                    <div key={kind} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        <span>{meta.icon}</span>
                        {meta.label}
                      </div>
                      {items.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-zinc-600">
                          None yet
                        </div>
                      )}
                      {items.map((a) => {
                        const parent = parentOf(a);
                        return (
                          <div
                            key={a.id}
                            className={`rounded-xl border bg-[#12121b] p-3 transition ${
                              a.stale ? "border-amber-500/40" : "border-white/10"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}>
                                {meta.label}
                              </span>
                              {a.mode !== "manual" && (
                                <span className="text-[10px] text-zinc-600">{a.mode}</span>
                              )}
                              {a.stale && (
                                <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                  stale
                                </span>
                              )}
                            </div>
                            {parent && (
                              <p className="mb-1 truncate text-[11px] text-zinc-500">
                                ↳ from {KIND_META[parent.kind].label}
                              </p>
                            )}
                            <p className="line-clamp-3 text-xs text-zinc-400">
                              {a.content.slice(0, 160) || "(empty)"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                onClick={() => openDetail(a)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-white/5"
                              >
                                View
                              </button>
                              <button
                                onClick={() => openDetail(a, true)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-white/5"
                              >
                                Edit
                              </button>
                              {a.stale && (
                                <>
                                  <button
                                    onClick={() => generate(parent!, a.kind, a.id)}
                                    disabled={busy === a.id}
                                    className="rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
                                  >
                                    {busy === a.id ? "Regenerating…" : "Regenerate"}
                                  </button>
                                  <button
                                    onClick={() => patchArtifact(a.id, { action: "acknowledge" })}
                                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-white/5"
                                  >
                                    Mark valid
                                  </button>
                                </>
                              )}
                            </div>

                            {DOWNSTREAM[a.kind].length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
                                <span className="text-[10px] text-zinc-600">generate:</span>
                                {DOWNSTREAM[a.kind].map((target) => (
                                  <button
                                    key={target}
                                    onClick={() => generate(a, target)}
                                    disabled={busy === `${a.id}:${target}`}
                                    className="rounded-lg border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                                  >
                                    {busy === `${a.id}:${target}` ? "…" : `→ ${KIND_META[target].label}`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Detail / edit panel */}
      {selected && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#12121b]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_META[selected.kind].badge}`}>
                {KIND_META[selected.kind].icon} {KIND_META[selected.kind].label}
              </span>
              {selected.stale && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">stale</span>
              )}
              <div className="ml-auto flex gap-2">
                {!editing && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setDraft(selected.content);
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-80 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-rose-500/60"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Editing an upstream artifact marks everything generated from it as stale.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        await patchArtifact(selected.id, { content: draft });
                        setEditing(false);
                      }}
                      className="rounded-lg bg-gradient-to-r from-rose-500 to-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <Markdown content={selected.content || "_(empty)_"} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
