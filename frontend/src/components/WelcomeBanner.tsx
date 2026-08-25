'use client';

/**
 * WelcomeBanner — a small, friendly greeting above the feed that greets the
 * signed-in user by handle and shows a rotating on-brand line, so the top of the
 * page feels a little different every visit.
 *
 * Client component: the handle comes from the shared MeProvider (JWT-fetched),
 * so no real identity is ever server-rendered. Falls back to a generic welcome
 * when signed out or still loading.
 */

import { useMe } from '../lib/me';
import { useRotating } from '../lib/useRotating';
import { WELCOME_LINES } from '../lib/prompts';

export function WelcomeBanner() {
  const { me } = useMe();
  const { item: line, key: lineKey } = useRotating(WELCOME_LINES);

  return (
    <div className="px-1">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        {me ? `Welcome back, ${me.handle}` : 'Welcome to SinkedIn'}
      </h1>
      <p className="mt-0.5 text-sm text-ink-2">
        <span key={lineKey} className="rotator-fade inline-block">
          {line}
        </span>
      </p>
    </div>
  );
}
