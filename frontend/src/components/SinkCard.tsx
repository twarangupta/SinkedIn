/**
 * SinkCard — renders one Sink (the core feed primitive).
 *
 * Presentational: takes a Sink as props, renders it. Voting buttons prompt
 * sign-in when logged out (via requireAuth); the actual vote mutation is a
 * later slice, so for now they're display + auth-gate only.
 */

import Link from 'next/link';
import { CategoryPill } from './CategoryPill';
import { VoteControl } from './VoteControl';
import { PollBlock } from './PollBlock';
import { Avatar } from './avatar/Avatar';
import { ExpandableText } from './ExpandableText';
import { SinkComments } from './SinkComments';
import { SinkActions } from './SinkActions';
import { ShareButton } from './ShareButton';
import { BookmarkButton } from './BookmarkButton';
import { timeAgo } from '../lib/format';
import type { Sink } from '../types';

export function SinkCard({
  sink,
  expandable = true,
}: {
  sink: Sink;
  /** Feed cards truncate long bodies; the single-Sink page passes false. */
  expandable?: boolean;
}) {
  return (
    <article className="relative rounded-xl border border-line bg-surface p-5">
      <header className="mb-3 flex items-center gap-3">
        <Link
          href={`/u/${sink.user.handle}`}
          className="rounded-full hover:ring-2 hover:ring-line-strong"
          aria-label={`${sink.user.handle} profile`}
        >
          <Avatar avatarId={sink.user.avatarId} handle={sink.user.handle} size={36} />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/u/${sink.user.handle}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {sink.user.handle}
          </Link>
          <div className="text-xs text-ink-3">{timeAgo(sink.createdAt)}</div>
        </div>
        {/* Top-right: save (with count) + the ⋮ options menu (edit/delete/report). */}
        <div className="ml-auto flex items-center gap-1">
          <BookmarkButton
            sinkId={sink.id}
            showLabel={false}
            count={sink._count.bookmarks}
            authorId={sink.user.id}
          />
          <SinkActions sink={sink} />
        </div>
      </header>

      <div className="mb-2">
        <CategoryPill
          name={sink.category.name}
          color={sink.category.color}
          slug={sink.category.slug}
        />
      </div>
      <Link href={`/s/${sink.id}`} className="hover:underline">
        <h3 className="mb-1 font-display text-lg font-medium">{sink.title}</h3>
      </Link>
      {sink.company && (
        <div className="mb-2 text-xs text-ink-3">
          at {sink.company}
          {sink.conclusion ? ` · ${sink.conclusion.toLowerCase()}` : ''}
        </div>
      )}
      {sink.body &&
        (expandable ? (
          <ExpandableText text={sink.body} />
        ) : (
          <p className="mb-3 whitespace-pre-wrap text-sm text-ink-2">{sink.body}</p>
        ))}
      {sink.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sink.imageUrl}
          alt=""
          className="mb-3 max-h-96 w-full rounded-lg border border-line object-cover"
        />
      )}
      {sink.pollOptions.length > 0 && (
        <PollBlock
          sinkId={sink.id}
          options={sink.pollOptions}
          myPollVote={sink.myPollVote}
        />
      )}

      <footer className="mt-2 flex items-center gap-4 text-sm text-ink-3">
        <VoteControl kind="sink" id={sink.id} score={sink.score} myVote={sink.myVote} />
        <ShareButton sinkId={sink.id} title={sink.title} />
      </footer>

      {/* Feed only: read, vote, reply, and add comments inline (no navigation).
          The detail page has its own full thread below the Sink. */}
      {expandable && (
        <SinkComments
          sinkId={sink.id}
          commentCount={sink._count.comments}
          topComment={sink.topComment}
        />
      )}

    </article>
  );
}
