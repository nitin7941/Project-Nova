"use client";

import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ProviderSelect } from "@/components/ProviderSelect";
import type { Feature } from "@/lib/features";
import type { CompletionMode, LlmProviderId } from "@/lib/claude";
import { scanLocalProject, type ScannedProject } from "@/lib/localProject";
import {
  DOC_SOURCES,
  DOC_TYPES,
  INTERVIEW_QUESTIONS,
  LANGUAGE_OPTIONS,
  downloadFilename,
  type DocSource,
  type DocType,
} from "@/lib/docsOptions";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-sky-500/60";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500";

function modeBadge(mode: CompletionMode) {
  if (mode === "live") return { label: "Live · Claude", className: "bg-emerald-500/15 text-emerald-300" };
  return { label: "Free · Groq", className: "bg-sky-500/15 text-sky-300" };
}

export function DocsWorkbench({ feature }: { feature: Feature }) {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState<DocType>("technical");
  const [source, setSource] = useState<DocSource>("codebase");

  const [code, setCode] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [projectTree, setProjectTree] = useState("");
  const [folderMeta, setFolderMeta] = useState<ScannedProject | null>(null);
  const [language, setLanguage] = useState("");

  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [sourcePath, setSourcePath] = useState("src");
  const [sourceUrl, setSourceUrl] = useState("");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customQuestion, setCustomQuestion] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [extraQuestions, setExtraQuestions] = useState<
    { id: string; label: string; placeholder: string }[]
  >([]);

  const [provider, setProvider] = useState<LlmProviderId>("auto");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<CompletionMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const interviewQuestions = [...INTERVIEW_QUESTIONS[docType], ...extraQuestions];

  const canGenerate =
    source === "interview"
      ? Object.values(answers).some((v) => v.trim())
      : Boolean(code.trim());

  function switchDocType(next: DocType) {
    setDocType(next);
    setAnswers({});
    setExtraQuestions([]);
    setCustomQuestion("");
    setCustomAnswer("");
    setError("");
  }

  function switchSource(next: DocSource) {
    setSource(next);
    setError("");
  }

  async function onSelectFolder(fileList: FileList | null) {
    if (!fileList?.length) return;
    setScanning(true);
    setError("");
    try {
      const scanned = await scanLocalProject(fileList);
      setFolderMeta(scanned);
      setCode(scanned.sourceBundle);
      setProjectTree(scanned.tree);
      setSourceLabel(`${scanned.rootName}/ (${scanned.files.length} source files)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan folder.");
      setFolderMeta(null);
      setCode("");
      setProjectTree("");
      setSourceLabel("");
    } finally {
      setScanning(false);
    }
  }

  async function loadFromGitHub() {
    const urlOrPath = sourceUrl.trim() || sourcePath.trim();
    if (!urlOrPath && !repo.trim()) {
      setError("Enter owner/repo and a folder path, or paste a GitHub tree URL.");
      return;
    }
    setFetching(true);
    setError("");
    try {
      const isFullUrl = /^https?:\/\//i.test(urlOrPath);
      const res = await fetch("/api/github/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: isFullUrl ? urlOrPath : undefined,
          repo: repo || undefined,
          path: isFullUrl ? undefined : urlOrPath || undefined,
          ref: isFullUrl ? undefined : branch || "main",
          token: githubToken || undefined,
          mode: "source",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub fetch failed");
      if (data.owner && data.repo) {
        setRepo(`${data.owner}/${data.repo}`);
      }
      if (data.ref) setBranch(data.ref);
      setCode(data.content);
      setProjectTree(data.tree || "");
      setFolderMeta(null);
      const label = data.htmlUrl || `${data.owner}/${data.repo}/${data.path}`;
      setSourceLabel(
        data.kind === "directory"
          ? `${label} · ${data.fileCount ?? "?"} source files`
          : `${label} (single file — prefer a folder path like src/)`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub fetch failed.");
    } finally {
      setFetching(false);
    }
  }

  function addCustomQuestion() {
    const label = customQuestion.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    setExtraQuestions((prev) => [
      ...prev,
      { id, label, placeholder: "Your answer…" },
    ]);
    if (customAnswer.trim()) {
      setAnswers((prev) => ({ ...prev, [id]: customAnswer.trim() }));
    }
    setCustomQuestion("");
    setCustomAnswer("");
  }

  async function generate() {
    if (source === "interview") {
      const labeled: Record<string, string> = {};
      for (const q of interviewQuestions) {
        const v = answers[q.id]?.trim();
        if (v) labeled[q.label] = v;
      }
      if (Object.keys(labeled).length === 0) {
        setError("Answer at least one interview question.");
        return;
      }
      await runGenerate({ answers: labeled });
      return;
    }

    if (!code.trim()) {
      setError(
        source === "github"
          ? "Load a GitHub folder first."
          : "Select a local project folder first.",
      );
      return;
    }
    await runGenerate({ code });
  }

  async function runGenerate(extra: { code?: string; answers?: Record<string, string> }) {
    setLoading(true);
    setError("");
    setOutput("");
    setMode(null);
    setCopied(false);
    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          source,
          code: extra.code,
          answers: extra.answers,
          language: language || undefined,
          sourceLabel: sourceLabel || undefined,
          projectTree: projectTree || undefined,
          repo: source === "github" ? repo || undefined : undefined,
          branch: source === "github" ? branch || undefined : undefined,
          provider,
        }),
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

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadOutput() {
    if (!output) return;
    const blob = new Blob([output + "\n"], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename(docType);
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setCode("");
    setSourceLabel("");
    setProjectTree("");
    setFolderMeta(null);
    setSourcePath("src");
    setSourceUrl("");
    setAnswers({});
    setExtraQuestions([]);
    setCustomQuestion("");
    setCustomAnswer("");
    setOutput("");
    setMode(null);
    setError("");
    setCopied(false);
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  const busy = loading || scanning || fetching;
  const selectedSource = DOC_SOURCES.find((s) => s.id === source)!;

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

      <section className="mb-4">
        <h2 className={labelClass}>Documentation type</h2>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchDocType(t.id)}
              className={`rounded-xl px-4 py-3 text-left transition ${
                docType === t.id
                  ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/40"
                  : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-1 text-[11px] leading-snug opacity-80">{t.summary}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h2 className={labelClass}>Where should we generate from?</h2>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {DOC_SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchSource(s.id)}
              className={`rounded-xl px-4 py-3 text-left transition ${
                source === s.id
                  ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/40"
                  : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="mt-1 text-[11px] leading-snug opacity-80">{s.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-200">
                Inputs · {selectedSource.label}
              </h2>
              {source !== "interview" && (
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-40 rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-sky-500/60"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.id || "auto"} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {source === "codebase" && (
              <div className="space-y-3">
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void onSelectFolder(e.target.files)}
                  {...({
                    webkitdirectory: "",
                    directory: "",
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                />
                <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-5 text-center">
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={scanning}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {scanning ? "Scanning folder…" : "Select project folder…"}
                  </button>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Reads the whole directory (skips node_modules/.git/dist). Builds docs from the
                    project structure and source files — not a single file.
                  </p>
                </div>

                {folderMeta && (
                  <div className="space-y-2 rounded-xl border border-white/5 bg-[#0d0d15] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-zinc-200">{folderMeta.rootName}/</span>
                      <span className="text-zinc-500">
                        {folderMeta.files.length} source files
                        {folderMeta.truncated ? " · truncated" : ""}
                        {folderMeta.skippedCount
                          ? ` · skipped ${folderMeta.skippedCount}`
                          : ""}
                      </span>
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] text-zinc-400">
                      {folderMeta.tree}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {source === "github" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>owner/repo</label>
                    <input
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      placeholder="acme/payments-api"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Branch</label>
                    <input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>PAT (private repos)</label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_…"
                      className={fieldClass}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Folder path or tree URL</label>
                  <input
                    value={sourcePath || sourceUrl}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^https?:\/\//i.test(v)) {
                        setSourceUrl(v);
                        setSourcePath("");
                      } else {
                        setSourcePath(v);
                        setSourceUrl("");
                      }
                    }}
                    placeholder="src  or  https://github.com/owner/repo/tree/main/src"
                    className={fieldClass}
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Prefer a directory (e.g. <code className="text-zinc-400">src</code> or{" "}
                    <code className="text-zinc-400">…/tree/main/src</code>) so Nova documents the
                    whole folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadFromGitHub()}
                    disabled={fetching}
                    className="mt-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 disabled:opacity-50"
                  >
                    {fetching ? "Loading folder…" : "Load folder from GitHub"}
                  </button>
                </div>
                {sourceLabel && (
                  <p className="text-[11px] text-sky-400/80">Loaded: {sourceLabel}</p>
                )}
                {projectTree && (
                  <pre className="max-h-40 overflow-auto rounded-lg border border-white/5 bg-[#0d0d15] p-2 font-mono text-[10px] text-zinc-400">
                    {projectTree}
                  </pre>
                )}
              </div>
            )}

            {source === "interview" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Answer the questions below. Nova will draft a unique{" "}
                  {DOC_TYPES.find((t) => t.id === docType)?.label.toLowerCase()} from your
                  answers — no code required.
                </p>
                {interviewQuestions.map((q) => (
                  <div key={q.id}>
                    <label className={labelClass}>{q.label}</label>
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder={q.placeholder}
                      className="h-20 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
                    />
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-white/15 bg-[#0d0d15] p-3">
                  <label className={labelClass}>Add a custom question (optional)</label>
                  <input
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="e.g. What tone should the docs use?"
                    className={`mb-2 ${fieldClass}`}
                  />
                  <textarea
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    placeholder="Optional answer to include when you add the question"
                    className="mb-2 h-16 w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0f] p-2 text-xs text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={addCustomQuestion}
                    disabled={!customQuestion.trim()}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Add question
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void generate()}
                disabled={busy || !canGenerate}
                className={`rounded-xl bg-gradient-to-r ${feature.accent} px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
              >
                {loading ? "Generating…" : feature.cta}
              </button>
              <button
                onClick={clearAll}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5"
              >
                Clear
              </button>
              {error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4 xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-300">Generated docs</label>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button
                    onClick={() => void copyOutput()}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={downloadOutput}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Download
                  </button>
                </>
              )}
              {mode && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${modeBadge(mode).className}`}
                >
                  {modeBadge(mode).label}
                </span>
              )}
            </div>
          </div>
          <div className="h-[32rem] overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4">
            {output ? (
              <Markdown content={output} />
            ) : (
              <p className="text-sm text-zinc-500">
                {busy
                  ? scanning
                    ? "Reading project folder…"
                    : fetching
                      ? "Loading GitHub folder…"
                      : "Generating documentation…"
                  : "Pick a doc type, select a local or GitHub folder (or interview), then generate."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
