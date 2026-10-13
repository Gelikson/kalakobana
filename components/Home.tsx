'use client';

import { useEffect, useState } from 'react';
import { Loader2, LogIn, Plus } from 'lucide-react';
import { Avatar, AVATARS, LetterBlock, btnGhost, btnPrimary } from './ui';

interface Props {
  busy: boolean;
  error: string | null;
  onCreate: (name: string, avatar: number) => void;
  onJoin: (code: string, name: string, avatar: number) => void;
  onError: (msg: string | null) => void;
}

const TITLE = [...'ქალაქობანა'];

export default function Home({ busy, error, onCreate, onJoin, onError }: Props) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [code, setCode] = useState('');

  useEffect(() => {
    try {
      const n = sessionStorage.getItem('kalakobana:name');
      if (n) setName(n);
    } catch {}
  }, []);

  const trimmed = name.trim();
  const remember = () => { try { sessionStorage.setItem('kalakobana:name', trimmed); } catch {} };

  const create = () => {
    if (!trimmed) return onError('ჯერ სახელი შეიყვანე');
    remember(); onCreate(trimmed, avatar);
  };
  const join = () => {
    if (!trimmed) return onError('ჯერ სახელი შეიყვანე');
    if (code.length !== 4) return onError('შეიყვანე 4-ასოიანი ოთახის კოდი');
    remember(); onJoin(code, trimmed, avatar);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <h1 className="mb-3 flex flex-wrap justify-center gap-1.5 sm:gap-2" aria-label="ქალაქობანა">
        {TITLE.map((c, i) => (
          <LetterBlock key={i} char={c} index={i} className="h-11 w-9 text-2xl sm:h-14 sm:w-12 sm:text-3xl" />
        ))}
      </h1>
      <p className="mb-8 text-center text-chalk/70">ქართული სიტყვების თამაში მეგობრებთან ერთად, რეალურ დროში</p>

      <section className="rounded-3xl bg-ink-800/90 p-6 ring-1 ring-chalk/10">
        <label htmlFor="name" className="mb-2 block text-sm font-semibold text-chalk/80">შენი სახელი</label>
        <input
          id="name"
          value={name}
          maxLength={14}
          onChange={(e) => { setName(e.target.value); onError(null); }}
          placeholder="მაგ., ნინო"
          className="w-full rounded-xl border-2 border-chalk/15 bg-ink-950 px-4 py-3 text-lg outline-none placeholder:text-chalk/30 focus:border-marigold"
        />

        <p className="mb-2 mt-5 text-sm font-semibold text-chalk/80">აირჩიე ავატარი</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ავატარი">
          {AVATARS.map((_, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={avatar === i}
              onClick={() => setAvatar(i)}
              className={`rounded-2xl p-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-chalk ${avatar === i ? 'ring-4 ring-chalk' : 'opacity-60 hover:opacity-100'}`}
            >
              <Avatar index={i} seat={i} />
            </button>
          ))}
        </div>

        <button onClick={create} disabled={busy} className={`${btnPrimary} mt-6 w-full text-lg`}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          ოთახის შექმნა
        </button>

        <div className="my-5 flex items-center gap-3 text-sm text-chalk/40">
          <span className="h-px flex-1 bg-chalk/15" />ან<span className="h-px flex-1 bg-chalk/15" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)); onError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="კოდი"
            aria-label="ოთახის კოდი"
            autoCapitalize="characters"
            className="w-28 rounded-xl border-2 border-chalk/15 bg-ink-950 px-4 py-3 text-center text-xl font-black tracking-[0.3em] outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-chalk/30 focus:border-mint"
          />
          <button onClick={join} disabled={busy} className={`${btnGhost} flex-1 text-lg`}>
            <LogIn className="h-5 w-5" /> შეერთება
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-persimmon/15 px-3 py-2 text-persimmon">{error}</p>}
      </section>
    </main>
  );
}
