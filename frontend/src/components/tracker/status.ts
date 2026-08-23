/**
 * Tracker status metadata — display order, labels, and pill colors for each
 * ApplicationStatus. Single source of truth so the list, filter, form, and the
 * later kanban board all agree.
 */

import type { ApplicationStatus } from '../../types';

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
