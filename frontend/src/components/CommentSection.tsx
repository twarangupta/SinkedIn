'use client';

/**
 * CommentSection — threaded comments on a Sink.
 *
 * The comments are fetched server-side (SSR, good for SEO) and passed in as a
 * flat list; this client component builds the reply tree and handles composing.
 * Public-first: composing prompts sign-in when logged out. After posting we
 * append the server's returned comment straight into local state — no
 * router.refresh(), so the new comment shows after a single round-trip instead
 * of two (post + full-page SSR re-pull) and with no page flash.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Avatar } from './avatar/Avatar';
import { VoteControl } from './VoteControl';
import { Button } from './ui/Button';
import type { Comment } from '../types';

interface CommentNode extends Comment {
  replies: CommentNode[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  comments.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: CommentNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });
  return roots;
}

/** Text box + submit. Prompts sign-in when logged out. */
function Composer({
  sinkId,
  parentId,
  placeholder,
  onDone,
  onAdded,
  autoFocus = false,
}: {
  sinkId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
  onAdded: (comment: Comment) => void;
  autoFocus?: boolean;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea from one line up to a cap as the user types.
  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  if (!session) {
    return (
      <button
        onClick={open}
        className="w-full rounded-lg border border-dashed border-line bg-elevated/40 px-4 py-3 text-left text-sm text-ink-3 hover:border-line-strong hover:text-ink"
      >
        {parentId
          ? 'Sign in to reply…'
          : 'Add a comment. Sign in to join the conversation…'}
      </button>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const { comment } = await apiFetch<{ comment: Comment }>(
        `/api/v1/sinks/${sinkId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: body.trim(),
            ...(parentId ? { parentId } : {}),
          }),
        },
      );
      setBody('');
      if (taRef.current) taRef.current.style.height = 'auto'; // shrink back
      onAdded(comment);
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-elevated/40 px-3 py-2 transition-colors focus-within:border-primary/60"
    >
      <textarea
        ref={taRef}
        autoFocus={autoFocus}
        rows={1}
        placeholder={placeholder}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          autoGrow();
        }}
        className="block max-h-40 w-full resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-ink-3"
      />
      <div className="mt-1.5 flex items-center justify-end gap-2">
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  node,
  sinkId,
  onAdded,
}: {
  node: CommentNode;
  sinkId: string;
  onAdded: (comment: Comment) => void;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar
          avatarId={node.user.avatarId}
          handle={node.user.handle}
          size={28}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs">
            <span className="font-medium text-ink-2">{node.user.handle}</span>
            <span className="text-ink-3"> · {timeAgo(node.createdAt)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {node.body}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <VoteControl
              kind="comment"
              id={node.id}
              score={node.score}
              myVote={null}
              size="sm"
            />
            <button
              onClick={() => setReplying((v) => !v)}
              className="text-xs font-medium text-ink-3 hover:text-primary"
            >
              {replying ? 'Cancel' : 'Reply'}
            </button>
          </div>
          {replying && (
            <div className="mt-2">
              <Composer
                sinkId={sinkId}
                parentId={node.id}
                placeholder="Write a reply…"
                onDone={() => setReplying(false)}
                onAdded={onAdded}
              />
            </div>
          )}
        </div>
      </div>
      {node.replies.length > 0 && (
        <div className="ml-5 space-y-3 border-l border-line pl-4">
          {node.replies.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              sinkId={sinkId}
              onAdded={onAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  sinkId,
  comments: initialComments,
  flat = false,
  autoFocusCompose = false,
}: {
  sinkId: string;
  comments: Comment[];
  /** Inline-in-feed variant: drop the card chrome, separate with a top rule. */
  flat?: boolean;
  /** Focus the top-level composer on mount (used by the feed "Reply" button). */
  autoFocusCompose?: boolean;
}) {
  const [comments, setComments] = useState(initialComments);

  // Reflect a fresh server render (e.g. navigating back to the Sink).
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Append a newly-posted comment (top-level or reply), ignoring dupes.
  const addComment = (comment: Comment) =>
    setComments((prev) =>
      prev.some((c) => c.id === comment.id) ? prev : [...prev, comment],
    );

  const tree = buildTree(comments);
  return (
    <section
      className={
        flat
          ? 'space-y-4 border-t border-line pt-4'
          : 'space-y-4 rounded-xl border border-line bg-surface p-5'
      }
    >
      <h2 className="text-base font-semibold text-ink">
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </h2>
      <Composer
        sinkId={sinkId}
        placeholder="Share your take…"
        onAdded={addComment}
        autoFocus={autoFocusCompose}
      />
      {tree.length > 0 ? (
        <div className="divide-y divide-line border-t border-line">
          {tree.map((node) => (
            <div key={node.id} className="py-4 first:pt-4 last:pb-0">
              <CommentItem node={node} sinkId={sinkId} onAdded={addComment} />
            </div>
          ))}
        </div>
      ) : (
        <p className="pt-1 text-sm text-ink-3">
          No comments yet. Be the first to pile on.
        </p>
      )}
    </section>
  );
}
