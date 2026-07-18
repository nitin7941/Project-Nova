"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Feature } from "@/lib/features";

export function FeatureWorkbench({ feature }: { feature: Feature }) {
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"live" | "mock" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!input.trim()) {
      setError("Please add some input first.");
      return;
    }
    setLoading(true);
    setError("");
    setOutput("");
    setMode(null);
    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOutput(data.text);
      setMode(data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
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
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  mode === "live"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {mode === "live" ? "Live · Claude" : "Mock mode"}
              </span>
            )}
          </div>
          <div className="h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4">
            {output ? (
              <Markdown content={output} />
            ) : (
              <p className="text-sm text-zinc-500">
                {loading ? "Asking Nova…" : "Output will appear here."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
