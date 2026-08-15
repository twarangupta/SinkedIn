# SinkedIn — Retention Features (context addendum)

Context for Claude Code and future-me. These are the five highest-leverage **retention** bets, folded into the phase where each belongs. This is a *planning lens*, **not** a licence to build ahead: every item is gated by its phase's entry gate, exactly like the roadmap. Build nothing here until its phase is active. When a phase is reached, the relevant item gets folded into that phase's own spec.

Companion to `2_SinkedIn_Phased_Roadmap.md` (the sequence), `SinkedIn_PRD.md` (v1 what), and `SinkedIn_Tech_Spec_Phase0_1.md` (Phase 0/1 how). Where an item touches Phase 0/1, that's called out so the *data* is captured clean now even though the *feature* ships later.

---

## Cross-cutting positioning — "narrow soul, wide door"

**Decision:** the audience is **anyone in a tech/corporate career**, not job-seekers only — but the anti-LinkedIn, honest, darkly-funny identity is preserved as the *voice and brand*. Job-seekers are the emotional core; employed professionals are why the community doesn't churn every time someone lands a job (see Grapevine: ~400k weekly actives, an employed-professional anonymous community).

**How it constrains every feature below:** widen *content coverage* (salary confessions, company intel, interview prep — things employed people never stop caring about) but keep the *delivery* raw, confessional, and funny. Guardrail test for any new surface: **"would this feel at home on LinkedIn?" If yes, it's off-brand.** No jobs board, no networking, no polished comp calculator — those are LinkedIn/Grapevine, not SinkedIn.

This is a lens, not a build task. It mainly means: don't scope the data model so narrowly that only active-search behaviour fits.

---

## 1. Structured Interview-Experience Hub + SEO  — *Phase 3 (seed data in Phase 1)*

**What:** a structured template for the Interview Experience category (rounds, questions asked, difficulty, stage reached, outcome, company) that renders as **server-side-rendered, SEO-indexed pages** (Next.js App Router — real HTML + OpenGraph). Plus per-category / per-company hubs. This is both genuine utility (people Google "[company] interview experience" during prep) and the primary organic-acquisition engine.

**Why it retains + acquires:** validated by scale — AmbitionBox (~6.4M monthly users) and GeeksforGeeks (~35M monthly users) were built largely on this exact search intent. They're soulless data dumps; SinkedIn's wedge is the *same SEO surface wrapped in a community with a voice*. It also serves employed lurkers (prep before they're even job-hunting) — the wide-door audience.

**Phase 0/1 action (data hygiene only):** the Interview Experience category already exists (Phase 1). Keep its `company` field and encourage a lightly-structured body now so the data is clean when the hub is built in Phase 3. **Do not build the hub or SEO tooling in Phase 1** — just don't pollute the data.

**Status vs. current plan:** partially present (category + "category hubs" + "basic SEO" are in Phase 3); the *structured template* and *SEO-as-primary-engine* framing are new. Consider pulling basic SEO earlier since it compounds slowly.

## 2. Weekly digest email — *Phase 2*

**What:** a personal "your week in the trenches" email — e.g. "4 applications, 1 ghost, 25% response rate, 3 replies to your Sinks." Built from the user's tracker + activity.

**Why it retains:** email/notification loops are *the* mechanical return driver for communities; this is the single cheapest retention win currently missing from the plan. The job hunt's months-long span is the natural cadence.

**Notes:** needs a transactional-email provider — defer the choice to Phase 2 (a free tier like Resend is fine). Keep the tone on-brand (funny, not corporate-HR). **New — not in the current plan.**

## 3. "You're not alone" counter + Ghost timer — *Phase 2*

**What:** two solidarity mechanics. (a) **Counter:** on a rejection/ghost from Company X, show "23 others were rejected by X this month" via **text-match on the free-text `company`** — no canonical Company table needed (stays consistent with the deferred Ghost Index decision). (b) **Ghost timer:** a live "ghosted for 34 days" counter on ghosted posts / tracked applications.

**Why it retains:** belonging is the emotional hook (you're not failing alone), and the ghost timer manufactures return visits ("let me check on my ghost") while being darkly funny and perfectly on-brand.

**Notes:** the counter is a soft, approximate text-match — present it as vibes, not precise stats. **Mostly new** (adjacent to Phase 3's "Sinks mentioning Amazon" soft tags, but the counter + timer framing is new; timer isn't in the plan at all).

## 4. Comeback flow + Comeback card — *Phase 2 (flow) / Phase 5 (card)*

**What:** close out your Sinks with a "Comeback" post when you land a job ("40 rejections, 1 offer, here's what worked"), and later export it as a branded, LinkedIn-optimized shareable card.

**Why it retains + spreads:** flips landing-a-job from a *churn event* into a *return event*, and the card turns users into distribution — the anti-LinkedIn spreading *through* LinkedIn, where layoff/comeback posts already go viral.

**Status vs. current plan:** **already in the plan** (flow = Phase 2, card = Phase 5). Listed here for completeness so the retention set is in one place. No change needed.

## 5. Resilience streak (the safe gamification) — *Phase 4*

**What:** reward *showing up* through the grind — "12 days still swimming," survival milestones — as light identity. Pairs with rank tiers (Puddle → Mariana Trench) and Aura.

**Why it retains (and the hard rule):** gives a habit/identity reason to return **without ever rewarding failure itself.** Aura and streaks weight toward *helping others* (advice, interview intel, support) and *persistence* — **never toward collecting rejections.** Gamifying failure is off-brand and harmful; this is a wellbeing + integrity line, not a style choice.

**Status vs. current plan:** Aura/ranks are in Phase 4; the explicit "resilience, never failure" reframing is the important clarification.

---

## 6. Category reactions / solidarity taps — *Phase 1b–2*

**What:** one-tap, category-specific reactions on a Sink, beyond the buoy/anchor vote — e.g. Rant → "Been there" / "IKR" / "Oof"; Rejection → "F" / "Their loss"; Ghosted → "Classic" / "Same"; Comeback → "Let's go" / "Inspiring". A lightweight emotional/solidarity layer.

**Why it retains:** a one-tap reaction is lower friction than a comment, so far more people engage; it directly serves the "you're not alone" belonging hook (item 3) and fits the confessional, darkly-funny voice. Reaction counts can later feed the "not alone" counter.

**Design notes (decide deliberately when built):**
- **Separate from Buoys/Anchors.** Voting stays the ranking signal (`score`); reactions are emotional solidarity with **no effect on score** — keep them visually and functionally distinct so it isn't confusing.
- **Config-driven per category** — the reaction set is data on the `Category` (like the `showsCompany` / `allowsPoll` flags), so adding reactions to a new category is a *data* change, not code. Needs a small schema addition (a `Reaction` table + per-category reaction config) when built.
- One reaction per user per Sink (per type, or one total) — decide at build time.

**Status vs. current plan:** **new** — not in the roadmap yet. Adjacent to item 3 (solidarity). **Gate:** build only after the core loop (post / vote / comment) is live and has users proving they engage. Do NOT build ahead.

---

## One-glance phase map

| Retention feature | Phase | In plan already? | Phase 0/1 action |
|---|---|---|---|
| Interview-Experience Hub + SEO | 3 (seed in 1) | Partial | Keep Interview Experience data clean/structured |
| Weekly digest email | 2 | New | none |
| "Not alone" counter + Ghost timer | 2 | Mostly new | none (uses free-text company) |
| Comeback flow + card | 2 / 5 | Yes | none |
| Resilience streak (safe gamification) | 4 | Partial | none |
| Category reactions / solidarity taps | 1b–2 | New | none |

**Reminder:** none of these are Phase 0/1 build items. The only thing they ask of Phase 1 is *don't pollute the Interview Experience data*, so the SEO hub has clean input later. Everything else waits for its gate.
