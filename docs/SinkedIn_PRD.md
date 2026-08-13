# SinkedIn — Product Requirements Document (v1)

## 1. Problem statement

Job seekers experience rejection, ghosting, layoffs, and career setbacks as isolated, silent failures. LinkedIn only rewards wins, so the real, painful, funny side of the job hunt has no honest home. Existing platforms are adjacent but don't own this:
- **Blind** — anonymous venting about your *current* job, not the job hunt / rejection.
- **AmbitionBox / Grapevine / Glassdoor** — neutral company research, not community or catharsis.
- **Prior "SinkedIn" clones** — got the joke, had no depth, died after the launch spike.

## 2. Product thesis

SinkedIn is **a Reddit-style community for the real side of the job market** — a feed of text posts ("Sinks"), each tagged with a category (Rejection, Interview Experience, Discussion, Poll, Rant, etc.), where people post, vote, comment, and poll each other. The tone is honest and darkly funny — the anti-LinkedIn. The moat is **community + content**, not proprietary data (this is a deliberate shift — see §9).

## 3. Target user

Active job seekers and recently-employed people (India-first, English-language), ~22–32, in tech/corporate roles, who want an honest, funny, supportive place to talk about the job-hunt grind — post rejections, share interview experiences, ask for advice, vent, and commiserate.

## 4. The core object: a Sink

A **Sink is a text post** — always a `title` + `body` — categorized by a **category**. The category is chosen first, and the compose form then reveals a few optional category-specific fields:

| Category | Extra fields revealed |
|---|---|
| Interview Experience | company, conclusion |
| Rejection | company, conclusion |
| Offer | company, conclusion |
| Ghosted | company |
| Salary | company |
| Layoff | company |
| Poll | poll options (required) |
| Advice | poll options (optional) |
| Discussion | poll options (optional) |
| Rant / Meme / Resource | none (pure text) |

- **Conclusion** = fixed set (Ghosted / Rejected / Accepted / Withdrew / Pending) + an "Other" free-text option.
- **Company** = optional free text (not canonical — see §9 tradeoff).
- Categories live in their own table and are freely extensible (add Networking, Career Switch, Fired, Visa/Relocation, etc. with no code change).

## 5. v1 scope

### In scope
- Pseudonymous accounts (persistent handle, real email hidden)
- Post a Sink: category-first compose with conditional fields (text, company, conclusion, poll options)
- Feed: paginated, filterable by category, sortable by new / top
- **Buoys & Anchors**: two-way voting (up/down arrows, themed), score = buoys − anchors
- **Comments**: threaded (top-level + replies)
- **Polls**: 2–6 options, one vote per user per poll, live result bars
- Basic user profile: handle, join date, post history

### Explicitly out of scope for v1 (deferred)
- Personal job-hunt tracker / dashboard — Phase 2
- Comeback flow — Phase 2
- Aura points, rank tiers, streaks, Hall of Fame — Phase 4/5
- Verified Sink badge — Phase 4
- Ghost Index / aggregate company stats — deferred & conditional (see §9)
- Any AI feature — Phase 6+
- Monetization — Phase 6+

## 6. Core user stories

1. As a job seeker, I get an anonymous handle without exposing my real identity.
2. I can post a Sink: write text, pick a category, and fill the category's optional fields, in under 60 seconds.
3. I can scroll a feed, filter by category, and sort by new or top.
4. I can buoy (up) or anchor (down) any Sink.
5. I can comment on a Sink and reply to comments.
6. I can create a poll and others can vote and see live results.
7. I can view a user's profile and post history.

## 7. Success criteria for v1 (the actual test)

- **Primary gate:** does posting a Sink feel good, and does reading/voting/commenting feel engaging? (Qualitative — test on yourself + a handful of real users.)
- Feed and a single Sink (with comments + poll) load correctly from 0 to 1000+ Sinks.
- Posting completes in under 60 seconds for a first-timer.
- No PII (real name/email) ever appears in any public view.

## 8. Non-functional requirements

- **Privacy:** real email is auth-only, never joined to public data. Hard constraint.
- **Extensibility:** categories are data, not code — new categories and their conditional fields added without a deploy.
- **Moderation-readiness:** report/hide on Sinks and comments, even if reviewed manually at v1 scale (a public post-anything community *will* attract abuse).
- **Voting health:** anchors (downvotes) are universal in v1, but the schema must allow disabling them per-category later (downvotes on raw rejections/layoffs can feel like a pile-on).

## 9. The strategic tradeoff on record (important)

This is a **text-first community**, so `company` is optional free text, not a canonical entity. Consequence: the **Ghost Index** (aggregate ghost rates / company scorecards / time-to-reject leaderboards) — described as "the moat" in earlier strategy docs — is **not cleanly buildable on this model**, because free-text company values don't aggregate.

This is a deliberate shift: **the moat becomes community + content** (a Reddit-for-job-pain, defended by audience and culture), not proprietary data. The Ghost Index is not deleted from the vision — it's a **fork to decide later**: if it matters, promote `company` to a canonical `Company` table with a foreign key and backfill. Flagged here so the brainstorm can resolve it deliberately rather than by accident.

## 10. Open decisions (for the brainstorm, don't block v1)
- Whether to split the (now larger) Phase 1 into 1a (post + feed + vote) and 1b (comments + polls).
- Whether the Ghost Index / canonical companies come back (see §9).
- Exact final category set and their colors.
- Anchors universal vs. softened on vulnerable categories.
- Voting rename check ("Buoys / Anchors" — final call).
