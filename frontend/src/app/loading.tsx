/**
 * Route-level loading UI (App Router). Shown INSTANTLY on navigation while the
 * server component for the next route renders — so moving between the feed, a
 * Sink, and profiles feels responsive instead of freezing on the old page for
 * ~1s (the SSR round-trip to the backend in prod). A lightweight skeleton that
 * roughly matches the page shell.
 */

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        {/* A few card-shaped shimmer placeholders. */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-line bg-surface p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-elevated" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-elevated" />
                <div className="h-2 w-16 rounded bg-elevated" />
              </div>
            </div>
            <div className="mb-2 h-5 w-3/4 rounded bg-elevated" />
            <div className="mb-1 h-3 w-full rounded bg-elevated" />
            <div className="h-3 w-2/3 rounded bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}
