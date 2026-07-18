# Project Nova — Unique Selling Proposition

**Hackathon pitch document** · Team: Nitin (Lead) · Vishal · Sahil

---

## One-line pitch

> **Nova is not autocomplete.** It is the team governance and continuity layer for the software lifecycle — grounded in *your* repo, linking requirements → design → tests → docs, citing sources, and flagging drift when upstream artifacts change.

---

## The problem

Individual AI coding tools (GitHub Copilot, Cursor, **Claude Code**, ChatGPT/Claude chat) make **one engineer** faster at **writing and editing code**.

They do **not**:

- Remember the team’s standards across every review as a shared product surface
- Link a requirement to the design, tests, and docs that came from it
- Tell you when documentation or tests went stale after a requirement changed
- Give the whole team one shared, cited, auditable knowledge base over the repo
- Keep a durable **artifact graph** (req → design → tests → docs) with drift detection

**Result:** AI helps individuals ship code faster, but teams still lose the plot on *why* something exists and whether artifacts still match reality.

---

## What Nova is

**Project Nova** is an AI-powered **developer productivity platform** for the full software lifecycle:

| Stage | Capability |
| ----- | ---------- |
| Discover | Chat with your codebase (RAG + citations) |
| Design | Requirements → system design (+ diagram) |
| Build quality | AI code review (severity / security / style) |
| Verify | Unit test generation |
| Document | Docs & API generation |
| Govern | Role-based access, shared prompts-as-standards |
| Continuity | **Traceability graph + drift / staleness detection** |

Every generative feature can optionally pull **project context** from an indexed repository so answers reflect *how this project works*, not generic internet patterns.

---

## The moat (four pillars)

### 1. Lifecycle continuity, not isolated chat

Nova stores **artifact links**: requirement → design → tests → docs.

Ask: *“Why does this test exist?”* → follow the parent chain.  
Change a requirement → Nova marks downstream design/tests/docs **stale** until regenerated or acknowledged.

No mainstream IDE assistant maintains this as a first-class, queryable graph.

### 2. Grounded in *your* repo, everywhere

RAG indexes a Git URL or local folder. Embeddings run **locally** (transformers.js — no embedding API key). Review, tests, docs, design, and chat all share the same retrieval layer and can cite `file:line`.

### 3. Team platform, not a personal assistant

- Shared indexed knowledge base for the team  
- **Standards-as-code**: review rubric and prompts in one place (`src/lib/prompts.ts`) — change once, applies to everyone  
- **RBAC**: admin vs member (e.g. indexing is admin-only)

### 4. Provenance & data control

- Cited sources on grounded answers  
- Local embeddings; only retrieved snippets leave the box to the LLM  
- Provider-flexible (e.g. Groq / Anthropic) and self-hostable

---

## Demo story (60–90 seconds)

1. **Index** a small repo → ask *“Where is auth handled?”* → show citations.  
2. Open **Review / Tests / Docs** with **Project context** selected → show grounded output + sources.  
3. Open **Traceability** → paste a requirement → generate Design → Tests → Docs.  
4. **Edit the requirement** → amber **stale** badges appear → **Regenerate** → back in sync.  
5. Mention: *“Claude Code / Copilot wrote the next change. Nova kept the chain of custody.”*

---

## Competitive comparison

Legend: **Yes** = first-class / strong · **Partial** = limited or ad-hoc · **No** = not a product focus

| Capability | **Project Nova** | GitHub Copilot | Cursor | **Claude Code** | Sourcegraph Cody | ChatGPT / Claude (chat) | Amazon Q |
| ---------- | :--------------: | :------------: | :----: | :-------------: | :--------------: | :---------------------: | :------: |
| Inline autocomplete | Partial* | **Yes** | **Yes** | Partial | Partial | No | **Yes** |
| Agentic multi-file coding in the terminal / IDE | Partial* | Partial | **Yes** | **Yes** | Partial | No | Partial |
| Repo-aware Q&A with citations | **Yes** | Partial | **Yes** | **Yes** | **Yes** | Partial† | Partial |
| Same grounding across review / tests / docs / design (shared UI) | **Yes** | No | Partial | Partial‡ | Partial | No | Partial |
| Requirements → design (architecture artifact) | **Yes** | No | Partial | Partial‡ | No | Partial | No |
| Artifact traceability graph (req → design → tests → docs) | **Yes** | No | No | **No** | No | No | No |
| Drift / staleness when upstream changes | **Yes** | No | No | **No** | No | No | No |
| Team standards enforced for every engineer | **Yes** | Partial | Partial | Partial§ | Partial | No | Partial |
| Role-based access (admin / member) as a product | **Yes** | Org IAM | Org IAM | Account / org | Org IAM | No | Org IAM |
| Local embeddings (no vector API key) | **Yes** | No | No | No | No | No | No |
| Self-hostable team web platform | **Yes** | No | No | No | Enterprise | No | No |
| Primary focus | **Team lifecycle + governance** | Individual coding | Individual IDE agent | Individual CLI agent | Code search + AI | General chat | AWS coding |

\*Nova is a **web lifecycle platform**, not an IDE/CLI coding agent — autocomplete and autonomous edits are out of scope by design.  
†Only if the user pastes/uploads context; no persistent team index or lifecycle links.  
‡Claude Code can *produce* designs/tests/docs on request in a session, but does not persist a shared, queryable lifecycle graph for the team.  
§Claude Code can follow `CLAUDE.md` / project instructions for one developer’s sessions; Nova applies **one standards pack** to every teammate via a shared web app + RBAC.

### Nova vs Claude Code (head-to-head)

| Dimension | **Claude Code** | **Project Nova** |
| --------- | --------------- | ---------------- |
| What it is | Anthropic’s **agentic coding CLI** — explores the repo, edits files, runs commands for *you* | A **team web platform** for the SDLC — review, tests, docs, design, chat, **traceability** |
| Who it serves | Individual developer (or pair) in a terminal session | Whole team with shared indexes, roles, and artifacts |
| Strength | Fast implementation loops: “fix this bug”, “add this feature”, multi-step tool use | Continuity & governance: *why* artifacts exist, whether they still match, who can index/generate |
| Repo context | Strong local workspace awareness in-session | Indexed RAG + optional grounding on every feature, with `file:line` citations |
| Lifecycle artifacts | Ephemeral chat / files you choose to keep | First-class linked artifacts: requirement → design → tests → docs |
| Drift | You notice manually (or re-ask) | Product feature: parent change → children marked **stale** |
| Standards | Per-project instructions (`CLAUDE.md`) for that agent | Central prompts + RBAC applied to every user of the platform |
| Complements | Use Claude Code to **write/change code** | Use Nova to **govern, ground, and keep the chain of custody** |

> **Pitch vs Claude Code:** *Claude Code is the best “do the coding work” agent. Nova is the “remember the project and keep the lifecycle honest” layer. They stack — they don’t replace each other.*

### How to read the table

| Competitor | What they win at | Where Nova wins |
| ---------- | ---------------- | --------------- |
| **Copilot** | Best-in-class autocomplete in the editor | Continuity across SDLC, shared standards, traceability + drift |
| **Cursor** | Fast agentic editing for one developer in the IDE | Team governance layer, artifact lineage, audit-friendly citations |
| **Claude Code** | Powerful terminal agent that implements changes in your repo | Durable req→design→test→doc graph, drift detection, shared RBAC platform |
| **Cody** | Deep code search / enterprise code IQ | End-to-end lifecycle chain and staleness |
| **ChatGPT / Claude (chat)** | General reasoning | Persistent project memory, RBAC, grounded multi-tool workflow |
| **Amazon Q** | AWS ecosystem assistance | Provider-agnostic, self-host, lifecycle graph |

**Bottom line:** Competitors optimize **velocity of writing/changing code**. Nova optimizes **velocity + fidelity of the whole engineering process**.

---

## Objection handling

| Objection | Answer |
| --------- | ------ |
| “Isn’t this just wrapping Claude?” | Wrapping a model is table stakes. The product is the **graph, grounding, standards, and drift** — the model is swappable (Groq / Anthropic). |
| “Isn’t this Claude Code?” | Claude Code is an **implementation agent** in your terminal. Nova is a **team lifecycle platform** with a persistent artifact graph and drift. Different jobs; complementary. |
| “Cursor / Claude Code already chat with the repo.” | They help *you* change code. Nova helps the *team* keep design/tests/docs tied to the same requirement and know when they diverge. |
| “We already have Copilot.” | Keep Copilot for autocomplete. Add Nova as the **governance and continuity layer** on top. |
| “Will judges care about governance?” | In enterprise and regulated teams, audit trails, RBAC, and “why does this exist?” are buying criteria — not nice-to-haves. |

---

## Owners / team

| Person | Focus |
| ------ | ----- |
| **Nitin** (Lead) | Code review, RAG, platform (auth/RBAC), project context, **traceability & drift** |
| **Vishal** | Unit test generator, docs & API generator |
| **Sahil** | Requirements → design, UX polish |

Repo: [github.com/nitin7941/Project-Nova](https://github.com/nitin7941/Project-Nova)

---

## Closing line (for judges)

> *We’re not competing with autocomplete or Claude Code. Nova is the continuity layer — it remembers the project, links requirements to design to tests to docs, enforces our standards, cites its sources, and tells us when the artifacts go out of date.*
