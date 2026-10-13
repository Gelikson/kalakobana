import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Surfaces a clear message in dev instead of an opaque websocket failure.
  console.warn('Supabase env vars missing: copy .env.example to .env.local');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  realtime: { params: { eventsPerSecond: 20 } },
});
