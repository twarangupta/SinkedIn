/**
 * Reaction service — one-tap solidarity taps (Rant → "Been there", Ghosted →
 * "Same"), deliberately SEPARATE from Buoy/Anchor voting so the ranking signal
 * stays clean.
 *
 * Rules (mirrors the vote service):
 *  - one reaction per user per Sink (schema @@unique) — re-tapping the same kind
 *    removes it (toggle off); tapping a different kind switches it,
 *  - the `kind` must be one of the Sink's category's configured reactions,
 *  - per-kind counts are cached on `Sink.reactionCounts` (like `score`) inside a
 *    transaction, so the feed reads tallies without a groupBy per card.
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type ReactionCounts = Record<string, number>;

/** Recompute + cache the per-kind counts for a Sink from its Reaction rows. */
async function recomputeReactionCounts(tx: Tx, sinkId: string): Promise<ReactionCounts> {
  const grouped = await tx.reaction.groupBy({
    by: ['kind'],
    where: { sinkId },
    _count: { _all: true },
  });
  const counts: ReactionCounts = {};
  for (const g of grouped) counts[g.kind] = g._count._all;
  await tx.sink.update({ where: { id: sinkId }, data: { reactionCounts: counts } });
  return counts;
}

/** The reaction keys a Sink's category offers (from its `reactions` JSON config). */
async function allowedKinds(sinkId: string): Promise<Set<string>> {
  const sink = await prisma.sink.findFirst({
    where: { id: sinkId, deletedAt: null },
    select: { category: { select: { reactions: true } } },
  });
  if (!sink) throw new AppError('Sink not found', 404);
  const config = Array.isArray(sink.category.reactions) ? sink.category.reactions : [];
  const keys = config
    .map((r) => (r && typeof r === 'object' && 'key' in r ? String(r.key) : null))
    .filter((k): k is string => Boolean(k));
  return new Set(keys);
}

/**
 * Toggle the caller's reaction on a Sink: set it, switch it, or remove it (by
 * re-tapping the same kind). Returns the fresh cached counts + the caller's
 * current reaction (or null).
 */
export async function toggleReaction(
  userId: string,
  sinkId: string,
  kind: string,
): Promise<{ reactionCounts: ReactionCounts; myReaction: string | null }> {
  const allowed = await allowedKinds(sinkId);
  if (!allowed.has(kind)) {
    throw new AppError('That reaction is not available here', 400);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.reaction.findUnique({
      where: { sinkId_userId: { sinkId, userId } },
      select: { kind: true },
    });

    let myReaction: string | null;
    if (existing?.kind === kind) {
      // Re-tapping the current reaction clears it.
      await tx.reaction.delete({ where: { sinkId_userId: { sinkId, userId } } });
      myReaction = null;
    } else {
      await tx.reaction.upsert({
        where: { sinkId_userId: { sinkId, userId } },
        update: { kind },
        create: { sinkId, userId, kind },
      });
      myReaction = kind;
    }

    const reactionCounts = await recomputeReactionCounts(tx, sinkId);
    return { reactionCounts, myReaction };
  });
}

/** The caller's chosen reaction per Sink (batched), keyed by sink id. */
export async function getMyReactions(
  userId: string,
  sinkIds: string[],
): Promise<Map<string, string>> {
  if (sinkIds.length === 0) return new Map();
  const rows = await prisma.reaction.findMany({
    where: { userId, sinkId: { in: sinkIds } },
    select: { sinkId: true, kind: true },
  });
  return new Map(rows.map((r) => [r.sinkId, r.kind]));
}
