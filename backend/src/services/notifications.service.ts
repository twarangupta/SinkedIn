/**
 * Notifications service — the in-app "bell" (Phase 2 retention).
 *
 * A small, fixed set (REPLY now; BUOY/POLL milestones in a later slice) that
 * tells a user when someone engaged with their content. Owner-scoped reads;
 * writes are triggered by the relevant service (e.g. comments.service on reply).
 * Pseudonymous by construction: it stores the actor's user id (a reference) and
 * resolves the CURRENT handle at read time, so a handle change is reflected
 * everywhere and no stale name is ever frozen into a notification.
 */

import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface NotificationInput {
  userId: string; // recipient
  type: NotificationType;
  actorId?: string | null; // who triggered it (REPLY); null for cumulative BUOY/POLL
  count?: number | null; // milestone value for BUOY/POLL
  sinkId?: string | null;
  commentId?: string | null;
}

// Milestone ladders. A notification fires once when a Sink's raw buoy count (or
// a poll's total votes) crosses one of these — never per vote.
export const BUOY_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
export const POLL_MILESTONES = [10, 25, 50, 100, 250, 500];

/** The highest ladder value <= `value` (0 if none reached yet). */
export function highestMilestone(value: number, ladder: number[]): number {
  let reached = 0;
  for (const m of ladder) {
    if (value >= m) reached = m;
    else break;
  }
  return reached;
}

const notificationSelect = {
  id: true,
  type: true,
  count: true,
  sinkId: true,
  commentId: true,
  readAt: true,
  createdAt: true,
  // Resolve the actor's CURRENT handle/avatar at read time (never a snapshot —
  // handles are user-changeable). Null for cumulative BUOY/POLL notifications.
  actor: { select: { handle: true, avatarId: true } },
} satisfies Prisma.NotificationSelect;

/**
 * Create notifications (best-effort — callers must not let a notification
 * failure break the action that triggered it). Drops empty input and never
 * throws to the caller when wrapped in the recommended try/catch.
 */
export async function createNotifications(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  await prisma.notification.createMany({
    data: inputs.map((n) => ({
      userId: n.userId,
      type: n.type,
      actorId: n.actorId ?? null,
      count: n.count ?? null,
      sinkId: n.sinkId ?? null,
      commentId: n.commentId ?? null,
    })),
  });
}

/** The caller's recent notifications (newest first) plus their unread count. */
export async function listNotifications(userId: string, limit = 30) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: notificationSelect,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

/** Just the unread count (for the bell badge). */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Mark all of the caller's unread notifications read. Returns how many changed. */
export async function markAllRead(userId: string): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}
