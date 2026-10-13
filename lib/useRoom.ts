'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';

export type Answers = Record<string, string>;

export interface Player {
  id: string;
  name: string;
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'scoring' | 'ended';
  round: number;
  totalRounds: number;
  letter: string;
  categories: string[];
  duration: number;
  endsAt: number | null;
  scores: Record<string, Record<string, number>>;
}

export function useRoom() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [presence, setPresence] = useState<Player[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [offset, setOffset] = useState<number>(0);

  const metaRef = useRef<{ id: string; name?: string } | null>(null);
  const hostRef = useRef<boolean>(false);
  const gameRef = useRef<GameState | null>(null);
  const submissionsRef = useRef<Record<string, Answers>>({});
  const channelRef = useRef<any>(null);

  gameRef.current = game;
  hostRef.current = isHost;

  const teardown = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setStatus('idle');
    setGame(null);
    setPresence([]);
    setCode('');
  }, []);

  const createRoom = useCallback(async (playerName: string) => {
    setStatus('connecting');
    setError(null);
    try {
      const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const playerId = Math.random().toString(36).substring(2, 9);

      metaRef.current = { id: playerId, name: playerName };
      setMyId(playerId);
      setCode(roomCode);
      setIsHost(true);

      const channel = supabase.channel(`room:${roomCode}`, {
        config: { presence: { key: playerId } },
      });

      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const players: Player[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.id) players.push({ id: p.id, name: p.name });
            });
          });
          setPresence(players);
        })
        .on('broadcast', { event: 'submit' }, ({ payload }) => {
          if (hostRef.current) {
            submissionsRef.current[payload.playerId] = payload.answers;
          }
        })
        .on('broadcast', { event: 'game_state' }, ({ payload }) => {
          setGame(payload);
        })
        .subscribe(async (s) => {
          if (s === 'SUBSCRIBED') {
            await channel.track({ id: playerId, name: playerName });
            setStatus('connected');
            setGame({
              phase: 'lobby',
              round: 1,
              totalRounds: 5,
              letter: '',
              categories: ['ქალაქი', 'ქვეყანა', 'სახელი', 'ცხოველი', 'მდინარე'],
              duration: 60,
              endsAt: null,
              scores: {},
            });
          }
        });
    } catch (err: any) {
      setError(err.message || 'ოთახის შექმნა ვერ მოხერხდა');
      setStatus('idle');
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    setStatus('connecting');
    setError(null);
    try {
      const playerId = Math.random().toString(36).substring(2, 9);
      const cleanCode = roomCode.trim().toUpperCase();

      metaRef.current = { id: playerId, name: playerName };
      setMyId(playerId);
      setCode(cleanCode);
      setIsHost(false);

      const channel = supabase.channel(`room:${cleanCode}`, {
        config: { presence: { key: playerId } },
      });

      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const players: Player[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.id) players.push({ id: p.id, name: p.name });
            });
          });
          setPresence(players);
        })
        .on('broadcast', { event: 'game_state' }, ({ payload }) => {
          setGame(payload);
        })
        .subscribe(async (s) => {
          if (s === 'SUBSCRIBED') {
            await channel.track({ id: playerId, name: playerName });
            setStatus('connected');
          }
        });
    } catch (err: any) {
      setError(err.message || 'ოთახში შესვლა ვერ მოხერხდა');
      setStatus('idle');
    }
  }, []);

  const startGame = useCallback(() => {
    if (!hostRef.current || !channelRef.current) return;

    const letters = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ', 'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ', 'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ'];
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];

    const newGame: GameState = {
      phase: 'playing',
      round: 1,
      totalRounds: 5,
      letter: randomLetter,
      categories: ['ქალაქი', 'ქვეყანა', 'სახელი', 'ცხოველი', 'მდინარე'],
      duration: 60,
      endsAt: Date.now() + 60000,
      scores: {},
    };

    setGame(newGame);
    channelRef.current.send({
      type: 'broadcast',
      event: 'game_state',
      payload: newGame,
    });
  }, []);

  const sendStop = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop',
        payload: { playerId: metaRef.current?.id },
      });
    }
  }, []);

  const submitAnswers = useCallback(async (round: number, answers: Answers) => {
    const pid = metaRef.current?.id;
    if (!pid) return;

    const currentLetter = gameRef.current?.letter || '';
    const validatedAnswers: Answers = { ...answers };

    const validationPromises = Object.entries(answers).map(async ([category, word]) => {
      const cleanWord = typeof word === 'string' ? word.trim() : '';

      if (!cleanWord) {
        (validatedAnswers as Record<string, string>)[category] = '';
        return;
      }

      try {
        const res = await fetch('/api/validate', {
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
          (validatedAnswers as Record<string, string>)[category] = cleanWord;
        } else {
          (validatedAnswers as Record<string, string>)[category] = '';
        }
      } catch (err) {
        console.error('Validation error:', err);
      }
    });

    await Promise.all(validationPromises);

    if (hostRef.current) {
      const s = gameRef.current;
      if (s
