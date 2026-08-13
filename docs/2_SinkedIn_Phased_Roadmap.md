# SinkedIn — Phased Build Roadmap (production-level sequencing)

> Companion to `1_How_To_Build_Production_Software.md` (the *why*) and `SinkedIn_PRD.md` (the *what* of v1). This file is the *sequence*: what each phase contains, why it exists, what has to be true to enter it, and what has to be true to leave it. Phase 0 is specified in full detail; later phases are specified enough to build toward without over-planning.

---

## The philosophy of phasing (read first)

**Why phase at all instead of building the whole vision?** Because the whole vision is a *hypothesis*, and most of it is worthless if the core loop doesn't work. Phasing means:

1. **You validate the risky assumption first.** The riskiest thing about SinkedIn isn't "can I build a leaderboard" — it's "will anyone actually post a rejection and enjoy it." Phase 1 tests exactly that, cheaply, before you build anything that depends on it.
2. **Every phase ends with working software.** You're never months-deep with nothing to show. Each phase is shippable.
3. **Each phase's gate protects the next.** You don't build Phase 3 (the data moat) until Phase 1 (the loop) is proven, because the moat is worthless without volume, and volume requires the loop to work.

**The cardinal rule: do not start a phase until the previous phase's exit gate is met.** The gate is not "I finished coding it" — it's "it demonstrably works and the assumption it tested held true." This is the discipline that separates shipped products from stalled side projects.

---

## Phase map at a glance

| Phase | Name | Core question it answers | Ships? |
|---|---|---|---|
| 0 | Foundation | Is the skeleton solid and deployable? | Skeleton live |
| 1 | The core loop | Does posting + reading a Sink feel good? | **v1 — real users** |
| 2 | Identity & retention | Do people come back? | Retention features |
| 3 | Community depth & growth | Does the community compound + spread? | Discovery, notifications, growth |
| 4 | Trust & gamification | Do verification + rewards deepen engagement? | Badges, Aura |
| 5 | Growth mechanics | Does it spread beyond the app? | Shareables, virality |
| 6+ | AI & monetization | Can it be smarter and make money? | AI, revenue |

---

## PHASE 0 — Foundation

**Goal:** a deployed, empty-but-working skeleton. No features yet — just proof that every layer (frontend ↔ backend ↔ database ↔ auth ↔ deploy) is wired correctly and talks to each other. This is the "hello world through the entire stack" phase.

**Why this phase exists separately:** if you build a feature and it doesn't work, you want to know whether the bug is in *your feature* or in *the plumbing*. By proving the plumbing works end-to-end with zero features, every bug after this is a feature bug — you've eliminated a whole category of confusion. It's the difference between "is it my code or my setup?" being a five-minute question vs. a five-hour one.

**Entry gate:** PRD locked, tech spec written, schema designed on paper.

### What Phase 0 contains, in build order

**0.1 — Repository & tooling setup**
- `git init`, create the repo, `.gitignore` (node_modules, .env, build artifacts) *before* anything else.
- Folder structure reflecting the layers:
  ```
  /backend
    /src
      /routes      (endpoint definitions + middleware wiring)
      /controllers (HTTP concerns: read request, call service, shape response)
      /services    (business logic — the unit-tested layer)
      /lib         (prisma client, shared utils)
    /prisma        (schema.prisma, migrations)
  /frontend
    /src
      /components  (SinkCard, CategoryPill, etc.)
      /hooks       (useFeed, useSink)
      /pages       (FeedPage, SinkDetailPage)
      /lib         (api client)
  ```
- ESLint + Prettier configured (mechanical consistency).
- `.env.example` committed (documents what env vars exist, without real values).
- **`CLAUDE.md` written and placed at repo root** — before you ask Claude Code to build anything. This is what keeps the AI grounded for the whole project.

*Why first:* conventions and hygiene set now prevent chaos and leaked secrets later. Everything built after this inherits these decisions.

**0.2 — Database up and schema migrated**
- Local Postgres running (Docker is easiest: one `docker-compose.yml` with a postgres service).
- Prisma installed, `schema.prisma` written (the Phase 0/1 tables: User, Sink, Category, Vote, Comment, PollOption, PollVote + enums).
- First migration run — tables actually exist in the DB.
- Prisma Client generated (this is what gives you typed DB access + Claude Code's ground truth).

*Why here:* the schema is the foundation. Nothing user-facing can be built until the data model exists. This is deliberately the first *real* thing you build.

**0.3 — Backend skeleton**
- Express server boots, responds to a health-check route (`GET /api/v1/health` → `{ ok: true }`).
- Prisma client connected and confirmed talking to the DB (e.g. health check does a trivial DB query).
- The layered structure in place (even if routes/services are near-empty), so the pattern is established from the first real endpoint.

*Why here:* proves the backend runs and reaches the database before you build logic on top.

**0.4 — Auth wired**
- Supabase Auth integrated on both frontend and backend.
- Sign up / sign in flow works.
- On signup, a `User` row is created with a persistent pseudonymous `handle` — the user picks from 3–4 auto-generated suggestions or types their own (with a live uniqueness check, a basic blocklist for company/reserved/profane names, and an anonymity nudge).
- A protected test endpoint confirms auth actually gates access.

*Why here:* auth is foundational and everything user-specific depends on it. Wiring it now (before features) means features are built on real identity from the start, not retrofitted.

**0.5 — Frontend skeleton**
- Vite + React + TS app boots.
- Can sign in via Supabase Auth.
- Calls the backend health check and displays the result — proving the frontend ↔ backend ↔ DB pipe works end to end.
- Basic routing set up (empty FeedPage, etc.).

**0.6 — Deploy the skeleton**
- Frontend deployed (Vercel), backend deployed (Render), DB + Auth on Supabase — all free tier.
- The deployed frontend successfully talks to the deployed backend which talks to the deployed DB.
- Environment variables configured per environment (never hardcoded).
- Minimal CI: on push, run tests (even if there's one trivial test) — establishes the habit.

*Why deploy now, with no features:* deploying is often where surprising problems hide (env vars, CORS, build config, DB connection strings). Finding them now, with an empty app, is trivial. Finding them later, tangled with feature bugs, is miserable. **Deploy early, deploy often.**

### Phase 0 exit gate
- A live URL where you can sign in, and the app successfully round-trips a request through frontend → backend → database → back.
- Schema migrated in all environments.
- `CLAUDE.md`, git hygiene, and env-var handling all in place.
- **Nothing user-facing works yet — and that's correct.** The gate is "the skeleton is solid and deployed," not "it does something useful."

---

## PHASE 1 — The core loop (this is v1)

**Goal:** the minimum that makes *posting a Sink feel good and reading the feed feel engaging.* This is the entire product hypothesis, and nothing else matters until it's proven.

**Why this is the whole ballgame:** every later phase assumes people post and read. If they don't, nothing downstream has value. This phase exists to answer one question honestly and cheaply, before you invest in anything that depends on the answer being yes.

**Entry gate:** Phase 0 exit gate met.

### What Phase 1 contains

Phase 1 grew: the product is now a Reddit-style community, not a rejection form, so the core loop is richer. It's worth **splitting into 1a and 1b** so you ship and test the riskiest part first.

**Phase 1a — the posting loop (ship + test this alone first):**
- **Post a Sink** — category-first `SinkComposeForm`: pick a category → form reveals title, body, and any category-conditional fields (company, conclusion, poll options) → Zod-validated `POST /api/v1/sinks`. Manual, no AI, <60s.
- **Categories** — seeded category table driving compose + feed filter (Interview Experience, Rejection, Ghosted, Offer, Salary, Layoff, Poll, Advice, Discussion, Rant, Meme, Resource).
- **The feed** — paginated, filterable by category, sortable new/top → `SinkCard`s with category pills.
- **Buoys & Anchors** — two-way voting (up/down), score = buoys − anchors.
- **Profile (basic)** — handle + post history.
- **Basic moderation** — report/hide, manually reviewed at this scale.

*1a gate:* do people want to post and read Sinks? This alone answers the core hypothesis with the least build.

**Phase 1b — the discussion layer (add once 1a is proven):**
- **Comments** — threaded (top-level + replies).
- **Polls** — 2–6 options, one vote per user per poll, live result bars.

*Why split:* 1a tests the riskiest assumption (will anyone post) cheaply; 1b adds engagement depth once that's proven. If comments/polls matter less than expected, you learn it before building them. You can also just build all of Phase 1 at once — the split is a de-risking option, not a mandate.

### The critical Phase 1 activity that isn't code: seeding
Because there's no AI cold-start bridge, **you must seed the feed yourself** with 30–50 real, relatable Sinks across a few categories (yours, friends' with permission, curated public ones) *before* showing it to anyone. An empty feed feels dead; a seeded one feels alive. Not optional polish — load-bearing for the whole test.

### Phase 1 exit gate (the most important gate in the project)
- The loop works end to end, deployed: a real person can sign up, post a Sink (with a category), see it in the feed, vote, comment, and vote in polls.
- **The qualitative test passes:** you and a handful of real early users genuinely find posting satisfying and reading/voting/commenting engaging. Not "it functions" — "it feels good."
- If the loop *doesn't* feel good: **stop and fix the loop.** Do not proceed to Phase 2. No amount of badges or later features rescues a core loop that isn't satisfying. This is the honest gate that saves you from building a beautiful dead product.

---

## PHASE 2 — Identity & retention spine

**Goal:** give people reasons to come *back*, converting one-time visitors into returning users. This is where MAU (a retention number) starts to become real.

**Why now:** Phase 1 proves the loop is satisfying *once*. Phase 2 makes it a *habit*. Retention is the hard part of hitting real user numbers, and the job hunt's months-long nature is your natural retention window — this phase builds the features that exploit it.

**Entry gate:** Phase 1 loop proven satisfying.

### Contains
- **Application tracker (standalone, private)** — a *separate* product from the public Sink feed, NOT derived from Sinks. A private log where the user records every job application (company, role, dates, status funnel: applied → response → interview → outcome) and **attaches the tailored resume (+ cover letter) they used for that job** — so storage enters here (Supabase Storage, private-by-default; see note). Gives response rate / ghost rate across *all* applications, not just the memorable ones a user chose to post. This is the JobMaxxing-overlap piece and its own mini-spec when you reach it.
  - **One-way bridge to Sinks:** a "post a Sink from this application" action that pre-fills a Sink compose from a tracked application's data. Convenience only — the two are independent data models, not coupled. The bridge must let the user choose what becomes public (the tracker holds real PII: resumes, real company names, real dates — it never touches the pseudonymous public side).
- **The Comeback flow** — close out Sinks with a "Comeback" post when you land a job. This flips landing-a-job from a churn event into a return event, and produces your most shareable content.
- **Richer profiles** — sink history, join date, (later) badges.
- **Persistent handle refinement** — ensure the pseudonymous identity feels like an identity worth building.

### Exit gate
- Measurable return behavior: people come back across multiple sessions/weeks, not just once. (Now you have enough usage to actually measure this — basic analytics should be in place.)

---

## PHASE 3 — Community depth & growth (formerly "the Ghost Index")

> **Reconciliation note:** earlier versions of this doc made the **Ghost Index** (aggregate company ghost-rates / scorecards) the Phase 3 "moat." The product has since shifted to a **text-first Reddit-style community** where `company` is optional free text, which means the Ghost Index is **not cleanly buildable** without first promoting companies to canonical entities. So the moat has moved from *proprietary data* to *community + content*, and Phase 3 is reframed accordingly. The Ghost Index survives only as an **optional fork** (below), not the default plan.

**Goal:** deepen the community and turn it into a growth engine — the things that make a Reddit-style product sticky and self-propagating.

**Why now:** Phases 1–2 prove the loop and build retention. Phase 3 is where a working community compounds: better discovery, richer participation, and content that pulls new people in.

**Entry gate:** an active community with recurring posting/voting/commenting.

### Contains (community-first)
- **Discovery & sorting** — hot/top/rising algorithms, category hubs (a "page" per category, e.g. all Interview Experiences), search.
- **Notifications** — replies to your Sinks/comments, poll results, someone buoyed you — the return-driver every community needs.
- **Following / feed personalization** — follow categories or users; a "your feed" vs "all."
- **Company mentions as soft tags** — since `company` is free text, offer a lightweight "Sinks mentioning Amazon" view via text match. Useful and low-effort, without the full canonical-data project.
- **Basic SEO** — clean URLs, meta tags on Sinks and category hubs, so the community's content pulls organic search traffic (a Sink titled "Razorpay SDE-1 interview experience" is a search magnet on its own).

### The optional fork — bring back the Ghost Index
If, once you have volume, you decide aggregate company data is worth it:
- Introduce a canonical `Company` table, migrate `company` free text → `companyId` (backfill by matching strings).
- Then build scorecards (ghost rate, time-to-reject), "you're not alone" counters, and company-page SEO.
- This is a strong candidate for a separate **FastAPI service** (your Python rep): read-heavy, bounded, doesn't gate the core product.
- **Decide this deliberately** — it's a real added-scope commitment, not a free add-on. The community can absolutely succeed without it.

### Exit gate
- Measurable organic growth: content pulling in new users via search/shares, and discovery/notifications lifting repeat engagement.

---

## PHASE 4 — Trust & gamification

**Goal:** deepen engagement and data quality via verification (trust) and rewards (engagement).

**Why now:** verification (Verified Sink badge) makes contributions *trustworthy* and adds a status layer, which matters most once there's an active community to earn status in. Gamification (Aura, tiers, streaks) rewards the behaviors you now know are valuable. Both are amplifiers of an already-working community — pointless before there's one to amplify. (If you took the Ghost Index fork in Phase 3, verification also makes that data credible.)

### Contains
- **Verified Sink badge** — email-forward / `.eml` upload → DKIM validation (start honor-system Tier 1, upgrade to real DKIM). Trust + status in one. Strips PII, keeps domain/date only.
- **Aura points** — weighted toward *helpfulness*, never toward failure itself (the cardinal gamification rule — don't incentivize collecting rejections).
- **Rank tiers** (Puddle → Mariana Trench), **survival streaks**, **categories**.

### Exit gate
- Verified Sinks flowing and weighting the Ghost Index; gamification measurably lifting return/contribution without corrupting authenticity.

---

## PHASE 5 — Growth mechanics

**Goal:** make SinkedIn spread *beyond* itself — turn users into distribution.

**Why now:** you only want to amplify a product that already retains. Driving growth to a leaky bucket (Phase 1 with no retention) wastes the growth. By now the bucket holds water, so growth compounds.

### Contains
- **Shareable card export** — every Sink/Comeback exports as a branded image for Instagram/X. Users become marketing; your watermark rides every share.
- **Hall of Fame / Sink of the Week** — curated, screenshot-bait, weekly return reason.
- **Market weather / aggregate stats** — "4,201 sinks this week, ghost rate up 12%" — press-friendly, recurring shareable.

### Exit gate
- Measurable external referral traffic from shared content.

---

## PHASE 6+ — AI & monetization

**Goal:** make it smarter (AI) and make it sustainable (revenue). Deliberately last.

**Why last:** AI adds cost, complexity, and failure surface — worth adding only once the product is proven and you know *where* AI genuinely helps. Monetization comes after you have the scale and trust that make it work without betraying users. Both are *additive on a validated product*, not foundations.

### Contains (candidates, sequenced by fit)
- **AI layer (additive):** the roast, the corporate-speak translator, and auto-parsing the compose flow (AI pre-fills, user still confirms). Drops on top of the *existing* manual schema — no rework, because the manual form stays as the fallback. This is also your "ship AI into a live product" learning milestone.
- **Monetization, ranked by brand fit:**
  1. Honest-employer marketplace (companies pay to prove they *don't* ghost — aligned incentives, free users untouched).
  2. Freemium utility (advanced tracker/analytics paid; cathartic core free forever).
  3. B2B candidate-experience data (high margin, later, careful framing).
  4. Ads — last resort, off-brand for a "no-tracking, honest" product.

**All three good monetization paths run on the same Sink data you've captured since Phase 1** — which is why capturing clean structured data from day one mattered. You don't decide monetization now; you keep the doors open by keeping the data clean.

---

## The two rules that govern the whole roadmap

1. **Never skip a gate.** Each phase's exit gate protects the next phase's investment. The Phase 1 gate ("does the loop feel good") is the one that matters most — honor it even if it means stopping.
2. **Never build ahead of the current phase.** It's tempting to add a Phase 4 badge while building Phase 1. Don't. The PRD and this roadmap exist precisely to resist that pull. Build what the phase needs, ship it, prove it, then move on. Scope discipline is the difference between shipping and stalling.

---

## The trademark thread (unchanged, runs parallel to all phases)

Independent of the build: the SinkedIn name carries real trademark risk (near-homophone of a defended mark, same market, commercial use). It doesn't block building, but resolve the one open item — an actual IP-lawyer conversation — *before* putting money or serious time behind the brand commercially (realistically before Phase 6 monetization, ideally sooner). This is the one risk no engineering decision addresses.

---
---

# Appendix — What the user can actually do after each phase

> The phases above describe what you *build*. This describes what a real person can *do* once each phase ships. This framing matters because the point of a phase isn't the code — it's the new capability a user gains. If you can't name a concrete new thing the user can do after a phase, the phase was probably scoped wrong. Read this as "the promise each phase makes to the user."

## After Phase 0 — Foundation
**User-facing capability: almost none — and that's correct.**
- A user can land on the site, sign up, and log in.
- They get an anonymous handle.
- They see an empty shell — no feed, no posting, nothing to do yet.

This is the one phase where "the user can barely do anything" is the *right* outcome. Phase 0 is a promise to *you* (the plumbing works), not to the user. If a stranger visited now they'd bounce — that's fine, because you're not showing it to strangers yet.

## After Phase 1 — The core loop (v1)
**User-facing capability: a working Reddit-style job-pain community. The first phase a real person would actually use.**

A user can now:
- **Post a Sink** — write a title + body, pick a category (Rejection, Interview Experience, Discussion, Poll, Rant, etc.), and add the category's optional fields (company, conclusion, poll options), in under a minute, anonymously.
- **Read the feed** — scroll everyone's Sinks, each labeled with its category.
- **Filter by category** and **sort** by new or top.
- **Buoy or anchor** — up/down vote any Sink.
- **Comment** — reply on Sinks, and reply to comments (threaded).
- **Vote in polls** — tap an option, see live result bars.
- **See a profile** — a user's handle + post history.

**The felt experience:** "It's a Reddit built for the job hunt — I ranted about a rejection and got 40 buoys and a dozen 'been there' replies, voted on someone's '12 LPA?' poll, and read three interview experiences for a company I'm interviewing at." A genuine community, not just a vent-wall.

**What they still can't do:** track their own hunt privately, post a Comeback, earn Aura/ranks, verify anything, or share outside the app.

## After Phase 2 — Identity & retention
**User-facing capability: a reason to come back, and a private tool that makes the job hunt itself easier.**

On top of Phase 1, a user can now:
- **Track their own job hunt** — a private, standalone application tracker (separate from the public feed) where they log every application, watch their funnel/response rate/ghost rate, and store the tailored resume they used for each job. SinkedIn becomes a *useful tool*, not just a place to vent. Optionally, they can post a Sink straight from a tracked application.
- **Post a Comeback** — when they land a job, close out their Sinks with a redemption post ("40 rejections, 1 offer, here's what worked").
- **Build a persistent identity** — their handle now accrues a real history worth returning to.

**The felt experience:** "I'm using this to actually manage my search — logging every application, watching my response rate — and when I finally got the offer, posting the Comeback was the most satisfying thing I've done online all year." The user now has a *habit reason* (the tracker) and a *return reason* (the Comeback), not just a one-time cathartic hit.

**What they still can't do:** see cross-user aggregate intelligence (which company ghosts most), or prove their Sinks are real.

## After Phase 3 — Community depth & growth
**User-facing capability: better discovery, staying in the loop, and content that pulls new people in.**

On top of Phase 2, a user can now:
- **Discover** — hot/top/rising sorting, per-category hubs (all Interview Experiences in one place), search.
- **Stay in the loop** — notifications when someone replies, buoys them, or a poll they're in resolves.
- **Personalize** — follow categories or users; a "your feed" vs "everything."
- **Find company mentions** — a lightweight "Sinks mentioning Amazon" text-match view (soft, since company is free text).
- **Arrive from Google** — a Sink titled "Razorpay SDE-1 interview experience" pulls in searchers, who then find a whole community.

**The felt experience:** "I follow the Interview Experience and Salary categories, get pinged when someone replies to my rant, and I found this place by Googling a company's interview process." The community now compounds and self-propagates.

*(If the optional Ghost Index fork was taken: users could also check aggregate ghost-rates/scorecards before applying — but that's a deliberate added-scope choice, not the default path.)*

**What they still can't do:** verify contributions, or earn status for contributing.

## After Phase 4 — Trust & gamification
**User-facing capability: credibility and status — reasons to contribute *more* and to *trust* what they read.**

On top of Phase 3, a user can now:
- **Verify a Sink** — forward the rejection email (or upload the `.eml`) to earn a "Verified" badge, proving it's real *without* revealing their identity.
- **Trust contributions more** — verified badges mark real experiences, so interview intel and company mentions carry more weight. (And if the Ghost Index fork was taken, verified Sinks weight that data too.)
- **Earn Aura** — accrue points for posting and, more heavily, for *helping* others (referrals, intel, support).
- **Climb rank tiers** — progress from Puddle toward Mariana Trench; wear survival streaks and categories as identity.

**The felt experience:** "My rejections are verified so people take my company reports seriously, I'm a 'Deep Water' rank after surviving 30 rejections, and I've got more Aura from helping people than from my own Ls." Contributing now has *status payoff*, and reading now comes with *trust*.

**What they still can't do:** easily spread SinkedIn content to their own social audiences.

## After Phase 5 — Growth mechanics
**User-facing capability: the ability to take SinkedIn content out into the world.**

On top of Phase 4, a user can now:
- **Export a shareable card** — turn any Sink or Comeback into a clean, branded image for Instagram/X.
- **Get featured** — land in the weekly Hall of Fame / Sink of the Week.
- **Share aggregate moments** — repost "market weather" stats ("ghost rate up 12% this week").

**The felt experience:** "I posted my Comeback card to LinkedIn and Instagram, it got more engagement than anything I've ever shared, and three friends signed up." The user becomes a *distribution channel* — every share pulls new people in.

**What they still can't do:** get AI assistance, or (as a company) pay to prove they're a good employer.

## After Phase 6+ — AI & monetization
**User-facing capability: a smarter, faster experience — and, for companies, a way to participate.**

On top of Phase 5, a user can now:
- **Get an instant AI roast/commiseration** on a posted rejection.
- **Auto-fill a Sink** by pasting the rejection email (AI extracts the fields; they just confirm).
- **Decode corporate-speak** — translate "your experience more closely aligns" into the honest meaning.
- **(Power users) pay for advanced tools** — deeper tracker analytics, alerts, follow-up help.
- **(Companies) participate honestly** — pay to post verified-responsive listings and earn a "we don't ghost" badge.

**The felt experience:** "I pasted my rejection, got a laugh from the AI roast in one second, the fields filled themselves in, and I noticed the honest employers now have a badge showing they actually reply." The product is now smarter for users and sustainable for you — without ever having put a paywall or an ad in front of the free cathartic core.

---

## The capability ladder, in one view

| After phase | The user can newly... | Who it serves |
|---|---|---|
| 0 | Sign up, log in (nothing else) | Nobody yet (proves plumbing) |
| 1 | Post Sinks (category + text), read/filter/sort feed, buoy/anchor, comment, poll | Posters + readers (community) |
| 2 | Track their own hunt, post a Comeback | Returning users (habit + hope) |
| 3 | Discover (hot/top/hubs/search), get notified, follow, arrive from Google | **Lurkers too** (discovery, SEO) |
| 4 | Verify Sinks, earn Aura, climb ranks | Contributors (status + trust) |
| 5 | Export shareable cards, get featured | Sharers (distribution) |
| 6+ | Get AI help; companies can participate | Everyone + revenue |

Notice the audience *widens* each phase: Phase 1 serves people willing to post; Phase 3 is the pivotal expansion because it starts serving people who only *read* (a far larger group); Phase 5 turns users into acquisition. Each phase doesn't just add a feature — it adds a *new kind of user* the product can serve. That widening is the real growth engine, and it's why the order matters.
