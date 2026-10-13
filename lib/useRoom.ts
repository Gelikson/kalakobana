'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { MAX_PLAYERS, MIN_PLAYERS, SUBMIT_GRACE_MS, makeRoomCode } from './georgian';
import { advance, applyResults, applyStop, beginRound, createInitialState } from './engine';
import { scoreRound } from './scoring';
import { remoteVerifier, validateSubmissions } from './validateRound';
import type { Answers, GameState, PresenceMeta } from './types';

/**
 * Architecture: Supabase Realtime only (Broadcast + Presence), no tables, no custom server.
 *  - Presence      = who is in the room (lobby list, connection loss detection, host lock flag)
 *  - Broadcast     = "state" snapshots host -> everyone; "stop" and "submit" messages player -> host
 *  - The HOST BROWSER is the authority: it runs the engine, validates words, scores rounds.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getPlayerId(): string {
  try {
    let id = sessionStorage.getItem('kalakobana:pid');
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('kalakobana:pid', id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type ConnStatus = 'idle' | 'connecting' | 'ready';

export function useRoom() {
  const [status, setStatus] = useState<ConnStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [myId, setMyId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [presence, setPresence] = useState<PresenceMeta[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [offset, setOffset] = useState(0); // hostClock - myClock, for timer sync

  const channelRef = useRef<RealtimeChannel | null>(null);
  const hostRef = useRef(false);
  const readyRef = useRef(false);
  const metaRef = useRef<PresenceMeta | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const presenceRef = useRef<PresenceMeta[]>([]);
  const submissionsRef = useRef<Record<string, Answers>>({});
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);

  /* ---------- host: publish a new authoritative snapshot ---------- */
  const publish = useCallback((next: GameState) => {
    const stamped = { ...next, hostNow: Date.now() };
    gameRef.current = stamped;
    setGame(stamped);
    setOffset(0);
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: stamped });
  }, []);

  /* ---------- host: end of round -> validate -> score -> results ---------- */
  const finishRound = useCallback(async () => {
    const s = gameRef.current;
    if (!hostRef.current || !s || s.phase !== 'playing' || finishingRef.current) return;
    finishingRef.current = true;
    if (endTimer.current) clearTimeout(endTimer.current);
    publish({ ...s, phase: 'scoring' });
    try {
      const cells = await validateSubmissions(s.letter!, s.players.map((p) => p.id), submissionsRef.current, remoteVerifier);
      const { result, roundPoints } = scoreRound(cells);
      publish(applyResults(gameRef.current ?? s, result, roundPoints));
    } finally {
      finishingRef.current = false;
    }
  }, [publish]);

  const scheduleFinish = useCallback(() => {
    if (endTimer.current) clearTimeout(endTimer.current);
    const s = gameRef.current;
    if (!s || s.phase !== 'playing' || !s.endsAt) return;
    // wait for the deadline plus a grace period for late "submit" messages
    endTimer.current = setTimeout(() => void finishRound(), Math.max(0, s.endsAt - Date.now()) + SUBMIT_GRACE_MS);
  }, [finishRound]);

  const maybeFinishEarly = useCallback(() => {
    const s = gameRef.current;
    if (!hostRef.current || !s || s.phase !== 'playing' || !s.endsAt) return;
    const online = new Set(presenceRef.current.map((p) => p.id));
    const allIn = s.players.filter((p) => online.has(p.id)).every((p) => submissionsRef.current[p.id]);
    if (allIn && Date.now() >= s.endsAt - 800) void finishRound();
  }, [finishRound]);

  const teardown = useCallback(() => {
    if (endTimer.current) clearTimeout(endTimer.current);
    const ch = channelRef.current;
    channelRef.current = null;
    if (ch) void supabase.removeChannel(ch);
    hostRef.current = false;
    readyRef.current = false;
    metaRef.current = null;
    gameRef.current = null;
    presenceRef.current = [];
    submissionsRef.current = {};
    finishingRef.current = false;
    setStatus('idle'); setCode(''); setIsHost(false); setPresence([]); setGame(null); setOffset(0);
  }, []);

  /* ---------- connect (create or join) ---------- */
  const connect = useCallback(
    async (roomCode: string, name: string, avatar: number, asHost: boolean): Promise<string | null> => {
      const pid = getPlayerId();
      setMyId(pid);
      const channel = supabase.channel(`kalakobana:${roomCode}`, {
        config: { broadcast: { self: false }, presence: { key: pid } },
      });
      channelRef.current = channel;

      let firstSync: () => void = () => {};
      const synced = new Promise<void>((r) => { firstSync = r; });

      channel.on('presence', { event: 'sync' }, () => {
        const metas = (Object.values(channel.presenceState<PresenceMeta>()).flat() as PresenceMeta[])
          .sort((a, b) => a.joinedAt - b.joinedAt);
        presenceRef.current = metas;
        setPresence(metas);
        firstSync();
        if (!readyRef.current) return;
        if (!hostRef.current && !metas.some((m) => m.isHost)) {
          teardown();
          setError('მასპინძელმა დატოვა ოთახი');
        } else if (hostRef.current) {
          maybeFinishEarly();
        }
      });

      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (hostRef.current) return;
        const s = payload as GameState;
        gameRef.current = s;
        setGame(s);
        setOffset(s.hostNow - Date.now());
      });

      channel.on('broadcast', { event: 'stop' }, ({ payload }) => {
        if (!hostRef.current || !gameRef.current) return;
        const next = applyStop(gameRef.current, payload.playerId, Date.now());
        if (next) { publish(next); scheduleFinish(); }
      });

      channel.on('broadcast', { event: 'submit' }, ({ payload }) => {
        const s = gameRef.current;
        if (!hostRef.current || !s || s.phase !== 'playing' || payload.round !== s.round) return;
        if (!s.players.some((p) => p.id === payload.playerId)) return;
        submissionsRef.current[payload.playerId] = payload.answers as Answers;
        maybeFinishEarly();
      });

      try {
        await new Promise<void>((resolve, reject) => {
          channel.subscribe((st) => {
            if (st === 'SUBSCRIBED') resolve();
            else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') reject(new Error(st));
          });
        });
      } catch {
        teardown();
        return 'კავშირი ვერ დამყარდა. შეამოწმე ინტერნეტი და Supabase-ის გასაღებები';
      }
      await Promise.race([synced, sleep(2500)]);

      const existing = Object.values(channel.presenceState<PresenceMeta>()).flat() as PresenceMeta[];
      const reject = async (msg: string) => { teardown(); return msg; };
      if (asHost && existing.length > 0) { teardown(); return 'TAKEN'; }
      if (!asHost) {
        const host = existing.find((m) => m.isHost);
        if (!host) return reject('ოთახი ვერ მოიძებნა');
        if (host.locked) return reject('თამაში უკვე დაწყებულია');
        if (existing.length >= MAX_PLAYERS) return reject('ოთახი სავსეა');
      }

      const meta: PresenceMeta = { id: pid, name, avatar, isHost: asHost, locked: false, joinedAt: Date.now() };
      metaRef.current = meta;
      hostRef.current = asHost;
      await channel.track(meta);
      readyRef.current = true;
      setIsHost(asHost);
      setCode(roomCode);
      setStatus('ready');
      return null;
    },
    [maybeFinishEarly, publish, scheduleFinish, teardown],
  );

  const createRoom = useCallback(async (name: string, avatar: number) => {
    setError(null); setStatus('connecting');
    for (let i = 0; i < 6; i++) {
      const res = await connect(makeRoomCode(), name, avatar, true);
      if (res === null) return;
      if (res !== 'TAKEN') { setError(res); setStatus('idle'); return; }
      setStatus('connecting');
    }
    setError('ოთახის შექმნა ვერ მოხერხდა, სცადე თავიდან'); setStatus('idle');
  }, [connect]);

  const joinRoom = useCallback(async (roomCode: string, name: string, avatar: number) => {
    setError(null); setStatus('connecting');
    const res = await connect(roomCode.toUpperCase(), name, avatar, false);
    if (res) { setError(res); setStatus('idle'); }
  }, [connect]);

  /* ---------- host actions ---------- */
  const setLocked = useCallback((locked: boolean) => {
    if (!metaRef.current) return;
    metaRef.current = { ...metaRef.current, locked };
    void channelRef.current?.track(metaRef.current);
  }, []);

  const startGame = useCallback(() => {
    if (!hostRef.current || !metaRef.current) return;
    const players = presenceRef.current.map(({ id, name, avatar }) => ({ id, name, avatar }));
    if (players.length < MIN_PLAYERS) return;
    setLocked(true);
    submissionsRef.current = {};
    finishingRef.current = false;
    publish(beginRound(createInitialState(metaRef.current.id, players), Date.now()));
    scheduleFinish();
  }, [publish, scheduleFinish, setLocked]);

  const nextRound = useCallback(() => {
    const s = gameRef.current;
    if (!hostRef.current || !s || s.phase !== 'results') return;
    submissionsRef.current = {};
    finishingRef.current = false;
    publish(advance(s, Date.now()));
    scheduleFinish();
  }, [publish, scheduleFinish]);

  const playAgain = useCallback(() => {
    if (!hostRef.current || !metaRef.current) return;
    setLocked(false);
    const players = presenceRef.current.map(({ id, name, avatar }) => ({ id, name, avatar }));
    publish(createInitialState(metaRef.current.id, players));
  }, [publish, setLocked]);

  /* ---------- player actions ---------- */
  const sendStop = useCallback(() => {
    const pid = metaRef.current?.id;
    if (!pid) return;
    if (hostRef.current) {
      const s = gameRef.current;
      const next = s && applyStop(s, pid, Date.now());
      if (next) { publish(next); scheduleFinish(); }
    } else {
      void channelRef.current?.send({ type: 'broadcast', event: 'stop', payload: { playerId: pid } });
    }
  }, [publish, scheduleFinish]);

const submitAnswers = useCallback(async (round: number, answers: Answers) => {
  const pid = metaRef.current?.id;
  if (!pid) return;

  const currentLetter = gameRef.current?.letter || '';

  // 1. AI შემოწმება თითოეული კატეგორიისთვის
  const validatedAnswers: Answers = {};

  for (const [category, word] of Object.entries(answers)) {
    const cleanWord = typeof word === 'string' ? word.trim() : '';

    if (!cleanWord) {
      validatedAnswers[category] = '';
      continue;
    }

    try {
      const res = await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          category: category,
          letter: currentLetter,
        }),
      });

      const data = await res.json();

      if (data.isValid) {
        validatedAnswers[category] = cleanWord;
      } else {
        console.log(`❌ AI-მ უარყო: "${cleanWord}" (${category}) - ${data.reason}`);
        validatedAnswers[category] = ''; // უარყოფილი სიტყვა გაუქმდა
      }
    } catch (err) {
      console.error('Validation error:', err);
      validatedAnswers[category] = cleanWord; // შეცდომისას ვატარებთ
    }
  }

  // 2. ვალიდირებული პასუხების გაგზავნა
  if (hostRef.current) {
    const s = gameRef.current;
    if (s && s.phase === 'playing' && s.round === round) {
      submissionsRef.current[pid] = validatedAnswers;
      maybeFinishEarly();
    }
  } else {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'submit',
      payload: { playerId: pid, round, answers: validatedAnswers },
    });
  }
}, [maybeFinishEarly]);

  useEffect(() => () => teardown(), [teardown]);

  return {
    status, error, setError, code, myId, isHost, presence, game, offset,
    createRoom, joinRoom, leave: teardown, startGame, nextRound, playAgain, sendStop, submitAnswers,
  };
}
