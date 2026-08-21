# Phase 5 — Growth mechanics ⬜ (gated)

← [Phase 4](phase-4-trust-and-gamification.md) · [Index](README.md) · Next: [Phase 6+ — AI & monetization](phase-6-ai-and-monetization.md)

> **Goal:** make SinkedIn spread *beyond* itself — turn users into distribution. You only amplify a product that already retains; by now the bucket holds water, so growth compounds instead of leaking.
>
> **Entry gate:** proven retention ([Phase 2](phase-2-retention.md)) + active community ([Phase 3](phase-3-depth-and-growth.md)).

## What the user can newly do
Export any Sink/Comeback as a clean, **branded card image** for Instagram / X / LinkedIn · get **featured** (Hall of Fame / Sink of the Week) · share **"market weather"** aggregate moments.

> **Felt experience:** "I posted my Comeback card to LinkedIn and Instagram, it got more engagement than anything I've ever shared, and three friends signed up." — the anti-LinkedIn spreading *through* LinkedIn, where layoff/comeback posts already go viral.

---

## Data model additions

```mermaid
erDiagram
    User ||--o{ Share : creates
    Sink ||--o| FeaturedSink : "may be"
    Share { string id PK; string userId FK; string sinkId FK; enum channel "IG|X|LINKEDIN|LINK"; datetime createdAt }
    FeaturedSink { string sinkId PK; enum kind "HALL_OF_FAME|SINK_OF_WEEK"; datetime featuredAt }
```
Plus weekly-stats snapshots (built from *existing* aggregate counts — **not** the Ghost Index).

---

## Shareable card export `[in-plan]` — rendered in TypeScript

Any Sink/Comeback → a branded image. Rendered with a **TypeScript** image pipeline (e.g. Satori / `@vercel/og`, or a Node canvas renderer) — **no new language.**

```mermaid
sequenceDiagram
    participant U as User
    participant API as Card service (TS)
    participant R as Renderer (Satori/@vercel/og)
    participant CDN as Cache/CDN
    U->>API: "Export as card" (sinkId, template)
    API->>API: load PUBLIC fields only (handle + chosen content) — no PII
    API->>R: render template → PNG
    R-->>API: image
    API->>CDN: cache by (sinkId, template)
    API-->>U: branded card (watermark rides every share)
```

Your watermark rides every share; the card is the marquee export at the user's highest-emotion moment.

## Comeback card `[in-plan · retention #4 (card)]`
The Comeback flow's post (from [Phase 2](phase-2-retention.md)) exported as the flagship shareable — users become marketing exactly when they're proudest.

## Hall of Fame / Sink of the Week `[in-plan]`
Curated, screenshot-bait, a weekly return reason. Curation protects quality (unmoderated "trending" surfaces the wrong thing).

## Market weather / aggregate stats `[in-plan]`
"4,201 Sinks this week, ghost rate up 12%" — press-friendly, recurring, shareable. Built from existing aggregate counts.

---

## Tradeoffs & decisions
- **Cards must respect pseudonymity:** never render real names/PII — only the handle + the content the user chose (the pseudonymity wall applies to shareables too).
- **Render cost/perf:** render on demand and cache by (sinkId, template); keep it serverless-friendly.
- **Virality vs. brand:** curated Hall of Fame protects quality; guard against amplifying the wrong content.

## Safety this phase
No PII on any shareable; curation/moderation of featured content; share-spam limits.

## Exit gate
Measurable **external referral traffic** from shared content.
