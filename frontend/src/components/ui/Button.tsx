/**
 * Button primitive. Two variants: `primary` (indigo CTA) and `ghost` (subtle).
 * Presentational only — all styling via design tokens.
 */

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 h-10 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    ghost: 'bg-transparent text-ink-2 hover:bg-elevated hover:text-ink',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
