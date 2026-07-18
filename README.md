# ✦ Project Nova

**An AI-powered developer productivity platform that accelerates the software lifecycle.**

Project Nova assists engineers end-to-end: it reviews code, flags bugs & security
issues, generates unit tests and documentation, and turns requirements into system
designs. Built with **Next.js + TypeScript** and powered by **Anthropic Claude**.

> Add a free **Groq** key (or Anthropic for Claude). Choose the provider in each feature UI.

---

## ✨ Why Nova? (and how it's *not* just Copilot)

Copilot and raw Claude make an **individual developer** faster at **writing a line of code**.
Nova makes a **team** faster and safer across the **whole lifecycle**. The moat isn't any
single feature — it's four things a per-file IDE assistant structurally doesn't do:

1. **Grounded in *your* repo, everywhere.** Every feature — review, tests, docs, design —
   can pull **project context** from an indexed codebase (RAG) and cite `file:line`.
2. **A team platform, not a personal assistant.** Role-based access, one shared index, and
   **standards-as-code** in `src/lib/prompts.ts` (change once → applies to everyone).
3. **Traceability + drift.** Link requirement → design → review → tests → docs; when upstream
   changes, Nova flags downstream artifacts as **stale**. (Chat stays discovery, not a graph node.)
4. **Provenance & data control.** Cited sources; local embeddings; only retrieved snippets
   reach the LLM; provider-flexible and self-hostable.

> **Pitch line:** *"We're not competing with autocomplete. Nova is the governance and
> continuity layer on top of it — it remembers the project, links requirements to design to
> tests to docs, enforces our standards, cites its sources, and flags drift."*

**Presentable USP + full competitor table:** [USP.md](USP.md)  
**New engineer onboarding:** [ONBOARDING.md](ONBOARDING.md)

### Nova vs other AI platforms (summary)

| Capability | Nova | Copilot | Cursor | Claude Code | Cody | ChatGPT / Claude |
| ---------- | :--: | :-----: | :----: | :---------: | :--: | :--------------: |
| Repo RAG / repo-aware Q&A | Yes | Partial | Yes | Yes | Yes | Partial |
| Grounded review / tests / docs / design | Yes | — | Partial | Partial | Partial | — |
| Requirements → architecture design | Yes | — | Partial | Partial | — | Partial |
| Artifact traceability graph | **Yes** | — | — | — | — | — |
| Drift / staleness detection | **Yes** | — | — | — | — | — |
| Team standards + RBAC (product focus) | **Yes** | Org IAM | Org IAM | Partial | Org IAM | — |
| Local embeddings / self-host web app | **Yes** | — | — | — | Enterprise | — |
| Agentic code edits (IDE/CLI) | —* | Partial | **Yes** | **Yes** | Partial | — |

\*By design — Nova is a **lifecycle web platform**, not an IDE/CLI coding agent.  
Claude Code = implement changes; Nova = govern + trace the lifecycle. Full table → [USP.md](USP.md).

---

## 🚀 Quick start

```bash
cd project-nova
npm install
cp .env.example .env.local   # add GROQ_API_KEY and/or ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

### Environment

| Variable            | Required | Description |
| ------------------- | -------- | ----------- |
| `GROQ_API_KEY`      | Recommended | Free-tier LLM. Get one at [console.groq.com/keys](https://console.groq.com/keys). |
| `GROQ_MODEL`        | No       | Override Groq model (default `llama-3.3-70b-versatile`). |
| `ANTHROPIC_API_KEY` | No       | Live Claude when you want Anthropic. |
| `ANTHROPIC_MODEL`   | No       | Override Claude model (default `claude-3-5-sonnet-latest`). |

**LLM picker:** Auto / Groq (Free) / Anthropic (Claude).  
**Auto order:** Groq → Anthropic (requires at least one key).

---

## 🧩 Features (each is an independent module)

| Module                     | Page       | API route           | What it does                                          |
| -------------------------- | ---------- | ------------------- | ----------------------------------------------------- |
| 🧠 Chat with your Codebase | `/chat`    | `/api/rag/*`        | Index a Git repo/folder, ask questions grounded in real code (RAG). |
| 🔍 AI Code Review          | `/review`  | `/api/review`       | Bugs, security, performance, and style findings.      |
| 🧪 Unit Test Generator     | `/tests`   | `/api/tests`        | Idiomatic test suite with edge cases.                 |
| 📚 Docs & API Generator    | `/docs`    | `/api/docs`         | Clean developer/API documentation from code.          |
| 🏗️ Requirements → Design   | `/design`  | `/api/design`       | System design + Mermaid diagram from requirements.    |
| 🕸️ Traceability & Drift    | `/trace`   | `/api/trace/*`      | Link req → design → review → tests → docs; flag stale. |

### Architecture at a glance

```
Browser ──> Next.js page ──> /api/<feature> route ──> lib/claude.ts ──> Claude (or mock)
                                         └── prompts live in lib/prompts.ts
```

- `src/lib/claude.ts` — single Claude client + automatic mock fallback.
- `src/lib/prompts.ts` — system prompt + mock output per module (tune behaviour here).
- `src/lib/features.ts` — feature registry (name, route, owner) driving nav + dashboard.
- `src/components/FeatureWorkbench.tsx` — shared input/output UI reused by every page.
- `src/lib/rag/` — RAG pipeline: `ingest` (git clone / local walk) → `chunk` → `embeddings`
  (local transformers.js, no key) → `store` (in-memory + on-disk vector search).

---

## 👥 Team assignments — 3 members

The scaffold is live and every module is isolated, so we can work in parallel.
Each stream has its own branch (already pushed). Work on your branch, open a PR into `main`.

### 👤 Member 1 — Nitin (Lead · Code Review + Platform)
**Branches:** `feat/review`, `feat/rag`, `feat/traceability`
- [x] 🔍 **Code Review** (`/review`): GitHub URL loader + sharper review prompt.
- [x] 🧠 **RAG "chat with your codebase"** — index a repo, vector search, context-aware answers.
- [x] Platform: auth + RBAC, streaming, shared project context.
- [x] 🕸️ **Traceability & drift** (`/trace`) — artifact graph + staleness detection.

### 👤 Vishal — Quality & Docs
**Branches:** `feat/tests`, `feat/docs`
- [ ] 🧪 **Test Generator** (`/tests`): framework selector (Jest / Vitest / pytest / JUnit), copy + download tests, stretch: run tests in a sandbox.
- [ ] 📚 **Docs Generator** (`/docs`): OpenAPI/Swagger output for HTTP APIs, Markdown export/copy button.

### 👤 Sahil — Design & UX
**Branches:** `feat/design`, `feat/ux`
- [x] 🏗️ **Requirements → Design** (`/design`): render the Mermaid diagram visually (add `mermaid` client-side), export to Markdown/PDF, stretch: multi-turn refinement.
- [ ] 🎨 **UX polish** (`feat/ux`): dashboard/landing polish, loading/streaming states, run history, mobile nav.

> **Convention:** work on your feature branch, keep prompts in `src/lib/prompts.ts`,
> reuse UI via `FeatureWorkbench`, then open a PR into `main`. Rebase on `main` often.

---

## 🛠️ Tech stack

- **Next.js (App Router) + TypeScript** — one codebase, API routes + UI.
- **Tailwind CSS v4** — styling.
- **@anthropic-ai/sdk** — Claude integration.

## 📜 Scripts

| Command         | Description               |
| --------------- | ------------------------- |
| `npm run dev`   | Start the dev server.     |
| `npm run build` | Production build.         |
| `npm run start` | Serve the production build.|
| `npm run lint`  | Lint the codebase.        |
