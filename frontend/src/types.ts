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
  company: string | null;
  conclusion: string | null;
  conclusionOther: string | null;
  score: number;
  createdAt: string;
  category: { id: string; name: string; slug: string; color: string };
  user: PublicUser;
  pollOptions: PollOption[];
  _count: { comments: number; votes: number };
  /** The current user's vote on this Sink (null if not voted / anonymous). */
  myVote: 'BUOY' | 'ANCHOR' | null;
}
