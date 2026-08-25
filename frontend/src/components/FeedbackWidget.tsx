'use client';

/**
 * FeedbackWidget — a floating "chat" launcher pinned to the bottom-right on every
 * page. Anyone (signed in or not) can message the site owner with complaints,
 * bugs, or suggestions. Mounted once globally (see Providers).
 *
 * Posts to the public /feedback endpoint; the backend stores every submission
 * and (once configured) emails the owner. The JWT is attached automatically when
 * signed in, purely so the owner sees the sender's pseudonymous handle.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Reset the form each time the panel closes.
  useEffect(() => {
    if (!open) {
      setMessage('');
      setEmail('');
      setState('idle');
    }
  }, [open]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async () => {
    if (!message.trim() || state === 'sending') return;
    setState('sending');
    try {
      await apiFetch('/api/v1/feedback', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          contactEmail: email.trim() || undefined,
          path: pathname,
        }),
      });
      setState('sent');
      window.setTimeout(() => setOpen(false), 1500);
    } catch {
      setState('error');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-sm font-medium text-ink">Send feedback</div>
              <div className="text-xs text-ink-3">Goes straight to the owner</div>
            </div>
            <button
              type="button"
              aria-label="Close feedback"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-ink-3 hover:bg-elevated hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {state === 'sent' ? (
              <div className="py-6 text-center">
                <p className="font-medium text-ink">Thanks. Sent.</p>
                <p className="mt-1 text-sm text-ink-3">The owner reads every one.</p>
              </div>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Complaints, bugs, ideas, anything…"
                  className="w-full resize-none rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional, for a reply)"
                  className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary"
                />
                {state === 'error' && (
                  <p className="mt-2 text-xs text-danger">Could not send. Please try again.</p>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={!message.trim() || state === 'sending'}
                  >
                    {state === 'sending' ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Feedback
        </button>
      )}
    </div>
  );
}
