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
  conclusion: string | null;
  conclusionOther: string | null;
  score: number;
  createdAt: string;
  category: { id: string; name: string; slug: string; color: string };
  user: PublicUser;
  /** The highest-scored top-level comment, previewed in the feed (null if none). */
  topComment: TopComment | null;
  pollOptions: PollOption[];
  _count: { comments: number; votes: number };
  /** The current user's vote on this Sink (null if not voted / anonymous). */
  myVote: 'BUOY' | 'ANCHOR' | null;
  /** The poll option id the current user chose (null if none / anonymous). */
  myPollVote: string | null;
}
