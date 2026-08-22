'use client';

/**
 * SinkComposer — the "+ New Sink" box at the top of the feed.
 *
 * Category-first: choose a category, then the form reveals only the fields that
 * category's config allows (company, conclusion, poll options). Logged-out
 * users clicking it get the sign-in modal (public-first). On success, calls
 * onCreated() so the feed refreshes.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { useMe } from '../lib/me';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar } from './avatar/Avatar';
import { CategoryInfoModal } from './CategoryInfoModal';
import type { Category } from '../types';

const CONCLUSIONS = ['GHOSTED', 'REJECTED', 'ACCEPTED', 'WITHDREW', 'PENDING', 'OTHER'];
const fieldClass =
  'h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none focus:border-primary';

export function SinkComposer({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [expanded, setExpanded] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [company, setCompany] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [conclusionOther, setConclusionOther] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // The caller's avatar (from the shared MeProvider) so the composer shows
  // *their* creature, not a grey blank, matching every other avatar on the page.
  const { me } = useMe();

  const category = categories.find((c) => c.id === categoryId);

  // Data hygiene for the future SEO Interview-Experience hub (see
  // docs/3_Retention_Features.md): a category-aware placeholder nudges cleanly
  // structured input now WITHOUT building a form or changing the schema. The
  // body stays free text — the soul is the wedge vs. soulless data dumps.
  const bodyPlaceholder =
    category?.slug === 'interview-experience'
      ? 'Rounds, questions asked, difficulty, and how it ended…'
      : 'Say more (optional)';

  const reset = () => {
    setExpanded(false);
    setCategoryId('');
    setTitle('');
    setBody('');
    setCompany('');
    setConclusion('');
    setConclusionOther('');
    setPollOptions(['', '']);
    setError(null);
  };

  const startComposing = () => {
    if (!session) {
      open();
      return;
    }
    setExpanded(true);
  };

  const setPollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { categoryId, title: title.trim() };
      if (body.trim()) payload.body = body.trim();
      if (category?.showsCompany && company.trim()) payload.company = company.trim();
      if (category?.showsConclusion && conclusion) {
        payload.conclusion = conclusion;
        if (conclusion === 'OTHER' && conclusionOther.trim()) {
          payload.conclusionOther = conclusionOther.trim();
        }
      }
      if (category?.allowsPoll) {
        const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (opts.length >= 2) payload.pollOptions = opts;
      }
      await apiFetch('/api/v1/sinks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  };

  if (!expanded) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
        {me ? (
          <Avatar avatarId={me.avatarId} handle={me.handle} size={36} />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-full bg-elevated" />
        )}
        <button
          onClick={startComposing}
          className="min-h-[72px] flex-1 rounded-lg border border-line bg-elevated px-4 py-3 text-left text-sm text-ink-3 hover:border-line-strong"
        >
          Drop a Sink: a bad-boss rant, a rejection, a raise, a small win…
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${fieldClass} flex-1`}
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="What do these categories mean?"
          title="What do these categories mean?"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-ink-3 hover:border-line-strong hover:text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
      />
      <textarea
        placeholder={bodyPlaceholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />

      {category?.showsCompany && (
        <Input
          placeholder="Company (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={100}
        />
      )}

      {category?.showsConclusion && (
        <select
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          className={fieldClass}
        >
          <option value="">Outcome (optional)…</option>
          {CONCLUSIONS.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      )}
      {category?.showsConclusion && conclusion === 'OTHER' && (
        <Input
          placeholder="Describe the outcome"
          value={conclusionOther}
          onChange={(e) => setConclusionOther(e.target.value)}
          maxLength={100}
        />
      )}

      {category?.allowsPoll && (
        <div className="space-y-2">
          <div className="text-xs text-ink-3">
            Poll options{category.requiresPoll ? ' (required, min 2)' : ' (optional)'}
          </div>
          {pollOptions.map((option, index) => (
            <Input
              key={index}
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => setPollOption(index, e.target.value)}
              maxLength={100}
            />
          ))}
          {pollOptions.length < 6 && (
            <button
              type="button"
              onClick={() => setPollOptions((prev) => [...prev, ''])}
              className="text-sm text-primary hover:underline"
            >
              + Add option
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={busy || !categoryId || !title.trim()}
        >
          {busy ? 'Posting…' : '+ New Sink'}
        </Button>
      </div>

      {showInfo && (
        <CategoryInfoModal
          categories={categories}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}
