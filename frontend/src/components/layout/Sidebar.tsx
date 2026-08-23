/**
 * Left navigation sidebar. Home and Tracker are wired; the rest are Phase-later
 * stubs shown for layout. The "Your Tracker" section (signed-in only) lists live
 * per-status counts that link to the filtered tracker.
 */

import Link from 'next/link';
import { TrackerNav } from '../tracker/TrackerNav';

const STUBS = ['Companies', 'Interviews', 'Salaries', 'Leaderboard'];

export function Sidebar() {
  // One consistent row size across the whole sidebar (nav + Your Tracker).
  const navRowCls =
    'block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink';
  const trackerRowCls =
    'rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink';

  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-20 flex h-[calc(100vh-7rem)] flex-col">
        <nav className="space-y-0.5">
          <Link href="/" className={`${navRowCls} bg-elevated !text-primary`}>
            Home
          </Link>
          <Link href="/tracker" className={navRowCls}>
            Tracker
          </Link>
          {STUBS.map((label) => (
            <button key={label} className={navRowCls}>
              {label}
            </button>
          ))}
        </nav>
        {/* Pinned to the bottom of the sidebar; larger rows than the main nav. */}
        <div className="mt-auto pb-2">
          <TrackerNav rowClassName={trackerRowCls} />
        </div>
      </div>
    </aside>
  );
}
