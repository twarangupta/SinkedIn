'use client';

/**
 * OnboardingModal — the first-run "pick your handle" moment. Shows once, when a
 * signed-in user hasn't chosen a handle yet (handleChosen === false). Picking a
 * handle (via HandlePicker) or keeping the auto-assigned one both set
 * handleChosen = true, which closes this. Rendered app-wide from Providers.
 */

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useMe } from '../lib/me';
import { apiFetch } from '../lib/api';
import { HandlePicker } from './HandlePicker';
import type { PublicUser } from '../types';

export function OnboardingModal() {
  const { session } = useAuth();
  const { me, setMe } = useMe();
  const [skipping, setSkipping] = useState(false);

  // Only for a signed-in user who hasn't been onboarded yet.
  if (!session || !me || me.handleChosen !== false) return null;

  const keepCurrent = async () => {
    setSkipping(true);
    try {
      const { user } = await apiFetch<{ user: PublicUser }>(
        '/api/v1/users/me/onboarded',
        { method: 'POST' },
      );
      setMe(user);
    } catch {
      setSkipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6">
        <h1 className="font-display text-xl font-bold">Welcome aboard.</h1>
        <p className="mt-1 text-sm text-ink-3">
          You are anonymous here. Pick a handle to post under, or keep the one we
          gave you.
        </p>

        <div className="mt-4">
          <HandlePicker />
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={keepCurrent}
            disabled={skipping}
            className="text-xs text-ink-3 hover:text-ink"
          >
            {skipping ? 'One sec…' : `Keep "${me.handle}"`}
          </button>
        </div>
      </div>
    </div>
  );
}
