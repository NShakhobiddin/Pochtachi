#!/usr/bin/env node
// Qo'llanmalardagi bir xil JS ni bitta umumiy faylga chiqaradi.
//
// Nima uchun: har bir qo'llanma ichida ~12 KB render kodi (tablar, wizard,
// kalkulyator, lug'at, FAQ, checklist) so'zma-so'z takrorlanardi. 7 ta
// qo'llanmada bu 84 KB ortiqcha trafik va har biri alohida qayta yuklanadi.
// Endi kod `guides/guide-engine.js` da — brauzer uni bir marta oladi va
// keshdan ishlatadi, qo'llanma ichida esa faqat o'z ma'lumoti qoladi.
//
// Skript idempotent: ikkinchi marta ishga tushirilsa hech nimani o'zgartirmaydi.
// Ishlatish: node tools/extract-guide-engine.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'guides', 'inline');
const ENGINE_FILE = join(ROOT, 'guides', 'guide-engine.js');
const ENGINE_TAG = '<script src="../guide-engine.js"></script>';
// Ma'lumot (TABS, STEPS, ...) shu belgidan yuqorida, render kodi — pastida.
const SPLIT = "/* ---------- TABS ---------- */";

const HEADER = `/* Qo'llanmalarning umumiy render kodi.
 *
 * GENERATSIYA QILINGAN: tools/extract-guide-engine.mjs qo'llanmalar ichidagi
 * bir xil koddan chiqargan. Bu yerni tahrirlash mumkin, ammo o'zgarish
 * hamma qo'llanmaga tegishli bo'ladi.
 *
 * Ma'lumot (TABS, STEPS, CALC, BAN, CARGO, WORDS, FAQ, CHECK) har bir
 * qo'llanmaning o'z ichidagi skriptda e'lon qilinadi va shu yerda
 * ishlatiladi — klassik skriptlarda top-level const global leksik
 * doirada bo'lgani uchun bu ishlaydi.
 */
`;

const files = readdirSync(DIR).filter(f => f.endsWith('.html')).sort();
let engine = null;
const pending = [];

for (const file of files) {
  const html = readFileSync(join(DIR, file), 'utf8');
  if (html.includes(ENGINE_TAG)) continue;           // allaqachon ajratilgan
  const at = html.indexOf(SPLIT);
  if (at < 0) { pending.push(file); continue; }      // boshqacha yozilgan (taobao)

  const close = html.indexOf('</script>', at);
  if (close < 0) throw new Error(`${file}: </script> topilmadi`);

  const part = html.slice(at, close).replace(/\s+$/, '') + '\n';
  if (engine === null) engine = part;
  else if (engine !== part) throw new Error(`${file}: kod boshqa qo'llanmalardan farq qiladi`);

  const next = html.slice(0, at).replace(/\s+$/, '\n') + `</script>\n${ENGINE_TAG}\n` + html.slice(close + '</script>'.length).replace(/^\n/, '');
  writeFileSync(join(DIR, file), next);
}

if (engine) {
  writeFileSync(ENGINE_FILE, HEADER + engine);
  console.log(`guides/guide-engine.js yozildi (${(engine.length / 1024).toFixed(1)} KB).`);
} else {
  console.log('Hamma qo\'llanma allaqachon umumiy koddan foydalanadi.');
}
if (pending.length) console.log(`Umumiy kodga o'tmagan: ${pending.join(', ')}`);
