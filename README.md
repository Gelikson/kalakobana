# ქალაქობანა — Kalakobana

Real-time multiplayer Georgian word game for 2–4 players. Next.js (App Router) + Tailwind + Supabase Realtime.
No custom server and no database tables: rooms live in Realtime **Broadcast + Presence** channels.

## Run locally

1. `npm install`
2. Create a free project at https://supabase.com, then copy **Project URL** and **anon public key**
(Project Settings → API) into `.env.local` (see `.env.example`).
3. `npm run dev` and open http://localhost:3000. Open a second tab (or phone on the same network) to join with the 4-letter code.

Realtime needs no SQL. Channels are public by default; if you disabled
*Realtime Settings → Allow public access*, turn it back on.

Optional AI referee for rare words: set `ANTHROPIC\\\_API\\\_KEY` (server-side only). Without it, well-formed words that are
not in the built-in dictionary are accepted and marked "unverified" (?) in the results.

## Deploy (Vercel)

Push to GitHub → import in Vercel → add the same env vars → deploy. Nothing else to provision.

## How it works

|Piece|File|
|-|-|
|Message protocol, host authority, timers|`lib/useRoom.ts`|
|Pure state transitions (rounds, STOP, winners)|`lib/engine.ts`|
|Scoring 10 / 5 / 0|`lib/scoring.ts`|
|Validation pipeline (dictionary → AI fallback)|`lib/validateRound.ts`, `app/api/validate/route.ts`|
|Dictionary + rule checks (letter, Mkhedruli, normalize)|`lib/georgianDictionary.js`|
|Screens|`components/Home.tsx`, `Lobby.tsx`, `Game.tsx`, `Results.tsx`|

* The **host's browser is the referee**. Clients send `stop` and `submit` to the host; the host broadcasts a `state`
snapshot stamped with its clock, and every client derives the countdown from `endsAt` plus a clock offset, so timers stay in sync.
* STOP (enabled at 3+ valid-looking fields) shortens the deadline to `min(endsAt, now + 5s)`.
* Round ends at the deadline; the host waits up to 3 s for late submissions, then validates and scores.

## Tests

* `npm run test:dict` — dictionary sanity check
* `npx tsx scripts/test-engine.ts` — scoring, validation fallback, STOP and 5-round flow

## Known limits (good next steps)

* Host-authoritative: fine for friends, not tamper-proof. If the host leaves, the room closes. For competitive play,
move the engine into a Supabase Edge Function.
* A player who refreshes mid-game cannot rejoin that game (late joins are blocked once the host starts).
* The dictionary is a seed (\~960 words). Extend the strings in `georgianDictionary.js`; the AI fallback covers the rest.

