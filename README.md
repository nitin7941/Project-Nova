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

## 👥 Team assignments (hackathon next steps)

The scaffold is live and each feature is isolated — grab a module and go deep.

### Teammate A — 🔍 Code Review (`/review`)
- [ ] Tune `reviewPrompt` in `src/lib/prompts.ts` for sharper severity tagging.
- [ ] Add **file upload / paste-a-diff** support.
- [ ] Stretch: fetch a file directly from a GitHub URL and review it.

### Teammate B — 🧪 Test Generator (`/tests`)
- [ ] Add a **framework selector** (Jest / Vitest / pytest / JUnit).
- [ ] Add a "copy tests" button and a downloadable `.test` file.
- [ ] Stretch: run generated tests in a sandbox and show pass/fail.

### Teammate C — 📚 Docs Generator (`/docs`)
- [ ] Support **OpenAPI/Swagger** output for HTTP APIs.
- [ ] Add Markdown export / "copy" button.
- [ ] Stretch: render Mermaid diagrams inline.

### Teammate D — 🏗️ Requirements → Design (`/design`)
- [ ] Render the Mermaid diagram visually (add `mermaid` client-side).
- [ ] Add export to Markdown / PDF.
- [ ] Stretch: multi-turn refinement ("make it cheaper", "add caching").

### Shared / platform (anyone)
- [ ] **RAG over a Git repo** (the "chat with your codebase" flow) — the biggest differentiator.
- [ ] Auth + role-based access (the "secure web app" requirement).
- [ ] Response **streaming** for snappier UX.
- [ ] Persist runs to a database (history per project).

> **Convention:** one feature per branch (`feat/review`, `feat/tests`, …), open a PR into `main`. Keep prompts in `lib/prompts.ts` and UI reuse in `FeatureWorkbench`.

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
