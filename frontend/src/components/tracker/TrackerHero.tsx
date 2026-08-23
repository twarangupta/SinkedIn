/**
 * TrackerHero — the PUBLIC, server-rendered marketing hero for the job tracker.
 *
 * This is the SEO surface: it renders as real HTML for everyone (crawlers
 * included), with no user data, so the page can rank for "free job application
 * tracker" and similar. The private tracker (TrackerApp) hydrates below it and
 * is the only thing that touches real data.
 */

import { StartTrackingButton } from './StartTrackingButton';

const FEATURES = [
  ['Track everything in one place', 'Every application, OA, interview, and offer, not scattered across tabs, emails, and a spreadsheet you stopped updating.'],
  ['Move it down the pipeline', 'Saved → Applied → OA → Interview → Offer. One click to update where each one stands.'],
  ['Private by default', 'Only you can ever see your tracker. It is never public, never on your profile, never indexed.'],
  ['Actually free', 'No trial, no card, no upsell wall. It is a tool, not a funnel.'],
];

export function TrackerHero() {
  return (
    <section className="text-center">
      <p className="mb-2 text-sm font-medium text-primary">Job tracker</p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        The free job application tracker
        <br className="hidden sm:block" /> for people who hate spreadsheets
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-ink-2">
        Track every application, assessment, interview, and offer in one private
        place. Built for the real, messy job hunt, no LinkedIn performance, no
        noise.
      </p>
      <div className="mt-5 flex justify-center">
        <StartTrackingButton />
      </div>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-1 font-medium">{title}</div>
            <div className="text-sm text-ink-3">{body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
