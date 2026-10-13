import { CATEGORIES, POINTS_SHARED, POINTS_UNIQUE } from './georgian';
import { normalizeGeorgian } from './georgianDictionary';
import type { CategoryId, RoundCells } from './types';

/**
 * Takes validated cells (status + word, points not yet set) and assigns points.
 * Valid + written by exactly one player  -> 10
 * Valid + written by 2+ players          -> 5 each
 * Invalid / empty                        -> 0
 */
export function scoreRound(cells: RoundCells): { result: RoundCells; roundPoints: Record<string, number> } {
  const playerIds = Object.keys(cells);
  const roundPoints: Record<string, number> = Object.fromEntries(playerIds.map((p) => [p, 0]));

  for (const { id } of CATEGORIES) {
    const counts = new Map<string, number>();
    for (const pid of playerIds) {
      const c = cells[pid][id];
      if (c.status === 'valid') {
        const k = normalizeGeorgian(c.word);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    for (const pid of playerIds) {
      const c = cells[pid][id];
      if (c.status !== 'valid') {
        c.points = 0;
        c.shared = false;
        continue;
      }
      const shared = (counts.get(normalizeGeorgian(c.word)) ?? 0) > 1;
      c.shared = shared;
      c.points = shared ? POINTS_SHARED : POINTS_UNIQUE;
      roundPoints[pid] += c.points;
    }
  }
  return { result: cells, roundPoints };
}

export function winnersOf(totals: Record<string, number>): string[] {
  const best = Math.max(...Object.values(totals));
  return Object.entries(totals).filter(([, v]) => v === best).map(([k]) => k);
}

export type { CategoryId };
