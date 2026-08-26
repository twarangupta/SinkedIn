'use client';

/**
 * SinkComposer — the "+ New Sink" box at the top of the feed.
 *
 * Category-first: choose a category, then the form reveals only the fields that
 * category's config allows (company, conclusion, poll options). Logged-out
 * users clicking it get the sign-in modal (public-first). On success, calls
 * onCreated() so the feed refreshes.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { useMe } from '../lib/me';
import { useRotating } from '../lib/useRotating';
import { COMPOSER_PROMPTS } from '../lib/prompts';
import { apiFetch } from '../lib/api';
import { takeSinkDraft } from '../lib/sinkDraft';
import { uploadSinkImage } from '../lib/uploadImage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar } from './avatar/Avatar';
import { DefaultAvatar } from './avatar/DefaultAvatar';
import { CompanySelect } from './tracker/CompanySelect';
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
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // The caller's avatar (from the shared MeProvider) so the composer shows
  // *their* creature, not a grey blank, matching every other avatar on the page.
  const { me } = useMe();
  // Rotating prompt so the composer feels alive and nudges honest, human posts.
  const { item: prompt, key: promptKey } = useRotating(COMPOSER_PROMPTS);

  // One-way bridge: if the tracker stashed a draft ("post this application as a
  // Sink"), pick it up once on mount and open the composer pre-filled. The user
  // still edits and confirms — nothing posts automatically.
  useEffect(() => {
    const draft = takeSinkDraft();
    if (!draft) return;
    if (draft.categorySlug) {
      const cat = categories.find((c) => c.slug === draft.categorySlug);
      if (cat) setCategoryId(cat.id);
    }
    if (draft.company) setCompany(draft.company);
    if (draft.conclusion) setConclusion(draft.conclusion);
    if (draft.body) setBody(draft.body);
    setExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categories]);

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
    setImageUrl('');
    setError(null);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setImageUrl(await uploadSinkImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
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
      if (imageUrl) payload.imageUrl = imageUrl;
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
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        {me ? (
          <Avatar avatarId={me.avatarId} handle={me.handle} size={36} />
        ) : (
          <DefaultAvatar size={36} />
        )}
        <button
          onClick={startComposing}
          className="flex min-h-[52px] flex-1 items-center rounded-lg border border-line bg-elevated px-4 text-left text-sm text-ink-2 transition-colors hover:border-primary hover:bg-elevated/70 hover:text-ink"
        >
          <span key={promptKey} className="rotator-fade inline-block">
            {prompt}
          </span>
        </button>
        <button
          onClick={startComposing}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Post
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

      {imageUrl ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Attachment preview"
            className="max-h-56 rounded-lg border border-line"
          />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-primary">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onPickImage}
            className="hidden"
          />
          {uploading ? 'Uploading…' : '+ Add image'}
        </label>
      )}

      {category?.showsCompany && (
        <CompanySelect value={company} onChange={(name) => setCompany(name)} />
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
          disabled={busy || uploading || !categoryId || !title.trim()}
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
