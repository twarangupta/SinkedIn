# SinkedIn — project context for Claude Code

Place this file at the repo root. It is read every session — keep it current as decisions change.

## What SinkedIn is
A Reddit-style, pseudonymous community for the honest, darkly-funny side of the job hunt (the anti-LinkedIn). The core object is a **Sink**: a text post (title + body) categorized by a **Category**. The moat is community + content, not proprietary data.

## Stack
Node + Express + TypeScript backend, **Next.js (App Router) + React + TypeScript** frontend (SSR for SEO), PostgreSQL via Prisma, Zod for validation, **Supabase Auth** for identity, Vitest for tests.
Hosting (all free tier): Vercel (frontend, Next.js preset), Render (backend), Supabase (Postgres + Auth). No AI in Phase 0/1.
Frontend was migrated from Vite to Next.js so public pages server-render for SEO + social share previews; the Express backend is unchanged.

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

Frontend (Next.js App Router):
- **Public reads are server components** — they fetch from the Express API via `src/lib/server-api.ts` and server-render, so pages are SEO-indexable (real HTML + per-page/OpenGraph metadata via `generateMetadata`). Pages live in `src/app/` (`page.tsx` = feed, `s/[id]/page.tsx` = single Sink).
- **Interactive pieces are client components** (`'use client'`): composer, vote controls, auth modal, header. Mutations go through the client `src/lib/api.ts` helper, which attaches the Supabase JWT.
- Presentational primitives take data as props (`SinkCard`, `CategoryPill`, `VoteControl`, `SinkComposer`, `PollBlock`, `CommentThread`); compose pages from them.
- Browser env vars use the `NEXT_PUBLIC_` prefix. Dev server runs on port **5173** (matches backend CORS `FRONTEND_URL`).

## Schema ground truth
`prisma/schema.prisma` is the source of truth for all data shapes. Always read it before writing code that touches User, Sink, Category, Vote, Comment, CommentVote, PollOption, PollVote, Report, Bookmark, Application, ApplicationEvent, InterviewRound, Company, Feedback, Notification, or Reaction. Never invent or rename field names — if unsure, read the schema first. (Since Phase 1: `User.avatarId` + `User.handleChosen`, `Sink.imageUrl`, `Comment.score` + the `CommentVote` model, the `Report` model, and the `Bookmark` model all exist.)

**Notifications + reactions (Phase 2 retention, built):** `Notification` (owner-scoped in-app bell) — `type` `NotificationType` `REPLY|BUOY|POLL`, **`actorId` (a reference to the actor `User`, NOT a handle snapshot — resolve the current handle at read time)**, `count` (milestone value for BUOY/POLL), `sinkId`, `commentId`, `readAt`. REPLY fires on comments; BUOY/POLL fire once per milestone (10/25/50…), deduped by `Sink.notifiedBuoyMilestone` / `notifiedPollMilestone`. `Reaction` (one-tap solidarity taps, separate from votes) — one per user per Sink (`@@unique([sinkId, userId])`), `kind` must be one of the Sink's category's configured reactions. **Two JSON columns (the first in the project):** `Category.reactions` = the per-category reaction config `[{key,emoji,label}]` (opaque, never queried by field), and `Sink.reactionCounts` = cached per-kind tallies (kept fresh in the reaction service like `score`). Rule of thumb: typed columns + FKs for anything filtered/sorted/joined; `jsonb` only for opaque, whole-stored, never-searched-inside payloads.

**Phase 2 tracker (private, owner-only, real PII — never in a public select, never indexed):** `Application` (the user's relationship with a job: `company` free text + `companyId`, `role`, `status` `ApplicationStatus` enum, `statusOther`, `jobUrl`, `appliedAt`, `notes`, `resumeFileKey` + `resumeFileName`, soft-deleted); `ApplicationEvent` (status-transition history, written on create + every status change, so analytics like response-time / ghost-duration / interview-rate stay reconstructable); `InterviewRound` (optional, per-application, add/remove/reorder — `position`, `type` `InterviewRoundType`, `typeOther`, `scheduledAt`, `result` `InterviewRoundResult`, `notes`).

**Resume PDF per application (built):** one file per application, key `{supabaseUserId}/{uuid}.pdf` in a **private** Supabase Storage bucket named `resumes` (Public OFF, RLS confines each user to their own folder). Storage is **client-side** (frontend `lib/uploadResume.ts`); the backend only stores the object key + original filename on the `Application` and never talks to the bucket. Upload is PDF-only, ≤3MB, enforced both in code and by the bucket limit; download is a short-lived signed URL. Deleting an application also deletes its resume object (no orphaned PII). **Data export + delete (built, PII obligation):** `GET /api/v1/applications/export?format=csv|json` downloads the full tracker (CSV opens in Excel, formula-injection-guarded; JSON is complete); `DELETE /api/v1/applications` hard-purges all applications + rounds + events and returns resume keys the client erases from storage. Both are in Settings ("Your data" + "Delete tracker data").

**Personal insights (built):** `GET /api/v1/applications/insights` computes a private single-user dashboard from the owner's own applications + `ApplicationEvent` history (funnel applied→OA→interview→offer, response/interview/offer/ghost rates, median response time, reply-rate per resume, weekly cadence). All single-user math, no cross-user aggregation (that would be the Phase-3 Ghost Index, gated). Surfaced as an "Insights" tab in the tracker.

**Feedback / "message the owner" (built, NOT private-to-a-user, but owner-only reads):** a floating bottom-right widget lets anyone (signed in or not) send complaints/suggestions. `POST /api/v1/feedback` (optionalAuth, rate-limited) stores every submission in the `Feedback` model and best-effort notifies the owner via `lib/email.ts` — a dependency-free Resend HTTP wrapper that is a **no-op until `RESEND_API_KEY` is set** (destination `OWNER_EMAIL`, defaults to twaranguptawork@gmail.com). Never expose `Feedback` (its `contactEmail` is PII) in any public response.

Still deferred (audit "Next"): a `Job` entity for the Chrome extension (source/externalId/snapshot + idempotent upsert); full account deletion (removing the Supabase Auth user, distinct from the tracker-data purge above).

**`Company` (shared, NOT private):** a centralized company entity, deduped by `normalizedName`, with an optional `domain` (for logos via Logo.dev, nothing stored) — seeded from `prisma/data/companies.json` (~9.6k) via `npm run db:seed:companies`, and grown by find-or-create as users type. Both `Application.companyId` and `Sink.companyId` link to it. Company search powers the tracker + composer autocomplete (`GET /api/v1/companies?q=`).

## Product model (important)
A Sink is a Reddit-style text post (title + body, plus an **optional image** via `imageUrl`) with one **Category**. The category is chosen first; the compose form then reveals category-conditional optional fields (`company`, `conclusion`, poll options) based on the category's config flags (`showsCompany`, `showsConclusion`, `allowsPoll`, `requiresPoll`). Categories live in a table and are extensible without code changes.

## Conventions
- All API routes prefixed `/api/v1/`.
- Validate every request body with Zod at the route boundary; category-conditional fields are validated **conditionally in the service** based on the category's config.
- Never hard-delete — use the `deletedAt` soft-delete pattern.
- `Sink.company` is optional **free text** (the label), AND is now linked to the centralized `Company` via `Sink.companyId` (resolved by find-or-create in the service on create/edit). The free text stays as the display/fallback; the FK powers company logos and the Phase-3 company pages. (This consciously un-deferred the old "no Company FK" rule now that the `Company` entity exists.)
- Enums (`Conclusion`, `VoteValue`) are fixed — do not add ad-hoc string values.
- Voting is **Buoys** (up) + **Anchors** (down); `score` = buoys − anchors, cached on the Sink. One vote per user per Sink.
- One poll-vote per user per **poll** (not per option) — enforce in the service layer.
- Comments are threaded via optional `parentId`.
- **Identity:** persistent pseudonymous `handle`, created on signup — user picks from 3–4 auto-generated suggestions (adjective + noun + number) or types their own, with a live uniqueness check, a blocklist (company/role words, admin/mod/official, basic profanity), and an anonymity nudge. Store `supabaseUserId` (unique) on the User row.
- **Privacy (hard rule):** public API responses never include `email`, `supabaseUserId`, or any real-identity field — only `handle`. Enforce by `select`-ing only safe fields in Prisma queries that serve public data; never strip after the fact.
- **Public-first:** the app renders for everyone; public reads (`GET /sinks`, `/categories`, `/sinks/:id`, comments) need no auth — the backend uses `optionalAuth` where per-user data (e.g. `myVote`) is enriched. Sign-in is required only for actions (post, vote, comment), surfaced as a modal on the action, not a login wall. Writes use `requireAuth`.
- **Reputation is branded "Auras"** (Reddit-style karma) — deferred, derivable from buoys; always call it "Auras", never karma/points.
- No AI features in this phase — do not add AI calls unless explicitly asked.

## Comments & docstrings
Write **thorough** docstrings and inline comments in all source — they help explain the *why* and keep the code understandable. They are stripped from production builds automatically, so document freely:
- Backend: the production `tsconfig` sets `"removeComments": true`, so compiled JS ships without comments.
- Frontend: the Next.js production build minifies and strips comments automatically.
Do **not** maintain separate branches to remove comments — source stays documented; the build strips them.

## Testing
Every new service function needs a Vitest test. Run the tests before considering a task done.

## Task style
Prefer small, scoped tasks over "build the whole feature." E.g. "the service function that creates a Sink, given this Zod-validated input" rather than "build the posting flow." On anything non-trivial, propose a plan and the files you'll touch before writing code.
