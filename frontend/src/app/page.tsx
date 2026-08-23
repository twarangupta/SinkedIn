/**
 * Home / feed — a SERVER component. Fetches Sinks + categories on the server and
 * renders real HTML (SSR), so the feed is indexable. Interactive bits (composer,
 * vote controls, auth, filter) are client components nested inside.
 *
 * The feed reads two URL params so the view is shareable/bookmarkable and the
 * server-rendered HTML matches what the client paginates:
 *   - `sort`     → 'top' (Trending, by score) or 'latest' (default, newest).
 *   - `category` → a category slug to filter by (from the filter control).
 */

import Link from 'next/link';
import { getCategoriesServer, getFeedServer } from '@/lib/server-api';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { SinkComposer } from '@/components/SinkComposer';
import { Feed } from '@/components/Feed';
import { FeedFilter } from '@/components/FeedFilter';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { sort?: string; category?: string };
}) {
  // Default sort is Trending (top) for everyone. Latest is the explicit opt-in
  // via ?sort=latest. A personalized "For you" default comes later, once there's
  // enough seeded content + personalization to make it meaningful.
  const sort = searchParams.sort === 'latest' ? 'latest' : 'top';
  const category =
    typeof searchParams.category === 'string' ? searchParams.category : undefined;

  const [feed, categories] = await Promise.all([
    getFeedServer({ sort, category }),
    getCategoriesServer(),
  ]);

  // Build a tab href that keeps the active category filter. Trending (top) is
  // the default, so only Latest carries an explicit sort param.
  const tabHref = (s: 'latest' | 'top') => {
    const params = new URLSearchParams();
    if (s === 'latest') params.set('sort', 'latest');
    if (category) params.set('category', category);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  const tabClass = (active: boolean) =>
    active
      ? 'border-b-2 border-primary pb-2 font-medium text-ink'
      : 'pb-2 text-ink-3 hover:text-ink';

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-4">
          <SinkComposer categories={categories} />

          <div className="flex items-center gap-4 border-b border-line text-sm">
            <Link href={tabHref('top')} className={tabClass(sort === 'top')}>
              Trending
            </Link>
            <Link href={tabHref('latest')} className={tabClass(sort === 'latest')}>
              Latest
            </Link>
            {/* Category filter, top-right of the tab row. Preserves the sort. */}
            <div className="ml-auto pb-1">
              <FeedFilter
                categories={categories}
                activeSlug={category}
                sort={sort}
              />
            </div>
          </div>

          <Feed
            key={`${sort}:${category ?? 'all'}`}
            initialSinks={feed.sinks}
            initialNextCursor={feed.nextCursor}
            sort={sort}
            category={category}
          />
        </main>

        <RightSidebar categories={categories} />
      </div>
    </div>
  );
}
