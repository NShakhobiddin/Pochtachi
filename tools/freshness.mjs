#!/usr/bin/env node
// Ma'lumotlar qanchalik yangi: kuryer tariflari, bojxona me'yorlari, kuryer va
// do'kon kartalari qachon tekshirilgan. Natija — Markdown (oylik GitHub
// issue matni, .github/workflows/freshness.yml). Tekshirish qo'lda: kuryer
// sayti, my.gov.uz, lex.uz. Chiqish kodi doim 0 — bu eslatma, sinov emas.
//
//   node tools/freshness.mjs            — Markdown stdout'ga
//   node tools/freshness.mjs --days 45  — "eski" chegarasi (standart 45 kun)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--days');
const LIMIT = i > 0 ? +process.argv[i + 1] || 45 : 45;
const now = new Date();

const parse = d => {
  const s = String(d || '');
  let m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d\d)\.(\d\d)\.(\d{4})$/.exec(s);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};
const age = d => { const t = parse(d); return t ? Math.floor((now - t) / 86400000) : null; };
const mark = n => n == null ? '❔' : n > LIMIT ? '🔴' : n > LIMIT * 0.66 ? '🟡' : '🟢';

const tariffs = JSON.parse(readFileSync(join(ROOT, 'data', 'tariffs.json'), 'utf8'));
const norms = JSON.parse(readFileSync(join(ROOT, 'data', 'norms.json'), 'utf8'));
const html = readFileSync(join(ROOT, 'Xarid Yordamchisi v2.dc.html'), 'utf8');

/* Kuryer va do'kon kartalaridagi "updated" sanalari (ilova manbasidan). */
const line = html.slice(html.indexOf('const COURIERS = ['), html.indexOf('\n', html.indexOf('const COURIERS = [')));
const couriers = [...line.matchAll(/"id":"([a-z0-9]+)","name":"([^"]+)"(?:(?!"id":").)*?"updated":"([^"]*)"/g)].map(m => ({ name: m[2], updated: m[3] }));
const sBlock = html.slice(html.indexOf('const STORES = ['), html.indexOf('\n];', html.indexOf('const STORES = [')));
const unq = t => t.replace(/\\(.)/g, '$1');
const stores = [...sBlock.matchAll(/name:"((?:[^"\\]|\\.)+)"(?:(?!\{ id:").)*?updated:"([^"]*)"/gs)].map(m => ({ name: unq(m[1]), updated: m[2] }));

const rows = [
  ['Kuryer tariflari (data/tariffs.json)', tariffs.updated_at],
  ["Bojxona me'yorlari (data/norms.json)", norms.checked]
];
const out = [];
out.push(`Oylik tekshiruv — ${now.toISOString().slice(0, 10)}. "Eski" chegarasi: ${LIMIT} kun.`, '');
out.push('| Ma\'lumot | Tekshirilgan | Necha kun |', '|---|---|---|');
for (const [k, d] of rows) out.push(`| ${k} | ${d || '—'} | ${mark(age(d))} ${age(d) ?? '—'} |`);

const group = (title, list) => {
  const by = new Map();
  for (const x of list) (by.get(x.updated) || by.set(x.updated, []).get(x.updated)).push(x.name);
  out.push('', `**${title}** (${list.length} ta)`, '');
  for (const [d, names] of [...by].sort((a, b) => (age(b[0]) ?? 0) - (age(a[0]) ?? 0)))
    out.push(`- ${mark(age(d))} ${d || '—'} (${age(d) ?? '?'} kun): ${names.join(', ')}`);
};
group('Kuryer kartalari', couriers);
group("Do'kon kartalari", stores);

out.push('', '**Nima qilish kerak**', '',
  '- [ ] Kuryer saytlarida tarif va muddatni solishtiring → `data/tariffs.json` (`updated_at`) va kuryer kartasidagi `updated`.',
  "- [ ] my.gov.uz / lex.uz: bojsiz me'yor, boj foizi, BHM o'zgarmaganmi → `data/norms.json` (`checked`).",
  "- [ ] Quyidagi havola tekshiruvida ishlamaydigan sayt bo'lsa — kuryer yoki do'kondan to'g'ri manzilni so'rang.",
  '- [ ] O\'zgartirgandan keyin `npm run build` va testlar.');
console.log(out.join('\n'));
