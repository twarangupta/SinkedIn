/**
 * Sink detail page — the per-Sink URL (/s/:id).
 *
 * This is what makes each Sink shareable and (eventually) SEO-indexable, and
 * it's where comments will live. Sets the document title from the Sink so the
 * browser tab and search snippet are meaningful.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Header } from '../components/layout/Header';
import { SinkCard } from '../components/SinkCard';
import type { Sink } from '../types';

export function SinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sink, setSink] = useState<Sink | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ sink: Sink }>(`/api/v1/sinks/${id}`)
      .then((res) => {
        setSink(res.sink);
        document.title = `${res.sink.title} · SinkedIn`;
      })
      .catch((err) => setError(err.message));

    return () => {
      document.title = 'SinkedIn — the real side of the job hunt';
    };
  }, [id]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <Link to="/" className="text-sm text-ink-3 hover:text-ink">
          ← Back to feed
        </Link>
        {error && <p className="text-danger">{error}</p>}
        {sink && <SinkCard sink={sink} />}
        {sink && (
          <p className="px-1 text-sm text-ink-3">Comments are coming soon.</p>
        )}
      </div>
    </div>
  );
}
