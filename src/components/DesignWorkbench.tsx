"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { ProviderSelect } from "@/components/ProviderSelect";
import { downloadMarkdown, exportDesignPdf } from "@/lib/exportDesign";
import type { Feature } from "@/lib/features";
import type { CompletionMode, LlmProviderId } from "@/lib/claude";

type ChatTurn = { role: "user" | "assistant"; content: string };

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

function modeBadge(mode: CompletionMode) {
  if (mode === "live") return { label: "Live · Claude", className: "bg-emerald-500/15 text-emerald-300" };
  return { label: "Free · Groq", className: "bg-sky-500/15 text-sky-300" };
}

export function DesignWorkbench({ feature }: { feature: Feature }) {
  const [input, setInput] = useState("");
  const [refine, setRefine] = useState("");
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [mode, setMode] = useState<CompletionMode | null>(null);
  const [provider, setProvider] = useState<LlmProviderId>("auto");
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [indexId, setIndexId] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/rag/indexes")
      .then((r) => r.json())
      .then((d) => setProjects(d.indexes ?? []))
      .catch(() => setProjects([]));
  }, []);

  function shortSource(s: string) {
    return s.replace(/\.git$/, "").split("/").slice(-2).join("/");
  }

  async function handleExportPdf() {
    if (!output.trim() || exportingPdf) return;
    setExportingPdf(true);
    setError("");
    try {
      await exportDesignPdf("Project Nova — System Design", output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function generate(kind: "initial" | "refine") {
    const requirements = kind === "initial" ? input : refine;
    if (!requirements.trim()) {
      setError(kind === "initial" ? "Please add some requirements first." : "Describe what to refine.");
      return;
    }
    if (kind === "refine" && !output) {
      setError("Generate a design before refining.");
      return;
    }

    setLoading(true);
    setError("");
    if (kind === "initial") {
      setOutput("");
      setMode(null);
      setHistory([]);
      setSources([]);
    }

    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: kind === "initial" ? requirements : input,
          refinement: kind === "refine" ? requirements : undefined,
          history: kind === "refine" ? history : undefined,
          provider,
          indexId: indexId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const nextHistory: ChatTurn[] =
        kind === "initial"
          ? [
              { role: "user", content: requirements },
              { role: "assistant", content: data.text },
            ]
          : [
              ...history,
              { role: "user", content: requirements },
              { role: "assistant", content: data.text },
            ];

      setHistory(nextHistory);
      setOutput(data.text);
      setMode(data.mode);
      setSources(data.sources ?? []);
      if (kind === "refine") setRefine("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setInput("");
    setRefine("");
    setOutput("");
    setHistory([]);
    setError("");
    setMode(null);
    setSources([]);
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
            {history.length > 0 && (
              <span className="text-xs text-zinc-500">
                {Math.floor(history.length / 2)} turn{history.length >= 4 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Project context:</span>
            <select
              value={indexId}
              onChange={(e) => setIndexId(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-amber-500/60"
            >
              <option value="">None — generic</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {shortSource(p.source)} ({p.chunkCount} chunks)
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <Link href="/chat" className="text-xs text-amber-400 hover:underline">
                Index a repo
              </Link>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={feature.placeholder}
            spellCheck={false}
            className="h-64 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-amber-500/60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void generate("initial")}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r ${feature.accent} px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
            >
              {loading && !output ? "Working…" : feature.cta}
            </button>
            <button
              onClick={clearAll}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5"
            >
              Clear
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>

          {output && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Refine the design
              </label>
              <textarea
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="e.g. Add Redis caching, prefer serverless, show sequence diagram…"
                spellCheck={false}
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 text-sm text-zinc-100 outline-none focus:border-amber-500/60"
              />
              <button
                onClick={() => void generate("refine")}
                disabled={loading || !refine.trim()}
                className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {loading ? "Refining…" : "Apply refinement"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium text-zinc-300">Result</label>
            <div className="flex flex-wrap items-center gap-2">
              {mode && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${modeBadge(mode).className}`}>
                  {modeBadge(mode).label}
                </span>
              )}
              {output && (
                <>
                  <button
                    onClick={() => downloadMarkdown(output)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/5"
                  >
                    Export Markdown
                  </button>
                  <button
                    onClick={() => void handleExportPdf()}
                    disabled={exportingPdf}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    {exportingPdf ? "Preparing PDF…" : "Export PDF"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            ref={resultRef}
            className="max-h-[36rem] min-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4"
          >
            {output ? (
              <Markdown content={output} />
            ) : (
              <p className="text-sm text-zinc-500">
                {loading ? "Asking Nova…" : "Architecture write-up and Mermaid diagram appear here."}
              </p>
            )}
          </div>
          {sources.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0d15] p-3">
              <p className="mb-1 text-xs font-medium text-zinc-400">Grounded in project context</p>
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
    </div>
  );
}
