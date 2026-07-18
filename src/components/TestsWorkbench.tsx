"use client";

import { useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Feature } from "@/lib/features";
import { scanLocalProject, type ScannedProject } from "@/lib/localProject";
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
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [projectMode, setProjectMode] = useState<ProjectMode>("existing");
  const [inputMethod, setInputMethod] = useState<InputMethod>("folder");

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
  const [projectTree, setProjectTree] = useState("");
  const [folderMeta, setFolderMeta] = useState<ScannedProject | null>(null);
  const [requirementsInferred, setRequirementsInferred] = useState(true);

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
  const [scanning, setScanning] = useState(false);
  const [fetching, setFetching] = useState<"req" | "source" | "both" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const availableMethods = useMemo(
    () =>
      INPUT_METHODS.filter((m) => projectMode === "existing" || !m.existingOnly),
    [projectMode],
  );

  const prerequisites =
    projectMode === "existing" ? EXISTING_PREREQUISITES : NEW_PREREQUISITES;

  const canGenerate =
    projectMode === "new"
      ? Boolean(requirements.trim())
      : Boolean(code.trim());

  const canValidate =
    projectMode === "existing" && Boolean(code.trim()) && Boolean(output.trim());

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
      if (scanned.requirements) {
        setRequirements(scanned.requirements);
        setReqLabel(scanned.requirementsPath || "requirements");
        setRequirementsInferred(false);
      } else {
        setRequirements("");
        setReqLabel("");
        setRequirementsInferred(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to scan folder.");
      setFolderMeta(null);
    } finally {
      setScanning(false);
    }
  }

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
        setRequirementsInferred(false);
      } else {
        setCode(data.content);
        setSourceLabel(label);
        setProjectTree("");
        setFolderMeta(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub fetch failed.");
    } finally {
      setFetching(null);
    }
  }

  async function generate() {
    if (projectMode === "new" && !requirements.trim()) {
      setError("New project mode needs requirements.");
      return;
    }
    if (projectMode === "existing" && !code.trim()) {
      setError("Select a local folder or provide source code first.");
      return;
    }
    const infer = projectMode === "existing" && !requirements.trim();
    setLoading(true);
    setError("");
    setOutput("");
    setValidation("");
    setMode(null);
    setValidationMode(null);
    setResultTab("generated");
    setCopied(false);
    setRequirementsInferred(infer);
    try {
      const res = await fetch(feature.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectMode,
          requirements: requirements || undefined,
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
          projectTree: projectTree || undefined,
          requirementsInferred: infer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOutput(data.text);
      setMode(data.mode);
      if (typeof data.requirementsInferred === "boolean") {
        setRequirementsInferred(data.requirementsInferred);
      }
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
          requirements: requirements || undefined,
          code,
          tests: output,
          repo: inputMethod === "github" ? repo || undefined : undefined,
          branch: inputMethod === "github" ? branch || undefined : undefined,
          sourceLabel: sourceLabel || undefined,
          framework,
          projectTree: projectTree || undefined,
          requirementsInferred: !requirements.trim() || requirementsInferred,
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
    setProjectTree("");
    setFolderMeta(null);
    setRequirementsInferred(true);
    setOutput("");
    setValidation("");
    setError("");
    setMode(null);
    setValidationMode(null);
    setCopied(false);
    setEntryPoint("");
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  function switchProjectMode(next: ProjectMode) {
    setProjectMode(next);
    setValidation("");
    setValidationMode(null);
    setResultTab("generated");
    setError("");
    setInputMethod(next === "existing" ? "folder" : "github");
  }

  const activeText = resultTab === "validation" ? validation : output;
  const activeMode = resultTab === "validation" ? validationMode : mode;
  const busy = loading || validating || scanning || fetching !== null;
  const selectedMethod =
    availableMethods.find((m) => m.id === inputMethod) || availableMethods[0];

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
            Existing project: Local folder or GitHub. Requirements optional (inferred from code if
            missing). New project: provide requirements, then generate test cases.
          </p>
        </div>
      </div>

      <section className="mb-4">
        <h2 className={labelClass}>Project type</h2>
        <div className="mt-1 flex flex-wrap gap-2">
          {PROJECT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchProjectMode(m.id)}
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

      <section className="mb-4">
        <h2 className={labelClass}>How do you want to provide inputs?</h2>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {availableMethods.map((m) => (
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
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#12121b] p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-200">
              Inputs · {selectedMethod.label}
            </h2>

            {inputMethod === "folder" && projectMode === "existing" && (
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
                <div className="rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={scanning}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {scanning ? "Scanning folder…" : "Select project folder…"}
                  </button>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Skips node_modules/.git/dist. Uses requirements.md if found; otherwise infers
                    from code.
                  </p>
                </div>

                {folderMeta && (
                  <div className="space-y-2 rounded-xl border border-white/5 bg-[#0d0d15] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-zinc-200">{folderMeta.rootName}</span>
                      <span className="text-zinc-500">
                        {folderMeta.files.length} source files
                        {folderMeta.truncated ? " · truncated" : ""}
                        {folderMeta.skippedCount
                          ? ` · skipped ${folderMeta.skippedCount}`
                          : ""}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          folderMeta.requirementsInferred
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {folderMeta.requirementsInferred
                          ? "No requirements file · will infer"
                          : `Requirements: ${folderMeta.requirementsPath}`}
                      </span>
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] text-zinc-400">
                      {folderMeta.tree}
                    </pre>
                    {!folderMeta.requirementsInferred && (
                      <details className="text-xs text-zinc-400">
                        <summary className="cursor-pointer text-zinc-300">
                          Edit detected requirements
                        </summary>
                        <textarea
                          value={requirements}
                          onChange={(e) => {
                            setRequirements(e.target.value);
                            setRequirementsInferred(!e.target.value.trim());
                          }}
                          className="mt-2 h-28 w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0f] p-2 font-mono text-xs text-zinc-200"
                        />
                      </details>
                    )}
                    {folderMeta.requirementsInferred && (
                      <div>
                        <label className={labelClass}>
                          Optional requirements (leave empty to auto-infer)
                        </label>
                        <textarea
                          value={requirements}
                          onChange={(e) => {
                            setRequirements(e.target.value);
                            setRequirementsInferred(!e.target.value.trim());
                          }}
                          placeholder="Optional: add acceptance criteria…"
                          className="h-24 w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0f] p-2 font-mono text-xs text-zinc-200"
                        />
                      </div>
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
                    <label className={labelClass}>
                      Requirements path {projectMode === "existing" ? "(optional)" : ""}
                    </label>
                    <input
                      value={reqPath}
                      onChange={(e) => setReqPath(e.target.value)}
                      placeholder="docs/requirements.md"
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      onClick={() => void loadGitHubFile("req")}
                      disabled={fetching !== null}
                      className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Load requirements
                    </button>
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
                      <button
                        type="button"
                        onClick={() => void loadGitHubFile("source")}
                        disabled={fetching !== null}
                        className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                      >
                        Load source
                      </button>
                    </div>
                  )}
                </div>
                {(reqLabel || sourceLabel) && (
                  <div className="space-y-1 text-[11px] text-emerald-400/80">
                    {reqLabel && <p>Requirements: {reqLabel}</p>}
                    {sourceLabel && <p>Source: {sourceLabel}</p>}
                  </div>
                )}
                <div>
                  <label className={labelClass}>
                    Requirements{" "}
                    {projectMode === "existing" ? "(optional — inferred if empty)" : ""}
                  </label>
                  <textarea
                    value={requirements}
                    onChange={(e) => {
                      setRequirements(e.target.value);
                      setRequirementsInferred(
                        projectMode === "existing" && !e.target.value.trim(),
                      );
                    }}
                    placeholder={
                      projectMode === "existing"
                        ? "Optional — leave empty to infer from source…"
                        : "Requirements for the new system (or load from GitHub above)…"
                    }
                    spellCheck={false}
                    className="h-36 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
                  />
                </div>
                {projectMode === "existing" && code && (
                  <div>
                    <label className={labelClass}>Loaded source preview</label>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-36 w-full resize-none rounded-xl border border-white/10 bg-[#0d0d15] p-3 font-mono text-xs text-zinc-100 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

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
              {projectMode === "existing" && canGenerate && (
                <span className="text-[11px] text-zinc-500">
                  {requirements.trim()
                    ? "Using provided requirements"
                    : "Will auto-infer requirements from source"}
                </span>
              )}
              {error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </section>
        </div>

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
                  ? scanning
                    ? "Reading project folder…"
                    : validating
                      ? "Validating tests…"
                      : "Generating…"
                  : projectMode === "existing"
                    ? "Select a local folder or GitHub source, then Generate unit tests → Validate tests."
                    : "Load or enter requirements (GitHub), then Generate test cases."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
