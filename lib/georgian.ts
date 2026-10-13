import type { CategoryId } from './types';

export const ROUND_SECONDS = 60;
export const STOP_GRACE_SECONDS = 5;
export const MIN_FILLED_TO_STOP = 3;
export const TOTAL_ROUNDS = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const SUBMIT_GRACE_MS = 3000;

export const POINTS_UNIQUE = 10;
export const POINTS_SHARED = 5;

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'city', label: 'ქალაქი / ქვეყანა' },
  { id: 'name', label: 'სახელი' },
  { id: 'animal', label: 'ცხოველი / მცენარე' },
  { id: 'object', label: 'ნივთი' },
  { id: 'river', label: 'მდინარე / მთის მწვერვალი' },
];

export const EMPTY_ANSWERS = (): Record<CategoryId, string> => ({
  city: '', name: '', animal: '', object: '', river: '',
});

/** Letters used for rounds. Very rare starters (ჟ ჰ ძ) are left out so rounds stay playable. */
export const LETTER_POOL = [...'აბგდევზთიკლმნოპრსტუფქღშჩცწჭხჯყ'];

export function pickLetter(used: string[]): string {
  const free = LETTER_POOL.filter((l) => !used.includes(l));
  const pool = free.length ? free : LETTER_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I / L / O to avoid mix-ups
export function makeRoomCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
