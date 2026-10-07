#!/usr/bin/env node
// Gemini diagnostikasi (workflow'da): namuna skrinshotni (media/shot-sample.webp)
// Worker'ning aynan o'sha so'rovi bilan (shotBody → toGemini) har bir modelga
// yuboradi va natijani chiqaradi: status, vaqt, to'xtash sababi, o'qilgan
// narx/valyuta yoki Google xato matni. Kalit faqat muhitdan (GEMINI_API_KEY),
// hech qayerga chiqmaydi.
//
// Ishlatish: GEMINI_API_KEY=… node worker/gemini-probe.mjs gemini-3.6-flash,gemini-flash-latest

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import '../core/customs.js';
import '../core/tariffs.js';
import '../core/landed.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { shotBody } = await import('./src/ai.js');
const { toGemini, fromGemini, GEMINI_URL } = await import('./src/gemini.js');

const key = String(process.env.GEMINI_API_KEY || '').trim();
const models = String(process.argv[2] || '').split(',').map(x => x.trim()).filter(Boolean);
if (!key || !models.length) { console.log('kalit yoki model yo\'q'); process.exit(0); }
const img = readFileSync(join(ROOT, 'media', 'shot-sample.webp')).toString('base64');
const env = { GEMINI_API_KEY: key, GEMINI_SHOT_THINKING: process.env.GEMINI_SHOT_THINKING };
const body = toGemini({ ...shotBody(img, 'image/webp', env), output_config: { format: { type: 'json_schema', schema: (await import('./src/ai.js')).SHOT_SCHEMA_EXPORT } } }, env);

for (const m of models) {
  const t0 = Date.now();
  let line = '';
  try {
    const res = await fetch(GEMINI_URL + m + ':generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const j = await res.json().catch(() => null);
    const s = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
    if (!res.ok) {
      const e = (Array.isArray(j) ? j[0] : j || {}).error || {};
      line = `${m}: ${res.status} ${s} — ${e.status || ''}: ${String(e.message || '').slice(0, 220)}`;
    } else {
      const msg = fromGemini(j, m);
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
      let out = null; try { out = JSON.parse(text); } catch (e) { out = null; }
      const u = (j && j.usageMetadata) || {};
      line = `${m}: 200 ${s} — stop=${msg.stop_reason} ` + (out ? `narx=${out.price} ${out.currency} nom="${String(out.name || '').slice(0, 40)}" kind=${out.kind}` : `JSON emas: ${text.slice(0, 120)}`)
        + ` | tokenlar kirish=${u.promptTokenCount || 0} chiqish=${u.candidatesTokenCount || 0} fikr=${u.thoughtsTokenCount || 0}`;
    }
  } catch (e) {
    line = `${m}: xato ${((Date.now() - t0) / 1000).toFixed(1)} s — ${e && e.message || e}`;
  }
  console.log(line);
}
