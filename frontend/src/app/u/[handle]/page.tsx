/**
 * Public profile — a SERVER component at /u/:handle.
 *
 * Shows a pseudonymous user's handle, join date, and post history (their
 * Sinks). SSR'd with per-profile metadata so profiles are indexable and share
 * cleanly. Only public data — never email/real identity (privacy hard-rule).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCategoriesServer,
  getUserFeedServer,
  getUserProfileServer,
} from '@/lib/server-api';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/avatar/Avatar';
import { PageHeader } from '@/components/PageHeader';
import { Feed } from '@/components/Feed';
import { FeedFilter } from '@/components/FeedFilter';

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const user = await getUserProfileServer(params.handle);
  if (!user) return { title: 'Profile not found · SinkedIn' };
  const title = `${user.handle} · SinkedIn`;
  const description = `${user.handle}'s Sinks on SinkedIn. The real side of the job market.`;
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
  searchParams,
}: {
  params: { handle: string };
  searchParams: { category?: string };
}) {
  const user = await getUserProfileServer(params.handle);
  if (!user) notFound();

  const category =
    typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const [feed, categories] = await Promise.all([
    getUserFeedServer(user.handle, { category }),
    getCategoriesServer(),
  ]);
  const basePath = `/u/${user.handle}`;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <PageHeader title="Profile" />

        <header className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
          <Avatar avatarId={user.avatarId} handle={user.handle} size={56} />
          <div className="min-w-0">
            <div className="truncate font-display text-xl font-medium">{user.handle}</div>
            <div className="text-sm text-ink-3">Joined {joinedLabel(user.createdAt)}</div>
          </div>
        </header>

        {/* Post history: same infinite-scroll Feed + category filter as home,
            scoped to this author. The label hugs the feed (space-y-2); the outer
            space-y-4 keeps a single clean gap from the profile header above. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">Sinks</span>
            <FeedFilter
              categories={categories}
              activeSlug={category}
              basePath={basePath}
            />
          </div>

          <Feed
            key={`${user.handle}:${category ?? 'all'}`}
            initialSinks={feed.sinks}
            initialNextCursor={feed.nextCursor}
            author={user.handle}
            category={category}
            emptyMessage={
              category
                ? 'No Sinks in this category yet.'
                : "Hasn't made a splash yet."
            }
          />
        </div>
      </div>
    </div>
  );
}
