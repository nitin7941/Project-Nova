# ✦ Project Nova

**An AI-powered developer productivity platform that accelerates the software lifecycle.**

Project Nova assists engineers end-to-end: it reviews code, flags bugs & security
issues, generates unit tests and documentation, and turns requirements into system
designs. Built with **Next.js + TypeScript** and powered by **Anthropic Claude**.

> Runs in **mock mode** with zero setup, so the demo always works. Add an API key to go live.

---

## 🚀 Quick start

```bash
cd project-nova
npm install
cp .env.example .env.local   # optional: add your Anthropic key
npm run dev                  # http://localhost:3000
```

### Environment

| Variable            | Required | Description                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | No\*     | Enables live Claude responses. Without it, the app runs in mock mode. |
| `ANTHROPIC_MODEL`   | No       | Override the model (default `claude-3-5-sonnet-latest`).           |

\*Not required for the demo — every feature returns a realistic mock when the key is absent.

---

## 🧩 Features (each is an independent module)

| Module                     | Page       | API route      | What it does                                          |
| -------------------------- | ---------- | -------------- | ----------------------------------------------------- |
| 🔍 AI Code Review          | `/review`  | `/api/review`  | Bugs, security, performance, and style findings.      |
| 🧪 Unit Test Generator     | `/tests`   | `/api/tests`   | Idiomatic test suite with edge cases.                 |
| 📚 Docs & API Generator    | `/docs`    | `/api/docs`    | Clean developer/API documentation from code.          |
| 🏗️ Requirements → Design   | `/design`  | `/api/design`  | System design + Mermaid diagram from requirements.    |

### Architecture at a glance

```
Browser ──> Next.js page ──> /api/<feature> route ──> lib/claude.ts ──> Claude (or mock)
                                         └── prompts live in lib/prompts.ts
```

- `src/lib/claude.ts` — single Claude client + automatic mock fallback.
- `src/lib/prompts.ts` — system prompt + mock output per module (tune behaviour here).
- `src/lib/features.ts` — feature registry (name, route, owner) driving nav + dashboard.
- `src/components/FeatureWorkbench.tsx` — shared input/output UI reused by every page.

---

## 👥 Team assignments — 3 members

The scaffold is live and every module is isolated, so we can work in parallel.
Each stream has its own branch (already pushed). Work on your branch, open a PR into `main`.

### 👤 Member 1 — Nitin (Lead · Code Review + Platform)
**Branches:** `feat/review`, `feat/rag`
- [ ] 🔍 **Code Review** (`/review`): tune `reviewPrompt`, add paste-a-diff, review a file from a GitHub URL.
- [ ] 🧠 **RAG "chat with your codebase"** (`feat/rag`) — the biggest differentiator: index a repo, vector search, context-aware answers.
- [ ] Platform glue: auth + role-based access, response streaming, deployment.

### 👤 Member 2 — Quality & Docs
**Branches:** `feat/tests`, `feat/docs`
- [ ] 🧪 **Test Generator** (`/tests`): framework selector (Jest / Vitest / pytest / JUnit), copy + download tests, stretch: run tests in a sandbox.
- [ ] 📚 **Docs Generator** (`/docs`): OpenAPI/Swagger output for HTTP APIs, Markdown export/copy button.

### 👤 Member 3 — Design & UX
**Branches:** `feat/design`, `feat/ux`
- [ ] 🏗️ **Requirements → Design** (`/design`): render the Mermaid diagram visually (add `mermaid` client-side), export to Markdown/PDF, stretch: multi-turn refinement.
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
