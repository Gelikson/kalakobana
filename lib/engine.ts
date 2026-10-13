import { STOP_GRACE_SECONDS, ROUND_SECONDS, TOTAL_ROUNDS, pickLetter } from './georgian';
import { winnersOf } from './scoring';
import type { GameState, PlayerInfo, RoundCells } from './types';

/** Pure state transitions. Only the host runs these; everyone else just renders broadcast snapshots. */

export function createInitialState(hostId: string, players: PlayerInfo[]): GameState {
  return {
    phase: 'lobby',
    hostId,
    players,
    totalRounds: TOTAL_ROUNDS,
    round: 0,
    letter: null,
    endsAt: null,
    stoppedBy: null,
    usedLetters: [],
    roundResult: null,
    roundPoints: {},
    totals: Object.fromEntries(players.map((p) => [p.id, 0])),
    winners: [],
    hostNow: Date.now(),
  };
}

export function beginRound(s: GameState, now: number): GameState {
  const letter = pickLetter(s.usedLetters);
  return {
    ...s,
    phase: 'playing',
    round: s.round + 1,
    letter,
    usedLetters: [...s.usedLetters, letter],
    endsAt: now + ROUND_SECONDS * 1000,
    stoppedBy: null,
    roundResult: null,
    roundPoints: {},
  };
}

export function applyStop(s: GameState, playerId: string, now: number): GameState | null {
  if (s.phase !== 'playing' || s.stoppedBy || !s.endsAt) return null;
  if (!s.players.some((p) => p.id === playerId)) return null;
  return { ...s, stoppedBy: playerId, endsAt: Math.min(s.endsAt, now + STOP_GRACE_SECONDS * 1000) };
}

export function applyResults(s: GameState, result: RoundCells, roundPoints: Record<string, number>): GameState {
  const totals = { ...s.totals };
  for (const [pid, pts] of Object.entries(roundPoints)) totals[pid] = (totals[pid] ?? 0) + pts;
  return { ...s, phase: 'results', roundResult: result, roundPoints, totals, endsAt: null };
}

/** From the results screen: next round, or the final standings after the last round. */
export function advance(s: GameState, now: number): GameState {
  if (s.round >= s.totalRounds) return { ...s, phase: 'finished', winners: winnersOf(s.totals) };
  return beginRound(s, now);
}
