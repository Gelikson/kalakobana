export type CategoryId = 'city' | 'name' | 'animal' | 'object' | 'river';
export type Answers = Record<CategoryId, string>;

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: number;
}

export type Phase = 'lobby' | 'playing' | 'scoring' | 'results' | 'finished';
export type CellStatus = 'valid' | 'invalid' | 'empty';

export interface Cell {
  word: string;
  status: CellStatus;
  reason?: string;
  points: number;
  shared: boolean;
  /** true when no dictionary/AI could confirm the word and it was accepted by policy */
  unverified?: boolean;
}

export type RoundCells = Record<string, Record<CategoryId, Cell>>; // playerId -> category -> cell

export interface GameState {
  phase: Phase;
  hostId: string;
  players: PlayerInfo[];
  totalRounds: number;
  round: number;
  letter: string | null;
  endsAt: number | null; // host epoch ms
  stoppedBy: string | null;
  usedLetters: string[];
  roundResult: RoundCells | null;
  roundPoints: Record<string, number>;
  totals: Record<string, number>;
  winners: string[];
  hostNow: number; // stamped on every broadcast, used for clock sync
}

export interface PresenceMeta {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  locked: boolean; // host only: game already started
  joinedAt: number;
}
