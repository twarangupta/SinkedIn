# How to Build Production Software — The Steps, and Why Each Exists

> A learning guide, not just a checklist. For every stage: **what** it is, **why** it's required, **when** you do it, and **what breaks if you skip it.** SinkedIn is the running example. Read this once end-to-end to build the mental model, then refer back to each section as you reach that stage.

The single most important idea in this whole document: **software is built in a deliberate order because each stage produces the ground truth the next stage depends on.** Skip a stage or do it out of order, and later stages are built on guesses. Most "messy codebases" and "projects that stalled" are not caused by bad coding — they're caused by building in the wrong order, so the foundation kept shifting under the house.

---

## The order at a glance

```
1. Discovery        →  understand the problem & who has it
2. PRD              →  decide WHAT you're building and why (not how)
3. Tech design      →  decide HOW, at a high level
4. Data modeling    →  design the schema — the foundation everything reads from
5. API design       →  define the contract between frontend and backend
6. Design system    →  the visual + component rules
7. Project setup    →  repo, tooling, conventions, environments
8. Auth             →  identity, before anything user-specific
9. Vertical slices  →  build one full feature at a time, end to end
10. Testing         →  prove each slice works, mechanically
11. Version control →  git discipline (actually runs through everything)
12. CI/CD           →  automate build, test, deploy
13. Deployment      →  dev / staging / prod environments
14. Observability   →  logging, error tracking, monitoring
15. Security        →  runs through everything, but verify explicitly
16. Iteration       →  ship, measure, learn, repeat
```

Stages 1–6 are **design** (cheap to change, done on paper/docs). Stages 7+ are **build** (expensive to change). The whole art is doing enough design that the build doesn't thrash — but not so much that you're planning a product nobody wants. For a solo project, that means: enough PRD to know the scope, enough schema to not repaint the foundation, and then *build and learn*.

---

## 1. Discovery — understand the problem before the solution

**What it is:** Getting crisp on the actual problem, who has it, and how they cope today (competitors/alternatives). Not "what do I want to build" but "what pain am I removing, for whom."

**Why it's required:** Every downstream decision — what to build, what to cut, how to position — flows from *who the user is and what they need*. Build without this and you build features for an imaginary person. This is also where you discover you're not first (like SinkedIn's clones and AmbitionBox), which reshapes strategy rather than wasting months learning it later.

**When:** Before the PRD. It *feeds* the PRD.

**Skip it and:** you build something technically impressive that solves a problem nobody has, or that three competitors already solve better. The graveyard of dead side projects is mostly this.

**SinkedIn:** Discovery told us the confessional-feed lane is open but the "useful layer" (company reviews, interview intel) is already owned by well-funded incumbents — so the strategy became "own the rejection *moment*, keep the data narrow and sharp (ghost rate, timelines), don't try to out-AmbitionBox AmbitionBox."

---

## 2. PRD (Product Requirements Document) — decide WHAT, and why

**What it is:** The single source of truth for *what v1 is*. Problem statement, target user, the core loop, in-scope vs. explicitly-out-of-scope, user stories, success criteria. It deliberately does **not** describe *how* (no tech choices) — only *what* and *why*.

**Why it's required:**
- It's your defense against scope creep, which is the #1 killer of solo projects. When you've brainstormed 40 features (like we did), the PRD is what says "these 6 are v1, the other 34 are later." Without a written scope, every good idea feels urgent and you build forever and ship nothing.
- It aligns everyone (even if "everyone" is just you across different days). The-you-at-2am wanting to add a feature can be overruled by the-you-that-wrote-the-PRD.
- It defines *done*. You can't finish something with no definition of finished.

**When:** After discovery, before any technical design. It's the input to the tech spec.

**Skip it and:** scope balloons, you never ship, and you can't tell whether you're making progress because there's no defined finish line.

**Key principle — separate WHAT from HOW.** The PRD says "users can post a rejection in under 60 seconds." It does *not* say "using a React form with a Zod-validated Express endpoint." Mixing them means every tech change reopens the product debate. Keep them in separate docs.

**SinkedIn:** the PRD locks v1 to Sinks-only (post, feed, react, company page, profile) and *explicitly lists* what's deferred (AI, verification, Ghost Index, gamification) so those don't sneak in.

---

## 3. Technical design / architecture — decide HOW, at a high level

**What it is:** The engineering counterpart to the PRD. Stack choice, system shape (frontend/backend/DB), major libraries, how the pieces talk, and the *reasoning* behind each choice. High-level — not every function, but every load-bearing decision.

**Why it's required:** Architecture decisions are the expensive-to-reverse ones. Choosing your database, your auth approach, your language — these ripple through everything. Making them deliberately (and writing down *why*) means future-you (and Claude Code) understand the constraints instead of fighting them. The written reasoning is as valuable as the decision: six months later "why did I pick Postgres?" has an answer.

**When:** After the PRD (you need to know *what* before choosing *how*), before writing code.

**Skip it and:** you make architecture decisions implicitly, one file at a time, with no coherence — and end up with three different ways of doing the same thing, which is exactly the "schema drifting across three locations" kind of debt.

**SinkedIn:** Node/Express/TS + React/TS + Postgres + Prisma + Zod + Supabase Auth. Each chosen for a reason (Prisma generates types = anti-hallucination ground truth for Claude Code; Postgres = relational + aggregate-friendly for the Ghost Index; Supabase Auth = don't roll your own auth, and it bundles the Postgres DB in one free provider).

---

## 4. Data modeling / database design — the foundation everything reads from

**What it is:** Designing the schema — tables, columns, types, relationships, constraints — *before* writing app code. For SinkedIn: User, Company, Sink, Reaction, and how they relate.

**Why it's THE most important stage:** Your entire app is "the data, displayed and manipulated in different ways." The feed, the company page, the Ghost Index, the tracker — all are *views over the same data*. If the schema models reality correctly, features are cheap to add (just a new query). If it's wrong, every feature fights it, and fixing the schema later means painful migrations plus rewriting everything that touched it.

**This is why data modeling comes before code, always.** Code is easy to change; a schema with production data in it is not. You can rewrite a function in minutes; migrating a live table with a million rows, without downtime or data loss, is a genuinely hard operation. So you pay the thinking cost up front, when it's free.

**When:** Right after tech design, before any feature code. The very first thing you build.

**Skip it (or rush it) and:** you get the classic disasters — company stored as free text so "Amazon"/"amazon"/"Amazon India" are three companies and your Ghost Index is garbage; no soft-delete so a bug erases data forever; types as loose strings so aggregation is impossible. These are the mistakes that are nearly free to prevent now and brutally expensive to fix later.

**Core data-modeling principles (learn these):**
- **Normalize the things that must be consistent.** `Category` is its own table with one canonical row per category; every Sink references it by ID (foreign key), and its config flags drive the compose form — so adding a category is a data change, not a code change. (Note the deliberate counter-example: `company` is kept as optional *free text*, not a canonical table. That's a real tradeoff — it keeps the text-first model simple but means aggregate company stats / the Ghost Index aren't buildable without first promoting company to a canonical entity. See the PRD §9 and Tech Spec tradeoff note.)
- **Constrain with enums/types.** `Conclusion` and `VoteValue` are fixed sets, not free strings. Clean data in = trivial aggregation out.
- **Never hard-delete.** Use a `deletedAt` timestamp. You want the data even when a post is hidden, and deletes are irreversible.
- **Anticipate near-future fields.** Add `isVerified` (defaulted false) now even though verification is Phase 4 — designing the *shape* to expect it avoids a messy migration later. But don't over-engineer for features you may never build.
- **Index what you query.** Columns you filter/sort by (categoryId, score, createdAt) get indexes so queries stay fast as data grows.

---

## 5. API design — the contract between frontend and backend

**What it is:** Defining the endpoints — what routes exist, what they accept, what they return. The *contract* the frontend and backend both agree to.

**Why it's required:** The frontend and backend are two programs that talk over HTTP. If they disagree on the contract, nothing works. Designing the API explicitly means both sides build to the same agreement, and you can build them in parallel (or, solo, build the backend knowing exactly what the frontend will need). It also forces you to think in terms of *resources and operations* ("a Sink can be created, listed, fetched, reacted to") which clarifies the whole system.

**When:** After the schema (endpoints operate on your data model), before building either side.

**Skip it and:** frontend and backend drift, you constantly rework response shapes, and you get the "three drifting output schemas" problem where the same data has a different shape in different places.

**Principles:**
- **Version from day one** (`/api/v1/`). Costs nothing now; saves a painful migration when you change response shapes later.
- **REST unless you have a strong reason not to.** Predictable, boring, well-understood. GraphQL is powerful but adds complexity a solo v1 doesn't need.
- **Validate at the boundary.** Every incoming request is validated (Zod) *before* it reaches your logic. Never trust client input — this is both a data-quality and a security guardrail.
- **Layer it:** thin route (HTTP only) → service (business logic) → data access (Prisma). This separation is what keeps logic testable and keeps AI-generated changes scoped to one layer.

---

## 6. Design system — visual and component rules

**What it is:** Not mockups of every screen, but the *rules*: color palette, typography scale, spacing, and the reusable component primitives (SinkCard, TypeBadge, ReactionBar). The vocabulary everything is built from.

**Why it's required:** Consistency and speed. If every screen invents its own button, the app looks amateur *and* every screen is bespoke work. Define primitives once, compose screens from them, and new features become "arrange existing pieces" instead of "build new UI." This is literally what "add features easily" means in practice.

**When:** After you have mockups/visual direction (like the ChatGPT designs), before building many screens. You can refine it as you go, but establish the primitives early.

**Skip it and:** visual inconsistency, duplicated component code, and a UI that's slow to extend because nothing is reused.

**SinkedIn:** one `SinkCard` powers the feed, company page, and profile. Build it once, well; compose everything from it and a handful of siblings.

---

## 7. Project setup — repo, tooling, conventions, environments

**What it is:** Scaffolding the actual project: repository, folder structure, linter/formatter, environment variable handling, and — critically for you — the `CLAUDE.md` that tells Claude Code your conventions.

**Why it's required:** This is the groundwork that makes everything after it smooth. Conventions decided now (folder structure, naming, where things live) prevent the codebase from becoming a pile of inconsistent decisions. Environment/secrets hygiene set up now prevents leaking API keys later. And `CLAUDE.md` set up now is what keeps the AI accurate for the entire rest of the build.

**When:** First thing in the build phase, after design is settled.

**Skip it and:** secrets get committed to git (a real security incident), the folder structure becomes chaos, and Claude Code guesses your conventions and guesses wrong.

**Key pieces:**
- **`.gitignore` + `.env.example`** before any secret exists — so keys never get committed.
- **Linter + formatter** (ESLint + Prettier) — mechanical consistency, no bikeshedding.
- **Folder structure** reflecting the layers (routes/, services/, prisma/, components/, hooks/).
- **`CLAUDE.md`** — stack, conventions, schema summary, "small scoped tasks only." This is your primary lever for AI accuracy.

---

## 8. Auth — identity, before anything user-specific

**What it is:** How users prove who they are. For SinkedIn: real auth via Supabase Auth, plus generating a pseudonymous public handle that's never linked to the real identity in public views.

**Why it comes early:** Almost everything else is *user-specific* — a Sink belongs to a user, reactions belong to a user. You can't build those correctly until "who is the current user" is a solved question. Auth is also the highest-stakes security surface, so you use a proven service rather than rolling your own.

**When:** Early in the build, right after project setup, before user-specific features.

**Skip/delay it and:** you build features with a fake "current user," then have to retrofit real auth through all of them — painful and bug-prone. And rolling your own auth is how solo devs ship security holes.

**SinkedIn-specific:** the identity model is the privacy backbone — real email is auth-only, public views only ever expose the handle. Enforce this at the query level (only select safe fields), not by remembering to strip fields later.

---

## 9. Vertical slices — build one full feature end to end

**What it is:** Building the app as complete *vertical* slices (one feature, all the way from DB → API → UI → deployed) rather than horizontal layers (all the DB, then all the API, then all the UI).

**Why it's the right way:** A vertical slice is *shippable and testable* — you can see it work end to end and get feedback. Horizontal building means nothing works until the very end, so you discover integration problems late, when they're expensive. Slices keep you *always close to working software*, which is both motivating and safe.

**When:** The main build phase, after the foundation (schema, auth, setup) is laid.

**Skip it (build horizontally) and:** you spend weeks with nothing runnable, then hit a wall of integration bugs all at once, and you can't get user feedback until it's too late to act on it.

**SinkedIn:** "post a Sink" is a slice (form → validated endpoint → DB write → appears in feed). Build that whole slice, see it work, *then* do reactions as the next slice. Each slice leaves you with a working, slightly-more-capable app.

**How this pairs with AI:** small scoped tasks = accurate AI. "Build the post-a-Sink endpoint given this schema and Zod validator" gets correct code. "Build SinkedIn" gets a hallucinated mess. The vertical slice, broken into sub-tasks, is the unit you hand Claude Code.

---

## 10. Testing — prove each slice works, mechanically

**What it is:** Automated tests that verify your code does what it should — run by a machine, repeatably, instead of you clicking around manually.

**Why it's required:**
- **It's how you catch AI mistakes mechanically.** When Claude Code writes a service function, a test either passes or it doesn't — you don't have to read every line hoping to spot a bug.
- **It's your safety net for change.** Tests let you refactor or add features confidently, because if you break something, a test fails immediately instead of a user finding it in production.
- **It documents intent.** A test says "this function should do X given Y" — that's executable documentation.

**When:** Alongside each slice — ideally write the test as you build the feature, not "later" (later never comes). Not necessarily strict TDD, but tests-with-features, not tests-someday.

**Skip it and:** every change is a gamble, you fear touching working code, AI-introduced bugs slip through, and regressions (things that used to work breaking) pile up silently.

**What to test (pragmatically, for a solo v1):** the business logic in your service layer (does `createSink` validate and store correctly?), the critical paths (auth, posting, the privacy guarantee that public responses never leak email). You don't need 100% coverage — you need the important and the breakable covered.

**SinkedIn:** Vitest. Every service function gets a test. This also fills a real gap on your résumé (no testing framework named) — a concrete reason to build the habit here.

---

## 11. Version control (git) — the discipline running through everything

**What it is:** Git — tracking every change, in small commits, with a workflow (branches, meaningful messages, a main branch that always works).

**Why it's required:** It's your undo button, your history, your safety net, and — when you collaborate or open-source — how others read your work. It also enables everything in CI/CD. Committing in small, logical units means you can always roll back to a working state and understand *why* each change happened.

**When:** From the very first file. `git init` is step zero of the build.

**Skip it (or use it badly — giant rare commits) and:** you can't undo a mistake, can't find when a bug was introduced, and lose the ability to work safely. Bad git hygiene (huge commits, "fixed stuff" messages) makes your own history useless to you.

**Good habits:** small commits, present-tense meaningful messages ("add reaction endpoint," not "stuff"), a `main` that always builds, feature work on branches. For your portfolio specifically, clean git history is something interviewers actually look at.

---

## 12. CI/CD — automate build, test, and deploy

**What it is:** Continuous Integration / Continuous Deployment. Automation that, on every push, runs your tests (CI) and — if they pass — deploys (CD). Usually GitHub Actions.

**Why it's required:** It removes human error and friction from shipping. Tests run automatically so you can't forget; deploys happen consistently so "it works on my machine" stops being a problem. It makes shipping *routine and safe* instead of a scary manual ritual.

**When:** Once you have tests and a deploy target — early-ish, so the habit and safety are there from the start. Even a minimal "run tests on push" pipeline is worth it early.

**Skip it and:** you deploy manually (error-prone), sometimes forget to run tests, and shipping stays scary enough that you do it rarely — which means big risky releases instead of small safe ones.

---

## 13. Deployment & environments — dev / staging / prod

**What it is:** Where your app actually runs, and the separation of environments: **development** (your machine), **staging** (a production-like test environment), **production** (real users). Each with its own database and config.

**Why environments are separate:** You never test on real user data or experiment in production. Staging lets you verify a change in a prod-like setting before real users see it. Dev lets you break things freely. Mixing them means a dev experiment can corrupt real data or take the live site down.

**When:** Set up dev from the start; add a real deploy target (prod) once you have something worth showing; add staging when the stakes rise (real users, real data).

**Skip proper separation and:** you test in production (users see your bugs and half-built features), or you develop against the live database (one bad query wipes real data).

**SinkedIn:** local Postgres (Docker) for dev; hosted prod on the free tier (Vercel frontend + Render backend + Supabase Postgres/Auth). Config via environment variables, different per environment, never hardcoded.

---

## 14. Observability — logging, error tracking, monitoring

**What it is:** The ability to *see what your app is doing* in production. Logs (what happened), error tracking (Sentry — get notified when something breaks, with the stack trace), and monitoring (is it up, is it slow).

**Why it's required:** Once real users are on it, you can't see problems by looking at your own screen. Without observability, you find out about bugs when a user complains (if they bother) — or never. With it, you get told the moment something breaks, with enough detail to fix it. You cannot fix what you cannot see.

**When:** Before or right at launch — the moment real users arrive. Error tracking especially is a launch-day essential.

**Skip it and:** you're flying blind in production. Bugs go unnoticed, you have no idea what's slow or failing, and debugging a user's report is guesswork because you have no logs.

---

## 15. Security — runs through everything, verified explicitly

**What it is:** Not one stage but a thread through all of them — plus explicit checks. Validate all input, never trust the client, keep secrets in env vars, use proven auth, protect against the common web vulnerabilities (injection, XSS), rate-limit public endpoints, and guard your specific sensitive data.

**Why it's required:** A public app *will* be probed and abused. A post-anything site attracts spam and bad actors. And you have a specific high-stakes promise here: anonymity. A leak that links a handle to a real identity isn't just a bug — it's a betrayal of the core trust that makes people use SinkedIn at all.

**When:** Continuously, but with explicit review at each sensitive point (auth, the privacy boundary, any user input, payments if they ever exist).

**Skip it and:** data breaches, spam floods, abuse, and — worst for this product — a deanonymization leak that destroys trust permanently.

**SinkedIn specifics:** the pseudonym/real-identity split enforced at the query layer; rate limiting on posting; basic moderation/report tooling; input validation everywhere; secrets never in git.

---

## 16. Iteration — ship, measure, learn, repeat

**What it is:** The loop after launch. Ship a slice, watch how real people use it (analytics + feedback), learn, adjust, ship the next thing. Software is never "done"; it's *steered*.

**Why it's required:** Your plan is a hypothesis. Real users are the test. The PRD's success gate ("does posting feel good, does reading feel good") can only be answered by shipping and watching. Iteration is how a product becomes good — nobody designs it perfectly up front.

**When:** Continuously, after the first shippable slice is live. This is the steady state of the whole project.

**Skip it and:** you build in a vacuum, guess at what users want, and either over-build unwanted features or miss the ones that mattered.

**SinkedIn:** ship Phase 1, seed it, get a handful of real people posting, and *honestly assess the core loop* before building Phase 2. If the loop doesn't work naked, no leaderboard saves it — better to learn that with a small v1 than after building everything.

---

## The meta-lesson

Notice the shape: **cheap, reversible, thinking-heavy work first (discovery → design → schema); expensive, hard-to-reverse work later (code → data → production).** You front-load the decisions that are costly to change and back-load the ones that are cheap to change. That's the entire logic of the sequence.

And for building *with AI*: the same discipline that makes software maintainable — clear scope (PRD), clean schema, layered architecture, small tasks, tests — is *exactly* what keeps AI accurate. Good engineering practice and good AI-collaboration practice are the same thing. The docs you write for yourself are also the context that keeps Claude Code from hallucinating. That's not a coincidence; it's the core insight of building this way.
