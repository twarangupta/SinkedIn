# SinkedIn — UI Inspiration Board

> **What this is:** an idea-mining reference, captured from a dashboard mockup the user shared on 2026-08-22 **purely to spark ideas** — *not* a design spec, not a "this is how it must look," and not a build target. Treat every item as a candidate to consider, filtered through the brand rules below. Nothing here is approved scope.
>
> **Companion to** [`roadmap/README.md`](roadmap/README.md) (the real sequence) and [`3_Retention_Features.md`](3_Retention_Features.md).

---

## The one filter for everything on this page

> **Guardrail test:** *"Would this feel at home on LinkedIn? If yes, it's off-brand."* SinkedIn is the honest, darkly-funny side of work — raw, confessional, pseudonymous. Not a jobs board, not networking, not a polished career suite.

---

## Idea inventory (from the mockup)

### ✅ On-brand — worth pulling in early (cheap, fits the voice)

| Idea seen | Plain description | Notes |
|---|---|---|
| Feed tabs: *For you / Trending / Following / Latest* | Sort toggle at top of feed | This is the **"Top" sort** already planned. "Trending" = highest score this week. Cheap; shows newcomers the best content first. |
| Ghost timer on a post | *"It's been 21 days now. Ghosted 😐"* + a `21 Days` pill | Killer on-brand detail — just a date-diff, no new data model. (Full version is Phase 2; the display is nearly free.) |
| Darkly-funny microcopy | *"Keep going! Consistency > Luck"* | Exactly the **voice pass** already planned. Proves how much personality good copy adds. |
| Category / tag pills on posts | *Interview Experience*, *Discussion*, *Interview Questions* | Already have categories; the pill styling is a nice reference. |
| Structured interview post | *"4 Rounds · 1 Assignment"* chips | Matches the Phase-3 structured Interview-Experience template (seed clean data now). |

### 🕒 Good ideas — but they belong to a later phase

| Idea seen | What it really is | Phase |
|---|---|---|
| Stat bar: Applications / Interviews / Offers / Ghosted / Rejections / Response Rate | The **private application tracker** (real PII → pseudonymity wall) | Phase 2 |
| "Your August Wrapped" recap + share buttons | Spotify-Wrapped-style shareable summary | Phase 5 (growth) |
| Streak "12 days", Bingo, Leaderboard | **Gamification** (resilience streak, Auras) — reward showing up, never failure | Phase 4 |
| Following / "Company to watch" follow | Follow users/companies + personalized feed | Phase 3 |
| Notifications bell (unread count) | In-app notifications | Phase 2 (basic) |

### ⚠️ Breaks our rules — do NOT copy from the picture

| Item in the mockup | Problem | The rule |
|---|---|---|
| *"2.4K **karma**"* (Top Contributors) | Wrong name for reputation | It is **"Auras"**, never karma/points. |
| Ghost Score `21/100`, Avg Rounds `4.2`, Avg Salary `₹18.4 LPA`, "Company to watch", Interview Difficulty | Aggregate **canonical company data** | This is the **deferred Ghost Index** fork. `company` stays **free text** — no Company table unless deliberately forked (TypeScript, never Python). |
| Left nav: **Jobs, Referrals, Resume Reviews, Career Tools** | LinkedIn / jobs-board territory | Retention doc says explicitly: *no jobs board, no networking, no polished career suite.* Fails the guardrail test. |
| Salaries as a headline nav item | Comp-tool framing (Grapevine-ish) | Salary *confessions* fit the voice; a polished salary tool does not. Keep it raw if ever built. |

---

## Takeaway

The mockup is a rich **source of ideas**, most of which map onto phases we've already planned. The honest reading: it shows the "someday" surface with several off-brand pieces mixed in. The only things worth acting on *now* are the ✅ row — voice, Trending/Top sort, the ghost-timer display — which we were already going to build. Everything else waits for its phase gate, and three items should never be copied at all.
