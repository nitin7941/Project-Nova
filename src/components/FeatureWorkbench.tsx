"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { ProviderSelect } from "@/components/ProviderSelect";
import { LoadingOutput } from "@/components/LoadingOutput";
import { RunHistoryPanel } from "@/components/RunHistoryPanel";
import type { Feature } from "@/lib/features";
import type { CompletionMode, LlmProviderId } from "@/lib/claude";
import {
  addRunHistoryEntry,
  loadRunHistory,
  type RunHistoryEntry,
} from "@/lib/runHistory";

function modeBadge(mode: CompletionMode) {
  if (mode === "live") return { label: "Live · Claude", className: "bg-emerald-500/15 text-emerald-300" };
  return { label: "Free · Groq", className: "bg-sky-500/15 text-sky-300" };
}

interface ProjectOption {
  id: string;
  source: string;
  chunkCount: number;
}

interface Source {
  file: string;
  startLine: number;
  endLine: number;
  score: number;
}

export function FeatureWorkbench({ feature }: { feature: Feature }) {
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<CompletionMode | null>(null);
  const [provider, setProvider] = useState<LlmProviderId>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ghUrl, setGhUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [indexId, setIndexId] = useState("");
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    fetch("/api/rag/indexes")
      .then((r) => r.json())
      .then((d) => setProjects(d.indexes ?? []))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nova-restore-run");
      if (!raw) return;
      const { featureSlug, id } = JSON.parse(raw) as { featureSlug?: string; id?: string };
      if (featureSlug !== feature.slug || !id) return;
      sessionStorage.removeItem("nova-restore-run");
      const entry = loadRunHistory().find((e) => e.id === id);
      if (entry) restoreRun(entry);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.slug]);

  function shortSource(s: string) {
    return s.replace(/\.git$/, "").split("/").slice(-2).join("/");
  }

  function restoreRun(entry: RunHistoryEntry) {
    setInput(entry.input);
    setOutput(entry.output);
    setMode((entry.mode as CompletionMode) || null);
    setError("");
    setSources([]);
  }

  function recordRun(inputText: string, outputText: string, runMode?: string) {
    addRunHistoryEntry({
      featureSlug: feature.slug,
      featureName: feature.name,
      input: inputText,
      output: outputText,
      mode: runMode,
    });
    window.dispatchEvent(new Event("nova-run-history"));
  }

  async function loadFromGithub() {
    if (!ghUrl.trim()) {
      setError("Paste a link to a file on GitHub.");
      return;
    }
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ghUrl }),
      });
      const { readJson } = await import("@/lib/http");
      const data = await readJson<{ error?: string; content?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Could not load file");
      setInput(data.content ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load file.");
    } finally {
      setFetching(false);
    }
  }

  async function run() {
    if (!input.trim()) {
      setError("Please add some input first.");
      return;
    }
    setLoading(true);
    setError("");
    setOutput("");
    setMode(null);
    setSources([]);
    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: input,
          language,
          provider,
          indexId: indexId || undefined,
        }),
      });
      const { readJson } = await import("@/lib/http");
      const data = await readJson<{
        error?: string;
        text?: string;
        mode?: "live" | "free";
        sources?: Source[];
      }>(res);
      if (!res.ok) throw new Error(data.error || "Request failed");
      const text = data.text ?? "";
      setOutput(text);
      setMode(data.mode ?? null);
      setSources(data.sources ?? []);
      recordRun(input, text, data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${feature.accent} text-2xl`}
          >
            {feature.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{feature.name}</h1>
            <p className="text-zinc-400">{feature.tagline}</p>
          </div>
        </div>
        <ProviderSelect value={provider} onChange={setProvider} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-300">{feature.inputLabel}</label>
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="language (optional)"
              className="w-40 rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1 text-xs text-zinc-300 outline-none focus:border-fuchsia-500/60"
            />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Project context:</span>
            <select
              value={indexId}
              onChange={(e) => setIndexId(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-fuchsia-500/60"
            >
              <option value="">None — generic (like plain Copilot/Claude)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {shortSource(p.source)} ({p.chunkCount} chunks)
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <Link href="/chat" className="text-xs text-fuchsia-400 hover:underline">
                Index a repo
              </Link>
            )}
          </div>
          {feature.supportsGithubUrl && (
            <div className="mb-3 flex gap-2">
              <input
                value={ghUrl}
                onChange={(e) => setGhUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !fetching && loadFromGithub()}
                placeholder="Load a file from a GitHub URL (github.com/owner/repo/blob/…)"
                className="flex-1 rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-fuchsia-500/60"
              />
              <button
                onClick={loadFromGithub}
                disabled={fetching}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                {fetching ? "Loading…" : "Load"}
              </button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={feature.placeholder}
            spellCheck={false}
            className="h-80 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-fuchsia-500/60"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={run}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r ${feature.accent} px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
            >
              {loading ? "Working…" : feature.cta}
            </button>
            <button
              onClick={() => {
                setInput("");
                setOutput("");
                setError("");
                setMode(null);
                setSources([]);
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5"
            >
              Clear
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Result</label>
            {mode && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${modeBadge(mode).className}`}>
                {modeBadge(mode).label}
              </span>
            )}
          </div>
          <div className="h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4">
            {loading && !output ? (
              <LoadingOutput />
            ) : output ? (
              <Markdown content={output} />
            ) : (
              <p className="text-sm text-zinc-500">Output will appear here.</p>
            )}
          </div>
          {sources.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0d15] p-3">
              <p className="mb-1 text-xs font-medium text-zinc-400">
                Grounded in project context
              </p>
              <ul className="space-y-0.5">
                {sources.map((s, i) => (
                  <li key={i} className="font-mono text-xs text-zinc-500">
                    {s.file}:{s.startLine}-{s.endLine}{" "}
                    <span className="text-zinc-600">({s.score.toFixed(2)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Run history</h2>
        <RunHistoryPanel featureSlug={feature.slug} onRestore={restoreRun} compact />
      </section>
    </div>
  );
}
