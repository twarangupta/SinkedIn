/**
 * Tests for the notifications service + the reply-notification wiring in
 * comments.service. Covers owner-scoping, the "don't notify yourself" rule, the
 * Sink-owner + parent-author dedupe, and unread/mark-read.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createComment } from './comments.service.js';
import { stepVote } from './votes.service.js';
import { castPollVote } from './pollVotes.service.js';
import {
  BUOY_MILESTONES,
  createNotifications,
  getUnreadCount,
  highestMilestone,
  listNotifications,
  markAllRead,
} from './notifications.service.js';

let owner: string; // owns the Sink
let replier: string;
let third: string;
let sinkId: string;
let categoryId: string;
let ownerComment: string; // a top-level comment by the owner

beforeEach(async () => {
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const [o, r, t] = await Promise.all([
    prisma.user.create({ data: { supabaseUserId: 'seed:n-owner', handle: 'Owner_Otter_1' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:n-replier', handle: 'Replier_Ray_2' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:n-third', handle: 'Third_Tuna_3' } }),
  ]);
  owner = o.id;
  replier = r.id;
  third = t.id;

  const category = await prisma.category.create({
    data: { name: 'Rant', slug: 'rant', color: '#fff' },
  });
  categoryId = category.id;
  const sink = await prisma.sink.create({
    data: { title: 't', body: 'b', userId: owner, categoryId: category.id },
  });
  sinkId = sink.id;
  const c = await prisma.comment.create({
    data: { body: 'owner top-level', userId: owner, sinkId },
  });
  ownerComment = c.id;
});

afterAll(async () => {
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('reply notifications (via createComment)', () => {
  it('notifies the Sink owner when someone else comments', async () => {
    await createComment(replier, sinkId, 'nice one');
    const { notifications, unreadCount } = await listNotifications(owner);
    expect(unreadCount).toBe(1);
    expect(notifications[0].type).toBe('REPLY');
    expect(notifications[0].actor?.handle).toBe('Replier_Ray_2');
    expect(notifications[0].sinkId).toBe(sinkId);
  });

  it('does NOT notify you when you comment on your own Sink', async () => {
    await createComment(owner, sinkId, 'my own thoughts');
    expect(await getUnreadCount(owner)).toBe(0);
  });

  it('notifies both the Sink owner and the parent comment author on a reply', async () => {
    // `third` replies to the owner's comment on the owner's Sink.
    await createComment(third, sinkId, 'replying to you', ownerComment);
    // Owner is both Sink owner AND parent author → exactly ONE notification,
    // the more specific reply-to-comment one (commentId set).
    const { notifications, unreadCount } = await listNotifications(owner);
    expect(unreadCount).toBe(1);
    expect(notifications[0].commentId).toBe(ownerComment);
  });

  it('notifies two distinct people (Sink owner + a different parent author)', async () => {
    // replier adds a top-level comment on owner's Sink...
    const rc = await createComment(replier, sinkId, 'replier top-level');
    // ...then `third` replies to replier's comment. Sink owner (owner) and the
    // parent author (replier) are different people → two notifications.
    await createComment(third, sinkId, 'reply to replier', rc.id);
    expect(await getUnreadCount(owner)).toBe(2); // top-level + the reply's sink notif
    expect(await getUnreadCount(replier)).toBe(1); // reply to replier's comment
  });
});

describe('highestMilestone', () => {
  it('returns the highest ladder value reached', () => {
    expect(highestMilestone(0, BUOY_MILESTONES)).toBe(0);
    expect(highestMilestone(9, BUOY_MILESTONES)).toBe(0);
    expect(highestMilestone(10, BUOY_MILESTONES)).toBe(10);
    expect(highestMilestone(24, BUOY_MILESTONES)).toBe(10);
    expect(highestMilestone(25, BUOY_MILESTONES)).toBe(25);
    expect(highestMilestone(9999, BUOY_MILESTONES)).toBe(1000);
  });
});

/** Have `n` fresh users each buoy the given Sink. */
async function buoyBy(count: number, sink: string) {
  for (let i = 0; i < count; i++) {
    const u = await prisma.user.create({
      data: { supabaseUserId: `seed:voter-${sink}-${i}`, handle: `Voter_${i}_${sink.slice(0, 4)}` },
    });
    await stepVote(u.id, sink, 'UP');
  }
}

describe('buoy milestone notifications', () => {
  it('notifies the owner once at 10 buoys, not per vote', async () => {
    await buoyBy(10, sinkId);
    const buoy = await prisma.notification.findMany({
      where: { userId: owner, type: 'BUOY' },
    });
    expect(buoy).toHaveLength(1);
    expect(buoy[0].count).toBe(10);
    expect(buoy[0].actorId).toBeNull(); // no single actor for a cumulative milestone
  });

  it('does not re-notify for buoys between milestones', async () => {
    await buoyBy(12, sinkId); // crosses 10, not yet 25
    const buoy = await prisma.notification.findMany({
      where: { userId: owner, type: 'BUOY' },
    });
    expect(buoy).toHaveLength(1); // still just the "10" notification
  });
});

describe('poll milestone notifications', () => {
  it('notifies the owner when the poll crosses 10 votes', async () => {
    const pollSink = await prisma.sink.create({
      data: { title: 'poll', userId: owner, categoryId },
    });
    const opt = await prisma.pollOption.create({
      data: { sinkId: pollSink.id, label: 'A', position: 0 },
    });
    for (let i = 0; i < 10; i++) {
      const u = await prisma.user.create({
        data: { supabaseUserId: `seed:pv-${i}`, handle: `PollVoter_${i}_z` },
      });
      await castPollVote(u.id, pollSink.id, opt.id);
    }
    const poll = await prisma.notification.findMany({
      where: { userId: owner, type: 'POLL' },
    });
    expect(poll).toHaveLength(1);
    expect(poll[0].count).toBe(10);
  });
});

describe('notifications service', () => {
  it('markAllRead clears the unread count', async () => {
    await createNotifications([
      { userId: owner, type: 'REPLY', actorId: replier, sinkId },
      { userId: owner, type: 'REPLY', actorId: replier, sinkId },
    ]);
    expect(await getUnreadCount(owner)).toBe(2);
    const read = await markAllRead(owner);
    expect(read).toBe(2);
    expect(await getUnreadCount(owner)).toBe(0);
  });

  it('never returns another user\'s notifications', async () => {
    await createNotifications([{ userId: owner, type: 'REPLY', actorId: replier, sinkId }]);
    const { notifications } = await listNotifications(third);
    expect(notifications).toHaveLength(0);
  });
});
