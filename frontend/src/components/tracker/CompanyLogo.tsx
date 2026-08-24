'use client';

/**
 * CompanyLogo — a small, subtle company badge for the tracker.
 *
 * Shows the REAL company logo via Logo.dev's logo API (looked up by domain when
 * we have one, else by company name), rendered on a white tile so any logo is
 * visible on the dark theme. Nothing is stored on our side. `fallback=404` makes
 * Logo.dev 404 when it has no logo, so our own clean monogram (initials on a
 * deterministic tint, same helpers as user avatars) takes over. A rounded
 * SQUARE, so it reads as a company, not a circular user avatar.
 *
 * The token is a PUBLISHABLE key (safe client-side by design). Override via
 * NEXT_PUBLIC_LOGODEV_KEY. Note: Logo.dev's free tier asks for an attribution
 * link for commercial use (see the tracker page footer).
 */

import { useState } from 'react';
import { initials, avatarColor } from '../../lib/format';

const KEY = process.env.NEXT_PUBLIC_LOGODEV_KEY || 'pk_RavWGefESjqXTr1fpkDJsw';

const logoUrl = (name: string, domain?: string | null) => {
  const target = domain ? domain : `name/${encodeURIComponent(name)}`;
  return `https://img.logo.dev/${target}?token=${KEY}&size=64&format=png&fallback=404`;
};

export function CompanyLogo({
  name,
  domain,
  size = 20,
}: {
  name: string;
  domain?: string | null;
  size?: number;
}) {
  // Track the URL that failed (not a boolean) so changing the company/name
  // retries the new logo instead of staying stuck on the monogram.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const box = { width: size, height: size };
  const src = name.trim() ? logoUrl(name, domain) : null;

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        style={box}
        className="shrink-0 rounded-md border border-line bg-white object-contain p-0.5"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={box}
      className={`inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${avatarColor(
        name,
      )}`}
    >
      {initials(name)}
    </span>
  );
}
