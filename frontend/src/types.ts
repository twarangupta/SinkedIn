/** Shared API types (mirror the backend's public projections). */

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  showsCompany: boolean;
  showsConclusion: boolean;
  allowsPoll: boolean;
  requiresPoll: boolean;
}

export interface PublicUser {
  id: string;
  handle: string;
  avatarId: string;
  /** Present on the caller's own record (GET /users/me); drives first-run onboarding. */
  handleChosen?: boolean;
}

/** A public profile (handle + join date) from GET /users/:handle. */
export interface UserProfile {
  id: string;
  handle: string;
  avatarId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  parentId: string | null;
  score: number;
  createdAt: string;
  user: PublicUser;
}

/** The single top comment previewed on a Sink card in the feed. */
export interface TopComment {
  id: string;
  body: string;
  score: number;
  createdAt: string;
  user: PublicUser;
}

export interface PollOption {
  id: string;
  label: string;
  position: number;
  _count: { votes: number };
}

export interface Sink {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  company: string | null;
  /** Linked company (for the logo); domain only, null when unlinked. */
  companyRef: { domain: string | null } | null;
  conclusion: string | null;
  conclusionOther: string | null;
  score: number;
  createdAt: string;
  category: { id: string; name: string; slug: string; color: string };
  user: PublicUser;
  /** The highest-scored top-level comment, previewed in the feed (null if none). */
  topComment: TopComment | null;
  pollOptions: PollOption[];
  _count: { comments: number; votes: number; bookmarks: number };
  /** The current user's vote on this Sink (null if not voted / anonymous). */
  myVote: 'BUOY' | 'ANCHOR' | null;
  /** The poll option id the current user chose (null if none / anonymous). */
  myPollVote: string | null;
}

/** Private job-tracker (Phase 2). Owner-only — never a public/pseudonymous shape. */
export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'OA'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'GHOSTED'
  | 'WITHDRAWN'
  | 'OTHER';

export type InterviewRoundType =
  | 'PHONE_SCREEN'
  | 'ONLINE_ASSESSMENT'
  | 'TECHNICAL'
  | 'SYSTEM_DESIGN'
  | 'BEHAVIORAL'
  | 'HIRING_MANAGER'
  | 'HR'
  | 'OTHER';

export type InterviewRoundResult = 'PENDING' | 'CLEARED' | 'REJECTED';

/** An optional, per-application interview round (add/remove/reorder). */
export interface InterviewRound {
  id: string;
  position: number;
  type: InterviewRoundType;
  typeOther: string | null;
  scheduledAt: string | null;
  result: InterviewRoundResult;
  notes: string | null;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  statusOther: string | null;
  jobUrl: string | null;
  appliedAt: string | null;
  notes: string | null;
  /** Private resume PDF object key in the `resumes` bucket; null when none. */
  resumeFileKey: string | null;
  /** Original filename of the uploaded resume (display only); null when none. */
  resumeFileName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Linked company (for the logo); domain only, null for unlinked/user-added. */
  companyRef: { domain: string | null } | null;
  rounds: InterviewRound[];
}
