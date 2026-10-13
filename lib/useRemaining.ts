'use client';
import { useEffect, useState } from 'react';

/** Whole seconds left until the host-clock deadline `endsAt` (offset = hostClock - localClock). */
export function useRemaining(endsAt: number | null, offset: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - (now + offset)) / 1000));
}
