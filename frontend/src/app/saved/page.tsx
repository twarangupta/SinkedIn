'use client';

/**
 * Saved — the caller's private bookmarked Sinks. Client component (auth-only):
 * the list is per-user and never SSR'd. Signed-out visitors get a sign-in
 * prompt; signed-in visitors see their saved Sinks, newest-saved first.
 */

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { PageHeader } from '../../components/PageHeader';
import { SinkCard } from '../../components/SinkCard';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { apiFetch } from '../../lib/api';
import type { Sink } from '../../types';

export default function SavedPage() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  // null = not loaded yet; [] = loaded and empty.
  const [sinks, setSinks] = useState<Sink[] | null>(null);

  useEffect(() => {
    if (!session) {
      setSinks(null);
      return;
    }
    let cancelled = false;
    apiFetch<{ sinks: Sink[] }>('/api/v1/users/me/bookmarks')
      .then((res) => {
        if (!cancelled) setSinks(res.sinks);
      })
      .catch(() => {
        if (!cancelled) setSinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <PageHeader title="Saved" />

        {!session ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <p className="mb-3 text-sm text-ink-3">
              Sign in to see the Sinks you&apos;ve saved.
            </p>
            <Button onClick={open}>Sign in</Button>
          </div>
        ) : sinks === null ? (
          <p className="py-8 text-center text-ink-3">Loading…</p>
        ) : sinks.length === 0 ? (
          <EmptyState
            title="You've hit an iceberg"
            subtitle="Nothing saved yet. Tap Save on a Sink to keep it here."
          />
        ) : (
          <div className="space-y-4">
            {sinks.map((sink) => (
              <SinkCard key={sink.id} sink={sink} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
