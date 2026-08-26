/**
 * Sink-draft handoff — the one-way bridge from the private tracker to a public
 * Sink. When a user chooses "post this application as a Sink", we stash a small
 * DRAFT here and open the composer pre-filled; the user then edits and confirms.
 *
 * Why sessionStorage (not a URL param): the draft can carry a company name, and
 * we never put personal/tracker data in the address bar. It lives only in this
 * tab, is read exactly once, and is cleared immediately after.
 *
 * Nothing here auto-posts. The Sink is only created when the user hits Post in
 * the composer, so real tracker data never flows public without an explicit act.
 */

export interface SinkDraft {
  categorySlug?: string; // pre-select this category (matched by slug)
  company?: string; // pre-fill the company field (if the category shows it)
  conclusion?: string; // pre-select the outcome (if the category shows it)
  body?: string; // a scaffold (e.g. interview rounds) — never private notes
}

const KEY = 'sinkedin:sink-draft';

/** Stash a draft for the composer to pick up after navigation. */
export function stashSinkDraft(draft: SinkDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode / storage disabled: the bridge just no-ops.
  }
}

/** Read AND clear the pending draft (one-shot). Returns null if there is none. */
export function takeSinkDraft(): SinkDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as SinkDraft;
  } catch {
    return null;
  }
}
