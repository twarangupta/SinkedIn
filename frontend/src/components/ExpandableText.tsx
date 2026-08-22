'use client';

/**
 * ExpandableText — truncates a long Sink body in the feed with a "See more"
 * toggle, so a wall of text doesn't dominate the scroll. Short bodies render
 * plainly with no button. Used on feed cards; the single-Sink page passes the
 * full text (SinkCard's `expandable={false}`) since you opened it to read.
 */

import { useState } from 'react';

export function ExpandableText({
  text,
  limit = 280,
}: {
  text: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= limit) {
    return <p className="mb-3 whitespace-pre-wrap text-sm text-ink-2">{text}</p>;
  }

  // Cut at the last space before the limit so we don't slice mid-word.
  const slice = text.slice(0, limit);
  const cut = slice.lastIndexOf(' ');
  const preview = (cut > limit * 0.6 ? slice.slice(0, cut) : slice).trimEnd();

  return (
    <div className="mb-3">
      <p className="whitespace-pre-wrap text-sm text-ink-2">
        {expanded ? text : `${preview}… `}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-ink-3 hover:text-primary"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      </p>
    </div>
  );
}
