// Run: npx tsx scripts/test-engine.ts   (pure game logic, no network)
import assert from 'node:assert/strict';
import { advance, applyResults, applyStop, beginRound, createInitialState } from '../lib/engine';
import { scoreRound } from '../lib/scoring';
import { validateSubmissions } from '../lib/validateRound';
import { EMPTY_ANSWERS } from '../lib/georgian';

const players = [
  { id: 'a', name: 'ნინო', avatar: 0 },
  { id: 'b', name: 'გიორგი', avatar: 1 },
  { id: 'c', name: 'ლევანი', avatar: 2 },
];

(async () => {
  // validation + scoring, letter "თ"
  const subs = {
    a: { ...EMPTY_ANSWERS(), city: 'თბილისი', name: 'თამარი', animal: 'თევზი', object: 'თოკი', river: 'თეთნულდი' },
    b: { ...EMPTY_ANSWERS(), city: 'თბილისი', name: 'თორნიკე', animal: 'ბაყაყი' /* wrong letter */, object: 'თუნგუშა' /* unknown */ },
    c: { ...EMPTY_ANSWERS(), city: 'Tbilisi' /* latin */ },
  };
  let asked = 0;
  const cells = await validateSubmissions('თ', ['a', 'b', 'c'], subs, async (_l, items) => {
    asked = items.length;
    return Object.fromEntries(items.map((i) => [`${i.category}|${i.word}`, i.word === 'თუნგუშა']));
  });
  const { result, roundPoints } = scoreRound(cells);

  assert.equal(asked, 1, 'only the unknown word goes to the fallback');
  assert.equal(result.a.city.points, 5, 'shared city = 5');
  assert.equal(result.b.city.points, 5);
  assert.equal(result.a.name.points, 10, 'unique name = 10');
  assert.equal(result.b.animal.status, 'invalid', 'wrong first letter');
  assert.equal(result.b.object.points, 10, 'AI-approved word scores');
  assert.equal(result.c.city.status, 'invalid', 'latin rejected');
  assert.deepEqual(roundPoints, { a: 5 + 10 + 10 + 10 + 10, b: 5 + 10 + 0 + 10, c: 0 });

  // no verifier available -> accepted but flagged unverified
  const soft = await validateSubmissions('თ', ['a'], { a: { ...EMPTY_ANSWERS(), object: 'თუნგუშა' } }, async () => null);
  assert.equal(soft.a.object.status, 'valid');
  assert.equal(soft.a.object.unverified, true);

  // engine flow: 5 rounds, stop shortens the clock to 5s
  let s = beginRound(createInitialState('a', players), 1_000_000);
  assert.equal(s.endsAt, 1_000_000 + 60_000);
  const stopped = applyStop(s, 'b', 1_020_000)!;
  assert.equal(stopped.endsAt, 1_025_000);
  assert.equal(applyStop(stopped, 'c', 1_021_000), null, 'second stop ignored');
  assert.equal(applyStop(stopped, 'zzz', 1_021_000), null, 'unknown player ignored');
  const lateStop = applyStop(s, 'b', 1_058_000)!;
  assert.equal(lateStop.endsAt, 1_060_000, 'stop never extends the clock');

  for (let r = 1; r <= 5; r++) {
    s = applyResults(s, result, { a: 20, b: 10, c: 0 });
    if (r < 5) { s = advance(s, 2_000_000); assert.equal(s.round, r + 1); }
  }
  s = advance(s, 3_000_000);
  assert.equal(s.phase, 'finished');
  assert.deepEqual(s.winners, ['a']);
  assert.equal(new Set(s.usedLetters).size, s.usedLetters.length, 'letters do not repeat');
  console.log('engine tests passed');
})();
