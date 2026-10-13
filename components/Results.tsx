'use client';

import { CircleHelp, Crown, LogOut, RotateCcw, Trophy, ArrowRight } from 'lucide-react';
import { CATEGORIES } from '@/lib/georgian';
import type { Cell, GameState } from '@/lib/types';
import { Avatar, SEATS, btnGhost, btnPrimary } from './ui';

interface Props {
  game: GameState;
  myId: string;
  isHost: boolean;
  onNext: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

function CellView({ cell }: { cell: Cell }) {
  if (cell.status === 'empty') return <span className="text-chalk/25">—</span>;
  if (cell.status === 'invalid') {
    return (
      <div>
        <span className="text-persimmon line-through decoration-2">{cell.word}</span>
        <p className="text-xs text-persimmon/80">{cell.reason}</p>
      </div>
    );
  }
  return (
    <div>
      <span className="font-semibold">{cell.word}</span>
      {cell.unverified && <CircleHelp className="ml-1 inline h-3.5 w-3.5 text-chalk/50" aria-label="ვერ გადამოწმდა" />}
      <p className={`text-sm font-black ${cell.shared ? 'text-marigold' : 'text-mint'}`}>
        +{cell.points} <span className="text-xs font-normal opacity-80">{cell.shared ? 'განმეორებული' : 'უნიკალური'}</span>
      </p>
    </div>
  );
}

export default function Results({ game, myId, isHost, onNext, onPlayAgain, onLeave }: Props) {
  if (game.phase === 'finished') return <Final game={game} myId={myId} isHost={isHost} onPlayAgain={onPlayAgain} onLeave={onLeave} />;

  const last = game.round >= game.totalRounds;
  const res = game.roundResult;
  if (!res) return null;

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 py-6 sm:py-10">
      <h1 className="mb-1 text-center text-2xl font-black">რაუნდი {game.round} — შედეგები</h1>
      <p className="mb-5 text-center text-chalk/60">ასო „{game.letter}“</p>

      <div className="overflow-x-auto rounded-2xl ring-1 ring-chalk/10">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="bg-ink-800">
              <th className="sticky left-0 bg-ink-800 p-3 text-sm font-semibold text-chalk/60">კატეგორია</th>
              {game.players.map((p, i) => (
                <th key={p.id} className="p-3">
                  <span className="flex items-center gap-2">
                    <Avatar index={p.avatar} seat={i} size="sm" />
                    <span className="max-w-[6.5rem] truncate">{p.name}{p.id === myId && ' (შენ)'}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.id} className="border-t border-chalk/10 align-top">
                <th className="sticky left-0 bg-ink-900 p-3 text-sm font-semibold text-chalk/70">{c.label}</th>
                {game.players.map((p) => (
                  <td key={p.id} className="p-3"><CellView cell={res[p.id][c.id]} /></td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-chalk/20 bg-ink-800/60">
              <th className="sticky left-0 bg-ink-800 p-3 text-sm">რაუნდის ქულა</th>
              {game.players.map((p, i) => (
                <td key={p.id} className={`p-3 text-xl font-black ${SEATS[i % 4].text}`}>+{game.roundPoints[p.id] ?? 0}</td>
              ))}
            </tr>
            <tr className="bg-ink-800">
              <th className="sticky left-0 bg-ink-800 p-3 text-sm">ჯამი</th>
              {game.players.map((p) => (
                <td key={p.id} className="p-3 text-2xl font-black">{game.totals[p.id] ?? 0}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {isHost ? (
          <button onClick={onNext} className={`${btnPrimary} text-lg`}>
            {last ? 'საბოლოო შედეგები' : 'შემდეგი რაუნდი'} <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <p className="text-chalk/70">ელოდები მასპინძელს…</p>
        )}
      </div>
    </main>
  );
}

function Final({ game, myId, isHost, onPlayAgain, onLeave }: Omit<Props, 'onNext'>) {
  const ranked = game.players
    .map((p, i) => ({ p, i, score: game.totals[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const winners = ranked.filter((r) => game.winners.includes(r.p.id));
  const tie = winners.length > 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <Trophy className="mx-auto mb-3 h-14 w-14 text-marigold" strokeWidth={2} />
        <h1 className="text-3xl font-black">თამაში დასრულდა</h1>
        <p className="mt-2 text-xl text-marigold">
          {tie ? `ფრეა: ${winners.map((w) => w.p.name).join(', ')}` : `გამარჯვებულია ${winners[0]?.p.name}!`}
        </p>
      </div>

      <ol className="space-y-2">
        {ranked.map(({ p, i, score }, rank) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-2xl p-3 ${game.winners.includes(p.id) ? 'bg-marigold/15 ring-2 ring-marigold' : 'bg-ink-800'}`}>
            <span className="w-6 text-center text-lg font-black text-chalk/50">{rank + 1}</span>
            <Avatar index={p.avatar} seat={i} />
            <span className="flex-1 truncate text-lg font-semibold">{p.name}{p.id === myId && ' (შენ)'}</span>
            {game.winners.includes(p.id) && <Crown className="h-5 w-5 text-marigold" />}
            <span className="text-2xl font-black">{score}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3">
        {isHost ? (
          <button onClick={onPlayAgain} className={`${btnPrimary} text-lg`}><RotateCcw className="h-5 w-5" /> ახალი თამაში</button>
        ) : (
          <p className="text-center text-chalk/70">მასპინძელს შეუძლია ახალი თამაშის დაწყება</p>
        )}
        <button onClick={onLeave} className={btnGhost}><LogOut className="h-4 w-4" /> გასვლა</button>
      </div>
    </main>
  );
}
