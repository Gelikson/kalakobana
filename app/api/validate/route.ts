import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_ITEMS = 30;
const GEORGIAN = /^[\u10D0-\u10FA]+(?: [\u10D0-\u10FA]+)*$/;
const CATEGORY_HINT: Record<string, string> = {
  city: 'a real city, town, village or country',
  name: 'a real Georgian or international given name',
  animal: 'a real animal or plant (including trees, flowers, crops)',
  object: 'a real physical everyday object / thing',
  river: 'a real river or a mountain peak / mountain',
};

/**
 * AI-assisted fallback for words missing from the built-in dictionary.
 * Body: { letter: "ა", items: [{ category, word }] }
 * Reply: { available: boolean, verdicts?: { "category|word": boolean } }
 * Without ANTHROPIC_API_KEY it answers { available: false } and the game accepts
 * well-formed words as "unverified" instead of failing.
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ available: false });

  let body: { letter?: string; items?: { category: string; word: string }[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const items = (body.items ?? []).slice(0, MAX_ITEMS).filter(
    (i) => typeof i?.word === 'string' && i.word.length <= 40 && GEORGIAN.test(i.word) && i.category in CATEGORY_HINT,
  );
  if (!items.length) return NextResponse.json({ available: true, verdicts: {} });

  const list = items.map((i, n) => `${n + 1}. "${i.word}" — must be ${CATEGORY_HINT[i.category]}`).join('\n');
  const prompt =
    `You are the referee of the Georgian word game Kalakobana. Letter of the round: "${body.letter}".\n` +
    `For each numbered Georgian word decide whether it is a real, correctly spelled Georgian word (nominative form, ` +
    `proper nouns allowed) that fits the stated category. Be fair to rare but real words; reject made-up words.\n\n` +
    `${list}\n\nReply with ONLY a JSON array of booleans, one per item, in order. No prose, no code fences.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return NextResponse.json({ available: false });
    const data = await res.json();
    const text: string = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('');
    const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!Array.isArray(arr)) return NextResponse.json({ available: false });
    const verdicts: Record<string, boolean> = {};
    items.forEach((it, n) => { if (typeof arr[n] === 'boolean') verdicts[`${it.category}|${it.word}`] = arr[n]; });
    return NextResponse.json({ available: true, verdicts });
  } catch {
    return NextResponse.json({ available: false });
  }
}
