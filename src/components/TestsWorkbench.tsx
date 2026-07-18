"use client";

import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Feature } from "@/lib/features";
import {
  TEST_FRAMEWORK_OPTIONS,
  downloadMeta,
  extractCodeBlock,
  type TestFramework,
} from "@/lib/testFrameworks";
import {
  COVERAGE_FOCI,
  EXISTING_PREREQUISITES,
  INPUT_METHODS,
  LANGUAGE_OPTIONS,
  NEW_PREREQUISITES,
  PROJECT_MODES,
  TEST_STYLES,
  type CoverageFocus,
  type InputMethod,
  type ProjectMode,
  type TestStyle,
} from "@/lib/testOptions";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-[#0d0d15] px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/60";
const labelClass = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500";

type ResultTab = "generated" | "validation";

export function TestsWorkbench({ feature }: { feature: Feature }) {
  const reqFileRef = useRef<HTMLInputElement>(null);
  const sourceFileRef = useRef<HTMLInputElement>(null);

  const [projectMode, setProjectMode] = useState<ProjectMode>("existing");
  const [inputMethod, setInputMethod] = useState<InputMethod>("paste");

  // GitHub fields (shown only when inputMethod === "github")
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [reqPath, setReqPath] = useState("docs/requirements.md");
  const [reqUrl, setReqUrl] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [requirements, setRequirements] = useState("");
  const [reqLabel, setReqLabel] = useState("");
  const [code, setCode] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");

  const [framework, setFramework] = useState<TestFramework>("jest");
  const [language, setLanguage] = useState("");
  const [coverageFocus, setCoverageFocus] = useState<CoverageFocus>("balanced");
  const [testStyle, setTestStyle] = useState<TestStyle>("unit");
  const [entryPoint, setEntryPoint] = useState("");
  const [mockDependencies, setMockDependencies] = useState(true);

  const [output, setOutput] = useState("");
  const [validation, setValidation] = useState("");
  const [resultTab, setResultTab] = useState<ResultTab>("generated");
  const [mode, setMode] = useState<"live" | "mock" | null>(null);
  const [validationMode, setValidationMode] = useState<"live" | "mock" | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fetching, setFetching] = useState<"req" | "source" | "both" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const prerequisites =
    projectMode === "existing" ? EXISTING_PREREQUISITES : NEW_PREREQUISITES;

  const canGenerate =
    Boolean(requirements.trim()) &&
    (projectMode === "new" || Boolean(code.trim()));

  const canValidate =
    projectMode === "existing" &&
    Boolean(requirements.trim()) &&
    Boolean(code.trim()) &&
    Boolean(output.trim());

  async function loadGitHubFile(kind: "req" | "source") {
    setFetching(kind);
    setError("");
    try {
      const url = kind === "req" ? reqUrl : sourceUrl;
      const path = kind === "req" ? reqPath : sourcePath;
      const res = await fetch("/api/github/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || undefined,
          repo: repo || undefined,
          path: path || undefined,
          ref: branch || "main",
          token: githubToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub fetch failed");
      const label = data.htmlUrl || `${data.owner}/${data.repo}/${data.path}`;
      if (kind === "req") {
        setRequirements(data.content);
        setReqLabel(label);
      } else {
        setCode(data.content);
        setSourceLabel(label);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub fetch failed.");
    } finally {
      setFetching(null);
    }
  }

  async function loadAllFromGitHub() {
    setFetching("both");
    setError("");
    try {
      await loadGitHubFile("req");
      if (projectMode === "existing") {
        await loadGitHubFile("source");
      }
    } finally {
      setFetching(null);
    }
  }

  function onUpload(kind: "req" | "source", file: File | null) {
    if (!file) return;
    if (file.size > 200_000) {
      setError("File is too large (max ~200KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      if (kind === "req") {
        setRequirements(text);
        setReqLabel(file.name);
      } else {
        setCode(text);
        setSourceLabel(file.name);
      }
      setError("");
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  async function generate() {
    if (!requirements.trim()) {
      setError("Add requirements first (via your chosen input option).");
      return;
    }
    if (projectMode === "existing" && !code.trim()) {
      setError("Existing project needs source code under test.");
      return;
    }
    setLoading(true);
    setError("");
    setOutput("");
    setValidation("");
    setMode(null);
    setValidationMode(null);
    setResultTab("generated");
    setCopied(false);
    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectMode,
          requirements,
          code: projectMode === "existing" ? code : undefined,
          language,
          framework,
          coverageFocus,
          testStyle,
          entryPoint,
          mockDependencies,
          repo: inputMethod === "github" ? repo || undefined : undefined,
          branch: inputMethod === "github" ? branch || undefined : undefined,
          sourceLabel: sourceLabel || undefined,
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

  async function validateSuite() {
    if (!canValidate) {
      setError("Generate unit tests first, then validate.");
      return;
    }
    setValidating(true);
    setError("");
    setValidation("");
    setValidationMode(null);
    setResultTab("validation");
    try {
      const res = await fetch("/api/tests/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements,
          code,
          tests: output,
          repo: inputMethod === "github" ? repo || undefined : undefined,
          branch: inputMethod === "github" ? branch || undefined : undefined,
          sourceLabel: sourceLabel || undefined,
          framework,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setValidation(data.text);
      setValidationMode(data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed.");
    } finally {
      setValidating(false);
    }
  }

  async function copyActive() {
    const text = resultTab === "validation" ? validation : output;
    if (!text) return;
    const payload =
      resultTab === "generated" && projectMode === "existing"
        ? extractCodeBlock(text)
        : text;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadActive() {
    const text = resultTab === "validation" ? validation : output;
    if (!text) return;
    if (resultTab === "validation" || projectMode === "new") {
      const blob = new Blob([text + "\n"], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resultTab === "validation" ? "test-validation.md" : "test-cases.md";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const codeOut = extractCodeBlock(text);
    const { filename, mime } = downloadMeta(framework);
    const blob = new Blob([codeOut + "\n"], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setRequirements("");
    setReqLabel("");
    setReqUrl("");
    setCode("");
    setSourceLabel("");
    setSourceUrl("");
    setSourcePath("");
    setOutput("");
    setValidation("");
    setError("");
    setMode(null);
    setValidationMode(null);
    setCopied(false);
    setEntryPoint("");
    if (reqFileRef.current) reqFileRef.current.value = "";
    if (sourceFileRef.current) sourceFileRef.current.value = "";
  }

  const activeText = resultTab === "validation" ? validation : output;
  const activeMode = resultTab === "validation" ? validationMode : mode;
  const busy = loading || validating || fetching !== null;
  const selectedMethod = INPUT_METHODS.find((m) => m.id === inputMethod)!;

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
          <p className="text-zinc-400">
            Choose project type and how you provide inputs, then generate and validate unit tests.
          </p>
        </div>
      </div>

      {/* 1. Project type */}
      <section className="mb-4">
        <h2 className={labelClass}>Project type</h2>
        <div className="mt-1 flex flex-wrap gap-2">
          {PROJECT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setProjectMode(m.id);
                setValidation("");
                setValidationMode(null);
                setResultTab("generated");
                setError("");
              }}
              className={`rounded-xl px-4 py-2.5 text-left text-sm transition ${
                projectMode === m.id
                  ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
                  : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <div className="font-semibold">{m.label}</div>
              <div className="mt-0.5 max-w-xs text-[11px] opacity-80">{m.summary}</div>
            </button>
          ))}
        </div>
      </section>

      {/* What you need (no input-method steps) */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-[#12121b] p-4">
        <h2 className="text-sm font-semibold text-zinc-200">What you need</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {prerequisites.map((p) => (
            <li key={p.id} className="rounded-xl border border-white/5 bg-[#0d0d15] px-3 py-2.5">
              <div className="text-xs font-medium text-zinc-200">{p.label}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{p.detail}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Input method choice */}
      <section className="mb-4">
        <h2 className={labelClass}>How do you want to provide inputs?</h2>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {INPUT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setInputMethod(m.id);
                setError("");
              }}
              className={`rounded-xl px-4 py-3 text-left transition ${
                inputMethod === m.id
                  ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/40"
                  : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="mt-1 text-[11px] leading-snug opacity-80">{m.hint}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">{selectedMethod.hint}</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {/* Dynamic input UI based on chosen option */}
          <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-200">
              Inputs · {selectedMethod.label}
            </h2>

            {inputMethod === "paste" && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Requirements</label>
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Paste feature requirements / acceptance criteria…"
                    spellCheck={false}
                    className="h-36 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
                  />
                </div>
                {projectMode === "existing" && (
                  <div>
                    <label className={labelClass}>Source under test</label>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="// Paste the existing module to unit-test…"
                      spellCheck={false}
                      className="h-44 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
                    />
                  </div>
                )}
              </div>
            )}

            {inputMethod === "upload" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-white/15 bg-[#0d0d15] p-4">
                  <label className={labelClass}>Requirements file</label>
                  <input
                    ref={reqFileRef}
                    type="file"
                    accept=".md,.txt,.json,.yml,.yaml"
                    className="hidden"
                    onChange={(e) => onUpload("req", e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => reqFileRef.current?.click()}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Choose requirements file…
                  </button>
                  {reqLabel && (
                    <p className="mt-2 text-[11px] text-emerald-400/80">Loaded: {reqLabel}</p>
                  )}
                  {requirements && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {requirements.split("\n").length} lines ready
                    </p>
                  )}
                </div>
                {projectMode === "existing" && (
                  <div className="rounded-xl border border-dashed border-white/15 bg-[#0d0d15] p-4">
                    <label className={labelClass}>Source file</label>
                    <input
                      ref={sourceFileRef}
                      type="file"
                      accept=".ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.java,.go,.rs,.kt,.cs,.txt"
                      className="hidden"
                      onChange={(e) => onUpload("source", e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => sourceFileRef.current?.click()}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
                    >
                      Choose source file…
                    </button>
                    {sourceLabel && (
                      <p className="mt-2 text-[11px] text-emerald-400/80">Loaded: {sourceLabel}</p>
                    )}
                    {code && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {code.split("\n").length} lines ready
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {inputMethod === "github" && (
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Requirements path</label>
                    <input
                      value={reqPath}
                      onChange={(e) => setReqPath(e.target.value)}
                      placeholder="docs/requirements.md"
                      className={fieldClass}
                    />
                    <label className={`${labelClass} mt-2`}>Or requirements file URL</label>
                    <input
                      value={reqUrl}
                      onChange={(e) => setReqUrl(e.target.value)}
                      placeholder="https://github.com/…/blob/…/requirements.md"
                      className={fieldClass}
                    />
                  </div>
                  {projectMode === "existing" && (
                    <div>
                      <label className={labelClass}>Source path</label>
                      <input
                        value={sourcePath}
                        onChange={(e) => setSourcePath(e.target.value)}
                        placeholder="src/services/billing.ts"
                        className={fieldClass}
                      />
                      <label className={`${labelClass} mt-2`}>Or source file URL</label>
                      <input
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://github.com/…/blob/…/src/…"
                        className={fieldClass}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadAllFromGitHub()}
                    disabled={fetching !== null}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    {fetching === "both" || fetching
                      ? "Loading from GitHub…"
                      : projectMode === "existing"
                        ? "Load requirements + source"
                        : "Load requirements"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadGitHubFile("req")}
                    disabled={fetching !== null}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Load requirements only
                  </button>
                  {projectMode === "existing" && (
                    <button
                      type="button"
                      onClick={() => void loadGitHubFile("source")}
                      disabled={fetching !== null}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Load source only
                    </button>
                  )}
                </div>
                {(reqLabel || sourceLabel) && (
                  <div className="space-y-1 text-[11px] text-emerald-400/80">
                    {reqLabel && <p>Requirements: {reqLabel}</p>}
                    {sourceLabel && <p>Source: {sourceLabel}</p>}
                  </div>
                )}
                {(requirements || code) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {requirements && (
                      <div>
                        <label className={labelClass}>Requirements preview</label>
                        <textarea
                          value={requirements}
                          onChange={(e) => setRequirements(e.target.value)}
                          className="h-28 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-2 font-mono text-xs text-zinc-100 outline-none"
                        />
                      </div>
                    )}
                    {projectMode === "existing" && code && (
                      <div>
                        <label className={labelClass}>Source preview</label>
                        <textarea
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="h-28 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-2 font-mono text-xs text-zinc-100 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Framework options + primary actions */}
          <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-200">Test options</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Framework</label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as TestFramework)}
                  className={fieldClass}
                >
                  {TEST_FRAMEWORK_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={fieldClass}
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.id || "auto"} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Coverage focus</label>
                <select
                  value={coverageFocus}
                  onChange={(e) => setCoverageFocus(e.target.value as CoverageFocus)}
                  className={fieldClass}
                >
                  {COVERAGE_FOCI.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Test style</label>
                <select
                  value={testStyle}
                  onChange={(e) => setTestStyle(e.target.value as TestStyle)}
                  className={fieldClass}
                >
                  {TEST_STYLES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {projectMode === "existing" && (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Entry point (optional)</label>
                    <input
                      value={entryPoint}
                      onChange={(e) => setEntryPoint(e.target.value)}
                      placeholder="e.g. calculateTotal"
                      className={fieldClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={mockDependencies}
                        onChange={(e) => setMockDependencies(e.target.checked)}
                        className="rounded border-white/20 bg-[#0d0d15]"
                      />
                      Mock external dependencies
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
              <button
                onClick={generate}
                disabled={busy || !canGenerate}
                className={`rounded-xl bg-gradient-to-r ${feature.accent} px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
              >
                {loading
                  ? "Generating…"
                  : projectMode === "existing"
                    ? "Generate unit tests"
                    : "Generate test cases"}
              </button>
              {projectMode === "existing" && (
                <button
                  onClick={validateSuite}
                  disabled={busy || !canValidate}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {validating ? "Validating…" : "Validate tests"}
                </button>
              )}
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

        {/* Results */}
        <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4 xl:sticky xl:top-20 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setResultTab("generated")}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  resultTab === "generated"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {projectMode === "existing" ? "Generated tests" : "Test cases"}
              </button>
              {projectMode === "existing" && (
                <button
                  type="button"
                  onClick={() => setResultTab("validation")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    resultTab === "validation"
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Validation
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeText && (
                <>
                  <button
                    onClick={copyActive}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={downloadActive}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Download
                  </button>
                </>
              )}
              {activeMode && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    activeMode === "live"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {activeMode === "live" ? "Live · Claude" : "Mock mode"}
                </span>
              )}
            </div>
          </div>
          <div className="h-[32rem] overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4">
            {activeText ? (
              <Markdown content={activeText} />
            ) : (
              <p className="text-sm text-zinc-500">
                {busy
                  ? validating
                    ? "Validating tests…"
                    : loading
                      ? "Generating…"
                      : "Loading inputs…"
                  : projectMode === "existing"
                    ? "Pick an input option, provide requirements + source, then Generate unit tests → Validate tests."
                    : "Pick an input option, provide requirements, then Generate test cases."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
