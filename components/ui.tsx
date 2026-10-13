import { Bird, Cat, Dog, Fish, Rabbit, Squirrel, type LucideIcon } from 'lucide-react';

export const AVATARS: LucideIcon[] = [Cat, Dog, Bird, Fish, Rabbit, Squirrel];

/** One colour per seat. Persimmon is kept free for "danger" (stop, invalid). */
export const SEATS = [
  { bg: 'bg-marigold', text: 'text-marigold', ring: 'ring-marigold' },
  { bg: 'bg-mint', text: 'text-mint', ring: 'ring-mint' },
  { bg: 'bg-lilac', text: 'text-lilac', ring: 'ring-lilac' },
  { bg: 'bg-sky', text: 'text-sky', ring: 'ring-sky' },
];

export function Avatar({ index, seat, size = 'md' }: { index: number; seat: number; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = AVATARS[index % AVATARS.length];
  const dims = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const icon = size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${dims} ${SEATS[seat % 4].bg} text-ink-950`}>
      <Icon className={icon} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

const TILE_COLORS = ['bg-marigold', 'bg-persimmon', 'bg-mint', 'bg-lilac', 'bg-sky'];

/** Alphabet-block tile: the visual signature of the game. */
export function LetterBlock({
  char, index = 0, className = '', tilt = true,
}: { char: string; index?: number; className?: string; tilt?: boolean }) {
  const rot = tilt ? [-4, 3, -2, 4, -3][index % 5] : 0;
  return (
    <span
      style={{ transform: `rotate(${rot}deg)` }}
      className={`inline-flex items-center justify-center rounded-xl font-black text-ink-950 shadow-[0_5px_0_rgba(0,0,0,0.38)] ${TILE_COLORS[index % 5]} ${className}`}
    >
      {char}
    </span>
  );
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-marigold px-6 py-3 font-bold text-ink-950 shadow-[0_4px_0_#b88a00] transition active:translate-y-[3px] active:shadow-[0_1px_0_#b88a00] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-chalk/25 px-5 py-3 font-semibold text-chalk transition hover:border-chalk/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk disabled:opacity-40';
