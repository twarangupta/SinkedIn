/**
 * Inline SVG icon set (feather-style: 24x24 grid, stroke = currentColor, no
 * fill, 2px round strokes). Keep every icon here so they stay visually
 * consistent and reusable across the app instead of being re-drawn inline.
 *
 * Usage: <DownloadIcon /> or <TrashIcon size={20} className="text-danger" />.
 * Color comes from the surrounding text color (currentColor); size defaults to
 * 16px. Any extra SVG prop (className, style, onClick…) passes straight through.
 */

import type { ReactNode, SVGProps } from 'react';

export type IconProps = { size?: number } & Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height'
>;

/** Shared frame for every icon; children are the icon-specific paths. */
function IconBase({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Downward arrow into a tray. */
export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </IconBase>
  );
}

/** Pencil — edit / replace. */
export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </IconBase>
  );
}

/** Trash can — remove / delete. */
export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </IconBase>
  );
}
