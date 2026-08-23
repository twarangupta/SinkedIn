/**
 * Button primitive. Variants: `primary` (indigo CTA), `ghost` (subtle), and
 * `danger` (destructive actions like deleting a Sink).
 * Presentational only — all styling via design tokens.
 */

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 h-8 text-xs',
    md: 'px-4 h-10 text-sm',
  };
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    ghost: 'bg-transparent text-ink-2 hover:bg-elevated hover:text-ink',
    danger: 'bg-danger text-white hover:opacity-90',
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
