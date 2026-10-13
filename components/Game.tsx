'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Hand, Keyboard, Loader2, TriangleAlert } from 'lucide-react';
import { CATEGORIES, EMPTY_ANSWERS, MIN_FILLED_TO_STOP, ROUND_SECONDS } from '@/lib/georgian';
import { checkFormat } from '@/lib/georgianDictionary';
import { useRemaining } from '@/lib/useRemaining';
import type { Answers, CategoryId, GameState } from '@/lib/types';
import { Avatar, LetterBlock, SEATS } from './ui';

interface Props {
  game: GameState;
  offset: number;
  myId: string;
  onStop: () => void;
  onSubmit: (round: number, answers: Answers) => void;
}

const clean = (v: string) =>
  v.replace(/[^\u10D0-\u10FA ]/g, '').replace(/^ +/, '').replace(/ {2,}/g, ' ').slice(0, 30);

export default function Game({ game, offset, myId, onStop, onSubmit }: Props) {
  const letter = game.letter ?? '';
  const remaining = useRemaining(game.endsAt, offset);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS());
  const [kbHint, setKbHint] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submitted = useRef(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // fresh sheet every round
  useEffect(() => {
    setAnswers(EMPTY_ANSWERS());
    inputs.current[0]?.focus();
  }, [game.round]);

  // hand the sheet to the host exactly once per round, when time is up
  useEffect(() => {
    const over = game.phase === 'scoring' || (game.phase === 'playing' && remaining <= 0);
    if (over && submitted.current !== game.round) {
      submitted.current = game.round;
      onSubmit(game.round, answersRef.current);
    }
  }, [remaining, game.phase, game.round, onSubmit]);

  const locked = game.phase !== 'playing' || remaining <= 0;
  const status = (id: CategoryId) => {
    const w = answers[id].trim();
    if (!w) return 'empty' as const;
    return checkFormat(w, letter).ok ? ('ok' as const) : ('bad' as const);
  };
  const filled = CATEGORIES.filter((c) => status(c.id) === 'ok').length;
  const canStop = !locked && !game.stoppedBy && filled >= MIN_FILLED_TO_STOP;
  const stopper = game.players.find((p) => p.id === game.stoppedBy);
  const urgent = remaining <= 10 && !locked;

  const onChange = (id: CategoryId, raw: string) => {
    const v = clean(raw);
    if (v.replace(/ /g, '').length < raw.replace(/ /g, '').length) {
      setKbHint(true);
      setTimeout(() => setKbHint(false), 2500);
    }
    setAnswers((a) => ({ ...a, [id]: v }));
  };

  const R = 34;
  const C = 2 * Math.PI * R;
  const ratio = Math.min(1, remaining / ROUND_SECONDS);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-5 sm:py-8">
      {/* header: round / letter / timer */}
      <header className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-sm text-chalk/60">რაუნდი</p>
          <p className="text-2xl font-black">{game.round} <span className="text-chalk/40">/ {game.totalRounds}</span></p>
        </div>
        <div key={game.round} className="animate-drop">
          <LetterBlock char={letter} tilt={false} className="h-28 w-24 bg-marigold text-7xl sm:h-36 sm:w-32 sm:text-8xl" />
        </div>
        <div className="flex justify-end">
          <div className={`relative h-20 w-20 ${urgent ? 'animate-tick' : ''}`} role="timer" aria-label={`დარჩენილია ${remaining} წამი`}>
            <svg viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" className="stroke-chalk/10" />
              <circle
                cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - ratio)}
                className={`transition-[stroke-dashoffset] duration-200 ${urgent ? 'stroke-persimmon' : 'stroke-mint'}`}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${urgent ? 'text-persimmon' : ''}`}>
              {remaining}
            </span>
          </div>
        </div>
      </header>

      {/* scoreboard */}
      <ul className="mb-4 flex flex-wrap justify-center gap-2 text-sm">
        {game.players.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-full bg-ink-800 py-1 pl-1 pr-3">
            <Avatar index={p.avatar} seat={i} size="sm" />
            <span className="max-w-[7rem] truncate">{p.name}{p.id === myId && ' (შენ)'}</span>
            <b className={SEATS[i % 4].text}>{game.totals[p.id] ?? 0}</b>
          </li>
        ))}
      </ul>

      {stopper && (
        <p role="status" className="mb-4 rounded-xl bg-persimmon/15 px-4 py-3 text-center font-semibold text-persimmon">
          {stopper.id === myId ? 'შენ დააჭირე „სტოპს“!' : `${stopper.name}-მა დააჭირა „სტოპს“! დაასრულეთ წერა`}
        </p>
      )}

      {/* the sheet */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3" autoComplete="off">
        {CATEGORIES.map((c, i) => {
          const st = status(c.id);
          const reason = st === 'bad' ? checkFormat(answers[c.id], letter).reason : '';
          return (
            <div key={c.id}>
              <label htmlFor={c.id} className="mb-1 block text-sm font-semibold text-chalk/80">{c.label}</label>
              <div className="relative">
                <input
                  id={c.id}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={answers[c.id]}
                  readOnly={locked}
                  lang="ka"
                  inputMode="text"
                  onChange={(e) => onChange(c.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); inputs.current[i + 1]?.focus(); } }}
                  placeholder={`${letter}…`}
                  className={`w-full rounded-xl border-2 bg-ink-950 py-3.5 pl-4 pr-11 text-xl outline-none transition placeholder:text-chalk/25 ${
                    st === 'bad' ? 'border-persimmon' : st === 'ok' ? 'border-mint' : 'border-chalk/15 focus:border-marigold'
                  } ${locked ? 'opacity-60' : ''}`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  {st === 'ok' && <Check className="h-5 w-5 text-mint" aria-label="კარგია" />}
                  {st === 'bad' && <TriangleAlert className="h-5 w-5 text-persimmon" aria-label="შეცდომა" />}
                </span>
              </div>
              {reason && <p className="mt-1 text-sm text-persimmon">{reason}</p>}
            </div>
          );
        })}
      </form>

      {kbHint && (
        <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm text-marigold">
          <Keyboard className="h-4 w-4" /> ჩართე ქართული კლავიატურა
        </p>
      )}

      {/* STOP */}
      <div className="sticky bottom-4 mt-6">
        <button
          onClick={onStop}
          disabled={!canStop}
          className="flex w-full flex-col items-center rounded-2xl bg-persimmon py-4 text-3xl font-black text-ink-950 shadow-[0_6px_0_#a8321a] transition active:translate-y-[4px] active:shadow-[0_2px_0_#a8321a] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:active:translate-y-0 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-chalk"
        >
          <span className="flex items-center gap-3"><Hand className="h-7 w-7" strokeWidth={2.6} />სტოპი!</span>
          {!canStop && !locked && !game.stoppedBy && (
            <span className="text-sm font-semibold">შეავსე მინიმუმ {MIN_FILLED_TO_STOP} ველი ({filled}/{MIN_FILLED_TO_STOP})</span>
          )}
        </button>
      </div>

      {game.phase === 'scoring' && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink-950/85 backdrop-blur-sm" role="status">
          <Loader2 className="h-10 w-10 animate-spin text-marigold" />
          <p className="text-xl font-bold">ვამოწმებთ პასუხებს…</p>
        </div>
      )}
    </main>
  );
}
