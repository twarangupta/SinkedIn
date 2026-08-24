'use client';

/**
 * CompanySelect — the tracker's company field as a searchable autocomplete over
 * the seeded company dataset. Typing queries /api/v1/companies?q=; picking a
 * suggestion fills the name AND its domain (so the logo resolves). Free text is
 * still allowed — whatever is typed becomes the company name, and the backend
 * find-or-create resolves/creates it on save.
 */

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Input } from '../ui/Input';
import { CompanyLogo } from './CompanyLogo';

interface Suggestion {
  id: string;
  name: string;
  domain: string | null;
}

export function CompanySelect({
  value,
  onChange,
}: {
  value: string;
  /** Called with the chosen/typed name and its domain (null when unknown). */
  onChange: (name: string, domain: string | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Debounced search as the user types.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { companies } = await apiFetch<{ companies: Suggestion[] }>(
          `/api/v1/companies?q=${encodeURIComponent(q)}`,
        );
        setSuggestions(companies);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-1">
      <Input
        placeholder="Company"
        value={value}
        maxLength={200}
        onChange={(e) => {
          onChange(e.target.value, null); // typing: domain unknown until picked/saved
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus, avoid blur race
              onClick={() => {
                onChange(s.name, s.domain);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-elevated"
            >
              <CompanyLogo name={s.name} domain={s.domain} size={18} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
