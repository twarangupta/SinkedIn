/**
 * Poll-vote service — casting a vote on a Sink's poll.
 *
 * Mirrors the Buoy/Anchor vote service, with one product rule from CLAUDE.md:
 * **one vote per POLL, not per option** (the schema's @@unique is per option, so
 * the "one per poll" invariant is enforced HERE, in the service).
 *
 * Behaviour (matches how the buoy toggle feels):
 *   - vote an option you haven't chosen  → your vote moves to it
 *   - vote the option you already chose   → your vote is removed (toggle off)
 *
 * Everything runs in a transaction so the "remove old + add new" move can never
 * leave a user with two votes in the same poll.
 */

import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import {
  createNotifications,
  POLL_MILESTONES,
  highestMilestone,
} from './notifications.service.js';

/** The public shape returned after a poll vote: fresh counts + the caller's choice. */
export interface PollVoteResult {
  pollOptions: Array<{
    id: string;
    label: string;
    position: number;
    _count: { votes: number };
  }>;
  /** The option id the caller currently has selected, or null if none. */
  myPollVote: string | null;
}

/**
 * Cast (or move, or toggle off) the user's vote in a Sink's poll.
 *
 * @throws AppError 404 if the Sink doesn't exist / is deleted
 * @throws AppError 400 if the Sink has no poll, or the option isn't part of it
 */
export async function castPollVote(
  userId: string,
  sinkId: string,
  pollOptionId: string,
): Promise<PollVoteResult> {
  const { result, pollNotify } = await prisma.$transaction(async (tx) => {
    // 1. The Sink must exist and be live; collect its poll option ids so we can
    //    validate the target and find any existing vote across the WHOLE poll.
    const sink = await tx.sink.findFirst({
      where: { id: sinkId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        notifiedPollMilestone: true,
        pollOptions: { select: { id: true } },
      },
    });
    if (!sink) throw new AppError('Sink not found', 404);

    const optionIds = sink.pollOptions.map((o) => o.id);
    if (optionIds.length === 0) {
      throw new AppError('This Sink has no poll', 400);
    }
    if (!optionIds.includes(pollOptionId)) {
      throw new AppError('Poll option does not belong to this Sink', 400);
    }

    // 2. Find the user's current vote anywhere in this poll (enforces one-per-poll).
    const existing = await tx.pollVote.findFirst({
      where: { userId, pollOptionId: { in: optionIds } },
      select: { id: true, pollOptionId: true },
    });

    let myPollVote: string | null;
    if (existing?.pollOptionId === pollOptionId) {
      // Re-voting the option you already hold removes it (toggle off).
      await tx.pollVote.delete({ where: { id: existing.id } });
      myPollVote = null;
    } else {
      // Moving to a new option: drop the old vote first, then add the new one.
      if (existing) {
        await tx.pollVote.delete({ where: { id: existing.id } });
      }
      await tx.pollVote.create({ data: { userId, pollOptionId } });
      myPollVote = pollOptionId;
    }

    // 3. Return the poll's fresh counts so the UI can redraw the bars.
    const pollOptions = await tx.pollOption.findMany({
      where: { sinkId },
      select: {
        id: true,
        label: true,
        position: true,
        _count: { select: { votes: true } },
      },
      orderBy: { position: 'asc' },
    });

    // 4. Poll milestone: when the poll's TOTAL votes cross a new threshold,
    //    notify the owner once (tracked by Sink.notifiedPollMilestone).
    let pollNotify: { ownerId: string; count: number } | null = null;
    const totalVotes = pollOptions.reduce((sum, o) => sum + o._count.votes, 0);
    const reached = highestMilestone(totalVotes, POLL_MILESTONES);
    if (reached > sink.notifiedPollMilestone) {
      await tx.sink.update({
        where: { id: sinkId },
        data: { notifiedPollMilestone: reached },
      });
      pollNotify = { ownerId: sink.userId, count: reached };
    }

    return { result: { pollOptions, myPollVote }, pollNotify };
  });

  // Fire the poll-milestone notification outside the transaction (best-effort).
  if (pollNotify) {
    try {
      await createNotifications([
        { userId: pollNotify.ownerId, type: 'POLL', count: pollNotify.count, sinkId },
      ]);
    } catch {
      // Non-fatal: the vote is saved and the milestone is marked.
    }
  }

  return result;
}
