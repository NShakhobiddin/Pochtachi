// Pochtam AI bilimlar bazasi: manbadagi ro'yxatlar (kuryerlar, do'konlar,
// taqiqlar, xizmatlar, qo'llanmalar), data/*.json va data/ai-rules.md dan
// bitta modul tuziladi — worker/src/kb.generated.js. Worker (Cloudflare)
// shu modulni import qiladi: AI faqat shu yerdagi faktlar bilan ishlaydi,
// hisob-kitob esa core/ orqali. Ilova va AI bir xil manbadan gapiradi.
//
// Ishlatish: node tools/ai-kb.mjs [--check]
//   --check  generatsiya qilingan fayl manbaga mos ekanini tekshiradi.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'Xarid Yordamchisi v2.dc.html';
const OUT = join(ROOT, 'worker', 'src', 'kb.generated.js');

const src = readFileSync(join(ROOT, SOURCE), 'utf8');
/* Manbadagi `const NAME = [ ... ];` literalini o'qiydi. Ro'yxatlar oddiy
   literal (funksiya chaqiruvisiz), shuning uchun Function bilan
   baholanadi; `window`/`document` yo'q muhitda ham ishlashi kerak. */
function grab(name) {
  const m = new RegExp('^const ' + name + ' = ', 'm').exec(src);
  if (!m) throw new Error('Manbada ' + name + ' topilmadi');
  const start = m.index + m[0].length;
  const end = src.indexOf('\n];', start);
  if (end < 0) throw new Error(name + ' ro\'yxati yopilmagan');
  return new Function('window', 'document', 'return ' + src.slice(start, end + 2))(undefined, undefined);
}
const json = f => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined && o[k] !== '' && o[k] !== null).map(k => [k, o[k]]));
const kv = list => (Array.isArray(list) ? list : []).map(x => x.k + ': ' + x.v);

const couriers = grab('COURIERS').map(c => ({
  ...pick(c, ['id', 'name', 'days', 'dnum', 'mode', 'countries', 'tracking', 'trusted', 'note', 'updated']),
  limits: kv(c.limits), svc: kv(c.svc)
}));
const stores = grab('STORES').map(s => pick(s, ['id', 'name', 'domain', 'url', 'country', 'from', 'cat', 'subcats', 'type', 'price',
  'segment', 'original', 'direct', 'complexity', 'tags', 'forWhom', 'returns']));
const banned = grab('BANNED').map(b => pick(b, ['name', 'level', 'syn', 'src', 'note']));
const services = grab('SERVICES').map(s => pick(s, ['icon', 'lane', 'title', 'sub', 'items', 'price']));
const guides = grab('FULL_GUIDES').map(g => pick(g, ['id', 'title', 'tag']));
const norms = json('norms.json').norms;
const tariffs = json('tariffs.json');
const categories = json('categories.json').categories;
const rules = readFileSync(join(ROOT, 'data', 'ai-rules.md'), 'utf8');
const countries = [...new Set(Object.values(tariffs.couriers).flat().map(t => t.c))].sort();

const lit = v => JSON.stringify(v, null, 1).split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
const out = `/* AVTOMATIK FAYL — qo'lda o'zgartirmang. Manba: ${SOURCE}, data/*.json,
   data/ai-rules.md. Yangilash: node tools/ai-kb.mjs (npm run build ichida). */
export const RULES = ${lit(rules)};
export const NORMS = ${lit(norms)};
export const TARIFFS = ${lit(tariffs)};
export const CATEGORIES = ${lit(categories)};
export const COUNTRIES = ${lit(countries)};
export const COURIERS = ${lit(couriers)};
export const STORES = ${lit(stores)};
export const BANNED = ${lit(banned)};
export const SERVICES = ${lit(services)};
export const GUIDES = ${lit(guides)};
`;

if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.error('worker/src/kb.generated.js manbaga mos emas. `node tools/ai-kb.mjs` ni ishlating.'); process.exit(1); }
  console.log('worker/src/kb.generated.js manbaga mos.');
} else {
  writeFileSync(OUT, out);
  console.log(`worker/src/kb.generated.js yozildi (${(out.length / 1024).toFixed(0)} KB): ${couriers.length} kuryer, ${stores.length} do'kon, ${banned.length} taqiq, ${services.length} xizmat, ${guides.length} qo'llanma.`);
}
