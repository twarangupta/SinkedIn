/**
 * Public profile — a SERVER component at /u/:handle.
 *
 * Shows a pseudonymous user's handle, join date, and post history (their
 * Sinks). SSR'd with per-profile metadata so profiles are indexable and share
 * cleanly. Only public data — never email/real identity (privacy hard-rule).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserProfileServer, getUserSinksServer } from '@/lib/server-api';
import { initials } from '@/lib/format';
import { Header } from '@/components/layout/Header';
import { SinkCard } from '@/components/SinkCard';

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const user = await getUserProfileServer(params.handle);
  if (!user) return { title: 'Profile not found · SinkedIn' };
  const title = `${user.handle} · SinkedIn`;
  const description = `${user.handle}'s Sinks on SinkedIn — The real side of the job market.`;
  return { title, description, openGraph: { title, description, type: 'profile' } };
}

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export default async function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const user = await getUserProfileServer(params.handle);
  if (!user) notFound();
  const sinks = await getUserSinksServer(user.handle);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <Link href="/" className="text-sm text-ink-3 hover:text-ink">
          ← Back to feed
        </Link>

        <header className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-elevated text-lg text-ink-2">
            {initials(user.handle)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-medium">{user.handle}</h1>
            <div className="text-sm text-ink-3">
              Joined {joinedLabel(user.createdAt)} · {sinks.length}{' '}
              {sinks.length === 1 ? 'Sink' : 'Sinks'}
            </div>
          </div>
        </header>

        {sinks.length === 0 ? (
          <p className="py-8 text-center text-ink-3">No Sinks yet.</p>
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
