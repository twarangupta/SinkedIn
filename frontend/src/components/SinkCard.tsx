/**
 * SinkCard — renders one Sink (the core feed primitive).
 *
 * Presentational: takes a Sink as props, renders it. Voting buttons prompt
 * sign-in when logged out (via requireAuth); the actual vote mutation is a
 * later slice, so for now they're display + auth-gate only.
 */

import { Link } from 'react-router-dom';
import { CategoryPill } from './CategoryPill';
import { VoteControl } from './VoteControl';
import type { PollOption, Sink } from '../types';

function initials(handle: string): string {
  return handle.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '::';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PollBlock({ options }: { options: PollOption[] }) {
  const total = options.reduce((sum, o) => sum + o._count.votes, 0);
  return (
    <div className="mb-3 space-y-2">
      {options.map((option) => {
        const pct = total ? Math.round((option._count.votes / total) * 100) : 0;
        return (
          <div
            key={option.id}
            className="relative overflow-hidden rounded-lg border border-line bg-elevated"
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/25"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between px-3 py-2 text-sm">
              <span>{option.label}</span>
              <span className="font-mono text-ink-3">{pct}%</span>
            </div>
          </div>
        );
      })}
      <div className="text-xs text-ink-3">{total} votes</div>
    </div>
  );
}

export function SinkCard({ sink }: { sink: Sink }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-xs text-ink-2">
          {initials(sink.user.handle)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{sink.user.handle}</div>
          <div className="text-xs text-ink-3">{timeAgo(sink.createdAt)}</div>
        </div>
      </header>

      <div className="mb-2">
        <CategoryPill name={sink.category.name} color={sink.category.color} />
      </div>
      <Link to={`/s/${sink.id}`} className="hover:underline">
        <h3 className="mb-1 font-display text-lg font-medium">{sink.title}</h3>
      </Link>
      {sink.company && (
        <div className="mb-2 text-xs text-ink-3">
          at {sink.company}
          {sink.conclusion ? ` · ${sink.conclusion.toLowerCase()}` : ''}
        </div>
      )}
      {sink.body && (
        <p className="mb-3 whitespace-pre-wrap text-sm text-ink-2">{sink.body}</p>
      )}
      {sink.pollOptions.length > 0 && <PollBlock options={sink.pollOptions} />}

      <footer className="mt-2 flex items-center gap-4 text-sm text-ink-3">
        <VoteControl sinkId={sink.id} score={sink.score} myVote={sink.myVote} />
        <Link to={`/s/${sink.id}`} className="hover:text-ink">
          {sink._count.comments} comments
        </Link>
      </footer>
    </article>
  );
}
