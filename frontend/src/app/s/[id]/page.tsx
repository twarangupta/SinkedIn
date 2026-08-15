/**
 * Single Sink — a SERVER component at /s/:id.
 *
 * SSR + generateMetadata means each Sink has real HTML plus per-Sink <title>
 * and OpenGraph tags — so it's indexable AND shows a rich preview when shared
 * (the thing a client-only SPA can't do).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSinkServer } from '@/lib/server-api';
import { Header } from '@/components/layout/Header';
import { SinkCard } from '@/components/SinkCard';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const sink = await getSinkServer(params.id);
  if (!sink) return { title: 'Sink not found · SinkedIn' };

  const description =
    (sink.body ?? '').slice(0, 160) || `${sink.category.name} on SinkedIn`;
  return {
    title: `${sink.title} · SinkedIn`,
    description,
    openGraph: { title: sink.title, description, type: 'article' },
  };
}

export default async function SinkPage({
  params,
}: {
  params: { id: string };
}) {
  const sink = await getSinkServer(params.id);
  if (!sink) notFound();

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <Link href="/" className="text-sm text-ink-3 hover:text-ink">
          ← Back to feed
        </Link>
        <SinkCard sink={sink} />
        <p className="px-1 text-sm text-ink-3">Comments are coming soon.</p>
      </div>
    </div>
  );
}
