/**
 * BoatMark — the SinkedIn logo: a bow-up boat sinking below a waterline, with
 * an isosceles sail rigged to the tilted mast, set in a circular badge (matches
 * app/icon.svg, the favicon). Presentational, sizeable.
 */

export function BoatMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="23.5" fill="#1f1f23" stroke="#2a2a30" />
      <path d="M6 32 L44 21 Q25 44 6 32 Z" fill="#818cf8" />
      <line
        x1="25"
        y1="28"
        x2="20"
        y2="7"
        stroke="#a78bfa"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M20 7 L37 10 L23 20 Z" fill="#a78bfa" />
      <path
        d="M5 31 q8 -4 16 0 q8 4 16 0"
        stroke="#94a3b8"
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="9" cy="26" r="1.9" fill="#c7d2fe" />
      <circle cx="6" cy="21" r="1.3" fill="#c7d2fe" />
    </svg>
  );
}
