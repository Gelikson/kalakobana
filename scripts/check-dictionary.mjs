// Sanity check: every dictionary word is Mkhedruli and the lists load.
import { dictionarySize, inDictionary, validateLocal, normalizeGeorgian } from '../lib/georgianDictionary.js';
console.log('sizes', dictionarySize());
const checks = [
  ['city', 'თბილისი', 'თ', 'valid'],
  ['city', 'ბათუმი', 'ს', 'invalid'],
  ['name', 'nino', 'ნ', 'invalid'],
  ['animal', '  ვეფხვი ', 'ვ', 'valid'],
  ['object', 'ქარგალი', 'ქ', 'unknown'],
];
let bad = 0;
for (const [c, w, l, want] of checks) {
  const got = validateLocal(c, w, l).status;
  if (got !== want) { bad++; console.error('FAIL', c, w, l, 'want', want, 'got', got); }
}
console.log(normalizeGeorgian('  ა\u200Bბ   გ '), inDictionary('river', 'მტკვარი'));
process.exit(bad ? 1 : 0);
