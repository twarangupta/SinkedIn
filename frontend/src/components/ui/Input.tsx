/**
 * Text input primitive. Presentational only; styling via design tokens.
 */

import type { InputHTMLAttributes } from 'react';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-primary ${className}`}
      {...props}
    />
  );
}
