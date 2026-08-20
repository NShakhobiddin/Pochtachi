#!/usr/bin/env node
// Matn shriftlarini Google Fonts'dan bir marta yuklab, loyihaga saqlaydi.
//
// Nima uchun: shriftlar ikkita tashqi hostdan (fonts.googleapis.com ->
// fonts.gstatic.com) ketma-ket olinardi — ikki DNS, ikki TLS va renderni
// kutib turadigan uzun zanjir. Sekin tarmoqda birinchi bo'yoqqacha bo'lgan
// vaqtning katta qismi shunga ketardi. Endi shriftlar o'z domenimizdan
// keladi va service worker ularni qobiq bilan birga keshlaydi.
//
// Ishlatish: node tools/fetch-fonts.mjs
// Natija: fonts/*.woff2 va fonts/text.css

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'fonts');
// woff2 olish uchun zamonaviy brauzer sifatida murojaat qilamiz.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* Kerakli yozuvlar: lotin (asosiy matn), lotin kengaytmasi (o‘zbekcha ʻ va
   qo'shni belgilar), kirill (qidiruv kirillcha ham ishlaydi). Vetnamcha va
   boshqa yozuvlar bu ilovada uchramaydi. */
const KEEP = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];

const FAMILIES = [
  { name: 'Bricolage Grotesque', slug: 'bricolage', query: 'Bricolage+Grotesque:wght@600;700;800' },
  { name: 'Onest', slug: 'onest', query: 'Onest:wght@400;500;600;700;800' }
];

const get = async (url, asText) => {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
};

mkdirSync(OUT, { recursive: true });
const rules = [];
let total = 0;

for (const fam of FAMILIES) {
  const css = await get(`https://fonts.googleapis.com/css2?family=${fam.query}&display=swap`, true);
  // Har bir @font-face oldida yozuv nomi izoh sifatida turadi.
  const faces = [...css.matchAll(/\/\* (\S+) \*\/\s*@font-face \{([\s\S]*?)\}/g)].map(m => ({
    subset: m[1],
    weight: Number((m[2].match(/font-weight: (\d+)/) || [])[1] || 400),
    url: (m[2].match(/url\((https:[^)]+)\)/) || [])[1],
    range: (m[2].match(/unicode-range: ([^;]+);/) || [])[1] || ''
  })).filter(f => KEEP.includes(f.subset) && f.url);

  // Bricolage va Onest — o'zgaruvchan (variable) shriftlar: bir fayl butun
  // og'irliklar oralig'iga xizmat qiladi, shuning uchun bir marta yuklaymiz.
  const bySubset = new Map();
  for (const f of faces) {
    const cur = bySubset.get(f.subset);
    if (!cur) bySubset.set(f.subset, { ...f, min: f.weight, max: f.weight });
    else {
      if (cur.url !== f.url) throw new Error(`${fam.name}/${f.subset}: bir yozuv uchun bir nechta fayl`);
      cur.min = Math.min(cur.min, f.weight);
      cur.max = Math.max(cur.max, f.weight);
    }
  }

  for (const [subset, f] of bySubset) {
    const file = `${fam.slug}-${subset}.woff2`;
    const body = await get(f.url, false);
    writeFileSync(join(OUT, file), body);
    total += body.length;
    console.log(`  ${file.padEnd(28)} ${(body.length / 1024).toFixed(1).padStart(6)} KB`);
    rules.push(
`@font-face {
  font-family: '${fam.name}';
  font-style: normal;
  font-weight: ${f.min === f.max ? f.min : `${f.min} ${f.max}`};
  font-display: swap;
  src: url("${file}") format('woff2');
  unicode-range: ${f.range};
}`);
  }
}

const header = `/* GENERATSIYA QILINGAN: tools/fetch-fonts.mjs. Qo'lda tahrirlamang.
 *
 * Shriftlar o'z domenimizdan beriladi — tashqi hostga ulanish yo'q, service
 * worker ularni qobiq bilan birga keshlaydi. Faqat lotin, lotin kengaytmasi
 * va kirill yozuvlari olinadi; brauzer sahifadagi belgilarga qarab shulardan
 * keraklisini yuklaydi.
 */
`;
writeFileSync(join(OUT, 'text.css'), header + rules.join('\n\n') + '\n');
console.log(`\nfonts/text.css yozildi — ${rules.length} ta yozuv, jami ${(total / 1024).toFixed(0)} KB.`);
