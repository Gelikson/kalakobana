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
  duration: number; // წამებში
  endsAt: number | null; // Timestamp
  scores: Record<string, Record<string, number>>; // { playerId: { category: score } }
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

  // ოთახის შექმნა
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
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
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

  // ოთახში
