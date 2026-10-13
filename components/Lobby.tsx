'use client';

import { useState } from 'react';
import { Check, Copy, Crown, LogOut, Play } from 'lucide-react';
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_SECONDS, TOTAL_ROUNDS } from '@/lib/georgian';
import type { PresenceMeta } from '@/lib/types';
import { Avatar, LetterBlock, btnGhost, btnPrimary } from './ui';

interface Props {
  code: string;
  players: PresenceMeta[];
  myId: string;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export default function Lobby({ code, players, myId, isHost, onStart, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const enough = players.length >= MIN_PLAYERS;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-3xl bg-ink-800/90 p-6 ring-1 ring-chalk/10">
        <p className="text-center text-sm text-chalk/70">ოთახის კოდი</p>
        <div className="my-3 flex items-center justify-center gap-2">
          {[...code].map((c, i) => (
            <LetterBlock key={i} char={c} index={i} className="h-14 w-12 text-3xl" />
          ))}
        </div>
        <button onClick={copy} className="mx-auto mb-6 flex items-center gap-2 text-sm text-chalk/70 hover:text-chalk">
          {copied ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
          {copied ? 'დაკოპირდა' : 'კოდის კოპირება'}
        </button>

        <h2 className="mb-3 font-bold">მოთამაშეები ({players.length}/{MAX_PLAYERS})</h2>
        <ul className="space-y-2">
          {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
            const p = players[i];
            return p ? (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-ink-950 p-3">
                <Avatar index={p.avatar} seat={i} />
                <span className="flex-1 truncate text-lg font-semibold">
                  {p.name}{p.id === myId && <span className="ml-2 text-sm font-normal text-chalk/50">(შენ)</span>}
                </span>
                {p.isHost && (
                  <span className="flex items-center gap-1 text-sm text-marigold"><Crown className="h-4 w-4" />მასპინძელი</span>
                )}
              </li>
            ) : (
              <li key={i} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-chalk/15 p-3 text-chalk/40">
                <span className="h-11 w-11 rounded-2xl bg-chalk/5" />ელოდება მოთამაშეს…
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-sm leading-relaxed text-chalk/60">
          {TOTAL_ROUNDS} რაუნდი, თითო რაუნდი {ROUND_SECONDS} წამი. უნიკალური სიტყვა — 10 ქულა, განმეორებული — 5.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {isHost ? (
            <>
              <button onClick={onStart} disabled={!enough} className={`${btnPrimary} text-lg`}>
                <Play className="h-5 w-5" /> თამაშის დაწყება
              </button>
              {!enough && <p className="text-center text-sm text-chalk/60">საჭიროა მინიმუმ {MIN_PLAYERS} მოთამაშე</p>}
            </>
          ) : (
            <p className="text-center text-chalk/70">ელოდები, სანამ მასპინძელი დაიწყებს თამაშს…</p>
          )}
          <button onClick={onLeave} className={btnGhost}><LogOut className="h-4 w-4" /> ოთახიდან გასვლა</button>
        </div>
      </section>
    </main>
  );
}
