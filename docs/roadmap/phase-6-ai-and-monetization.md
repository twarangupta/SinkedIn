# Phase 6+ — AI & monetization ⬜ (gated, deliberately last)

← [Phase 5](phase-5-growth-mechanics.md) · [Index](README.md)

> **Goal:** make it smarter (AI) and sustainable (revenue). **Additive on a *validated* product** — AI adds cost, complexity, and failure surface; monetization needs scale + trust to work without betraying users. Both come last on purpose.
>
> **Entry gate:** a proven, retained, growing product with trust signals (Phases 1–4 gates all passed).

## What the user can newly do
Get an instant **AI roast/commiseration** on a rejection · **auto-fill a Sink** by pasting the rejection email (AI extracts fields; you confirm) · **decode corporate-speak** ("your experience more closely aligns" → the honest meaning) · (opt-in) let AI help **detect a tracked application's outcome** from a forwarded email · (power users) pay for deeper tools · (companies) participate honestly and earn a "we don't ghost" badge.

---

## The AI layer `[in-plan]` — additive, never authoritative

Drops **on top of** the existing manual schema — the manual compose form stays as the fallback, so there's **no rework**. Uses the **latest Claude models** (Anthropic) — this is the project's natural AI/Anthropic milestone.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Compose (Next.js)
    participant API as AI service (TS)
    participant LLM as Claude (latest)
    U->>FE: paste rejection email
    FE->>API: extract fields
    API->>LLM: prompt (extract company, conclusion, rounds…)
    LLM-->>API: structured suggestion
    API-->>FE: pre-filled draft
    U->>FE: REVIEW + confirm (edit anything)
    FE->>API: POST /sinks (same manual endpoint)
    Note over U,FE: The human always confirms — AI never fabricates the post
```

**AI features:** the roast (instant commiseration), the corporate-speak translator, compose auto-fill. **Guardrail:** AI must never fabricate a user's experience — pre-fill + user confirmation only; the human owns the post. Add cost controls, rate limits, and graceful degradation (feature fails → manual form still works).

---

## Optional automation — outcome detection, autofill, hard-site extraction `[optional · deferred · fragile — manage expectations]`
The tempting-but-unreliable frontier (the features that *sound* magical and break constantly). All **opt-in**, all **confirmation-gated**, none on the critical path.
- **Outcome detection (AI-assisted):** user forwards an email (or connects Gmail with explicit scope) → AI classifies *rejection / interview invite / offer* → **suggests** a tracker status update the user confirms. **Reality check:** flaky across companies/languages, privacy-heavy (email access) — *this is exactly why it lives here and not in the [Phase-2 tracker](phase-2-retention.md).* Never auto-change status without confirmation.
- **AI-assisted extraction for hard sites:** where JSON-LD + CSS adapters fail (Workday, obfuscated pages), an LLM parses messy DOM/text into `NormalizedJob`. **Decision:** a cost-capped, cached **fallback** — structured-data-first stays the default path.
- **Application autofill:** pre-fill ATS forms from the stored profile/resume. **Decision:** **deferred, low priority** — high maintenance, crowded space (Simplify et al.), **not SinkedIn's differentiator.** Build only if clearly demanded.

> **Why these are last:** each adds cost, failure surface, and privacy burden for *convenience*, not for the core value (catharsis + community). Ship only on a validated product, opt-in, degrading gracefully to the manual flow.

---

## Monetization — ranked by brand fit `[in-plan]`

```mermaid
graph TB
    D["Same Sink data captured since Phase 1"] --> M1
    D --> M2
    D --> M3
    M1["1 · Honest-employer marketplace<br/>pay to prove you don't ghost · 'we don't ghost' badge"]
    M2["2 · Freemium utility<br/>advanced tracker/analytics/alerts paid; core free forever"]
    M3["3 · B2B candidate-experience data<br/>high margin, careful framing, later"]
    M4["4 · Ads — last resort, off-brand"]
    style M1 fill:#10B981,color:#fff
    style M4 fill:#6b7280,color:#fff
```

1. **Honest-employer marketplace** — companies pay to prove they *don't* ghost (verified-responsive listings + a "we don't ghost" badge). **Aligned incentives; free users untouched.** Best brand fit.
2. **Freemium utility** — advanced tracker/analytics/alerts paid; the **cathartic core free forever.**
3. **B2B candidate-experience data** — high margin, careful framing, later.
4. **Ads** — last resort, off-brand for a "no-tracking, honest" product.

All paths run on the **same Sink data captured since Phase 1** — which is *why* clean, structured data from day one mattered. Payments via **Stripe** (TypeScript SDK); **employer** is a distinct account role.

---

## Data model additions
`EmployerAccount(orgName, domain, verified)` · `EmployerBadge(orgDomain, kind "NO_GHOST", grantedAt)` · billing records (Stripe customer/subscription) · AI usage/cost ledger (`AiUsage(userId, feature, tokens, costCents)`).

## 🔧 Build notes — services & decisions (brief)
*A build log for future-you: per service, what we build, the key decision, and why.*
- **AI service (TS)** — thin wrapper over the **latest Claude models**; endpoints `extract`, `roast`, `translate`, `classify-outcome`. **Decision:** additive on top of the manual schema; **the human confirms every write.** **Why:** AI never fabricates a user's experience; the manual form is always the fallback.
- **AI cost controls** — `AiUsage` ledger + per-user rate limits + caching + graceful degradation. **Decision:** guard unit economics *before* scaling any AI feature. **Why:** silent AI cost can sink a free product.
- **Employer accounts** — distinct account role (`EmployerAccount` / `EmployerBadge`). **Decision:** employers see **aggregate / opt-in** data only, **never** de-anonymized users. **Why:** the pseudonymous side stays sacrosanct even when money enters.
- **Payments** — **Stripe** (TS SDK), subscriptions + one-off. **Decision:** never paywall the cathartic core; only advanced utilities. **Why:** the free vent-and-community *is* the product.

## Tradeoffs & decisions
- **AI must never fabricate experience** — confirmation-gated pre-fill only.
- **Never paywall the cathartic core** — the free vent-and-community *is* the soul; only advanced utilities are paid.
- **Employer accounts change the trust model** — the pseudonymous user side stays sacrosanct; employers see aggregate/opt-in data, **never** de-anonymized users.
- **AI cost control** — cache, rate-limit, degrade gracefully; watch unit economics before scaling any AI feature.

## Safety this phase
Confirmation-gated AI; strict separation of employer view from user identity; billing/PCI handled by Stripe; AI abuse + cost guards.

## Exit gate
Sustainable revenue **without** an ad or paywall in front of the free cathartic core, and **without** betraying user trust.

---

## Trademark reminder
Resolve the IP-lawyer conversation **before** this phase's commercial weight (ideally sooner). Keep "anti-LinkedIn" as internal compass only — never public branding.
