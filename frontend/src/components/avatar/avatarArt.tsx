/**
 * Avatar art catalog — flat CARTOON ocean creatures keyed by avatarId.
 *
 * Style recipe (locked with the user): flat fills, NO thin outline strokes
 * (they read as pencil), big rounded eyes with a white highlight, solid filled
 * mouths + chunky filled fangs (never stroked lines), rounder chunky bodies,
 * soft blush cheeks. Each entry is drawn on a 0..100 canvas centered near
 * (50,50); the <Avatar> wrapper adds the grey badge + border and clips to the
 * circle. The id list MIRRORS backend/src/lib/avatars.ts — keep in sync.
 */

import type { ReactNode } from 'react';

/** Big cute cartoon eye: white + dark pupil (slightly low) + highlight. */
function Eye({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      <circle cx={cx} cy={cy + r * 0.2} r={r * 0.55} fill="#241f38" />
      <circle cx={cx - r * 0.32} cy={cy - r * 0.32} r={r * 0.24} fill="#fff" />
    </>
  );
}

/** Soft blush cheek. */
function Cheek({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  return <circle cx={cx} cy={cy} r={5} fill={fill} opacity={0.75} />;
}

/** id → art. Unknown ids fall back to initials in <Avatar>. */
export const AVATAR_ART: Record<string, ReactNode> = {
  pufferfish: (
    <g>
      <g fill="#e88f2b">
        <path d="M50 5 l7 15 h-14 Z M95 50 l-15 7 v-14 Z M50 95 l7 -15 h-14 Z M5 50 l15 7 v-14 Z M82 18 l2 16 -16 -6 Z M82 82 l-14 -10 16 -6 Z M18 82 l-2 -16 16 6 Z M18 18 l14 10 -16 6 Z" />
      </g>
      <circle cx="50" cy="50" r="32" fill="#f6a942" />
      <path d="M24 56 q26 24 52 0 q-3 18 -26 18 q-23 0 -26 -18 Z" fill="#fbd18a" />
      <Cheek cx={37} cy={55} fill="#f4a0a8" />
      <Cheek cx={63} cy={55} fill="#f4a0a8" />
      <Eye cx={43} cy={45} r={7.5} />
      <Eye cx={57} cy={45} r={7.5} />
      <path d="M44 60 q6 6 12 0 q-6 4 -12 0 Z" fill="#a85a15" />
    </g>
  ),
  blobfish: (
    <g>
      <path d="M20 48 q0 -30 30 -30 q28 0 28 28 q0 16 -12 26 q4 12 -8 16 q-10 4 -16 -4 q-22 -4 -22 -32 Z" fill="#ee94b0" />
      <path d="M18 56 q-12 4 -10 18 q12 0 16 -10 Z" fill="#ee94b0" />
      <Cheek cx={36} cy={56} fill="#f2a3b8" />
      <Cheek cx={60} cy={57} fill="#f2a3b8" />
      <Eye cx={42} cy={44} r={7.5} />
      <Eye cx={60} cy={46} r={7} />
      <path d="M44 62 q9 -7 18 0 q-9 5 -18 0 Z" fill="#c25f7f" />
    </g>
  ),
  anglerfish: (
    <g>
      <path d="M18 50 q0 -32 34 -32 q30 0 30 30 q0 26 -30 30 q-34 4 -34 -28 Z" fill="#33b0a4" />
      <path d="M22 54 q30 -8 56 2 q-4 16 -28 16 q-24 0 -28 -18 Z" fill="#16413d" />
      <g fill="#fff">
        <path d="M28 54 l4 9 4 -9 Z M40 56 l4 9 4 -9 Z M56 56 l4 9 4 -9 Z M68 54 l4 9 4 -9 Z" />
        <path d="M34 72 l4 -8 4 8 Z M50 74 l4 -8 4 8 Z M64 72 l4 -8 4 8 Z" />
      </g>
      <Eye cx={44} cy={34} r={8} />
      <path d="M52 22 q6 -14 18 -18" fill="none" stroke="#7a5bbf" strokeWidth="4" strokeLinecap="round" />
      <circle cx="72" cy="6" r="8" fill="#b79bf5" />
      <circle cx="69" cy="3" r="2.2" fill="#d9ccf7" />
    </g>
  ),
  'gulper-eel': (
    <g>
      <path d="M26 50 q4 -26 30 -24 q30 2 30 24 q0 22 -30 24 q-26 2 -30 -24 Z" fill="#7a6fd0" />
      <path d="M26 50 l-16 -10 5 10 -5 10 Z" fill="#7a6fd0" />
      <path d="M30 50 q26 -8 52 0 q-6 16 -26 16 q-20 0 -26 -16 Z" fill="#2e2a55" />
      <g fill="#fff"><path d="M40 50 l3 8 3 -8 Z M56 50 l3 8 3 -8 Z" /></g>
      <Eye cx={62} cy={36} r={7} />
    </g>
  ),
  'vampire-squid': (
    <g>
      <path d="M26 34 q24 -22 48 0 q4 26 -24 40 q-28 -14 -24 -40 Z" fill="#9b4d7a" />
      <path d="M32 62 q-6 16 -10 30 M44 68 q-3 18 -4 28 M56 68 q3 18 4 28 M68 62 q6 16 10 30" fill="none" stroke="#9b4d7a" strokeWidth="6" strokeLinecap="round" />
      <Cheek cx={38} cy={44} fill="#c46f96" />
      <Cheek cx={62} cy={44} fill="#c46f96" />
      <Eye cx={42} cy={40} r={7.5} />
      <Eye cx={58} cy={40} r={7.5} />
    </g>
  ),
  barreleye: (
    <g>
      <path d="M20 52 q0 -32 30 -32 q30 0 30 30 q0 24 -30 28 q-30 4 -30 -26 Z" fill="#3fb6ad" />
      <path d="M26 42 q24 -14 48 0 q0 22 -24 22 q-24 0 -24 -22 Z" fill="#cdeeeb" opacity="0.55" />
      <circle cx="40" cy="42" r="8" fill="#8ce6a0" />
      <circle cx="40" cy="43" r="4" fill="#123" />
      <circle cx="60" cy="42" r="8" fill="#8ce6a0" />
      <circle cx="60" cy="43" r="4" fill="#123" />
      <path d="M44 64 q6 5 12 0 q-6 3 -12 0 Z" fill="#1f7a72" />
    </g>
  ),
  'dumbo-octopus': (
    <g>
      <path d="M26 50 q0 -30 24 -30 q24 0 24 30 q0 14 -6 24 q-10 -4 -12 6 q-2 -10 -12 -6 q-6 -10 -18 -24 Z" fill="#d98fb0" />
      <path d="M28 42 q-16 -6 -20 6 q10 8 20 2 Z" fill="#d98fb0" />
      <path d="M72 42 q16 -6 20 6 q-10 8 -20 2 Z" fill="#d98fb0" />
      <Cheek cx={38} cy={54} fill="#efb1c9" />
      <Cheek cx={62} cy={54} fill="#efb1c9" />
      <Eye cx={42} cy={46} r={7.5} />
      <Eye cx={58} cy={46} r={7.5} />
      <path d="M45 58 q5 5 10 0 q-5 3 -10 0 Z" fill="#a85f80" />
    </g>
  ),
  'goblin-shark': (
    <g>
      <path d="M12 52 q12 -24 46 -20 q22 3 30 14 l-12 8 q-6 -8 -18 -8 q6 8 -2 16 q-30 8 -44 -10 Z" fill="#e6a5c0" />
      <path d="M60 46 l18 -2 -14 10 Z" fill="#e6a5c0" />
      <path d="M50 66 l26 8 -6 -16 Z" fill="#e6a5c0" />
      <g fill="#fff"><path d="M50 64 l3 7 3 -7 Z M60 66 l3 7 3 -7 Z" /></g>
      <Eye cx={34} cy={46} r={7} />
    </g>
  ),
  fangtooth: (
    <g>
      <path d="M22 50 q0 -30 30 -30 q30 0 30 30 q0 26 -30 28 q-30 2 -30 -28 Z" fill="#4a5a80" />
      <path d="M28 52 q24 -6 46 0 q-4 14 -23 14 q-19 0 -23 -14 Z" fill="#20283f" />
      <g fill="#fff"><path d="M34 52 l4 12 4 -12 Z M50 52 l4 12 4 -12 Z M64 52 l4 10 4 -10 Z" /></g>
      <Eye cx={44} cy={38} r={8} />
      <Eye cx={62} cy={40} r={6.5} />
    </g>
  ),
  octopus: (
    <g>
      <path d="M18 52 q0 -34 32 -34 q32 0 32 34 q0 12 -6 20 q-26 0 -52 0 q-6 -8 -6 -20 Z" fill="#a97fe6" />
      <g fill="#a97fe6">
        <circle cx="26" cy="74" r="9" />
        <circle cx="40" cy="80" r="9" />
        <circle cx="50" cy="82" r="9" />
        <circle cx="60" cy="80" r="9" />
        <circle cx="74" cy="74" r="9" />
      </g>
      <Cheek cx={36} cy={54} fill="#c39cf0" />
      <Cheek cx={64} cy={54} fill="#c39cf0" />
      <Eye cx={40} cy={46} r={9} />
      <Eye cx={60} cy={46} r={9} />
      <path d="M43 58 q7 6 14 0 q-7 4 -14 0 Z" fill="#6f4bb0" />
    </g>
  ),
  jellyfish: (
    <g>
      <path d="M18 48 q0 -30 32 -30 q32 0 32 30 q0 8 -4 14 q-28 0 -56 0 q-4 -6 -4 -14 Z" fill="#d489c8" />
      <path d="M26 62 q-3 18 -8 30 M42 64 q-1 18 -3 30 M58 64 q1 18 3 30 M74 62 q3 18 8 30" fill="none" stroke="#d489c8" strokeWidth="5" strokeLinecap="round" />
      <Cheek cx={38} cy={48} fill="#e7a9dd" />
      <Cheek cx={62} cy={48} fill="#e7a9dd" />
      <Eye cx={42} cy={42} r={7} />
      <Eye cx={58} cy={42} r={7} />
      <path d="M45 52 q5 4 10 0 q-5 3 -10 0 Z" fill="#a85f9e" />
    </g>
  ),
  whale: (
    <g>
      <path d="M12 54 q18 -28 52 -18 q20 6 22 18 q-2 12 -22 18 q-34 10 -52 -18 Z" fill="#5b9bde" />
      <path d="M62 40 l20 -12 -4 22 Z M62 68 l20 12 -4 -22 Z" fill="#5b9bde" />
      <path d="M28 32 q6 -14 14 -6" fill="none" stroke="#bcd8f2" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 60 q22 10 44 0 q-4 10 -22 10 q-18 0 -22 -10 Z" fill="#cfe6f7" />
      <Eye cx={34} cy={52} r={7} />
      <path d="M40 62 q7 5 14 0 q-7 4 -14 0 Z" fill="#2f5f8f" />
    </g>
  ),
  narwhal: (
    <g>
      <path d="M14 54 q16 -26 52 -16 q18 6 20 16 q-2 12 -20 16 q-36 8 -52 -16 Z" fill="#84bbec" />
      <path d="M62 42 l20 -10 -4 20 Z" fill="#84bbec" />
      <path d="M30 34 l-12 -26 6 2 4 -6 4 30 Z" fill="#efe0b0" />
      <path d="M22 60 q22 8 42 0 q-4 9 -21 9 q-17 0 -21 -9 Z" fill="#c4dcf3" />
      <Eye cx={34} cy={50} r={7} />
      <path d="M40 60 q6 4 12 0 q-6 3 -12 0 Z" fill="#4a7fb0" />
    </g>
  ),
  crab: (
    <g>
      <path d="M20 56 q0 -20 30 -20 q30 0 30 20 q0 14 -30 16 q-30 -2 -30 -16 Z" fill="#e6664c" />
      <path d="M22 54 q-14 -2 -18 -12 q8 -4 14 2 q4 4 4 10 Z M78 54 q14 -2 18 -12 q-8 -4 -14 2 q-4 4 -4 10 Z" fill="#e6664c" />
      <path d="M28 70 l-6 12 M40 74 l-3 12 M60 74 l3 12 M72 70 l6 12" fill="none" stroke="#e6664c" strokeWidth="5" strokeLinecap="round" />
      <Cheek cx={36} cy={58} fill="#f19685" />
      <Cheek cx={64} cy={58} fill="#f19685" />
      <Eye cx={40} cy={44} r={7} />
      <Eye cx={60} cy={44} r={7} />
      <path d="M43 58 q7 5 14 0 q-7 4 -14 0 Z" fill="#a13a28" />
    </g>
  ),
  seahorse: (
    <g>
      <path d="M56 14 q18 4 16 22 q-2 14 -16 18 q-12 4 -12 16 q0 12 12 16 q-6 6 -16 2 q-16 -6 -12 -22 q3 -14 16 -18 q10 -3 10 -13 q0 -10 -12 -12 q4 -12 14 -11 Z" fill="#f0a24a" />
      <path d="M56 12 q12 -2 16 6 q-6 6 -16 2 Z" fill="#f0a24a" />
      <Cheek cx={50} cy={30} fill="#f6bd82" />
      <Eye cx={54} cy={26} r={6.5} />
    </g>
  ),
  'sea-turtle': (
    <g>
      <circle cx="50" cy="54" r="26" fill="#4fae7b" />
      <g fill="#3d8c60">
        <circle cx="50" cy="54" r="9" />
        <path d="M50 30 l8 10 -16 0 Z M74 54 l-10 8 0 -16 Z M50 78 l-8 -10 16 0 Z M26 54 l10 -8 0 16 Z" />
      </g>
      <circle cx="50" cy="22" r="9" fill="#66c091" />
      <g fill="#66c091"><circle cx="26" cy="38" r="6" /><circle cx="74" cy="38" r="6" /><circle cx="30" cy="74" r="6" /><circle cx="70" cy="74" r="6" /></g>
      <Eye cx={46} cy={21} r={3.6} />
      <Eye cx={54} cy={21} r={3.6} />
    </g>
  ),
  'manta-ray': (
    <g>
      <path d="M50 26 q42 6 46 32 q-22 6 -32 -2 q6 14 -2 30 q-10 -14 -12 -26 q-2 12 -12 26 q-8 -16 -2 -30 q-10 8 -32 2 q4 -26 46 -32 Z" fill="#4a6fa5" />
      <path d="M50 26 q-6 -8 -13 -6 M50 26 q6 -8 13 -6" fill="none" stroke="#4a6fa5" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 44 q16 8 32 0 q-4 10 -16 10 q-12 0 -16 -10 Z" fill="#6a8fc5" />
      <Eye cx={42} cy={34} r={5} />
      <Eye cx={58} cy={34} r={5} />
    </g>
  ),
  orca: (
    <g>
      <path d="M12 54 q18 -28 52 -18 q20 6 22 18 q-2 12 -22 18 q-34 10 -52 -18 Z" fill="#2b2f3a" />
      <path d="M60 40 l16 -12 -4 22 Z" fill="#2b2f3a" />
      <path d="M40 32 q6 -12 12 -8 l-2 12 Z" fill="#2b2f3a" />
      <path d="M20 62 q22 10 46 2 q-3 10 -22 12 q-20 0 -24 -14 Z" fill="#eef2f7" />
      <ellipse cx="40" cy="46" rx="7" ry="5" fill="#eef2f7" />
      <Eye cx={35} cy={50} r={6} />
      <path d="M40 62 q7 5 14 0 q-7 4 -14 0 Z" fill="#0f1420" />
    </g>
  ),
  megalodon: (
    <g>
      <path d="M12 50 q0 -22 32 -22 q42 -3 46 22 q-4 20 -46 22 q-32 -2 -32 -22 Z" fill="#72839d" />
      <path d="M12 50 l-9 -15 2 15 -2 15 Z" fill="#72839d" />
      <path d="M46 30 q9 -12 17 -5 l-3 13 Z" fill="#72839d" />
      <path d="M20 58 q30 14 62 0 q-6 12 -31 12 q-25 0 -31 -12 Z" fill="#cdd5e0" />
      <path d="M56 60 q16 -2 28 6 q-6 11 -19 9 q-11 -2 -9 -15 Z" fill="#20283a" />
      <g fill="#fff"><path d="M60 60 l3 8 3 -8 Z M71 61 l3 8 3 -8 Z M82 63 l3 7 3 -7 Z" /></g>
      <Eye cx={62} cy={42} r={10} />
    </g>
  ),
  dunkleosteus: (
    <g>
      <path d="M14 50 q0 -26 32 -24 q34 2 42 12 q-8 8 -22 6 q6 10 -4 18 q-16 8 -34 2 q-16 -6 -14 -14 Z" fill="#7a8596" />
      <path d="M46 28 q28 0 42 10 l-3 8 q-20 -8 -40 -6 Z" fill="#9aa4b3" />
      <path d="M50 56 q18 -4 34 2 q-4 10 -18 10 q-14 0 -16 -12 Z" fill="#232a36" />
      <g fill="#d9dee6"><path d="M56 56 l4 9 4 -9 Z M70 58 l4 9 4 -9 Z" /></g>
      <Eye cx={34} cy={38} r={7} />
    </g>
  ),
  coelacanth: (
    <g>
      <path d="M14 52 q12 -26 46 -22 q24 4 26 22 q-2 18 -26 22 q-34 4 -46 -22 Z" fill="#5f7a8f" />
      <path d="M78 42 l16 -10 -2 20 Z" fill="#5f7a8f" />
      <path d="M34 72 q-6 12 2 20 q8 -2 10 -12 Z" fill="#54697b" />
      <path d="M56 72 q-2 12 6 18 q6 -4 4 -14 Z" fill="#54697b" />
      <path d="M40 32 q-6 -12 2 -18 q8 4 8 14 Z" fill="#54697b" />
      <g fill="#cdd9e2"><circle cx="46" cy="54" r="2.4" /><circle cx="58" cy="48" r="2.4" /><circle cx="60" cy="60" r="2.4" /></g>
      <Eye cx={34} cy={48} r={7} />
    </g>
  ),
  ammonite: (
    <g>
      <circle cx="52" cy="52" r="34" fill="#d0a06a" />
      <circle cx="52" cy="52" r="34" fill="none" stroke="#b0844e" strokeWidth="3" />
      <path d="M52 52 q0 -12 12 -12 q16 0 16 18 q0 22 -26 22 q-30 0 -30 -30 q0 -34 36 -34" fill="none" stroke="#a5763f" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 26 q4 6 2 12 M28 34 q6 4 6 12 M24 48 q8 2 10 10" fill="none" stroke="#a5763f" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  trilobite: (
    <g>
      <path d="M28 20 q22 -8 44 0 q10 32 0 62 q-22 8 -44 0 q-10 -30 0 -62 Z" fill="#8a6f4a" />
      <g fill="#6f5836">
        <path d="M30 34 h40 M29 46 h42 M30 58 h40 M32 70 h36" stroke="#6f5836" strokeWidth="3" />
      </g>
      <path d="M40 20 q10 -4 20 0 q-2 8 -10 8 q-8 0 -10 -8 Z" fill="#9c7f56" />
      <Eye cx={44} cy={22} r={3} />
      <Eye cx={56} cy={22} r={3} />
    </g>
  ),
  helicoprion: (
    <g>
      <path d="M18 50 q14 -24 46 -20 q22 3 26 14 q-6 6 -16 4 q4 8 -4 16 q-30 10 -52 -14 Z" fill="#6b7688" />
      <path d="M62 40 l16 -10 -3 18 Z" fill="#6b7688" />
      <circle cx="30" cy="66" r="13" fill="#20283a" />
      <path d="M30 66 q0 -12 12 -10 q-2 12 -12 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <Eye cx={44} cy={42} r={7} />
    </g>
  ),
  'point-nemo': (
    <g>
      <path d="M8 38 q12 6 24 0 q12 -6 24 0 q12 6 24 0 q6 -3 12 0" fill="none" stroke="#3a5f8f" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 54 q12 6 24 0 q12 -6 24 0 q12 6 24 0 q6 -3 12 0" fill="none" stroke="#3a5f8f" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 70 q12 6 24 0 q12 -6 24 0 q12 6 24 0 q6 -3 12 0" fill="none" stroke="#3a5f8f" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="16" x2="50" y2="84" stroke="#a78bfa" strokeWidth="4" strokeDasharray="4 6" strokeLinecap="round" />
      <line x1="16" y1="50" x2="84" y2="50" stroke="#a78bfa" strokeWidth="4" strokeDasharray="4 6" strokeLinecap="round" />
      <circle cx="50" cy="50" r="7" fill="#a78bfa" />
      <circle cx="50" cy="50" r="3" fill="#fff" />
    </g>
  ),
  dock: (
    <g>
      <rect x="12" y="40" width="76" height="9" rx="3" fill="#c08a4a" />
      <rect x="12" y="51" width="76" height="8" rx="3" fill="#a5763f" />
      <g fill="#8a5f30">
        <rect x="20" y="49" width="7" height="34" rx="2" />
        <rect x="40" y="49" width="7" height="34" rx="2" />
        <rect x="60" y="49" width="7" height="34" rx="2" />
        <rect x="76" y="49" width="7" height="26" rx="2" />
      </g>
      <path d="M8 74 q16 8 26 0 q16 -8 32 0 q10 5 18 0 v14 h-76 Z" fill="#4a7fb0" opacity="0.7" />
    </g>
  ),
  nautilus: (
    <g>
      <path d="M52 50 q0 -14 14 -14 q18 0 18 20 q0 26 -30 26 q-36 0 -36 -34 q0 -14 10 -22 q8 -6 18 -6" fill="#e0b57a" />
      <path d="M40 30 q-8 5 -10 12 M32 44 q-4 7 -2 14 M34 60 q0 9 8 13" fill="none" stroke="#b58a4a" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 78 q-3 8 -8 12 M42 82 q-1 8 -3 12 M54 82 q2 8 4 12" fill="none" stroke="#e0b57a" strokeWidth="5" strokeLinecap="round" />
      <Eye cx={40} cy={62} r={6} />
    </g>
  ),
  lighthouse: (
    <g>
      <path d="M40 86 L44 40 L56 40 L60 86 Z" fill="#efe9db" />
      <path d="M43 50 h14 M42 64 h16 M41 78 h18" fill="none" stroke="#e0654f" strokeWidth="6" />
      <path d="M44 40 L56 40 L54 30 L46 30 Z" fill="#e6e0d0" />
      <rect x="45" y="18" width="10" height="12" rx="2" fill="#f5d76e" />
      <path d="M55 24 l18 -7 M55 24 l18 7" fill="none" stroke="#f5d76e" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 86 q20 8 40 0 v6 h-40 Z" fill="#4a7fb0" opacity="0.7" />
    </g>
  ),
  'message-in-bottle': (
    <g>
      <path d="M42 22 h16 v8 q16 6 16 26 v20 q0 8 -8 8 h-32 q-8 0 -8 -8 v-20 q0 -20 16 -26 Z" fill="#8fd0ba" opacity="0.9" />
      <rect x="43" y="12" width="14" height="12" rx="3" fill="#a5763f" />
      <rect x="36" y="52" width="28" height="22" rx="3" fill="#f4ead0" />
      <path d="M41 60 h18 M41 66 h18 M41 71 h12" fill="none" stroke="#b9a877" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  kraken: (
    <g>
      <path d="M28 46 q0 -28 22 -28 q22 0 22 28 q0 12 -6 20 q-6 -4 -8 4 q-2 -8 -8 -4 q-2 -8 -8 -4 q-6 -8 -6 -16 Z" fill="#7a5bbf" />
      <g fill="none" stroke="#7a5bbf" strokeWidth="6" strokeLinecap="round">
        <path d="M28 56 q-16 4 -20 -6 M32 66 q-16 12 -26 10 M42 74 q-8 16 -20 20 M58 74 q8 16 20 20 M68 66 q16 12 26 10 M72 56 q16 4 20 -6" />
      </g>
      <Eye cx={42} cy={44} r={7.5} />
      <Eye cx={58} cy={44} r={7.5} />
      <path d="M44 58 q6 5 12 0 q-6 4 -12 0 Z" fill="#553a94" />
    </g>
  ),
  buoy: (
    <g>
      <path d="M32 46 q18 -8 36 0 l-5 32 q-13 6 -26 0 Z" fill="#e0654f" />
      <path d="M31 56 q19 -6 38 0 M33 67 q17 -5 34 0" fill="none" stroke="#f4ece4" strokeWidth="5" />
      <rect x="46" y="22" width="8" height="24" rx="3" fill="#e0654f" />
      <circle cx="50" cy="18" r="7" fill="#f5d76e" />
      <path d="M28 82 q22 8 44 0 v6 h-44 Z" fill="#4a7fb0" opacity="0.7" />
    </g>
  ),
};
