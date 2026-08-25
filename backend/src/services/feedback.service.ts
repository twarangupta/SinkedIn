/**
 * Feedback service — "message the owner" (complaints + suggestions), open to
 * anyone. We ALWAYS persist the submission first (so nothing is ever lost), then
 * best-effort email the owner. Feedback is owner-only; it never appears in any
 * public response.
 */

import { prisma } from '../lib/prisma.js';
import { sendOwnerEmail } from '../lib/email.js';

export interface CreateFeedbackInput {
  message: string;
  contactEmail?: string | null;
  path?: string | null;
  // Set by the controller from optionalAuth (present only when signed in).
  userId?: string | null;
  handle?: string | null;
}

/** Store one feedback submission and notify the owner (email is best-effort). */
export async function createFeedback(input: CreateFeedbackInput) {
  const feedback = await prisma.feedback.create({
    data: {
      message: input.message.trim(),
      contactEmail: input.contactEmail?.trim() || null,
      path: input.path ?? null,
      userId: input.userId ?? null,
      handle: input.handle ?? null,
    },
    select: { id: true, createdAt: true },
  });

  // Notify the owner. Awaited but non-fatal: a failed/unconfigured email must
  // never fail the request — the submission is already saved.
  const who = input.handle ? `@${input.handle}` : 'anonymous';
  const where = input.path ? ` (from ${input.path})` : '';
  await sendOwnerEmail(
    `SinkedIn feedback from ${who}`,
    `${input.message.trim()}\n\n— ${who}${where}` +
      (input.contactEmail ? `\nReply to: ${input.contactEmail}` : '\n(no reply address left)'),
    input.contactEmail?.trim() || undefined,
  );

  return feedback;
}
