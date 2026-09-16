/* Worker'ning sof qismlari uchun test: beacon tahlili va Durable Object
   sanog'i (SQLite o'rniga xotiradagi soxta storage). `node test.mjs`. */
import worker, { parseBeacon, Counter } from './src/index.js';

let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? '  ok  ' : ' XATO '} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

/* --- parseBeacon --- */
const body = JSON.stringify({ v: 'v1.0.0 · 19.08.2026', l: 'uz', e: [
  { n: 'screen', k: 'stores', t: 1 }, { n: 'screen', k: 'stores', t: 2 }, { n: 'store', k: 'taobao', t: 3 },
  { n: 'hack', k: 'x' }, { n: 'guide', k: 'a'.repeat(100) }, { n: 'svcAsk', k: 'svc-hisob' }, { n: 'courier' }
] });
const rows = parseBeacon(body, '2026-09-09');
const get = (n, k) => (rows.find(r => r.name === n && r.key === k) || {}).n;
check('bir xil hodisa qo\'shiladi', get('screen', 'stores') === 2);
check('do\'kon sanaladi', get('store', 'taobao') === 1);
check('begona hodisa tashlanadi', !rows.some(r => r.name === 'hack'));
check('kalit 40 belgiga qisqaradi', get('guide', 'a'.repeat(40)) === 1);
check('kalitsiz hodisa "-" bo\'ladi', get('courier', '-') === 1);
check('til va versiya sanaladi', get('lang', 'uz') === 1 && get('ver', 'v1.0.0 · 19.08.2026') === 1);
check('hamma qator bugungi kun', rows.every(r => r.day === '2026-09-09'));
check('buzuq JSON — bo\'sh', parseBeacon('{oops', '2026-09-09').length === 0);
check('hodisasiz beacon — bo\'sh', parseBeacon(JSON.stringify({ v: 'x', l: 'ru', e: [] }), '2026-09-09').length === 0);
const many = JSON.stringify({ e: Array.from({ length: 200 }, (_, i) => ({ n: 'screen', k: 'k' + i })) });
check('60 tadan ortiq hodisa olinmaydi', parseBeacon(many, '2026-09-09').filter(r => r.name === 'screen').length === 60);

/* --- Counter (soxta SQLite: faqat shu yerda ishlatiladigan 4 ta so'rov) --- */
function fakeSql() {
  const rowsDb = new Map();
  return { exec(q, ...a) {
    if (q.startsWith('CREATE')) return [];
    if (q.startsWith('INSERT')) { const id = a.slice(0, 3).join('|'); const r = rowsDb.get(id) || { day: a[0], name: a[1], key: a[2], n: 0 }; r.n += a[3]; rowsDb.set(id, r); return []; }
    if (q.startsWith('SELECT')) return [...rowsDb.values()].filter(r => r.day >= a[0]).sort((x, y) => x.day.localeCompare(y.day) || x.name.localeCompare(y.name) || y.n - x.n);
    if (q.startsWith('DELETE')) { for (const [id, r] of rowsDb) if (r.day < a[0]) rowsDb.delete(id); return []; }
    throw new Error('kutilmagan so\'rov: ' + q);
  } };
}
const today = new Date().toISOString().slice(0, 10);
const c = new Counter({ storage: { sql: fakeSql() } }, { ALLOW_ORIGIN: 'https://x' });
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify(parseBeacon(body, today)) }));
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify(parseBeacon(body, today)) }));
await c.fetch(new Request('https://counter/add', { method: 'POST', body: JSON.stringify([{ day: '2020-01-01', name: 'screen', key: 'old', n: 1 }]) }));
const st = await (await c.fetch(new Request('https://counter/stats?days=7'))).json();
check('sanoq jamlanadi', st.byName.screen.stores === 4 && st.byName.store.taobao === 2, JSON.stringify(st.byName.screen));
check('kun bo\'yicha ekran soni', st.byDay[today] === 4);
check('eski kun oynaga kirmaydi', !('old' in (st.byName.screen || {})));
check('kalitlar kamayish tartibida', Object.keys(st.byName.guide)[0] === 'a'.repeat(40));
await c.fetch(new Request('https://counter/purge', { method: 'DELETE' }));
const st2 = await (await c.fetch(new Request('https://counter/stats?days=90'))).json();
check('purge eski qatorni o\'chiradi', !Object.values(st2.byName).some(o => 'old' in o));

/* --- Butun Worker: yo'llar (soxta env, Counter yuqoridagi soxta SQLite bilan) --- */
const env = { ALLOW_ORIGIN: 'https://x', READ_TOKEN: 'sir', PUBLIC_STATS: '0', COUNTER: { idFromName: () => 'main', get: () => ({ fetch: (u, i) => c.fetch(new Request(u, i)) }) } };
const ctx = { waitUntil: p => p };
const hit = (path, init) => worker.fetch(new Request('https://w' + path, init), env, ctx);
check('GET / — ok', (await (await hit('/')).text()) === 'ok');
check('POST / begona Origin — 403', (await hit('/', { method: 'POST', headers: { origin: 'https://boshqa' }, body })).status === 403);
check('POST / o\'z Origin — 204', (await hit('/', { method: 'POST', headers: { origin: 'https://x' }, body })).status === 204);
check('/stats tokensiz — 401', (await hit('/stats')).status === 401);
const env2 = { ...env, ALLOW_ORIGIN: 'https://x, https://pochtam.uz' };
const hit2 = (path, init) => worker.fetch(new Request('https://w' + path, init), env2, ctx);
const r2 = await hit2('/', { method: 'POST', headers: { origin: 'https://pochtam.uz' }, body });
check('bir nechta Origin — ikkinchisi ham qabul', r2.status === 204 && r2.headers.get('access-control-allow-origin') === 'https://pochtam.uz');
check('bir nechta Origin — begona 403', (await hit2('/', { method: 'POST', headers: { origin: 'https://boshqa' }, body })).status === 403);
check('preflight ruxsat etilgan manzilni qaytaradi', (await hit2('/', { method: 'OPTIONS', headers: { origin: 'https://x' } })).headers.get('access-control-allow-origin') === 'https://x');
check('/stats ?token= bilan — 200', (await hit('/stats?token=sir')).status === 200);
const hs = await hit('/hisobot');
const html = await hs.text();
check('/hisobot — HTML sahifa', hs.status === 200 && /text\/html/.test(hs.headers.get('content-type')) && html.includes('<title>Pochtam hisobot</title>'));
check('/hisobot tashqi resurssiz', !/src="http|href="http/.test(html));
check('/hisobot parolni manzilda saqlamaydi', html.includes("history.replaceState(null,'',location.pathname)"));
check('/hisobot yorliqlar to\'liq', ['Do\'konga o\'tish', 'Pullik xizmat', 'Boj hisobini tekshirish', 'Bosh sahifa'].every(t => html.includes(t)));
check('/hisobot indekslanmaydi', hs.headers.get('x-robots-tag') === 'noindex');

/* --- Pochtam AI (/ai): soxta Claude API (env.AI_FETCH), haqiqiy vositalar --- */
const { runTool, buildSystem, TOOLS, parseAiBody } = await import('./src/ai.js');
import '../core/customs.js';
const Core = globalThis.PochtamCore;
const aiEnv = (extra = {}) => ({ ...env, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '3', AI_DAILY_TOTAL: '100', ...extra });
const ask = (q, extra = {}, init = {}) => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': '1.2.3.4', ...(init.headers || {}) }, body: JSON.stringify({ q, lang: 'uz', usdRate: 12650, ...(init.body || {}) }) }), aiEnv(extra), ctx);
const claudeText = text => new Response(JSON.stringify({ model: 'claude-test', stop_reason: 'end_turn', content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });

const noKey = await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x' }, body: JSON.stringify({ q: 'salom' }) }), { ...env, AI_FETCH: () => { throw new Error('chaqirilmasligi kerak'); } }, ctx);
check('/ai kalitsiz — 503 no_key', noKey.status === 503 && (await noKey.json()).code === 'no_key');
const badOrigin = await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://boshqa' }, body: '{"q":"x"}' }), aiEnv({ AI_FETCH: claudeText }), ctx);
check('/ai begona Origin — 403', badOrigin.status === 403);
check('/ai bo\'sh savol — 400', (await ask('   ', { AI_FETCH: () => claudeText('x') })).status === 400);
check('/ai uzun savol — 400', (await ask('a'.repeat(700), { AI_FETCH: () => claudeText('x') })).status === 400);
check('/ai buzuq JSON — 400', (await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x' }, body: '{oops' }), aiEnv({ AI_FETCH: () => claudeText('x') }), ctx)).status === 400);

/* Vosita aylanishi: Claude avval customs_duty so'raydi, keyin matn beradi.
   Ikkinchi so'rovda tool_result ichida core natijasi bo'lishi shart. */
let calls = [];
const fakeClaude = async (url, init) => {
  const body = JSON.parse(init.body); calls.push(body);
  check('Claude so\'rovi: kalit sarlavhada, model va vositalar bor', init.headers['x-api-key'] === 'sk-test' && body.model === 'claude-opus-5' && body.tools.length === TOOLS.length && body.system[0].cache_control.type === 'ephemeral', body.model);
  if (calls.length === 1) return new Response(JSON.stringify({ model: 'claude-test', stop_reason: 'tool_use', usage: { input_tokens: 100, output_tokens: 20 },
    content: [{ type: 'text', text: 'Hisoblayman.' }, { type: 'tool_use', id: 'toolu_1', name: 'customs_duty', input: { goodsUsd: 320, shipUsd: 22.5, kg: 2.5 } }] }), { status: 200 });
  const last = body.messages[body.messages.length - 1];
  const tr = last.content[0];
  const res = JSON.parse(tr.content);
  const expect = Core.customsDuty({ goodsUsd: 320, shipUsd: 22.5, kg: 2.5, norms: Core.normsAt((await import('./src/kb.generated.js')).NORMS, new Date().toISOString().slice(0, 10)), usdRate: 12650 });
  check('vosita natijasi core bilan bir xil (boj $' + expect.dutyUsd.toFixed(2) + ')', tr.type === 'tool_result' && tr.tool_use_id === 'toolu_1' && Math.abs(res.dutyUsd - expect.dutyUsd) < 0.01 && res.feeUzs === Math.round(expect.feeUzs), JSON.stringify(res).slice(0, 120));
  return claudeText('Boj ' + res.dutyUsd + ' dollar, yig\'im ' + res.feeUzs + ' so\'m. Taxminiy.');
};
const a1 = await ask('320 dollarlik 2.5 kg tovar uchun boj qancha?', { AI_FETCH: fakeClaude });
const j1 = await a1.json();
check('/ai vosita bilan javob — 200, matn va vosita ro\'yxati', a1.status === 200 && /Boj 38\.53/.test(j1.text) && j1.tools.length === 1 && j1.tools[0].name === 'customs_duty' && j1.usage.input === 110, JSON.stringify(j1).slice(0, 160));
check('/ai tarixi Claude\'ga o\'tadi (navbat bilan)', calls[0].messages.length === 1 && calls[1].messages.length === 3 && calls[1].messages[1].role === 'assistant');

/* Kunlik chegara: IP uchun 3 ta (yuqoridagi 1 ta sanalgan), 4-si 429. */
const okA = [];
for (let i = 0; i < 3; i++) okA.push((await ask('savol ' + i, { AI_FETCH: () => claudeText('ok') })).status);
check('/ai IP chegarasi: 2 ta o\'tadi, keyingi 429 limit', okA[0] === 200 && okA[1] === 200 && okA[2] === 429, okA.join(','));
const other = await ask('boshqa', { AI_FETCH: () => claudeText('ok') }, { headers: { 'cf-connecting-ip': '9.9.9.9' } });
check('/ai boshqa IP chegaraga tegmaydi', other.status === 200);
const totalHit = await ask('umumiy', { AI_FETCH: () => claudeText('ok'), AI_DAILY_TOTAL: '1' }, { headers: { 'cf-connecting-ip': '8.8.8.8' } });
check('/ai umumiy kunlik chegara — 429 scope total', totalHit.status === 429 && (await totalHit.json()).scope === 'total');

/* Claude API yiqilsa — 503 upstream, ilova buni "vaqtincha mavjud emas" deb ko'rsatadi. */
const down = await ask('x', { AI_FETCH: () => new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 }) }, { headers: { 'cf-connecting-ip': '7.7.7.7' } });
check('/ai Claude 529 — 503 upstream', down.status === 503 && (await down.json()).code === 'upstream');
const badKey = await ask('x', { AI_FETCH: () => new Response(JSON.stringify({ error: { type: 'authentication_error', message: 'bad key' } }), { status: 401 }) }, { headers: { 'cf-connecting-ip': '6.6.6.6' } });
check('/ai kalit noto\'g\'ri — 503 key', badKey.status === 503 && (await badKey.json()).code === 'key');
const netErr = await ask('x', { AI_FETCH: () => { throw new Error('ECONNRESET'); } }, { headers: { 'cf-connecting-ip': '5.5.5.5' } });
check('/ai tarmoq xatosi — 503 upstream', netErr.status === 503);
const refused = await ask('x', { AI_FETCH: () => new Response(JSON.stringify({ model: 'm', stop_reason: 'refusal', content: [] }), { status: 200 }) }, { headers: { 'cf-connecting-ip': '4.4.4.4' } });
check('/ai refusal — rad javobi matni', refused.status === 200 && /javob bera olmayman/.test((await refused.json()).text));

/* /stats: AI sanog'i bor, IP xeshlari yo'q. */
const stA = await (await hit('/stats?token=sir')).json();
check('/stats da AI sanog\'i (ok, limit, err, tool:…) bor', stA.byName.ai && stA.byName.ai.ok >= 3 && stA.byName.ai.limit >= 1 && stA.byName.ai.err >= 2 && stA.byName.ai['tool:customs_duty'] === 1, JSON.stringify(stA.byName.ai));
check('/stats da IP xeshi yo\'q', !('ai_ip' in stA.byName));

/* Vositalar (core orqali) va tizim ko'rsatmasi. */
const tctx = { usdRate: 12650, today: '2026-09-15' };
const cq = runTool('courier_quotes', { country: 'USA', kg: 2, priority: 'cheap' }, tctx);
check('courier_quotes: davlat taxallusi (USA → AQSh), arzonidan', cq.country === 'AQSh' && cq.quotes.length >= 3 && cq.quotes.every((q, i) => i === 0 || q.usd >= cq.quotes[i - 1].usd), JSON.stringify(cq.quotes.slice(0, 2)));
const cqUzs = runTool('courier_quotes', { country: 'Turkiya', kg: 1 }, tctx);
check('courier_quotes: so\'mdagi tariflar kurs bilan dollarga o\'giriladi', cqUzs.quotes.some(q => /so'm|UZS/i.test(q.tariff)) && cqUzs.quotes.every(q => q.usd > 0), JSON.stringify(cqUzs.quotes.map(q => q.courier + ':' + q.usd)));
check('courier_quotes: noma\'lum davlat — xato va ro\'yxat', !!runTool('courier_quotes', { country: 'Mars', kg: 1 }, tctx).error);
const lc = runTool('landed_cost', { priceUsd: 100, country: 'Xitoy', category: 'poyabzal', localPriceUzs: 3000000 }, tctx);
check('landed_cost: vazn kategoriya bo\'yicha, eng arzon kuryer, foydalimi', lc.kgGuessed && lc.kgPerItem === 1.2 && lc.courier && lc.totalUsd > 100 && lc.worth === true, JSON.stringify(lc).slice(0, 140));
const lcCore = Core.landedCost({ priceUsd: 100, qty: 1, kg: 1.2, shipUsd: lc.shipUsd, norms: Core.normsAt((await import('./src/kb.generated.js')).NORMS, '2026-09-15'), usdRate: 12650 });
check('landed_cost jami core bilan bir xil', Math.abs(lcCore.totalUsd - lc.totalUsd) < 0.01);
check('check_banned: rus so\'zi ham topadi (наркотик → taqiqlangan)', runTool('check_banned', { query: 'наркотик' }, tctx).items[0].level === 'taqiqlangan');
check('check_banned: topilmasa "ruxsat degani emas"', /ruxsat degani emas/.test(runTool('check_banned', { query: 'qalam' }, tctx).note));
check('find_store: domen bo\'yicha', runTool('find_store', { query: 'trendyol.com' }, tctx).stores[0].id === 'trendyol');
check('noma\'lum vosita — xato, tashlamaydi', !!runTool('yoq', {}, tctx).error);
const sys = buildSystem();
check('tizim ko\'rsatmasi: qoidalar, me\'yor, kuryer va do\'kon bazasi', /HECH QACHON o'zing/.test(sys) && /"freeUsd":200/.test(sys) && /MYMEEST/.test(sys) && /taobao\.com/.test(sys) && /Giyohvandlik/.test(sys), sys.length + ' belgi');
check('tizim ko\'rsatmasida kalit yo\'q', !/sk-/.test(sys));
check('parseAiBody: rollar navbat bilan, oxirgi assistant', JSON.stringify(parseAiBody(JSON.stringify({ q: 'a', history: [{ role: 'assistant', text: 'x' }, { role: 'user', text: 'u1' }, { role: 'user', text: 'u2' }, { role: 'assistant', text: 'a1' }, { role: 'user', text: 'u3' }] })).history) === JSON.stringify([{ role: 'user', text: 'u1\nu2' }, { role: 'assistant', text: 'a1' }]));

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nWorker testlari o\'tdi.');
process.exit(fails ? 1 : 0);
