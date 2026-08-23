'use client';

/**
 * HandlePicker — pick or change your pseudonymous handle: tap a suggestion or
 * type your own, with a live availability check (debounced), then Save. Uses the
 * shared MeProvider so the new handle shows in the header/profile immediately.
 */

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useMe } from '../lib/me';
import { Button } from './ui/Button';
import type { PublicUser } from '../types';

type Status =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok' }
  | { state: 'bad'; reason: string };

export function HandlePicker() {
  const { me, setMe } = useMe();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounce = useRef<number>();

  // Seed the input with the current handle once loaded.
  useEffect(() => {
    if (me) setValue((v) => v || me.handle);
  }, [me]);

  // Load a few suggestions on mount.
  useEffect(() => {
    apiFetch<{ suggestions: string[] }>('/api/v1/users/handle/suggestions')
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => undefined);
  }, []);

  // Live availability check (debounced), skipping the unchanged current handle.
  useEffect(() => {
    setSaved(false);
    if (!me) return;
    if (value === me.handle) {
      setStatus({ state: 'idle' });
      return;
    }
    if (value.length < 3) {
      setStatus({ state: 'bad', reason: 'A bit short.' });
      return;
    }
    setStatus({ state: 'checking' });
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      try {
        const res = await apiFetch<{ available: boolean; reason?: string }>(
          `/api/v1/users/handle/available?handle=${encodeURIComponent(value)}`,
        );
        setStatus(
          res.available
            ? { state: 'ok' }
            : { state: 'bad', reason: res.reason ?? 'Not available.' },
        );
      } catch {
        setStatus({ state: 'bad', reason: 'Could not check right now.' });
      }
    }, 350);
    return () => window.clearTimeout(debounce.current);
  }, [value, me]);

  const canSave = status.state === 'ok' && !saving;

  const save = async () => {
    if (!me || !canSave) return;
    setSaving(true);
    try {
      const { user } = await apiFetch<{ user: PublicUser }>(
        '/api/v1/users/me/handle',
        { method: 'PATCH', body: JSON.stringify({ handle: value }) },
      );
      setMe(user);
      setStatus({ state: 'idle' });
      setSaved(true);
    } catch (err) {
      setStatus({
        state: 'bad',
        reason: err instanceof Error ? err.message : 'Could not save.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 className="text-sm font-medium text-ink-2">Your handle</h2>
        <p className="mt-0.5 text-xs text-ink-3">
          A pseudonym, not your real name. No real names, no company. It is public.
        </p>
      </div>

      <div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.trim())}
          maxLength={30}
          spellCheck={false}
          className="h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none focus:border-primary"
          placeholder="Pick a handle"
        />
        <div className="mt-1 h-4 text-xs">
          {status.state === 'checking' && (
            <span className="text-ink-3">Checking…</span>
          )}
          {status.state === 'ok' && (
            <span className="text-emerald-400">✓ Available</span>
          )}
          {status.state === 'bad' && (
            <span className="text-danger">{status.reason}</span>
          )}
          {status.state === 'idle' && saved && (
            <span className="text-ink-3">Saved.</span>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setValue(s)}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save handle'}
        </Button>
      </div>
    </section>
  );
}
