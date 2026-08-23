'use client';

/**
 * AddFirstComment — shown on a feed card when a Sink has zero comments, in place
 * of the "0 comments" link. Lets you drop the first comment WITHOUT opening the
 * Sink: a funny prompt → inline composer → the posted comment previewed right
 * there (mirroring the top-comment block). Logged-out users get the sign-in
 * modal. Self-contained so the surrounding SinkCard can stay a server component.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Avatar } from './avatar/Avatar';
import { VoteControl } from './VoteControl';
import { Button } from './ui/Button';
import type { Comment } from '../types';

export function AddFirstComment({ sinkId }: { sinkId: string }) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState<Comment | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Close the composer when clicking outside it (consistent with reply boxes).
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

  // Once posted, show the new comment inline (same look as the top-comment block).
  if (posted) {
    return (
      <div className="rounded-lg border border-line bg-elevated/40 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Avatar avatarId={posted.user.avatarId} handle={posted.user.handle} size={20} />
          <span className="text-xs font-medium text-ink-2">{posted.user.handle}</span>
          <span className="text-xs text-ink-3">· {timeAgo(posted.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-ink-2">{posted.body}</p>
        <div className="mt-2 flex items-center gap-3">
          <VoteControl kind="comment" id={posted.id} score={posted.score} myVote="BUOY" size="sm" />
          <Link
            href={`/s/${sinkId}`}
            className="text-xs font-medium text-ink-3 hover:text-primary"
          >
            View discussion
          </Link>
        </div>
      </div>
    );
  }

  const start = () => {
    if (!session) {
      open();
      return;
    }
    setExpanded(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const { comment } = await apiFetch<{ comment: Comment }>(
        `/api/v1/sinks/${sinkId}/comments`,
        { method: 'POST', body: JSON.stringify({ body: body.trim() }) },
      );
      setPosted(comment);
    } finally {
      setBusy(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={start}
        className="text-sm font-medium text-ink-3 transition-colors hover:text-primary"
      >
        No comments yet. Be the first to pile on.
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="rounded-lg border border-line bg-elevated/40 px-3 py-2 transition-colors focus-within:border-primary/60"
    >
      <textarea
        autoFocus
        rows={2}
        placeholder="Say the quiet part out loud…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="block max-h-40 w-full resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-ink-3"
      />
      <div className="mt-1.5 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setExpanded(false);
            setBody('');
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}
