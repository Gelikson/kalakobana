'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type Answers = Record<string, string>;

export function useRoom() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [presence, setPresence] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);
  const [offset, setOffset] = useState<number>(0);

  const metaRef = useRef<{ id: string } | null>(null);
  const hostRef = useRef<boolean>(false);
  const gameRef = useRef<any>(null);
  const submissionsRef = useRef<Record<string, Answers>>({});
  const channelRef = useRef<any>(null);

  gameRef.current = game;
  hostRef.current = isHost;

  const maybeFinishEarly = useCallback(() => {
    // Finish round logic
  }, []);

  const sendStop = useCallback(() => {
    // Send stop logic
  }, []);

  const submitAnswers = useCallback(async (round: number, answers: Answers) => {
    const pid = metaRef.current?.id;
    if (!pid) return;

    const currentLetter = gameRef.current?.letter || '';

    // 1. დავაკოპიროთ პასუხები
    const validatedAnswers: Answers = { ...answers };

    // 2. პარალელურად დაველოდოთ AI-ს ყველა კატეგორიის შემოწმებაზე
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
          console.log(`❌ AI-მ უარყო: "${cleanWord}" (${category}) - ${data.reason}`);
          (validatedAnswers as Record<string, string>)[category] = '';
        }
      } catch (err) {
        console.error('Validation error:', err);
      }
    });

    await Promise.all(validationPromises);

    // 3. მხოლოდ AI-ს შემოწმების დასრულების შემდეგ ვაგზავნით გასუფთავებულ პასუხებს
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

  const teardown = useCallback(() => {}, []);

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  return {
    status,
    error,
    setError,
    code,
    myId,
    isHost,
    presence,
    game,
    offset,
    createRoom: () => {},
    joinRoom: () => {},
    leave: teardown,
    startGame: () => {},
    nextRound: () => {},
    playAgain: () => {},
    sendStop,
    submitAnswers,
  };
}
