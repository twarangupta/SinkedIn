'use client';

/**
 * Confetti — a one-shot, full-screen party-popper burst. Dependency-free: a
 * fixed overlay of colored pieces that fall + drift + spin via a CSS keyframe,
 * then it calls onDone so the parent can unmount it. Pointer-events-none, so it
 * never blocks clicks on whatever is underneath (e.g. the Comeback nudge).
 */

import { useEffect, useMemo, type CSSProperties } from 'react';

const COLORS = ['#6366f1', '#a78bfa', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

export function Confetti({
  pieces = 140,
  durationMs = 3200,
  onDone,
}: {
  pieces?: number;
  durationMs?: number;
  onDone?: () => void;
}) {
  // Randomize each piece once (position, timing, color, spin, sideways drift).
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 260,
        spin: 360 + Math.random() * 720,
      })),
    [pieces],
  );

  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate(0, -10vh) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 110vh) rotate(var(--spin)); opacity: 0.85; }
        }
      `}</style>
      {items.map((it, i) => (
        <span
          key={i}
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${it.left}%`,
              width: `${it.w}px`,
              height: `${it.w * 0.4}px`,
              background: it.color,
              borderRadius: '1px',
              animation: `confetti-fall ${it.duration}s ${it.delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
              '--drift': `${it.drift}px`,
              '--spin': `${it.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
