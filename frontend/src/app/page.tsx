/**
 * Home / feed — a SERVER component. Fetches Sinks + categories on the server and
 * renders real HTML (SSR), so the feed is indexable. Interactive bits (composer,
 * vote controls, auth) are client components nested inside.
 */

import { getCategoriesServer, getFeedServer } from '@/lib/server-api';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { SinkComposer } from '@/components/SinkComposer';
import { SinkCard } from '@/components/SinkCard';

export default async function HomePage() {
  const [sinks, categories] = await Promise.all([
    getFeedServer(),
    getCategoriesServer(),
  ]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-4">
          <SinkComposer categories={categories} />

          <div className="flex gap-4 border-b border-line text-sm">
            <span className="border-b-2 border-primary pb-2 font-medium text-ink">
              For you
            </span>
            <span className="pb-2 text-ink-3">Trending</span>
            <span className="pb-2 text-ink-3">Latest</span>
          </div>

          {sinks.length === 0 ? (
            <p className="py-8 text-center text-ink-3">
              Nothing&apos;s sunk yet. Be the first to overshare.
            </p>
          ) : (
            sinks.map((sink) => <SinkCard key={sink.id} sink={sink} />)
          )}
        </main>

        <RightSidebar categories={categories} />
      </div>
    </div>
  );
}
