'use client';

/**
 * CommentSection — threaded comments on a Sink.
 *
 * The comments are fetched server-side (SSR, good for SEO) and passed in as a
 * flat list; this client component builds the reply tree and handles composing.
 * Public-first: composing prompts sign-in when logged out. After posting we
 * router.refresh() to re-pull the server-rendered comments.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';
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

function initials(handle: string): string {
  return handle.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '::';
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Text box + submit. Prompts sign-in when logged out. */
function Composer({
  sinkId,
  parentId,
  placeholder,
  onDone,
}: {
  sinkId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <Button onClick={open} variant="ghost">
        Sign in to comment
      </Button>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/sinks/${sinkId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: body.trim(),
          ...(parentId ? { parentId } : {}),
        }),
      });
      setBody('');
      onDone?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 2 : 3}
        className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({ node, sinkId }: { node: CommentNode; sinkId: string }) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] text-ink-2">
          {initials(node.user.handle)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-3">
            <span className="text-ink-2">{node.user.handle}</span> ·{' '}
            {timeAgo(node.createdAt)}
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{node.body}</p>
          <button
            onClick={() => setReplying((v) => !v)}
            className="mt-1 text-xs text-ink-3 hover:text-ink"
          >
            {replying ? 'Cancel' : 'Reply'}
          </button>
          {replying && (
            <div className="mt-2">
              <Composer
                sinkId={sinkId}
                parentId={node.id}
                placeholder="Write a reply…"
                onDone={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
      {node.replies.length > 0 && (
        <div className="ml-5 space-y-3 border-l border-line pl-4">
          {node.replies.map((child) => (
            <CommentItem key={child.id} node={child} sinkId={sinkId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  sinkId,
  comments,
}: {
  sinkId: string;
  comments: Comment[];
}) {
  const tree = buildTree(comments);
  return (
    <section className="space-y-5 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink-2">
        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
      </h2>
      <Composer sinkId={sinkId} placeholder="Add a comment…" />
      {tree.length > 0 && (
        <div className="space-y-4">
          {tree.map((node) => (
            <CommentItem key={node.id} node={node} sinkId={sinkId} />
          ))}
        </div>
      )}
    </section>
  );
}
