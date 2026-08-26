/**
 * Tracker status metadata — display order, labels, and pill colors for each
 * ApplicationStatus. Single source of truth so the list, filter, form, and the
 * later kanban board all agree.
 */

import type { ApplicationStatus, InterviewRoundType } from '../../types';
import type { SinkDraft } from '../../lib/sinkDraft';

/** Full pipeline order (used by the list filter + the status dropdowns). */
export const STATUS_ORDER: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'OA',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'GHOSTED',
  'WITHDRAWN',
  'OTHER',
];

/** Default kanban columns (the 6 primary stages, Saved → Rejected). */
export const BOARD_PRIMARY: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'OA',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
];

/** Terminal statuses — shown as board columns only when something is in them. */
export const BOARD_TERMINAL: ApplicationStatus[] = ['GHOSTED', 'WITHDRAWN', 'OTHER'];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  OA: 'OA',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  GHOSTED: 'Ghosted',
  WITHDRAWN: 'Withdrawn',
  OTHER: 'Other',
};

/** Tailwind classes for the status pill (dot + text), theme-token based. */
export const STATUS_PILL: Record<ApplicationStatus, string> = {
  SAVED: 'bg-elevated text-ink-2',
  APPLIED: 'bg-primary/15 text-primary',
  OA: 'bg-buoy/15 text-buoy',
  INTERVIEW: 'bg-violet/15 text-violet',
  OFFER: 'bg-green-500/15 text-green-500',
  REJECTED: 'bg-danger/15 text-danger',
  GHOSTED: 'bg-elevated text-ink-3',
  WITHDRAWN: 'bg-elevated text-ink-3',
  OTHER: 'bg-elevated text-ink-2',
};

/** Human labels for interview-round types (shared by the editor + the bridge). */
export const ROUND_TYPE_LABEL: Record<InterviewRoundType, string> = {
  PHONE_SCREEN: 'Phone screen',
  ONLINE_ASSESSMENT: 'Online assessment',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System design',
  BEHAVIORAL: 'Behavioral',
  HIRING_MANAGER: 'Hiring manager',
  HR: 'HR',
  OTHER: 'Other',
};

// The one-way bridge: map a private tracked application to a PUBLIC Sink draft.
// Which category + outcome a status suggests. Statuses with no meaningful public
// mapping (SAVED / APPLIED / OTHER) are omitted, so the user just picks a
// category themselves.
const STATUS_TO_SINK: Partial<
  Record<ApplicationStatus, { categorySlug: string; conclusion?: string }>
> = {
  OA: { categorySlug: 'interview-experience', conclusion: 'PENDING' },
  INTERVIEW: { categorySlug: 'interview-experience', conclusion: 'PENDING' },
  OFFER: { categorySlug: 'offer', conclusion: 'ACCEPTED' },
  REJECTED: { categorySlug: 'rejection', conclusion: 'REJECTED' },
  GHOSTED: { categorySlug: 'ghosted', conclusion: 'GHOSTED' },
  WITHDRAWN: { categorySlug: 'interview-experience', conclusion: 'WITHDREW' },
};

/**
 * Build a public Sink draft from a private application. ONLY opt-in, non-PII
 * fields cross: the company label, a suggested category + outcome, and — for an
 * interview experience — a body scaffold built from round TYPES (never the
 * private per-round notes). The title is deliberately left blank so the user
 * writes their own honest hook.
 */
export function draftFromApplication(app: {
  status: ApplicationStatus;
  company: string;
  rounds?: { type: InterviewRoundType; typeOther?: string | null }[];
}): SinkDraft {
  const map = STATUS_TO_SINK[app.status];
  const draft: SinkDraft = {
    categorySlug: map?.categorySlug,
    conclusion: map?.conclusion,
    company: app.company.trim() || undefined,
  };

  if (map?.categorySlug === 'interview-experience' && app.rounds?.length) {
    draft.body = app.rounds
      .map((r, i) => {
        const label = r.type === 'OTHER' ? r.typeOther || 'Other' : ROUND_TYPE_LABEL[r.type];
        return `Round ${i + 1} (${label}): `;
      })
      .join('\n');
  }
  return draft;
}

/**
 * Build a "Comeback" Sink draft when the user lands an offer: pre-fill the
 * comeback category, the company, and a factual recap of THEIR OWN journey
 * (applications / rejections / ghosts, from the tracker) — real numbers, not
 * slop. The user writes the "what helped" story and confirms before posting.
 */
export function comebackDraft(
  company: string,
  applications: { status: ApplicationStatus }[],
): SinkDraft {
  const applied = applications.filter((a) => a.status !== 'SAVED').length;
  const rejections = applications.filter((a) => a.status === 'REJECTED').length;
  const ghosts = applications.filter((a) => a.status === 'GHOSTED').length;

  const parts = [`${applied} application${applied === 1 ? '' : 's'}`];
  if (rejections) parts.push(`${rejections} rejection${rejections === 1 ? '' : 's'}`);
  if (ghosts) parts.push(`${ghosts} ghost${ghosts === 1 ? '' : 's'}`);
  parts.push('1 offer');

  return {
    categorySlug: 'comeback',
    company: company.trim() || undefined,
    body: `The numbers: ${parts.join(', ')}.\n\nWhat actually helped:\n`,
  };
}
