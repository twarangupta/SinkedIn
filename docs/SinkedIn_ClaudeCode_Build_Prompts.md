# SinkedIn — Claude Code Build Prompts (Phase 0 → Phase 1)

A ready-to-use script of scoped task prompts to paste into Claude Code, in order. This is the *how you drive it* companion to the tech spec's build order. Work through it top to bottom, **one prompt at a time** — never paste several at once.

---

## How to use this file (read first)

Claude Code works best in a tight loop. For every prompt below:

1. **Paste one prompt.** Let it propose a plan first (most prompts ask for this).
2. **Read the diff** it produces — don't rubber-stamp it. You're learning the *why*, so make sure you understand what changed.
3. **Run the tests** (`npm test` / Vitest). Your `CLAUDE.md` mandates a test per service function.
4. **Commit** when green (`git add -A && git commit`). Git is your undo button — commit small and often.
5. **Move to the next prompt.**

Rules of thumb: keep each task pointed at *one layer* (a route, a service, a component — not "the whole feature"). If Claude Code starts sprawling across many files, stop it and narrow the ask. Use `/clear` between unrelated tasks to reset its context.

---

## What you do yourself (Claude Code can't/shouldn't)

- Install Node.js, git, and Claude Code (`npm install -g @anthropic-ai/claude-code`, then `claude` to authenticate).
- Create the **private** GitHub repo, and free accounts on **Supabase**, **Vercel**, and **Render**.
- Paste real secret keys into `.env` yourself — never hand secrets to the tool. When it needs a key it will name the env var; you fill the value.
- Make the product decisions. It builds; you decide.

---

## Session start

Open this folder in Claude Code. `CLAUDE.md` is already at the repo root (read automatically every session), and the planning docs live in `docs/` (tracked in git, so they carry version history — keep the repo private). Claude Code reads them when a prompt references them. Initialize git:

```
git init
```

Then work through the prompts below, one at a time.

---

## PHASE 0 — Foundation

### 0.1 — Repo scaffold

```
Read CLAUDE.md first. Scaffold an empty project (no features yet):
- Frontend: Vite + React + TypeScript in /frontend, with folders src/components, src/hooks, src/pages, src/lib.
- Backend: Express + TypeScript in /backend, with folders src/routes (endpoint definitions + middleware wiring), src/controllers (HTTP concerns only — read request, call a service, shape response), src/services (business logic — the unit-tested layer), src/lib (prisma client + utils), and /prisma. Enforce separation of concerns: routes → controllers → services → prisma; Prisma calls only in services.
- ESLint + Prettier configured in both.
- A committed .env.example documenting the env vars we'll need (Postgres URL, Supabase keys) with placeholder values. A .gitignore already exists at the root (it ignores node_modules, .env, build artifacts) — extend it if needed. Do NOT ignore docs/ (the planning docs are tracked on purpose).
Before writing anything, tell me your plan and the exact file tree you'll create. Wait for my OK.
```

### 0.2 — Prisma schema + first migration

```
Using the Prisma schema in docs/SinkedIn_Tech_Spec_Phase0_1.md as the exact source of truth, create prisma/schema.prisma with the Phase 0/1 models: User, Sink, Category, Vote, Comment, PollOption, PollVote, and the enums Conclusion and VoteValue. Match field names, relations, indexes, @unique constraints, and the deletedAt soft-delete fields exactly — do not invent or rename fields. Then set up a local Postgres connection via DATABASE_URL and run the first migration. Show me the schema for review before running the migration.
```

### 0.3 — Seed the categories

```
Write a Prisma seed script that inserts the 12 starter categories from the tech spec (Interview Experience, Rejection, Ghosted, Offer, Salary, Layoff, Poll, Advice, Discussion, Rant, Meme, Resource), each with the correct config flags (showsCompany, showsConclusion, allowsPoll, requiresPoll), a slug, and a color. Make the seed idempotent (safe to re-run). Then run it and confirm the rows exist.
```

### 0.4 — Backend skeleton + health check

```
Set up the Express server following the routes → controllers → services → prisma layering. Add GET /api/v1/health: the route wires the endpoint, a controller handles the HTTP response, and a service runs a trivial DB query through the Prisma client, returning { ok: true } only if the DB responds. Add one Vitest test for the health service. Establish the pattern: routes map endpoints + middleware, controllers hold HTTP concerns only, services hold logic, and Prisma calls live only in services — never in routes or controllers.
```

### 0.5 — Supabase Auth wired

```
Integrate Supabase Auth. Frontend: use the Supabase client SDK for email/password sign up + sign in. Backend: verify the Supabase JWT on protected routes (middleware). On first authenticated request from a new user, create a User row storing supabaseUserId (unique) and a generated pseudonymous handle.

Handle generation per the spec: offer the user 3-4 auto-generated suggestions (adjective + noun + number, e.g. Rejected_Raccoon_402) they can accept, OR type their own, with a live uniqueness check, a small hardcoded blocklist (company/role words, admin/mod/official, basic profanity), and an anonymity nudge. Add a protected test endpoint proving auth gates access, and Vitest tests for the handle-generation + uniqueness logic. Plan first, then build.
```

### 0.6 — Frontend skeleton

```
Build the minimal frontend shell: sign in via Supabase, then call GET /api/v1/health and display the result — proving frontend → backend → DB works end to end. Set up basic routing with an empty FeedPage. No feature UI yet.
```

### 0.7 — Deploy the skeleton

```
Help me deploy: frontend to Vercel, backend to Render, DB + Auth on Supabase (all free tier). Walk me through the env vars each environment needs (I'll paste the secret values myself), set up CORS between the deployed frontend and backend, and add a minimal CI workflow that runs the tests on push. Confirm the deployed frontend can round-trip the health check through the deployed backend to the DB.
```

> **Note:** Render's free backend cold-starts after 15 min idle. Once deployed, set a free cron ping (e.g. cron-job.org) hitting /api/v1/health every ~10 min to keep it warm.

**Phase 0 is done when:** a live URL lets you sign in and round-trips a request through the whole stack, schema is migrated everywhere, and git/env hygiene is in place. Nothing user-facing works yet — correct.

---

## PHASE 1a — The posting loop

### 1a.1 — Categories endpoint

```
Add GET /api/v1/categories returning all categories with their config flags. This drives both the compose form and the feed filter. Follow the layering: route → controller → service → Prisma, with a Vitest test for the service.
```

### 1a.2 — Create a Sink (the core write path)

```
Implement POST /api/v1/sinks (auth required). Validate the body with the Zod schema from the tech spec at the route boundary (flat object: categoryId, title, body?, company?, conclusion?, conclusionOther?, pollOptions?). Then in a createSink() service, do category-aware refinement: fetch the category's config and enforce it — require pollOptions (2-6) if requiresPoll, require conclusionOther when conclusion is OTHER, and strip fields the category doesn't use. Write the Sink (+ poll options if any) in one transaction. Never expose email/supabaseUserId in the response — return handle only. Add Vitest tests covering each refinement branch. Plan first.
```

### 1a.3 — Compose form

```
Build SinkComposeForm: category-first. Fetch categories from GET /api/v1/categories; when the user picks one, reveal only the fields its config allows (title + body always; company/conclusion/poll options conditionally). Submit one flat JSON object to POST /api/v1/sinks. Keep data-fetching in a hook, presentation in the component.
```

### 1a.4 — The feed (read path)

```
Implement GET /api/v1/sinks: paginated (cursor), filterable by category (?category=slug), sortable ?sort=new|top. Then build the read UI from small primitives: SinkCard (category pill, title, body preview, buoy button + score, comment count), CategoryPill (color from the Category record), and FeedPage that composes them via a useFeed() hook. Public responses expose handle only. Tests for the feed service.
```

### 1a.5 — Buoys & Anchors (voting)

```
Implement POST /api/v1/sinks/:id/vote and DELETE /api/v1/sinks/:id/vote (auth). One vote per user per Sink (enforce via the @@unique constraint + service logic); value is BUOY or ANCHOR; update the cached score (buoys − anchors) on the Sink. Build BuoyButton with the count. Add tests for casting, switching, and removing a vote.
```

### 1a.6 — Profile page

```
Build ProfilePage backed by GET /api/v1/users/:handle (public: handle + join date + their Sinks) and GET /api/v1/users/me. Reuse SinkCard for the post list — do NOT create a second card component. Add a small profile header. Public data exposes handle only.
```

### 1a.7 — Basic moderation

```
Add report/hide on Sinks (auth): a report endpoint that flags a Sink for manual review, and soft-hide via the existing deletedAt pattern for the author's own delete. Keep it minimal — manual review at this scale.
```

**Then, before 1b: seed.** Manually post 30–50 real, relatable Sinks across categories so the feed feels alive, and get honest signal on whether posting + reading actually feels good. That qualitative test is the real Phase 1a gate — not "it functions."

---

## PHASE 1b — The discussion layer (only after 1a proves out)

### 1b.1 — Comments

```
Implement threaded comments: POST /api/v1/sinks/:id/comments (auth; optional parentId for replies) and GET /api/v1/sinks/:id/comments returning them threaded. Build CommentThread with reply nesting. Soft-delete via deletedAt. Public data exposes handle only. Tests for the comment service.
```

### 1b.2 — Polls

```
Add poll support to compose (2-6 options for Poll/Advice/Discussion per category config) and POST /api/v1/sinks/:id/poll-vote. Enforce "one vote per poll per user" in the service layer (not just the per-option unique constraint). Build PollBlock rendering options + vote + live result bars. GET /api/v1/sinks/:id should include poll results. Tests covering the one-vote-per-poll rule.
```

**Phase 1 is done when:** deployed, a real person can sign up, post a Sink, see it in the feed, vote, comment, and vote in polls — **and it genuinely feels good.** If it doesn't, stop and fix the loop before Phase 2.

---

## Good habits to keep the whole way

- **One prompt, one layer, one commit.** Resist "build all of Phase 1" — you'll lose the plot and bugs will hide.
- **Make it check the schema** before touching data code (your CLAUDE.md already says this — remind it if it drifts).
- **Ask for the plan before the code** on anything non-trivial, so you understand it before it's written.
- **Tests before "done."** Vitest per service function, run before each commit.
- **Privacy is non-negotiable:** if any response ever includes email or supabaseUserId, that's a bug — public data returns handle only.
