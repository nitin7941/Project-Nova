"use client";

import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

interface Source {
  file: string;
  startLine: number;
  endLine: number;
  score: number;
}

interface IndexSummary {
  id: string;
  source: string;
  fileCount: number;
  chunkCount: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: "live" | "mock";
}

export default function ChatPage() {
  const [source, setSource] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [index, setIndex] = useState<IndexSummary | null>(null);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  async function indexRepo() {
    if (!source.trim()) {
      setError("Enter a Git URL or a local folder path.");
      return;
    }
    setIndexing(true);
    setError("");
    setIndex(null);
    setMessages([]);
    try {
      const res = await fetch("/api/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Indexing failed");
      setIndex(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indexing failed.");
    } finally {
      setIndexing(false);
    }
  }

  async function ask() {
    if (!index || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setAsking(true);
    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexId: index.id, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources, mode: data.mode },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "failed"}` },
      ]);
    } finally {
      setAsking(false);
      requestAnimationFrame(() => threadRef.current?.scrollTo(0, threadRef.current.scrollHeight));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl">
          🧠
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat with your Codebase</h1>
          <p className="text-zinc-400">
            Index a Git repo or local folder, then ask questions grounded in the real code (RAG).
          </p>
        </div>
      </div>

      {/* Step 1: index */}
      <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          1. Index a codebase — Git URL or local folder path
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !indexing && indexRepo()}
            placeholder="https://github.com/owner/repo.git  or  /var/www/html/5.0/project-nova"
            className="flex-1 rounded-xl border border-white/10 bg-[#0d0d15] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/60"
          />
          <button
            onClick={indexRepo}
            disabled={indexing}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {indexing ? "Indexing…" : "Index"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {index && (
          <p className="mt-3 text-sm text-emerald-300">
            Indexed <span className="font-mono">{index.source}</span> — {index.fileCount} files,{" "}
            {index.chunkCount} chunks. Ask away below.
          </p>
        )}
        {indexing && (
          <p className="mt-2 text-xs text-zinc-500">
            First run downloads the local embedding model (~90MB); subsequent runs are fast.
          </p>
        )}
      </section>

      {/* Step 2: chat */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-[#12121b] p-4">
        <label className="mb-3 block text-sm font-medium text-zinc-300">2. Ask questions</label>
        <div
          ref={threadRef}
          className="mb-3 h-96 space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4"
        >
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">
              {index
                ? "Try: “What does this project do?” or “Where is authentication handled?”"
                : "Index a codebase first, then your conversation appears here."}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block max-w-[90%] rounded-2xl px-4 py-2 text-left text-sm ${
                  m.role === "user"
                    ? "bg-violet-600/25 text-violet-50"
                    : "bg-white/5 text-zinc-200"
                }`}
              >
                {m.role === "assistant" ? <Markdown content={m.content} /> : m.content}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <p className="mb-1 text-xs font-medium text-zinc-400">Sources</p>
                    <ul className="space-y-0.5">
                      {m.sources.map((s, j) => (
                        <li key={j} className="font-mono text-xs text-zinc-500">
                          {s.file}:{s.startLine}-{s.endLine}{" "}
                          <span className="text-zinc-600">({s.score.toFixed(2)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {asking && <p className="text-sm text-zinc-500">Nova is reading the code…</p>}
        </div>
        <div className="flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !asking && ask()}
            disabled={!index || asking}
            placeholder={index ? "Ask about the codebase…" : "Index a codebase first"}
            className="flex-1 rounded-xl border border-white/10 bg-[#0d0d15] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/60 disabled:opacity-50"
          />
          <button
            onClick={ask}
            disabled={!index || asking || !question.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </section>
    </div>
  );
}
