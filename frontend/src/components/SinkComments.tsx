'use client';

/**
 * SinkComments — the whole comment experience for a feed card, done in-place so
 * a user never has to navigate to the Sink page just to read or reply.
 *
 *  - 0 comments: the inline "be the first" composer (AddFirstComment).
 *  - >0 comments (collapsed): a preview of the top comment + a toggle.
 *  - Expanded: the full threaded CommentSection, lazy-loaded on first open
 *    (the feed SSR only carries the count + top comment, not every comment).
 *
 * The single-Sink page (/s/:id) still exists as the SEO-indexable permalink;
 * this just removes the forced navigation for interaction.
 */

import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Avatar } from './avatar/Avatar';
import { VoteControl } from './VoteControl';
import { CommentSection } from './CommentSection';
import { AddFirstComment } from './AddFirstComment';
import type { Comment, TopComment } from '../types';

export function SinkComments({
  sinkId,
  commentCount,
  topComment,
}: {
  sinkId: string;
  commentCount: number;
  topComment: TopComment | null;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusCompose, setFocusCompose] = useState(false);

  if (commentCount === 0) {
    return (
      <div className="mt-3">
        <AddFirstComment sinkId={sinkId} />
      </div>
    );
  }

  const expand = async (focus = false) => {
    setFocusCompose(focus);
    setOpen(true);
    if (comments === null && !loading) {
      setLoading(true);
      try {
        const res = await apiFetch<{ comments: Comment[] }>(
          `/api/v1/sinks/${sinkId}/comments`,
        );
        setComments(res.comments);
      } catch {
        setOpen(false); // let the user retry
      } finally {
        setLoading(false);
      }
    }
  };

  if (open) {
    return (
      <div className="mt-3">
        {comments === null ? (
          <p className="py-2 text-sm text-ink-3">Dredging up the comments…</p>
        ) : (
          <CommentSection
            sinkId={sinkId}
            comments={comments}
            flat
            autoFocusCompose={focusCompose}
          />
        )}
        <button
          onClick={() => setOpen(false)}
          className="mt-3 text-xs font-medium text-ink-3 hover:text-primary"
        >
          Hide comments
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {topComment && (
        <div className="rounded-lg border border-line bg-elevated/40 p-3">
          <div className="mb-1 flex items-center gap-2">
            <Avatar
              avatarId={topComment.user.avatarId}
              handle={topComment.user.handle}
              size={20}
            />
            <span className="text-xs font-medium text-ink-2">
              {topComment.user.handle}
            </span>
            <span className="text-xs text-ink-3">
              · {timeAgo(topComment.createdAt)}
            </span>
          </div>
          <p className="line-clamp-2 whitespace-pre-wrap text-sm text-ink-2">
            {topComment.body}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <VoteControl
              kind="comment"
              id={topComment.id}
              score={topComment.score}
              myVote={null}
              size="sm"
            />
            <button
              onClick={() => expand(true)}
              className="text-xs font-medium text-ink-3 hover:text-primary"
            >
              Reply
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => expand(false)}
        className="text-sm font-medium text-ink-3 hover:text-primary"
      >
        View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
      </button>
    </div>
  );
}
