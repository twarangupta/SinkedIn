'use client';

/**
 * SinkEditor — the author's "edit Sink" modal.
 *
 * Editable: title, body, image, and (when the Sink's category surfaces them)
 * company + conclusion. Category and poll options are locked after posting, so
 * they're not shown. PATCHes /api/v1/sinks/:id, then router.refresh() so the
 * feed re-renders with the edit.
 *
 * It fetches the category list once to learn *this* Sink's category flags
 * (showsCompany/showsConclusion) — the feed's Sink payload doesn't carry them.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { uploadSinkImage } from '../lib/uploadImage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Category, Sink } from '../types';

const CONCLUSIONS = ['GHOSTED', 'REJECTED', 'ACCEPTED', 'WITHDREW', 'PENDING', 'OTHER'];

export function SinkEditor({
  sink,
  onClose,
}: {
  sink: Sink;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(sink.title);
  const [body, setBody] = useState(sink.body ?? '');
  const [imageUrl, setImageUrl] = useState(sink.imageUrl ?? '');
  const [company, setCompany] = useState(sink.company ?? '');
  const [conclusion, setConclusion] = useState(sink.conclusion ?? '');
  const [conclusionOther, setConclusionOther] = useState(sink.conclusionOther ?? '');
  const [flags, setFlags] = useState<{ company: boolean; conclusion: boolean }>({
    company: sink.company != null,
    conclusion: sink.conclusion != null,
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Learn this Sink's category flags so we show the right conditional fields
  // (and let the author *add* a company/conclusion they left blank).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ categories: Category[] }>('/api/v1/categories')
      .then(({ categories }) => {
        const cat = categories.find((c) => c.id === sink.category.id);
        if (cat && !cancelled) {
          setFlags({ company: cat.showsCompany, conclusion: cat.showsConclusion });
        }
      })
      .catch(() => {
        /* fall back to "show what already has a value" (set above) */
      });
    return () => {
      cancelled = true;
    };
  }, [sink.category.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      // Send the full editable set; null clears a field. The service ignores
      // company/conclusion for categories that don't surface them.
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim() ? body.trim() : null,
        imageUrl: imageUrl || null,
      };
      if (flags.company) payload.company = company.trim() ? company.trim() : null;
      if (flags.conclusion) {
        payload.conclusion = conclusion || null;
        payload.conclusionOther =
          conclusion === 'OTHER' && conclusionOther.trim()
            ? conclusionOther.trim()
            : null;
      }
      await apiFetch(`/api/v1/sinks/${sink.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none focus:border-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">Edit Sink</h2>
            <button
              onClick={onClose}
              className="text-ink-3 hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <textarea
            placeholder="Say more (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
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

          {flags.company && (
            <Input
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={100}
            />
          )}

          {flags.conclusion && (
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
          {flags.conclusion && conclusion === 'OTHER' && (
            <Input
              placeholder="Describe the outcome"
              value={conclusionOther}
              onChange={(e) => setConclusionOther(e.target.value)}
              maxLength={100}
            />
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={busy || uploading || !title.trim()}
            >
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
