// Pochtam AI sinovi — tirik worker bilan. Kalit va serverni talab qiladi,
// shuning uchun CI'da yurmaydi:
//   AI_URL=https://pochtam-metrics.<hisob>.workers.dev/ai node tests/ai.mjs
// AI_URL bo'lmasa o'tkazib yuboriladi (chiqish kodi 0). Har savol uchun
// tests/ai-eval.json dagi mezonlar tekshiriladi va umumiy xulosa chiqadi.
// Asosiy tekshiruv: raqamli javob faqat vosita natijasidan — vositasiz
// "$…" yoki "… so'm" chiqsa xato.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = process.env.AI_URL || '';
const ORIGIN = process.env.AI_ORIGIN || 'https://pochtam.uz';
/* EVAL_TOKEN (= READ_TOKEN): tayyor javob keshi va IP chegarasisiz — har
   savolga haqiqiy javob. Bo'lmasa oddiy foydalanuvchi kabi. */
const EVAL = process.env.EVAL_TOKEN || '';
let usd = 0;
if (!URL_) { console.log('AI_URL berilmagan — AI sinovi o\'tkazib yuborildi.'); process.exit(0); }

const { cases } = JSON.parse(readFileSync(join(ROOT, 'tests', 'ai-eval.json'), 'utf8'));
const only = process.argv.slice(2).join(' ');
let fails = 0, n = 0;
let soft = 0;
const check = (name, ok, info = '', warnOnly = false) => {
  console.log(`${ok ? '  ok  ' : warnOnly ? ' OGOH ' : ' XATO '} ${name}${info ? ' — ' + info : ''}`);
  if (!ok) { if (warnOnly) soft++; else fails++; }
};
const cyr = s => (s.match(/[Ѐ-ӿ]/g) || []).length, lat = s => (s.match(/[A-Za-z]/g) || []).length;

for (const c of cases) {
  if (only && !c.q.includes(only)) continue;
  n++;
  let j, status;
  try {
    const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8', origin: ORIGIN, ...(EVAL ? { 'x-pochtam-eval': EVAL } : {}) },
      body: JSON.stringify({ q: c.q, lang: c.lang === 'ru' ? 'ru' : 'uz', usdRate: 12650,
        ...(c.cart ? { cart: c.cart } : {}), ...(c.url ? { url: c.url } : {}), ...(c.find ? { find: true } : {}) }) });
    status = r.status; j = await r.json();
  } catch (e) { check(c.q, false, 'so\'rov xatosi: ' + e.message); continue; }
  if (status !== 200 || !j || !j.text) { check(c.q, false, `HTTP ${status} ${JSON.stringify(j).slice(0, 120)}`); continue; }
  usd += (j.usage && +j.usage.usd) || 0;
  const text = String(j.text), tools = (j.tools || []).map(t => typeof t === 'string' ? t : t.name);
  const cards = (j.cards || []).map(x => x.type);
  const problems = [];
  if (c.card && !cards.includes(c.card)) problems.push(`karta ${c.card} yo'q (${cards.join(',') || 'kartasiz'})`);
  const want = [].concat(c.tool || []);
  if (want.length && !want.some(t => tools.includes(t))) problems.push(`vosita ${want.join(' yoki ')} chaqirilmadi (${tools.join(',') || 'hech biri'})`);
  if (c.noTool && tools.length) problems.push('vosita chaqirilmasligi kerak edi: ' + tools.join(','));
  if (c.must && !new RegExp(c.must, 'i').test(text)) problems.push(`kutilgan ifoda yo'q: /${c.must}/`);
  if (c.mustNot && new RegExp(c.mustNot, 'i').test(text)) problems.push(`taqiqlangan ifoda bor: /${c.mustNot}/`);
  if (!tools.length && /\$\s?\d|\d[\d\s]{3,}\s?(so'm|сум)/i.test(text)) problems.push('vositasiz raqamli javob');
  if (c.lang === 'ru' && cyr(text) < lat(text)) problems.push('javob ruscha emas');
  if (c.lang === 'uz' && cyr(text) > lat(text)) problems.push('javob o\'zbekcha (lotin) emas');
  if (/[#*]{2,}|^\s*#/m.test(text)) problems.push('markdown belgilari');
  /* Yiqilganda AI javobining o'zi ham chiqadi — sabab (AI xatosimi yoki
     mezon eskirganmi) logdan ko'rinsin. */
  const short = text.replace(/\s+/g, ' ');
  check(c.q, problems.length === 0, problems.length ? problems.join('; ') + ' | javob: ' + short.slice(0, 260) + ` · ${cards.join(',') || 'kartasiz'} · ${tools.join(',') || 'vositasiz'}`
    : short.slice(0, 90) + ` · ${cards.join(',') || 'kartasiz'} · ${j.usage ? j.usage.input + '/' + j.usage.output : ''}`, !!c.soft);
}
console.log((fails ? `\n${fails}/${n} savol o'tmadi.` : `\nAI sinovi o'tdi: ${n} savol.`) + (soft ? ` Ogohlantirish: ${soft} (internetga bog'liq).` : ''));
console.log(`Taxminiy xarajat: $${usd.toFixed(3)} (${n ? '$' + (usd / n).toFixed(4) + ' / savol' : ''})`);
process.exit(fails ? 1 : 0);
