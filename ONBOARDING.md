# Onboarding — Project Nova

Welcome. This doc gets a new engineer productive in ~15 minutes: what Nova is,
how it works, where the code lives, and how to add a feature.

---

## 1. What Nova is (in one paragraph)

Project Nova is a **team AI layer for the whole software lifecycle**. It takes a
requirement and helps carry it through **design → code review → tests → docs**,
with every answer **grounded in your actual repository** (via RAG) and gated by
**role-based access**. It runs on Anthropic Claude, with a **mock fallback** so
the app is fully demoable with zero setup.

---

## 2. Run it locally

```bash
cd project-nova
npm install
cp .env.example .env.local     # optional: add ANTHROPIC_API_KEY, NOVA_SECRET, NOVA_USERS
npm run dev                    # http://localhost:3000
```

- No API key? Everything still works in **mock mode** (retrieval is real; generation is stubbed).
- Sign in with the demo accounts: **`admin` / `nova`** (admin) or **`member` / `nova`** (member).
- Indexing a repo is **admin-only**; chatting/reviewing is available to any signed-in user.

---

## 3. The mental model — three layers

```
Pages (src/app/*/page.tsx)      ->  what the user sees
API routes (src/app/api/**)     ->  thin handlers, one per capability
Shared core (src/lib/*)         ->  the real logic, reused everywhere
```

The golden rule: **a feature = a thin page + a thin API route + a system prompt.**
All heavy lifting (LLM calls, RAG, auth) lives in `src/lib` and is shared.

### Where to look, in order
1. `README.md` — overview + run instructions.
2. `src/lib/features.ts` — the registry that drives the nav and dashboard. **Adding a feature starts here.**
3. `src/lib/claude.ts` — the single entry point for all AI calls: `complete()` and `completeStream()`, with automatic mock fallback.
4. `src/lib/prompts.ts` — each feature's system prompt + mock output. **Behaviour is tuned here, not in routes.**
5. `src/lib/rag/*` — the RAG pipeline: `ingest` → `chunk` → `embeddings` (local, no key) → `store` (vector search) → `context` (grounding helper for every feature).
6. `src/middleware.ts` + `src/lib/auth.ts` — who can access what (signed-cookie sessions, admin/member roles).

---

## 4. How a request flows

**Grounded feature (e.g. review):**
```
UI (FeatureWorkbench) --POST {code, indexId}--> /api/review
  -> getProjectContext(indexId, code)  [embed query -> vector search -> top-k snippets]
  -> withProjectContext(context, prompt)
  -> complete()  -> Claude (or mock)
  -> { text, mode, sources }  ->  UI renders answer + cited file:line sources
```

**Chat (RAG):** index a repo/folder → chunk → embed locally → store vectors →
question embedded → top-k retrieved → Claude answers, streamed, with citations.

---

## 5. Add a new feature (copy-paste recipe)

1. Add an entry to `src/lib/features.ts` (slug, route, icon, owner).
2. Add a system prompt + mock to `src/lib/prompts.ts`.
3. Create `src/app/api/<slug>/route.ts` — copy an existing one; call `complete()`
   (add `getProjectContext` if it should be repo-aware).
4. Create `src/app/<slug>/page.tsx` — usually just `<FeatureWorkbench feature={...} />`.
5. `npm run build` to typecheck, then test in mock mode.

---

## 6. Conventions

- Keep routes thin; put prompts in `prompts.ts` and shared logic in `src/lib`.
- Everything must still work with **no API key** (provide a mock).
- One feature branch per stream (`feat/...`) → PR into `main`.
- Never commit `.env*` or `.nova/` (cloned repos + vector indexes).
