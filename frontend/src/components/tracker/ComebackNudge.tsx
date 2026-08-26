'use client';

/**
 * ComebackNudge — the celebratory prompt shown when a user marks an application
 * as OFFER. Landing a job is normally a CHURN event (they leave); the Comeback
 * post flips it into a RETURN event and produces the most shareable content on
 * the site ("40 rejections, 1 offer, here's what worked").
 *
 * "Post a Comeback" pre-fills the composer via the same one-way bridge the
 * tracker uses (stash a draft, open the composer). Nothing posts automatically.
 */

import { useRouter } from 'next/navigation';
import { stashSinkDraft } from '../../lib/sinkDraft';
import { Button } from '../ui/Button';
import { comebackDraft } from './status';
import type { Application } from '../../types';

export function ComebackNudge({
  app,
  applications,
  onClose,
}: {
  app: Application; // the application that just became an offer
  applications: Application[]; // all of the user's apps, for the journey recap
  onClose: () => void;
}) {
  const router = useRouter();

  const postComeback = () => {
    stashSinkDraft(comebackDraft(app.company, applications));
    onClose();
    router.push('/');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h2 className="font-display text-lg font-semibold">
            You landed an offer{app.company ? ` at ${app.company}` : ''}!
          </h2>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-ink-2">
            Close out the hunt with a Comeback. Your real numbers help the next
            person still in the trenches.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Not now
            </Button>
            <Button size="sm" onClick={postComeback}>
              Post a Comeback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
