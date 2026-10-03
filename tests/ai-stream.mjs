// Oqim (stream) sinovi — tirik worker bilan, bitta vosita chaqiradigan savol.
// Modellarni solishtirishda (workflow compare): birinchi so'z qachon keldi,
// oqimda qancha matn keldi va yakuniy javob matni bo'sh emasmi (Sonnet 5.5
// vositalar orasidagi matnni thinking blokida beradi — matn yo'qolmasin).
//   AI_URL=… EVAL_TOKEN=… EVAL_MODEL=claude-sonnet-5-5 EVAL_THINKING=between_tools node tests/ai-stream.mjs
const URL_ = process.env.AI_URL || '';
if (!URL_) { console.log('AI_URL berilmagan'); process.exit(0); }
const h = { origin: process.env.AI_ORIGIN || 'https://pochtam.uz', 'content-type': 'text/plain' };
if (process.env.EVAL_TOKEN) h['x-pochtam-eval'] = process.env.EVAL_TOKEN;
if (process.env.EVAL_MODEL) h['x-pochtam-model'] = process.env.EVAL_MODEL;
if (process.env.EVAL_THINKING) h['x-pochtam-thinking'] = process.env.EVAL_THINKING;
const t0 = Date.now();
let first = 0, texts = 0, chars = 0, last = null;
try {
  const r = await fetch(URL_, { method: 'POST', headers: h,
    body: JSON.stringify({ q: 'Turkiyadan 2 kg kiyim, 250 dollar. Qaysi kuryer arzon va boj qancha?', lang: 'uz', usdRate: 12650, stream: true }) });
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!l) continue;
      const e = JSON.parse(l);
      if (e.t === 'text') { texts++; chars += (e.d || '').length; if (!first) first = Date.now(); }
      last = e;
    }
  }
} catch (e) { console.log('OQIM xato ' + e.message); process.exit(1); }
const s = x => ((x - t0) / 1000).toFixed(1) + 's';
const fin = last && last.t === 'done' ? last : null;
console.log('OQIM ' + (fin && fin.text ? 'ok' : 'xato') + ' birinchi_soz=' + (first ? s(first) : '-') + ' jami=' + s(Date.now()) + ' bolaklar=' + texts
  + ' oqim_belgi=' + chars + ' yakuniy_belgi=' + (fin ? fin.text.length : 0) + ' vositalar=' + (fin ? (fin.tools || []).map(x => x.name || x).join(',') : '-')
  + ' $=' + (fin && fin.usage ? (+fin.usage.usd || 0).toFixed(4) : '?'));
process.exit(fin && fin.text ? 0 : 1);
