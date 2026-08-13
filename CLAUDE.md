# SinkedIn — project context for Claude Code

Place this file at the repo root. It is read every session — keep it current as decisions change.

## What SinkedIn is
A Reddit-style, pseudonymous community for the honest, darkly-funny side of the job hunt (the anti-LinkedIn). The core object is a **Sink**: a text post (title + body) categorized by a **Category**. The moat is community + content, not proprietary data.

## Stack
Node + Express + TypeScript backend, React + TypeScript (Vite) frontend, PostgreSQL via Prisma, Zod for validation, **Supabase Auth** for identity, Vitest for tests.
Hosting (all free tier): Vercel (frontend), Render (backend), Supabase (Postgres + Auth). No AI in Phase 0/1.

## Architecture — separation of concerns (strict)
Backend layering, every request follows it:
```
routes/       → endpoint definitions + middleware wiring (path, auth, Zod validation) only
controllers/  → HTTP concerns only: read the request, call a service, shape the response — NO business logic
services/     → all business logic (createSink(), getFeed(), castBuoy()); the layer that gets unit-tested
prisma client → data access
```
Rules:
- Prisma calls live **only** in services — never in routes or controllers.
- Controllers hold no business logic; they translate HTTP ↔ service calls.
- Point work at one layer at a time; don't tangle concerns across layers.

Frontend: components take data as props and render (presentational); data-fetching lives in hooks (`useFeed`, `useSink`). Build small primitives (`SinkCard`, `CategoryPill`, `BuoyButton`, `SinkComposeForm`, `PollBlock`, `CommentThread`) and compose screens from them.

## Schema ground truth
`prisma/schema.prisma` is the source of truth for all data shapes. Always read it before writing code that touches User, Sink, Category, Vote, Comment, PollOption, or PollVote. Never invent or rename field names — if unsure, read the schema first.

## Product model (important)
A Sink is a Reddit-style text post (title + body) with one **Category**. The category is chosen first; the compose form then reveals category-conditional optional fields (`company`, `conclusion`, poll options) based on the category's config flags (`showsCompany`, `showsConclusion`, `allowsPoll`, `requiresPoll`). Categories live in a table and are extensible without code changes.

## Conventions
- All API routes prefixed `/api/v1/`.
- Validate every request body with Zod at the route boundary; category-conditional fields are validated **conditionally in the service** based on the category's config.
- Never hard-delete — use the `deletedAt` soft-delete pattern.
- `company` is optional **free text** on a Sink (not a foreign key) in this model. Do not add a Company table or FK unless explicitly asked (that's the deferred Ghost Index fork).
- Enums (`Conclusion`, `VoteValue`) are fixed — do not add ad-hoc string values.
- Voting is **Buoys** (up) + **Anchors** (down); `score` = buoys − anchors, cached on the Sink. One vote per user per Sink.
- One poll-vote per user per **poll** (not per option) — enforce in the service layer.
- Comments are threaded via optional `parentId`.
- **Identity:** persistent pseudonymous `handle`, created on signup — user picks from 3–4 auto-generated suggestions (adjective + noun + number) or types their own, with a live uniqueness check, a blocklist (company/role words, admin/mod/official, basic profanity), and an anonymity nudge. Store `supabaseUserId` (unique) on the User row.
- **Privacy (hard rule):** public API responses never include `email`, `supabaseUserId`, or any real-identity field — only `handle`. Enforce by `select`-ing only safe fields in Prisma queries that serve public data; never strip after the fact.
- No AI features in this phase — do not add AI calls unless explicitly asked.

## Comments & docstrings
Write **thorough** docstrings and inline comments in all source — they help explain the *why* and keep the code understandable. They are stripped from production builds automatically, so document freely:
- Backend: the production `tsconfig` sets `"removeComments": true`, so compiled JS ships without comments.
- Frontend: Vite's production build minifies and strips comments automatically.
Do **not** maintain separate branches to remove comments — source stays documented; the build strips them.

## Testing
Every new service function needs a Vitest test. Run the tests before considering a task done.

## Task style
Prefer small, scoped tasks over "build the whole feature." E.g. "the service function that creates a Sink, given this Zod-validated input" rather than "build the posting flow." On anything non-trivial, propose a plan and the files you'll touch before writing code.
