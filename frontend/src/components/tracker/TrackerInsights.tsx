'use client';

/**
 * TrackerInsights — a PRIVATE, single-user dashboard over the owner's own
 * tracker: a funnel (applied → OA → interview → offer), the key rates, median
 * response time, which resume gets replies, and a gentle weekly cadence nudge.
 *
 * Every number is the user's own math (fetched from /applications/insights with
 * the JWT) — no cross-user data, so nothing private is ever aggregated or
 * indexed. Purely presentational beyond the one fetch.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface Insights {
  total: number;
  funnel: { applied: number; oa: number; interview: number; offer: number };
  rates: { response: number; interview: number; offer: number; ghost: number };
  medianResponseDays: number | null;
  perResume: { name: string; applied: number; responseRate: number }[];
  cadence: { thisWeek: number; lastWeek: number };
}

/** One labelled percentage tile. */
function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-ink-2">{label}</div>
      {hint && <div className="text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

/** One funnel row: a labelled bar whose width is relative to the widest stage. */
function FunnelRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-xs text-ink-2">{label}</div>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-elevated">
        <div
          className="flex h-full items-center justify-end rounded-md bg-primary px-2 text-[11px] font-medium text-white"
          style={{ width: `${Math.max(width, count > 0 ? 8 : 0)}%` }}
        >
          {count > 0 ? count : ''}
        </div>
      </div>
    </div>
  );
}

export function TrackerInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Insights>('/api/v1/applications/insights')
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="py-8 text-center text-sm text-ink-3">Could not load insights.</p>;
  }
  if (!data) {
    return <p className="py-8 text-center text-sm text-ink-3">Crunching your numbers…</p>;
  }
  if (data.funnel.applied === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="mb-1 font-medium">No insights yet</p>
        <p className="text-sm text-ink-3">
          Mark an application as Applied (or further) and your funnel, response
          rate, and more will show up here.
        </p>
      </div>
    );
  }

  const { funnel, rates, cadence, perResume, medianResponseDays } = data;
  const cadenceDelta = cadence.thisWeek - cadence.lastWeek;

  return (
    <div className="space-y-6">
      {/* Rates */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Response rate" value={`${rates.response}%`} hint="got any reply" />
        <StatTile label="Interview rate" value={`${rates.interview}%`} hint="reached an interview" />
        <StatTile label="Offer rate" value={`${rates.offer}%`} hint="reached an offer" />
        <StatTile label="Ghost rate" value={`${rates.ghost}%`} hint="no reply at all" />
      </div>

      {/* Funnel */}
      <section className="space-y-2 rounded-xl border border-line bg-surface p-5">
        <h3 className="mb-2 text-sm font-medium text-ink">Your funnel</h3>
        <FunnelRow label="Applied" count={funnel.applied} max={funnel.applied} />
        <FunnelRow label="OA" count={funnel.oa} max={funnel.applied} />
        <FunnelRow label="Interview" count={funnel.interview} max={funnel.applied} />
        <FunnelRow label="Offer" count={funnel.offer} max={funnel.applied} />
      </section>

      {/* Secondary facts */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="mb-1 text-sm font-medium text-ink">Median response time</h3>
          <p className="text-sm text-ink-2">
            {medianResponseDays === null
              ? 'No replies to measure yet.'
              : `About ${medianResponseDays} ${medianResponseDays === 1 ? 'day' : 'days'} from applying to first reply.`}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="mb-1 text-sm font-medium text-ink">This week</h3>
          <p className="text-sm text-ink-2">
            {cadence.thisWeek} applied in the last 7 days
            {cadence.lastWeek > 0 || cadence.thisWeek > 0
              ? `, ${cadence.lastWeek} the week before`
              : ''}
            .
            {cadenceDelta > 0 && ' Nice, you picked up the pace.'}
          </p>
        </div>
      </div>

      {/* Which resume gets replies */}
      {perResume.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h3 className="mb-3 text-sm font-medium text-ink">Which resume gets replies</h3>
          <div className="space-y-2">
            {perResume.map((r) => (
              <div key={r.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-ink-2" title={r.name}>{r.name}</span>
                <span className="shrink-0 text-ink-3">
                  {r.responseRate}% reply · {r.applied} sent
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
