'use client';

/**
 * Root error boundary (App Router). Catches render/data-fetch failures in the
 * page segments so a backend hiccup shows a friendly, on-brand retry instead of
 * a raw crash (exactly the failure mode a down backend causes for the SSR feed).
 * `reset()` re-renders the segment to retry.
 */

import { Button } from '../components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Something sank.</h1>
      <p className="max-w-sm text-sm text-ink-3">
        We could not load this right now. It is usually a brief hiccup on our
        end. Give it another go.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
