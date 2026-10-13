import { CATEGORIES } from './georgian';
import { normalizeGeorgian, validateLocal } from './georgianDictionary';
import type { Answers, Cell, CategoryId, RoundCells } from './types';

export interface RemoteItem { category: CategoryId; word: string }
/** Returns a map "category|word" -> boolean, or null when no verifier is available. */
export type RemoteVerifier = (letter: string, items: RemoteItem[]) => Promise<Record<string, boolean> | null>;

const blank = (word = ''): Cell => ({ word, status: 'empty', points: 0, shared: false });

export async function validateSubmissions(
  letter: string,
  playerIds: string[],
  submissions: Record<string, Answers | undefined>,
  remote: RemoteVerifier,
): Promise<RoundCells> {
  const cells: RoundCells = {};
  const unknown: RemoteItem[] = [];
  const seen = new Set<string>();

  for (const pid of playerIds) {
    const answers = submissions[pid];
    cells[pid] = {} as Record<CategoryId, Cell>;
    for (const { id } of CATEGORIES) {
      const word = normalizeGeorgian(answers?.[id] ?? '');
      if (!word) { cells[pid][id] = blank(); continue; }
      const res = validateLocal(id, word, letter);
      if (res.status === 'valid') cells[pid][id] = { word, status: 'valid', points: 0, shared: false };
      else if (res.status === 'invalid') cells[pid][id] = { word, status: 'invalid', reason: res.reason, points: 0, shared: false };
      else {
        // well-formed but not in the built-in dictionary -> ask the fallback
        cells[pid][id] = { word, status: 'valid', points: 0, shared: false, unverified: true };
        const key = `${id}|${word}`;
        if (!seen.has(key)) { seen.add(key); unknown.push({ category: id, word }); }
      }
    }
  }

  if (unknown.length) {
    let verdicts: Record<string, boolean> | null = null;
    try { verdicts = await remote(letter, unknown); } catch { verdicts = null; }
    if (verdicts) {
      for (const pid of playerIds) for (const { id } of CATEGORIES) {
        const c = cells[pid][id];
        if (!c.unverified) continue;
        const verdict = verdicts[`${id}|${c.word}`];
        if (verdict === true) c.unverified = false;
        else if (verdict === false) { c.status = 'invalid'; c.reason = 'ასეთი სიტყვა ვერ მოიძებნა'; c.unverified = false; }
        // undefined -> stays accepted but flagged unverified
      }
    }
  }
  return cells;
}

/** Browser-side verifier that calls the Next.js route handler. */
export const remoteVerifier: RemoteVerifier = async (letter, items) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter, items }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.available ? (data.verdicts as Record<string, boolean>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
};
