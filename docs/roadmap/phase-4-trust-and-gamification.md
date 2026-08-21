# Phase 4 — Trust & gamification ⬜ (gated)

← [Phase 3](phase-3-depth-and-growth.md) · [Index](README.md) · Next: [Phase 5 — Growth mechanics](phase-5-growth-mechanics.md)

> **Goal:** deepen engagement and data quality via **verification (trust)** and **rewards (engagement)** — amplifiers of an already-working community, pointless before there's one to amplify.
>
> **Entry gate:** an active, growing community with recurring contribution (Phase 3 organic growth proven).

## What the user can newly do
**Verify a Sink** — prove it's real *without* revealing identity · **earn Auras** for helping and persisting · **climb rank tiers** · build and wear a **resilience streak**.

> **Felt experience:** "My rejections are verified so people take my company reports seriously, I'm a 'Deep Water' rank after surviving 30 rejections, and I've got more Aura from *helping* people than from my own Ls."

> ## 🚫 The hard rule (never negotiable)
> Auras, streaks, and ranks reward **helping others** and **persistence** — **never collecting rejections.** No "most rejected" leaderboard. Gamifying failure is off-brand and harmful; this is a wellbeing + integrity line. Frame everything as **resilience / comeback**, never a failure scoreboard.

---

## Data model additions

```mermaid
erDiagram
    Sink ||--o| Verification : "may have"
    User ||--o{ AuraEvent : earns
    User ||--|| RankState : has

    Verification { string sinkId PK; enum method "HONOR|DKIM"; string domain; datetime verifiedAt }
    AuraEvent { string id PK; string userId FK; enum kind "HELPFUL_COMMENT|INTEL|SUPPORT|PERSISTENCE"; int weight; datetime createdAt }
    RankState { string userId PK; int aura; int streakDays; datetime lastActiveAt; string tier }
```
- `Verification` stores **only domain + date** — PII (names, body of the email) is stripped on ingest.
- `AuraEvent.kind` is a fixed enum weighted toward **helpfulness/persistence** — there is deliberately **no** "rejection" kind that earns points.

---

## Verified Sink badge `[in-plan]`

Forward the rejection/offer email (or upload the `.eml`) → validate authenticity → badge. Start honor-system **Tier 1** (low friction, some trust), upgrade to real **DKIM** validation (high trust).

```mermaid
sequenceDiagram
    participant U as User
    participant Ingest as Verify service (TS)
    participant DKIM as DKIM validator
    participant DB as Postgres
    U->>Ingest: forward email / upload .eml
    Ingest->>Ingest: STRIP PII (names, body) — keep domain + date only
    alt Tier 2 (DKIM)
        Ingest->>DKIM: validate signature vs sender domain
        DKIM-->>Ingest: valid / invalid
    end
    Ingest->>DB: Verification { sinkId, method, domain, verifiedAt }
    Ingest-->>U: ✔ Verified badge on the Sink
```

Trust + a status layer in one; makes interview intel and company mentions carry more weight (and, if the [Ghost Index fork](phase-3-depth-and-growth.md) was taken, weights that data credibly). **Never require verification to post.**

---

## Auras (reputation) `[in-plan]`
Reddit-style karma branded **"Auras"**, weighted toward **helpfulness** (advice, interview intel, support, referrals) and **persistence** — never toward collecting rejections. Derivable from existing signals (buoys on helpful content, accepted advice); surfaced now via the `AuraEvent` ledger.

## Rank tiers `[in-plan]`
Puddle → … → **Mariana Trench**, as light identity earned by contribution + survival, never by failure count.

## Resilience streak `[new · retention #5 — the safe gamification]`
Reward *showing up* through the grind — "12 days still swimming", survival milestones — as light identity. Pairs with ranks + Auras. Gives a habit/identity reason to return **without ever rewarding failure itself.**

---

## Tradeoffs & decisions
- **Verification friction vs. trust:** honor-system Tier 1 first; DKIM later. Never gate posting on it.
- **Gamification can corrupt authenticity:** if Auras/streaks are gameable, people optimize for points over honesty. Weight toward hard-to-fake helpfulness; add anti-gaming (rate caps, self-vote exclusion, sockpuppet heuristics).
- **The failure-gamification trap:** it's *tempting* to badge "rejections survived" — keep it framed as resilience/comebacks, never a rejection leaderboard. (See the hard rule above.)

## Safety this phase
Anti-gaming for Auras (rate caps, sockpuppet detection); PII stripping in verification; fake-`.eml` abuse mitigated by the DKIM tier.

## Exit gate
Verified Sinks flowing (and, if forked, weighting the Ghost Index); gamification measurably lifting return/contribution **without corrupting authenticity.**
