# SinkedIn — Technical Spec (Phase 0 & Phase 1)

Companion to `SinkedIn_PRD.md`. This covers only what's needed to build Phase 0 (foundation) and Phase 1 (core loop). Later phases get their own spec additions when you reach them — don't build ahead of this.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript — SSR for SEO (migrated from Vite) |
| Backend | Node + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod (shared schemas between frontend/backend where possible) |
| Auth | Supabase Auth |
| Testing | Vitest |
| Hosting (suggested) | Vercel (frontend) + Render (backend) + Supabase (Postgres + Auth) — all free tier, fastest path to a live URL |

---

## Database schema (Phase 0/1 tables only)

```prisma
// schema.prisma — Phase 0/1 scope only. More tables added in later phases.

model User {
  id          String   @id @default(uuid())
  supabaseUserId String @unique   // Supabase Auth user id, never exposed publicly
  handle      String   @unique   // e.g. "Rejected_Raccoon_402" — public-facing
  createdAt   DateTime @default(now())
  sinks       Sink[]
  votes       Vote[]
  comments    Comment[]
  pollVotes   PollVote[]
}

// A Sink is a Reddit-style post: always a title + body, categorized by a category.
// Depending on the category, the compose form reveals a few optional extra fields
// (company, conclusion, poll options). Those fields are shared/optional on the
// Sink itself — NOT separate per-category tables — so the model stays simple.
model Sink {
  id          String     @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  title       String                          // every Sink has a title
  body        String?     @db.Text            // the main text (optional for e.g. pure Poll)

  // --- optional category-conditional fields (nullable; only some categories use them) ---
  company        String?                      // shown for Interview Experience, Rejection, Ghosted, etc.
  conclusion     Conclusion?                  // shown for Interview Experience / Offer etc.
  conclusionOther String?                     // free text, used only when conclusion = OTHER
  // poll options live in the PollOption table below (one-to-many)

  score       Int         @default(0)         // cached buoy score for ranking (buoys - anchors)
  isVerified  Boolean     @default(false)     // Phase 4 — always false in Phase 1
  deletedAt   DateTime?                        // soft delete, never hard-delete
  createdAt   DateTime    @default(now())

  votes       Vote[]
  comments    Comment[]
  pollOptions PollOption[]

  @@index([categoryId])
  @@index([createdAt])
  @@index([score])
}

// Categories are their own table so new ones can be added with NO code/schema change.
// The `config` fields describe which optional inputs the compose form reveals.
model Category {
  id            String  @id @default(uuid())
  name          String  @unique   // "Interview Experience", "Discussion", "Poll", ...
  slug          String  @unique   // "interview-experience"
  color         String            // hex or token for the category pill
  showsCompany  Boolean @default(false)
  showsConclusion Boolean @default(false)
  allowsPoll    Boolean @default(false)   // optional poll (Discussion, Advice)
  requiresPoll  Boolean @default(false)   // poll mandatory (Poll category)
  sinks         Sink[]
}

enum Conclusion {
  GHOSTED
  REJECTED
  ACCEPTED
  WITHDREW
  PENDING
  OTHER      // when picked, the free-text conclusionOther field is used
}

// --- Voting: "Buoys" (up) and "Anchors" (down) — our themed two-way vote. ---
// Buoy lifts a Sink toward the surface; anchor sinks it. score = buoys - anchors.
enum VoteValue {
  BUOY     // +1, up arrow, lift it up
  ANCHOR   // -1, down arrow, sink it
}

model Vote {
  id        String     @id @default(uuid())
  sinkId    String
  sink      Sink        @relation(fields: [sinkId], references: [id])
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  value     VoteValue
  createdAt DateTime    @default(now())

  @@unique([sinkId, userId])   // one vote per user per Sink
}

// --- Polls (Phase 1): a Sink can carry options; users vote on one. ---
model PollOption {
  id        String     @id @default(uuid())
  sinkId    String
  sink      Sink        @relation(fields: [sinkId], references: [id])
  label     String
  position  Int                          // display order
  votes     PollVote[]
}

model PollVote {
  id            String     @id @default(uuid())
  pollOptionId  String
  option        PollOption @relation(fields: [pollOptionId], references: [id])
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now())

  @@unique([pollOptionId, userId])
  // NOTE: enforce "one vote per poll (not per option)" in the service layer.
}

// --- Comments (Phase 1): Reddit needs them. Threaded via optional parentId. ---
model Comment {
  id        String    @id @default(uuid())
  sinkId    String
  sink      Sink       @relation(fields: [sinkId], references: [id])
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  body      String     @db.Text
  parentId  String?                       // null = top-level; set = reply (threading)
  parent    Comment?   @relation("Thread", fields: [parentId], references: [id])
  replies   Comment[]  @relation("Thread")
  deletedAt DateTime?
  createdAt DateTime    @default(now())

  @@index([sinkId])
}
```

**Why these decisions:**
- **A Sink is one generic post shape (title + body + category), not per-type tables.** The category-conditional fields (`company`, `conclusion`, poll options) are optional columns/relations on the same Sink — revealed by the compose form based on the chosen category. This is the Reddit model: one post structure, a category categorizes it, and some categories surface a few extra inputs. Simple to build, trivial to extend.
- **`Category` is its own table with `config` flags** (`showsCompany`, `allowsPoll`, etc.) — so adding a new category (or changing which fields it reveals) is a *data* change, not a code change. This is what makes "add more categories later" free.
- **`company` is free text now, not a foreign key.** This is a deliberate reversal from the earlier rejection-tracker design: since the product is now a text-first community (not a structured rejection database), company is just an optional tag on a post. **Consequence: the Ghost Index / aggregate company stats are no longer a clean day-one capability** — you'd need canonical companies for that. If you later want the Ghost Index, promote `company` to a `companyId` foreign key then. Flagged as an explicit tradeoff (see the note after this block).
- **Voting is "Buoys" and "Anchors"** — a custom, on-theme two-way vote: buoy (up arrow) lifts a Sink toward the surface, anchor (down arrow) sinks it. `score` = buoys − anchors, cached on the Sink for fast ranking (classic Reddit ranking under the hood, themed as depth). One vote per user per Sink. **Caveat worth revisiting:** downvotes on vulnerable posts (a raw rejection, a layoff) can feel like a pile-on in a community built to be kinder than LinkedIn — a good later refinement is disabling anchors on the most vulnerable categories (Rejection, Ghosted, Layoff) while keeping full voting on Discussion/Poll. Universal for now; per-category softening is a config flag away.
- **Comments are threaded** via an optional `parentId` self-relation (top-level vs. reply) — standard Reddit threading.
- **Polls are first-class in Phase 1** — options as a child table, one poll-vote per user per poll (enforced in the service).
- `deletedAt` soft-delete everywhere; `isVerified` stubbed for Phase 4.

### The category set (seed data — add more anytime, no code change)

Every Sink picks one category. The category drives which optional fields the compose form reveals:

| Category | Reveals: company | Reveals: conclusion | Poll |
|---|---|---|---|
| Interview Experience | yes | yes | — |
| Rejection | yes | yes | — |
| Ghosted | yes | — | — |
| Offer | yes | yes | — |
| Salary | yes | — | — |
| Layoff | yes | — | — |
| Poll | — | — | required |
| Advice | — | — | optional |
| Discussion | — | — | optional |
| Rant | — | — | — |
| Meme | — | — | — |
| Resource | — | — | — |

Because `Category` is a table with config flags, this is seed data you can edit/extend freely — add "Networking," "Career Switch," "Visa/Relocation," "Fired," "Startup Death," whatever, without touching code.

### Important tradeoff — the Ghost Index is no longer a day-one capability

The earlier design stored company as a canonical foreign key so it could power aggregate stats (ghost rate per company, time-to-reject leaderboards — "the Ghost Index"). This Reddit-style model stores `company` as **optional free text on a post**, because the product is now a text-first community, not a structured rejection database.

That's the right call for the product you described — but be aware it means:
- You **cannot** cleanly build the Ghost Index / company scorecards on this schema, because "Amazon" / "amazon" / "Amazon India" won't aggregate.
- If you later decide the Ghost Index matters, the migration is: introduce a `Company` table, add `companyId` to Sink, and backfill by matching the free-text values. Doable, but not free.
- The strategy docs (`2_SinkedIn_Phased_Roadmap.md` Phase 3, and the 5-directions doc) lean heavily on the Ghost Index as the moat. With this model, **the moat shifts from "proprietary company data" to "community + content"** — a Reddit-for-job-pain, where the defensibility is the audience and the culture, not aggregated stats. That's a legitimate and simpler product; just know it's a different bet than the Ghost-Index-as-moat one those docs describe. Worth reconciling the strategy docs to match when you get a chance.

---

## API design (Phase 1 endpoints only)

REST, versioned from day one: prefix everything `/api/v1/`.

```
POST   /api/v1/sinks              — create a Sink (auth required)
GET    /api/v1/sinks              — paginated feed (?category=poll&sort=new|top&cursor=...)
GET    /api/v1/sinks/:id          — single Sink + comments + poll results
DELETE /api/v1/sinks/:id          — soft-delete own Sink (auth required)

POST   /api/v1/sinks/:id/vote     — buoy a Sink (auth required)
DELETE /api/v1/sinks/:id/vote     — remove your buoy

POST   /api/v1/sinks/:id/comments — add a comment (auth; optional parentId for replies)
GET    /api/v1/sinks/:id/comments — threaded comments for a Sink

POST   /api/v1/sinks/:id/poll-vote — vote on a poll option (auth; one per poll)

GET    /api/v1/categories             — list categories (drives the compose form + feed filter)

GET    /api/v1/users/me           — current user profile
GET    /api/v1/users/:handle      — public profile by handle
```

**Layering (every request follows this):**
```
route (endpoint definition + middleware wiring — path, auth, Zod validation)
  → controller (HTTP concerns only: reads the request, calls a service, shapes the response)
    → service (business logic, e.g. createSink(), getFeed(), castBuoy())
      → Prisma client (data access)
```
Keep these layers in separate files/folders (`routes/`, `controllers/`, `services/`, `prisma/`). Routes just map endpoints to controllers and attach middleware; controllers hold no business logic (they translate HTTP ↔ service calls); services hold all logic and are the layer you unit-test; Prisma is the only layer that touches the DB. This explicit separation of concerns keeps the codebase scalable and keeps Claude Code's changes scoped and predictable: point it at one layer and it won't tangle unrelated concerns.

**Validation:** every request body validated with Zod at the route boundary before it reaches the service layer. A Sink is one flat object; the category-conditional fields are optional and validated *conditionally* based on the chosen category. Example:

```typescript
const createSinkSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  // category-conditional, all optional at the schema level:
  company: z.string().max(100).optional(),
  conclusion: z.nativeEnum(Conclusion).optional(),
  conclusionOther: z.string().max(100).optional(),  // required by service only when conclusion = OTHER
  pollOptions: z.array(z.string().min(1).max(100)).min(2).max(6).optional(),
})
// then refine based on the category's config (fetched in the service):
// - if category.requiresPoll → pollOptions must be present (>=2)
// - if conclusion === OTHER → conclusionOther must be non-empty
// - if !category.showsCompany → ignore/strip company, etc.
```

**How creating a Sink works, end to end (Phase 1):**
1. User taps "New Sink" and **picks a category first** (Interview Experience, Poll, Rant, …).
2. The compose form **reveals fields based on the category's config**: always title + body; plus company/conclusion if the category shows them; plus poll-option inputs if the category allows/requires a poll. (Config comes from `GET /api/v1/categories`.)
3. Frontend sends one flat JSON object to `POST /api/v1/sinks`.
4. Route validates with Zod; the `createSink()` service then does category-aware refinement (enforces required poll, strips fields the category doesn't use) and writes the Sink (+ poll options if any) in one transaction.
5. The new Sink appears at the top of the feed with its category pill.

The design principle: **the category is chosen first and everything else adapts to it.** This is what makes SinkedIn feel like Reddit — one post type, a category that categorizes it, and a form that shows only the fields that category needs.

---

## Frontend component architecture (Phase 1 only)

Build a small set of primitives, compose everything else from them:

- **`SinkCard`** — renders one Sink (category pill, title, body preview, buoy button + score, comment count). One component powers the feed, the category-filtered views, and the profile. Build it once, well, with props.
- **`CategoryPill`** — colored label per category, color from the `Category` record.
- **`BuoyButton`** — the custom upvote (buoy) control + count.
- **`SinkComposeForm`** — category-first compose: pick category → form reveals title, body, and any category-conditional fields (company, conclusion, poll options) driven by the category's config from `GET /api/v1/categories`.
- **`PollBlock`** — renders poll options + vote + live results (for poll/discussion/advice Sinks).
- **`CommentThread`** — threaded comments with reply nesting.

Screens (`FeedPage`, `SinkDetailPage`, `ProfilePage`) are arrangements of these primitives plus data-fetching. Keep data-fetching in hooks (`useFeed()`, `useSink(id)`) separate from the presentational components — components take data as props and render; hooks own the fetching. This split is what makes components easy for Claude Code to reason about in isolation and easy for you to test.

---

## Auth & identity model

- Supabase Auth handles real auth (email/password or OAuth) — never build this yourself. Verify the Supabase JWT on the backend; the frontend uses the Supabase client SDK.
- On signup, the user gets a persistent pseudonymous `handle`. Flow: show 3–4 auto-generated suggestions (adjective + noun + number, e.g. `Rejected_Raccoon_402`) that they can accept with one tap, **or** type their own. The handle is stored on the `User` row and is `@unique`.
  - **Custom handles need guardrails** (the cost of letting users choose): a live uniqueness/availability check as they type; character + length validation; a blocklist (company names + role words like `Google_HR`/`Recruiter`, reserved words like `admin`/`mod`/`official`, and a basic profanity list) to prevent impersonation and abuse; and a one-line anonymity nudge ("pick something anonymous — this is public") since a user typing their real name would break the privacy guarantee. For Phase 0, a small hardcoded blocklist is enough — expand it later.
  - The handle is **persistent** (doesn't rotate) so a user's Sinks, comments, and votes stay attached to one identity. A "change handle" option can come later in Phase 2 with richer profiles.
- **The real email/Supabase identity must never be exposed through any public API response.** Every public-facing endpoint returns `handle`, never `supabaseUserId` or email. Enforce this by only ever `select`-ing safe fields in Prisma queries that serve public data — never rely on remembering to strip fields after the fact.

---

## Build order (Phase 0 → Phase 1, step by step)

**Phase 0 — foundation**
1. **Repo scaffold** — Vite+React+TS frontend, Express+TS backend, shared `packages/` for Zod schemas if you want a monorepo (optional; two repos is fine too).
2. **Prisma schema + first migration** — the tables above, against a local Postgres (Docker easiest).
3. **Seed the `Category` table** — the 12 starter categories with their config flags.
4. **`CLAUDE.md`** written (see below) before asking Claude Code to build features.
5. **Auth wired** — Supabase Auth integrated, sign up/sign in working, `User` row + generated handle on first login.
6. **Deploy a skeleton end-to-end** — empty feed page that calls a real (even if empty) `/api/v1/sinks`. Confirms the whole pipe works before building on it.

**Phase 1a — the posting loop (ship + test before 1b)**
7. **`GET /api/v1/categories`** — powers compose + feed filter.
8. **`POST /sinks` + `SinkComposeForm`** — category-first compose with conditional fields. The core write path.
9. **`GET /sinks` + `FeedPage` + `SinkCard` + `CategoryPill`** — the read path with category filter + new/top sort. Loop works end-to-end here.
10. **Buoys & Anchors** — `POST/DELETE /sinks/:id/vote`, `BuoyButton`, cached `score`.
11. **Profile page.**
12. **Seed it yourself** with 30–50 real Sinks across categories, then get real signal on 1a before building 1b.

**Phase 1b — the discussion layer (after 1a proves out)**
13. **Comments** — `POST/GET /sinks/:id/comments` (threaded), `CommentThread`.
14. **Polls** — poll options on compose, `POST /sinks/:id/poll-vote`, `PollBlock` with live result bars.

*The 1a/1b split is a de-risking option — you can build all of Phase 1 at once if you prefer. See the roadmap for the rationale.*

---

## `CLAUDE.md`

The canonical `CLAUDE.md` lives at repo root — see `/CLAUDE.md`. It is the single source of truth for project conventions (stack, the routes → controllers → services → prisma layering, schema ground rule, product model, privacy hard-rule, comment/docstring policy, testing, task style). Keep it current there; do not duplicate it here.

---

## What's deliberately NOT in this spec
No AI, no verification, no Aura/gamification, no Ghost Index aggregates, no tracker dashboard, no Comeback flow. These get their own spec sections when you reach Phase 2+ — building them now would be scope creep against the PRD.
