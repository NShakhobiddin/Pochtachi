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
check('HEAD / — 200 (havola tekshiruvchisi uchun)', (await hit('/', { method: 'HEAD' })).status === 200);
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
const { runTool, buildSystem, TOOLS, parseAiBody, buildCards, mergeCart, toolAsk, parseCart, parseUrl, plainText, orderRules, costUsd } = await import('./src/ai.js');
check('plainText: markdown belgilari olib tashlanadi, raqamli qadamlar qoladi', plainText('**Nike.com** — rasmiy.\n## Sarlavha\n- birinchi\n1. Qadam *muhim* `kod`') === 'Nike.com — rasmiy.\nSarlavha\n— birinchi\n1. Qadam muhim kod', JSON.stringify(plainText('**Nike.com** — rasmiy.\n## Sarlavha\n- birinchi\n1. Qadam *muhim* `kod`')));
import '../core/customs.js';
const Core = globalThis.PochtamCore;
const aiEnv = (extra = {}) => ({ ...env, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '3', AI_DAILY_TOTAL: '100', ...extra });
const ask = (q, extra = {}, init = {}) => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': '1.2.3.4', ...(init.headers || {}) }, body: JSON.stringify({ q, lang: 'uz', usdRate: 12650, ...(init.body || {}) }) }), aiEnv(extra), ctx);
const claudeText = text => new Response(JSON.stringify({ model: 'claude-test', stop_reason: 'end_turn', content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });

/* /ai/status: kalitsiz false, kalit bilan true; keshlanadi, Origin qaytariladi. */
const stOff = await hit('/ai/status', { headers: { origin: 'https://x' } });
const stOn = await worker.fetch(new Request('https://w/ai/status', { headers: { origin: 'https://x' } }), aiEnv(), ctx);
check('/ai/status kalitsiz — ai:false, 5 daqiqa kesh', stOff.status === 200 && (await stOff.json()).ai === false && /max-age=300/.test(stOff.headers.get('cache-control') || '') && stOff.headers.get('Access-Control-Allow-Origin') === 'https://x');
check('/ai/status kalit bilan — ai:true', stOn.status === 200 && (await stOn.json()).ai === true);
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
  check('Claude so\'rovi: kalit sarlavhada, model va vositalar bor', init.headers['x-api-key'] === 'sk-test' && body.model === 'claude-sonnet-5' && body.tools.length === TOOLS.length && !body.tools.some(t => t.type === 'web_search_20260209') && body.system[0].cache_control.type === 'ephemeral', body.model);
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
check('/ai vosita bilan javob — 200, matn, vosita nomi va boj kartasi (kirish bilan)', a1.status === 200 && /Boj 38\.53/.test(j1.text) && j1.tools.join() === 'customs_duty' && j1.cards.length === 1 && j1.cards[0].type === 'duty' && j1.cards[0].got.goodsUsd === 320 && j1.cards[0].duty.dutyUsd > 0 && j1.usage.input === 110, JSON.stringify(j1).slice(0, 200));
/* Vositalarda kesh nuqtasi: statik ro'yxatning oxirgisida, server vositalari undan keyin. */
check('vositalar: oxirgi statik vositada cache_control, tizim blokida ham', calls[0].tools[calls[0].tools.length - 1].cache_control && calls[0].tools[calls[0].tools.length - 1].cache_control.type === 'ephemeral' && calls[0].system[0].cache_control && calls[0].system[0].cache_control.type === 'ephemeral');
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
const md = await ask('x', { AI_FETCH: () => claudeText('**Boj yo\'q.** Me\'yor ichida.') }, { headers: { 'cf-connecting-ip': '4.4.4.5' } });
check('/ai javobida markdown yo\'q (kodda qo\'riqlov)', (await md.json()).text === 'Boj yo\'q. Me\'yor ichida.');

/* "Qayerdan topaman" (find:true): veb-qidiruv vositasi qo'shiladi (max 2),
   server qidiruvlari sanaladi, pause_turn davom ettiriladi, product_links
   tekshirilib ilovaga uzatiladi. */
{
  const fcalls = [];
  const fakeFind = async (url, init) => {
    const body = JSON.parse(init.body); fcalls.push(body);
    if (fcalls.length === 1) return new Response(JSON.stringify({ model: 'claude-test', stop_reason: 'pause_turn', usage: { input_tokens: 50, output_tokens: 5, server_tool_use: { web_search_requests: 1 } },
      content: [{ type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'Nike Air Max 90 size 41 site:amazon.com' } }, { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [] }] }), { status: 200 });
    if (fcalls.length === 2) return new Response(JSON.stringify({ model: 'claude-test', stop_reason: 'tool_use', usage: { input_tokens: 60, output_tokens: 30, server_tool_use: { web_search_requests: 1 } },
      content: [{ type: 'text', text: 'Topdim.' }, { type: 'tool_use', id: 'toolu_l', name: 'product_links', input: { links: [
        { title: 'Nike Air Max 90 Men', url: 'https://www.amazon.com/dp/B0EXAMPLE', store: 'Amazon', price: 119.99, currency: 'USD' },
        { title: 'takror', url: 'https://www.amazon.com/dp/B0EXAMPLE?tag=x', store: 'Amazon' },
        { title: 'xavfli', url: 'javascript:alert(1)', store: 'x' },
        { title: 'http', url: 'http://example.com/p', store: 'x' },
        { title: 'Air Max 90', url: 'https://www.nike.com/t/air-max-90-abc', store: 'Nike', price: 130, currency: 'USD' }
      ] } }] }), { status: 200 });
    return claudeText('Amazon va Nike da aniq sahifalar topildi.');
  };
  const fr = await ask('Poyabzal qidiryapman. Qaysi do\'kondan topaman?', { AI_FETCH: fakeFind }, { headers: { 'cf-connecting-ip': '3.3.3.3' }, body: { find: true } });
  const fj = await fr.json();
  const ws = fcalls[0].tools.find(t => t.type === 'web_search_20260209');
  check('find: web_search vositasi qo\'shiladi (max_uses 1 — tejash) va ko\'rsatma', !!ws && ws.max_uses === 1 && fcalls[0].system.some(b => /web_search/.test(b.text)), JSON.stringify(ws));
  const pl = fj.cards.find(c => c.type === 'links');
  check('find: pause_turn davom ettiriladi, links kartasida 2 ta toza havola, vosita nomi', fr.status === 200 && fcalls.length === 3 && fj.tools.join() === 'product_links' && !!pl && pl.links.length === 2 && pl.links.every(l => /^https:\/\//.test(l.url)) && pl.links[0].host === 'amazon.com' && !fj.cards.some(c => c.type === 'cart'), JSON.stringify(fj.cards).slice(0, 200));
  check('find: web_search statik vositalardan KEYIN (statik prefiks keshda qoladi)', fcalls[0].tools.findIndex(t => t.type === 'web_search_20260209') === fcalls[0].tools.length - 1);
  check('find: server qidiruvlari sanaladi (2)', fj.usage.search === 2, JSON.stringify(fj.usage));
  const off = [];
  await ask('x', { AI_FETCH: async (u, i) => { off.push(JSON.parse(i.body)); return claudeText('ok'); }, AI_WEB_SEARCH: '0' }, { headers: { 'cf-connecting-ip': '3.3.3.4' }, body: { find: true } });
  check('AI_WEB_SEARCH=0 — find so\'rovida ham veb-qidiruv yo\'q', off.length === 1 && !off[0].tools.some(t => t.type === 'web_search_20260209'));
  const tl = runTool('product_links', { links: [{ title: 't', url: 'https://x.com/a' }] }, { usdRate: 12650, today: '2026-09-18' });
  check('product_links: minimal kirish — host do\'kon nomi bo\'ladi', tl.ok && tl.links[0].store === 'x.com' && tl.links[0].price === 0);
}

/* Yagona kirish: matn, rasm, havola va joriy xarid bitta so'rovda. */
{
  check('parseAiBody: bo\'sh so\'rov rad etiladi', parseAiBody(JSON.stringify({ lang: 'uz' })) === 'savol bo\'sh');
  const onlyImg = parseAiBody(JSON.stringify({ image: 'data:image/png;base64,iVBORw0KGgo=', lang: 'uz' }));
  check('parseAiBody: faqat rasm ham yetadi', typeof onlyImg === 'object' && onlyImg.q === '' && onlyImg.shot.mime === 'image/png');
  const onlyUrl = parseAiBody(JSON.stringify({ url: 'https://www.amazon.com/dp/B0X', lang: 'uz' }));
  check('parseAiBody: faqat havola ham yetadi', typeof onlyUrl === 'object' && onlyUrl.url === 'https://www.amazon.com/dp/B0X');
  check('parseUrl: faqat http(s)', parseUrl('javascript:alert(1)') === '' && parseUrl('https://x.com/a') === 'https://x.com/a');
  const c = parseCart({ name: 'Nike Air Max', price: '699', cur: 'cny', kg: 99, qty: 0, junk: 'x' });
  check('parseCart: tozalanadi (vazn 50 kg gacha, valyuta katta harf, miqdor ≥1)', c.name === 'Nike Air Max' && c.price === 699 && c.cur === 'CNY' && c.kg === 50 && c.qty === 1 && !('junk' in c), JSON.stringify(c));
  check('parseCart: bo\'sh — null', parseCart({}) === null && parseCart(null) === null);
  const merged = mergeCart({ name: 'eski', country: 'AQSh', courier: 'D2D', price: 0, kg: 0, qty: 1, totalUsd: 50 },
    { found: true, name: 'Nike Air Max 90', store: 'Taobao', country: 'Xitoy', category: 'poyabzal', currency: 'CNY', price: 699, qty: 1, weightKg: 0.8 });
  check('mergeCart: skrinshot joriy xaridni to\'ldiradi, kuryer saqlanadi, jami tozalanadi', merged.name === 'Nike Air Max 90' && merged.country === 'Xitoy' && merged.courier === 'D2D' && merged.price === 699 && merged.kg === 0.8 && merged.totalUsd === 0, JSON.stringify(merged));
  const ask = toolAsk({ question: 'Qaysi davlatdan olib kelamiz?', options: ['Xitoy', 'AQSh', ''] });
  check('ask_user: savol va variantlar tozalanadi', ask.ok && ask.options.length === 2, JSON.stringify(ask));
  check('ask_user: bitta variant — xato', !!toolAsk({ question: 'x', options: ['bitta'] }).error);
  const cc = { usdRate: 12650, today: new Date().toISOString().slice(0, 10) };
  const cards = buildCards({ shot: { found: true, name: 'Nike' }, cart: { name: 'Nike', price: 699 }, used: [
    { name: 'ask_user', result: ask },
    { name: 'suggest_stores', input: { category: 'poyabzal' }, result: runTool('suggest_stores', { category: 'poyabzal', query: 'sneakers' }, cc) },
    { name: 'check_banned', result: runTool('check_banned', { query: 'dron' }, cc) },
    { name: 'courier_quotes', result: runTool('courier_quotes', { country: 'Xitoy', kg: 2 }, cc) },
    { name: 'landed_cost', input: { priceUsd: 320, country: 'Xitoy', kg: 2.5 }, result: runTool('landed_cost', { priceUsd: 320, country: 'Xitoy', kg: 2.5 }, cc) },
    { name: 'find_store', result: runTool('find_store', { query: 'taobao' }, cc) },
    { name: 'customs_duty', result: { error: 'x' } }
  ] });
  check('buildCards: har vosita o\'z kartasiga, xato vosita kartasiz', cards.map(x => x.type).join(',') === 'product,ask,stores,warning,couriers,total,store,cart', cards.map(x => x.type).join(','));
  check('buildCards: kartada ilovaga kerak hamma narsa — kirish (got), davlat, vazn, do\'kon id', cards.find(x => x.type === 'total').got.priceUsd === 320 && cards.find(x => x.type === 'couriers').kg === 2 && cards.find(x => x.type === 'store').id === 'taobao' && !!cards.find(x => x.type === 'stores').got.category);
  check('suggest_stores: o\'lcham eslatmasi faqat poyabzal/kiyimda, keyingi qadam skrinshot (JIT ko\'rsatma)', /41 = US 8 = 26 sm/.test(runTool('suggest_stores', { category: 'poyabzal', query: 'x' }, cc).sizeNote) && runTool('suggest_stores', { category: 'elektronika', query: 'x' }, cc).sizeNote === '' && /skrinshot/i.test(runTool('suggest_stores', { category: 'elektronika', query: 'x' }, cc).next));
}

/* Faqat rasm yuborilsa asosiy model umuman chaqirilmaydi (arzon yo'l). */
{
  const seen = [];
  const fake = async (url, init) => { const b = JSON.parse(init.body); seen.push(b.model); 
    return new Response(JSON.stringify({ model: b.model, stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 40 },
      content: [{ type: 'text', text: JSON.stringify({ name: 'Nike Air Max 90', price: 699, currency: 'CNY', qty: 1, store: 'Taobao', category: 'poyabzal', country: 'Xitoy', weightKg: 0.8, confidence: 0.9 }) }] }), { status: 200 }); };
  const r = await ask('', { AI_FETCH: fake }, { headers: { 'cf-connecting-ip': '2.2.2.9' }, body: { image: 'data:image/png;base64,iVBORw0KGgo=' } });
  const j = await r.json();
  check('faqat rasm: bitta arzon chaqiruv, asosiy model chaqirilmaydi', r.status === 200 && seen.length === 1 && seen[0] === 'claude-haiku-4-5' && j.stop === 'shot' && j.text === '', seen.join(',') + ' · ' + j.stop);
  check('faqat rasm: mahsulot kartasi va joriy xarid qaytadi', j.cards.map(c => c.type).join(',') === 'product,cart' && j.cart.name === 'Nike Air Max 90' && j.cart.cur === 'CNY' && j.cart.kg === 0.8, JSON.stringify(j.cart));
  /* Rasm + savol: rasm arzon modelda, savol asosiy modelda; xarid holati ko'rsatmada. */
  const seen2 = [];
  const fake2 = async (url, init) => { const b = JSON.parse(init.body); seen2.push(b);
    if (b.model === 'claude-haiku-4-5') return new Response(JSON.stringify({ model: b.model, stop_reason: 'end_turn', usage: {},
      content: [{ type: 'text', text: JSON.stringify({ name: 'Nike Air Max 90', price: 699, currency: 'CNY', qty: 1, store: 'Taobao', category: 'poyabzal', country: 'Xitoy', weightKg: 0.8, confidence: 0.9 }) }] }), { status: 200 });
    return claudeText('Taobao dan buyurtma tartibi shunday.'); };
  const r2 = await ask('Buni qanday buyurtma qilaman?', { AI_FETCH: fake2 }, { headers: { 'cf-connecting-ip': '2.2.2.10' }, body: { image: 'data:image/png;base64,iVBORw0KGgo=' } });
  const j2 = await r2.json();
  const sys = (seen2[1].system || []).map(b => b.text).join(' ');
  check('rasm + savol: rasm arzon modelda, savol asosiyda, xarid holati ko\'rsatmada', r2.status === 200 && seen2.length === 2 && seen2[0].model === 'claude-haiku-4-5' && seen2[1].model === 'claude-sonnet-5' && /Joriy xarid/.test(sys) && /Nike Air Max 90/.test(sys) && /699 CNY/.test(sys), sys.slice(-200));
  check('rasm + savol: rasm asosiy modelga ko\'rsatilmaydi', !JSON.stringify(seen2[1].messages).includes('image'));
  /* Havola: web_fetch faqat o'sha domenga ruxsat bilan qo'shiladi. */
  const seen3 = [];
  const r3 = await ask('Bu qancha turadi?', { AI_FETCH: async (u, i) => { seen3.push(JSON.parse(i.body)); return claudeText('ok'); } },
    { headers: { 'cf-connecting-ip': '2.2.2.11' }, body: { url: 'https://www.amazon.com/dp/B0X' } });
  const wf = (seen3[0].tools || []).find(t => t.type === 'web_fetch_20260209');
  check('havola: web_fetch qo\'shiladi va faqat o\'sha domenga', r3.status === 200 && !!wf && wf.allowed_domains.join() === 'amazon.com' && /amazon\.com\/dp\/B0X/.test(JSON.stringify(seen3[0].messages)), JSON.stringify(wf));
}

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
check('tizim ko\'rsatmasi: qoidalar, me\'yor, kuryer va do\'kon nomlari', /HECH QACHON o'zing/.test(sys) && /"freeUsd":200/.test(sys) && /MYMEEST/.test(sys) && /Xitoy: Taobao, /.test(sys) && /Tezkor savol/.test(sys), sys.length + ' belgi');
/* Xarajat: JSON indekslar promptda yo'q (har so'rovda ketardi) — taqiq,
   kategoriya, qo'llanma, davlatlar vositalardan keladi. */
check('tizim ko\'rsatmasida JSON indeks yo\'q (taqiq, kategoriya, qo\'llanma)', !/Giyohvandlik/.test(sys) && !/"kgPerItem"/.test(sys) && !/\[\{"name":/.test(sys) && !/"id":"taobao"/.test(sys));
check('tizim ko\'rsatmasida kalit yo\'q', !/sk-/.test(sys));
/* Indeks: og'ir matn maydonlari promptga tushmaydi — ular vositalardan
   keladi (find_store, check_banned, courier_quotes). Bu tekshiruv
   maydon qaytib qo'shilib qolishidan saqlaydi. */
check('tizim ko\'rsatmasi indeks: og\'ir maydonlar promptda yo\'q',
  !/"returns":/.test(sys) && !/"complexity":/.test(sys) && !/"limits":/.test(sys) && !/"domain":/.test(sys) && !/"note":/.test(sys));
/* 24 000: qoidalar qisqartirildi (takror va ziddiyatlar olib tashlandi,
   o'lcham jadvali va veb-qidiruv ko'rsatmasi vositaga/dinamik blokka
   ko'chdi) — 26 700 dan 22 600 ga. Oshirishdan oldin: buni vosita bera oladimi? */
/* 13 000: JSON indekslar nomlar ro'yxatiga, buyurtma bo'limi JIT blokka
   ko'chdi — 23 700 dan ~11 400 ga (kesh yozish ham, o'qish ham arzonlashdi). */
check('tizim ko\'rsatmasi byudjeti: 13 000 belgidan kichik', sys.length < 13000, sys.length + ' belgi');
check('buyurtma bo\'limi asosiy ko\'rsatmada yo\'q (faqat mavzuga)', !/## Qanday buyurtma qilaman/.test(sys) && /## Ilova funksiyalari/.test(sys));
check('orderRules: buyurtma savoli va davomi — bor; boshqa savol — yo\'q',
  /## Qanday buyurtma qilaman/.test(orderRules('Qanday buyurtma qilaman?', [])) && /Buy for me/.test(orderRules('Как заказать?', [])) &&
  !!orderRules('3-qadamni tushuntiring', [{ role: 'user', text: 'Men Taobao dan buyurtma qilmoqchiman' }]) && orderRules('krossovka qancha tushadi', []) === '');
check('landed_cost: kategoriya ogohlantirishi natijada (promptdan ko\'chdi)', /Litiy batareya/.test(runTool('landed_cost', { priceUsd: 100, country: 'Xitoy', category: 'elektronika' }, tctx).caution || ''));
check('landed_cost: kategoriya id lari vosita tavsifida', /elektronika/.test(TOOLS.find(t => t.name === 'landed_cost').input_schema.properties.category.description));
/* Narx: Sonnet $2/$10, Haiku $1/$5; keshdan o'qish 0,1×, yozish 1,25×; qidiruv $0.01. */
check('costUsd: Sonnet — 1000 kirish + 10 000 keshdan + 100 chiqish = $0.005', Math.abs(costUsd('claude-sonnet-5', { input_tokens: 1000, cache_read_input_tokens: 10000, output_tokens: 100 }) - 0.005) < 1e-9);
check('costUsd: Haiku yarim narx, keshga yozish 1,25×, qidiruv $0.01', Math.abs(costUsd('claude-haiku-4-5-20251001', { cache_creation_input_tokens: 8000 }) - 0.01) < 1e-9 && Math.abs(costUsd('x', { server_tool_use: { web_search_requests: 2 } }) - 0.02) < 1e-9);
check('tizim ko\'rsatmasi keshlanadi (bir kunda bir marta tuziladi)', buildSystem() === sys);
{ const buyLine = (sys.match(/"Buy for me"[^\n]*/) || [''])[0];
  check('"Buy for me" ro\'yxati — haqi bilan, xizmati yo\'q kuryer yo\'q', /BOXETTE \(Mavjud, 10% \(min \$5\)\)/.test(buyLine) && !/D2D/.test(buyLine), buyLine.slice(0, 160)); }
check('qoidalarda o\'lcham jadvali va web_search tafsiloti yo\'q (JIT)', !/EU 40 = US 7/.test(sys) && !/Amazon, AliExpress, eBay/.test(sys));
/* Kesilgan maydonlar vositalarda bor — indeks ularni yo'qotmadi. */
const tDet = runTool('find_store', { query: 'taobao' }, tctx).stores[0];
check('find_store tafsilotni beradi (qaytarish, murakkablik, domen)', !!tDet.returns && !!tDet.complexity && tDet.domain === 'taobao.com');
check('check_banned manba va izohni beradi', !!runTool('check_banned', { query: 'qurol' }, tctx).items[0].src);
check('parseAiBody: rollar navbat bilan, oxirgi assistant', JSON.stringify(parseAiBody(JSON.stringify({ q: 'a', history: [{ role: 'assistant', text: 'x' }, { role: 'user', text: 'u1' }, { role: 'user', text: 'u2' }, { role: 'assistant', text: 'a1' }, { role: 'user', text: 'u3' }] })).history) === JSON.stringify([{ role: 'user', text: 'u1\nu2' }, { role: 'assistant', text: 'a1' }]));

/* --- Skrinshot (/ai ga rasm) va do'kon tavsiyasi (suggest_stores) --- */
const { parseImage, normalizeShot, searchUrl } = await import('./src/ai.js');
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const shot = (body, extra = {}, ip = '3.3.3.3') => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': ip }, body: JSON.stringify(body) }), aiEnv(extra), ctx);
check('parseImage: data URL dan mime va base64', (() => { const p = parseImage({ image: 'data:image/png;base64,' + PNG1 }); return typeof p === 'object' && p.mime === 'image/png' && p.image === PNG1; })());
check('parseImage: rasmsiz — null', parseImage({ lang: 'uz' }) === null);
check('parseImage: begona tur — xato', typeof parseImage({ image: PNG1, mime: 'image/gif' }) === 'string');
check('/ai/shot manzili yo\'q — 404 (yagona manzil /ai)', (await worker.fetch(new Request('https://w/ai/shot', { method: 'POST', headers: { origin: 'https://x' }, body: '{}' }), aiEnv(), ctx)).status === 404);
const n1 = normalizeShot({ name: ' Nike Air Max 90 ', price: '129.99', currency: 'usd', qty: 0, store: 'Amazon', category: 'Poyabzal', country: 'USA', weightKg: 0.9, confidence: 0.9 }, 12650);
check('normalizeShot: USD narx, nom, miqdor 1', n1.found && n1.priceUsd === 129.99 && n1.name === 'Nike Air Max 90' && n1.qty === 1 && !n1.fxApprox, JSON.stringify(n1));
/* Natija kartasi uchun maydonlar: kategoriya faqat bazadagi id, davlat taxallusdan (USA → AQSh), vazn chegaralangan. */
check('normalizeShot: kategoriya, davlat (taxallus), vazn', n1.category === 'poyabzal' && n1.country === 'AQSh' && n1.weightKg === 0.9, JSON.stringify([n1.category, n1.country, n1.weightKg]));
const n0 = normalizeShot({ price: 5, currency: 'USD', category: 'mebel', country: 'Marsdan', weightKg: 900 }, 12650);
check('normalizeShot: noma\'lum kategoriya/davlat bo\'sh, vazn 50 kg dan oshmaydi', n0.category === '' && n0.country === '' && n0.weightKg === 50, JSON.stringify([n0.category, n0.country, n0.weightKg]));
const n2 = normalizeShot({ name: 'Kurtka', price: 699, currency: 'CNY', qty: 2, store: 'Taobao', confidence: 0.7 }, 12650);
check('normalizeShot: CNY → USD taxminiy kurs bilan, belgi', n2.found && n2.priceUsd > 80 && n2.priceUsd < 110 && n2.fxApprox && n2.qty === 2, JSON.stringify(n2));
check('normalizeShot: narx yo\'q — found=false', !normalizeShot({ price: 0, currency: '' }, 12650).found);
check('shot: kalitsiz 503', (await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x' }, body: JSON.stringify({ image: PNG1, mime: 'image/png' }) }), { ...env }, ctx)).status === 503);
check('shot: rasm ham, savol ham yo\'q — 400', (await shot({ lang: 'uz' }, { AI_FETCH: () => claudeText('{}') })).status === 400);
let shotReq = null;
const fakeShot = async (url, init) => {
  shotReq = JSON.parse(init.body);
  return new Response(JSON.stringify({ model: 'claude-haiku-4-5', stop_reason: 'end_turn', usage: { input_tokens: 1500, output_tokens: 60 },
    content: [{ type: 'text', text: JSON.stringify({ name: 'Nike Air Max 90', price: 129.99, currency: 'USD', qty: 1, store: 'Amazon', category: 'poyabzal', country: 'AQSh', weightKg: 0, confidence: 0.92 }) }] }), { status: 200 });
};
const sr = await shot({ image: 'data:image/png;base64,' + PNG1, lang: 'uz', usdRate: 12650 }, { AI_FETCH: fakeShot });
const sj = await sr.json();
check('shot: rasm Claude\'ga base64 blok bilan, JSON sxema so\'raladi, arzon model, vositasiz', shotReq && shotReq.model === 'claude-haiku-4-5' && shotReq.messages[0].content[0].type === 'image' && shotReq.messages[0].content[0].source.data === PNG1 && shotReq.output_config && shotReq.output_config.format.type === 'json_schema' && !shotReq.tools, JSON.stringify(shotReq).slice(0, 120));
check('shot: javob — shot (nom, narx, USD, ishonch), mahsulot kartasi, stop shot', sr.status === 200 && sj.stop === 'shot' && sj.shot.found && sj.shot.name === 'Nike Air Max 90' && sj.shot.priceUsd === 129.99 && sj.shot.confidence === 0.92 && sj.usage.input === 1500 && sj.cards[0].type === 'product', JSON.stringify(sj).slice(0, 160));
check('shot: sxemada kategoriya, davlat, vazn so\'raladi va javobda keladi', shotReq.output_config.format.schema.required.includes('category') && shotReq.output_config.format.schema.required.includes('country') && shotReq.output_config.format.schema.required.includes('weightKg') && sj.shot.category === 'poyabzal' && sj.shot.country === 'AQSh' && sj.shot.weightKg === 0, JSON.stringify([sj.shot.category, sj.shot.country, sj.shot.weightKg]));
/* Tuzilgan chiqish 400 bersa — oddiy so'rov, matn ichidan JSON. */
let calls2 = 0;
const fallbackShot = async (url, init) => { calls2++; const b = JSON.parse(init.body); if (b.output_config) return new Response(JSON.stringify({ error: { type: 'invalid_request_error', message: 'output_config.format is not supported' } }), { status: 400 });
  return new Response(JSON.stringify({ model: 'm', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Mana: {"name":"Kurtka","price":699,"currency":"CNY","qty":1,"store":"Taobao","confidence":0.6} tayyor' }] }), { status: 200 }); };
const sr2 = (await (await shot({ image: PNG1, mime: 'image/png', usdRate: 12650 }, { AI_FETCH: fallbackShot }, '3.3.3.4')).json()).shot;
check('shot: sxema rad etilsa matndan JSON, CNY → USD', calls2 === 2 && sr2.found && sr2.currency === 'CNY' && sr2.fxApprox && sr2.priceUsd > 80, JSON.stringify(sr2).slice(0, 120));
const sr3 = await (await shot({ image: PNG1, mime: 'image/png' }, { AI_FETCH: () => claudeText('rasmda narx ko\'rinmayapti') }, '3.3.3.5')).json();
check('shot: JSON topilmasa shot.found=false, kartasiz, stop shot', sr3.shot.found === false && sr3.cards.length === 0 && sr3.stop === 'shot');
const sr4 = await shot({ image: PNG1, mime: 'image/png' }, { AI_FETCH: () => new Response('{}', { status: 529 }) }, '3.3.3.6');
check('shot: Claude yiqilsa 503', sr4.status === 503);
/* suggest_stores */
const sg = runTool('suggest_stores', { category: 'poyabzal', original: true, budgetUsd: 100, query: 'men sneakers size 41' }, tctx);
check('suggest_stores: original poyabzal $100 — brend poyabzal do\'konlari birinchi, havola bilan', sg.found && sg.stores.length === 5 && sg.stores.slice(0, 3).every(x => x.cat === 'poyabzal' && /Yuqori/.test(x.original)) && sg.stores.every(x => /^https:\/\//.test(x.searchUrl)) && sg.stores.some(x => /men\+sneakers/.test(x.searchUrl)), sg.stores.map(x => x.id).join(','));
const sg2 = runTool('suggest_stores', { category: 'elektronika', original: false, budgetUsd: 30, query: 'wireless earbuds' }, tctx);
check('suggest_stores: arzon elektronika — arzon marketplace ham ro\'yxatda', sg2.found && sg2.stores.slice(0, 3).some(x => ['aliexpress', 'taobao', 'pinduoduo', 'walmart'].includes(x.id)), sg2.stores.map(x => x.id).join(','));
check('searchUrl: shablonsiz do\'kon — o\'z manzili', /^https:\/\//.test(searchUrl({ id: 'yoq', url: 'https://example.com' }, 'x')) && searchUrl({ id: 'amazon', url: 'https://www.amazon.com' }, 'red shoes') === 'https://www.amazon.com/s?k=red+shoes');

/* --- Ro'yxatdan tashqari do'konlar (other_stores) --- */
{
  const { toolOther } = await import('./src/ai.js');
  const o = toolOther({ stores: [
    { name: 'Zalando', url: 'https://www.zalando.de/herren-schuhe/?q=air+max', country: 'Germaniya', why: 'Yevropadagi eng katta poyabzal tanlovi' },
    { name: 'Yomon', url: 'http://example.com' }, { name: 'IP', url: 'https://192.168.1.1/x' }, { name: 'Parol', url: 'https://u:p@evil.com/' },
    { name: 'JS', url: 'javascript:alert(1)' }, { name: 'Takror', url: 'https://zalando.de/boshqa' },
    { name: 'Amazon', url: 'https://www.amazon.com/s?k=x' } ] });
  check('other_stores: faqat https va haqiqiy domen; IP, parolli, http, javascript va takror tashlanadi', o.ok && o.stores.length === 2 && o.stores[0].host === 'zalando.de' && o.stores[0].inList === false && o.stores[0].country === 'Germaniya', JSON.stringify(o.stores.map(x => x.host)));
  check('other_stores: bazadagi do\'kon domeni bo\'lsa — inList va id bilan', o.stores[1].host === 'amazon.com' && o.stores[1].inList === true && o.stores[1].id === 'amazon');
  check('other_stores: hech biri o\'tmasa ok:false', toolOther({ stores: [{ name: 'x', url: 'ftp://x.com' }] }).ok === false);
  const cards = buildCards({ shot: null, used: [{ name: 'other_stores', input: {}, result: o }], cart: null });
  check('other_stores → stores_ext kartasi', cards.length === 1 && cards[0].type === 'stores_ext' && cards[0].stores.length === 2);
  const nf = runTool('suggest_stores', { category: 'yo\'q-kategoriya', query: 'x' }, { usdRate: 12650, today: '2026-09-27' });
  check('suggest_stores natijasi: mos kelmasa other_stores ga yo\'naltiradi (topilgan va topilmagan holatda ham)', /other_stores/.test(nf.next || '') && /other_stores/.test(runTool('suggest_stores', { category: 'poyabzal', query: 'x' }, { usdRate: 12650, today: '2026-09-27' }).next || ''), JSON.stringify(nf.next));
  check('other_stores vositalar ro\'yxatida', TOOLS.some(t => t.name === 'other_stores'));
}

/* --- Oqim (stream: true): SSE dan xabar yig'iladi, ilovaga NDJSON --- */
const sseOf = m => {
  const ev = (type, o) => 'event: ' + type + '\ndata: ' + JSON.stringify({ type, ...o }) + '\n\n';
  let out = ev('message_start', { message: { id: 'msg_s', type: 'message', role: 'assistant', model: m.model || 'claude-test', content: [], usage: { input_tokens: 50, cache_read_input_tokens: 40, output_tokens: 1 } } });
  m.content.forEach((b, i) => {
    if (b.type === 'text') {
      out += ev('content_block_start', { index: i, content_block: { type: 'text', text: '' } });
      const h = Math.ceil(b.text.length / 2);
      for (const part of [b.text.slice(0, h), b.text.slice(h)]) if (part) out += ev('content_block_delta', { index: i, delta: { type: 'text_delta', text: part } });
    } else if (b.type === 'tool_use' || b.type === 'server_tool_use') {
      out += ev('content_block_start', { index: i, content_block: { type: b.type, id: b.id, name: b.name, input: {} } });
      const js = JSON.stringify(b.input), h = Math.ceil(js.length / 2);
      out += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: js.slice(0, h) } });
      out += ev('content_block_delta', { index: i, delta: { type: 'input_json_delta', partial_json: js.slice(h) } });
    } else if (b.type === 'thinking') {
      out += ev('content_block_start', { index: i, content_block: { type: 'thinking', thinking: '', signature: '' } });
      out += ev('content_block_delta', { index: i, delta: { type: 'thinking_delta', thinking: b.thinking } });
      out += ev('content_block_delta', { index: i, delta: { type: 'signature_delta', signature: b.signature } });
    } else {
      out += ev('content_block_start', { index: i, content_block: b });
    }
    out += ev('content_block_stop', { index: i });
  });
  out += ev('message_delta', { delta: { stop_reason: m.stop_reason }, usage: { output_tokens: 30 } }) + ev('message_stop', {});
  return new Response(out, { status: 200, headers: { 'content-type': 'text/event-stream' } });
};
const lines = async res => (await res.text()).split('\n').filter(Boolean).map(l => JSON.parse(l));
{
  const sent = [];
  const fakeS = async (u, i) => {
    const b = JSON.parse(i.body); sent.push(b);
    if (sent.length === 1) return sseOf({ stop_reason: 'tool_use', content: [
      { type: 'thinking', thinking: '', signature: 'sig-abc' },
      { type: 'text', text: 'Hisoblayman.' },
      { type: 'tool_use', id: 'toolu_s1', name: 'customs_duty', input: { goodsUsd: 320, shipUsd: 22.5, kg: 2.5 } }] });
    return sseOf({ stop_reason: 'end_turn', content: [{ type: 'text', text: '**Boj** 38.53 dollar. Taxminiy.' }] });
  };
  const rs = await ask('320 dollarlik 2.5 kg tovar uchun boj qancha?', { AI_FETCH: fakeS, AI_EFFORT: 'low', AI_EFFORT_FIND: 'medium' }, { headers: { 'cf-connecting-ip': '2.3.4.5' }, body: { stream: true } });
  const ls = await lines(rs);
  const done = ls.find(l => l.t === 'done') || {};
  check('oqim: NDJSON, holat (vosita nomi), matn bo\'laklari raund bilan, oxirida done', /ndjson/.test(rs.headers.get('content-type') || '') && ls.some(l => l.t === 'status' && l.s === 'customs_duty') && ls.filter(l => l.t === 'text' && l.r === 0).map(l => l.d).join('') === 'Hisoblayman.' && ls.filter(l => l.t === 'text' && l.r === 1).map(l => l.d).join('') === '**Boj** 38.53 dollar. Taxminiy.' && ls[ls.length - 1].t === 'done', JSON.stringify(ls.map(l => l.t)));
  check('oqim: done — oqimsiz javob bilan bir xil (markdownsiz matn, boj kartasi, vosita, sarf)', done.text === 'Boj 38.53 dollar. Taxminiy.' && done.cards && done.cards[0].type === 'duty' && done.cards[0].got.goodsUsd === 320 && done.tools.join() === 'customs_duty' && done.usage.input === 100 && done.usage.cacheRead === 80, JSON.stringify(done).slice(0, 200));
  const as = (sent[1] && sent[1].messages[1]) || {};
  check('oqim: Claude\'ga stream:true; 2-raundda thinking imzosi va vosita kirishi (JSON bo\'laklaridan) o\'zgarishsiz', sent[0].stream === true && as.role === 'assistant' && as.content[0].type === 'thinking' && as.content[0].signature === 'sig-abc' && as.content[2].type === 'tool_use' && JSON.stringify(as.content[2].input) === '{"goodsUsd":320,"shipUsd":22.5,"kg":2.5}', JSON.stringify(as).slice(0, 200));
  check('tezlik: oddiy savolda effort low', sent[0].output_config && sent[0].output_config.effort === 'low', JSON.stringify(sent[0].output_config));
  const fsent = [];
  await ask('krossovka qidiryapman', { AI_FETCH: async (u, i) => { fsent.push(JSON.parse(i.body)); return claudeText('ok'); }, AI_EFFORT: 'low', AI_EFFORT_FIND: 'medium' }, { headers: { 'cf-connecting-ip': '2.3.4.6' }, body: { find: true } });
  check('tezlik: veb-qidiruvli (find) so\'rovda effort medium', fsent[0] && fsent[0].output_config.effort === 'medium', JSON.stringify(fsent[0] && fsent[0].output_config));
  const errS = await ask('x', { AI_FETCH: async () => new Response('event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }) }, { headers: { 'cf-connecting-ip': '2.3.4.7' }, body: { stream: true } });
  const el = await lines(errS);
  check('oqim: API oqimdagi xato — {t:"error", code:"upstream"}', el.length && el[el.length - 1].t === 'error' && el[el.length - 1].code === 'upstream', JSON.stringify(el));
  const badS = await ask('   ', { AI_FETCH: () => claudeText('x') }, { headers: { 'cf-connecting-ip': '2.3.4.8' }, body: { stream: true } });
  check('oqim: kirish xatosi oqimgacha oddiy JSON (400)', badS.status === 400 && /json/.test(badS.headers.get('content-type') || ''));
}

/* --- Hamkor kuryer holat API (src/track.js): soxta Durable Object ombori --- */
const { Tracks, partnerKeys, partnerIds, parseEvent, whoIs } = await import('./src/track.js');
function fakeKv() {
  const m = new Map();
  return {
    m,
    /* Haqiqiy ombordagi kabi: bitta chaqiruvda 128 kalitdan ko'p — xato. */
    async get(keys) { if (keys.length > 128) throw new Error('get: 128 dan ko\'p'); return new Map(keys.filter(k => m.has(k)).map(k => [k, structuredClone(m.get(k))])); },
    async put(obj) { if (Object.keys(obj).length > 128) throw new Error('put: 128 dan ko\'p'); for (const [k, v] of Object.entries(obj)) m.set(k, structuredClone(v)); },
    async delete(keys) { if (keys.length > 128) throw new Error('delete: 128 dan ko\'p'); for (const k of keys) m.delete(k); },
    async list({ prefix, limit, startAfter }) { return new Map([...m].filter(([k]) => k.startsWith(prefix) && (!startAfter || k > startAfter)).sort().slice(0, limit)); }
  };
}
const kv = fakeKv();
const tracks = new Tracks({ storage: kv });
const D2D = 'd2d-kalit-uzun-kamida-24-belgi', GLB = 'globbing-kalit-uzun-24-belgi-bor';
const tEnv = { ...env, PARTNER_KEYS: `d2d:${D2D}, globbing:${GLB}, qisqa:abc, sinov:sinov-kalit-uzun-kamida-24-belgi`,
  TRACKS: { idFromName: () => 'main', get: () => ({ fetch: (u, i) => tracks.fetch(new Request(u, i)) }) } };
const tHit = (path, init) => worker.fetch(new Request('https://w' + path, init), tEnv, ctx);
check('PARTNER_KEYS: qisqa kalit hisobga olinmaydi', partnerKeys(tEnv).size === 3 && !partnerKeys(tEnv).has('abc'));
check('partnerIds: "sinov" ro\'yxatga chiqmaydi', partnerIds(tEnv).join(',') === 'd2d,globbing');
check('whoIs: kalit kuryerni aytadi, READ_TOKEN — egasi', whoIs(tEnv, 'Bearer ' + D2D).id === 'd2d' && whoIs(tEnv, 'Bearer sir').owner === true && whoIs(tEnv, 'Bearer yoq') === null);
check('parseEvent: noto\'g\'ri status va raqam rad etiladi', !!parseEvent({ number: 'AB12', status: 'customs' }).error && !!parseEvent({ number: 'AB123456', status: 'lost' }).error);
check('parseEvent: bo\'shliq va kichik harf tozalanadi, kelajak vaqt — hozir', (() => { const e = parseEvent({ number: ' rb 1234 5678 cn ', status: 'Customs', at: '2099-01-01T00:00:00Z', note: 'Toshkent <b>' }); return e.n === 'RB12345678CN' && e.st === 'customs' && e.at <= Date.now() && !/[<>]/.test(e.note); })());
const post = (key, body) => tHit('/partner/status', { method: 'POST', headers: key ? { authorization: 'Bearer ' + key } : {}, body: JSON.stringify(body) });
check('/partner/status kalitsiz — 401', (await post('', { number: 'RB123456789CN', status: 'shipped' })).status === 401);
const ps = await post(D2D, { events: [
  { number: 'RB123456789CN', status: 'received', at: '2026-09-20T08:00:00Z' },
  { number: 'RB123456789CN', status: 'customs', at: '2026-09-23T10:00:00Z', note: 'Toshkent-AERO' },
  { number: 'RB123456789CN', status: 'shipped', at: '2026-09-21T09:00:00Z' },
  { number: 'X', status: 'shipped' }
] });
const psj = await ps.json();
check('/partner/status: to\'g\'ri hodisalar yoziladi, noto\'g\'risi sababi bilan', ps.status === 200 && psj.ok === 3 && psj.courier === 'd2d' && psj.rejected.length === 1 && psj.rejected[0].i === 3, JSON.stringify(psj));
check('omborda jo\'natma raqami ochiq saqlanmaydi', [...kv.m.keys()].every(k => /^t:[0-9a-f]{64}$/.test(k)) && !JSON.stringify([...kv.m.values()]).includes('RB123456789CN'));
await post(D2D, { number: 'RB123456789CN', status: 'customs', at: '2026-09-23T10:00:00Z', note: 'Toshkent-AERO' });
const tq = body => tHit('/track', { method: 'POST', headers: { origin: 'https://x' }, body: JSON.stringify(body) });
const tr1 = await (await tq({ q: [{ c: 'd2d', n: 'rb123456789cn' }, { c: 'globbing', n: 'RB123456789CN' }, { c: 'cpost', n: 'RB123456789CN' }] })).json();
const a = tr1.r[0];
check('/track: joriy holat — eng kech vaqtli hodisa (tartibsiz kelsa ham)', a.found && a.st === 'customs' && a.note === 'Toshkent-AERO' && a.at === '2026-09-23T10:00:00.000Z', JSON.stringify(a));
check('/track: tarix yangisi oldinda, takror hodisa qo\'shilmaydi', a.h.length === 3 && a.h.map(e => e.st).join(',') === 'customs,shipped,received');
check('/track: boshqa kuryerdagi xuddi shu raqam ko\'rinmaydi', tr1.r[1].found === false && tr1.r[1].partner === true);
check('/track: hamkor bo\'lmagan kuryer — partner:false', tr1.r[2].found === false && tr1.r[2].partner === false);
check('/track: begona Origin — 403', (await tHit('/track', { method: 'POST', headers: { origin: 'https://boshqa' }, body: '{"q":[]}' })).status === 403);
check('/track: 20 tadan ortiq so\'rov kesiladi', (await (await tq({ q: Array.from({ length: 30 }, (_, i) => ({ c: 'd2d', n: 'AB12345' + i })) })).json()).r.length === 20);
check('/partner/status: kuryer boshqa kuryer nomidan yoza olmaydi', (await (await post(GLB, { courier: 'd2d', number: 'ZZ99999999', status: 'delivered' })).json()).courier === 'globbing');
const own = await post('sir', { courier: 'sinov', number: 'CI-12345', status: 'ready', note: 'workflow' });
check('/partner/status: egasi "sinov" nomidan yozadi, /track o\'qiydi', own.status === 200 && (await (await tq({ q: [{ c: 'sinov', n: 'ci-12345' }] })).json()).r[0].st === 'ready');
check('/partner/status: egasi courier\'siz — 400', (await post('sir', { number: 'CI-12345', status: 'ready' })).status === 400);
check('/ai/status: partners ro\'yxati', JSON.stringify((await (await tHit('/ai/status')).json()).partners) === '["d2d","globbing"]');
check('/track: Origin javobda qaytadi (bir nechta manzil)', (await tHit('/track', { method: 'POST', headers: { origin: 'https://x' }, body: '{"q":[]}' })).headers.get('access-control-allow-origin') === 'https://x');
/* 200 ta turli raqam bitta so'rovda (ombor chegarasi 128 — bo'laklab yoziladi). */
const big = await post(D2D, { events: Array.from({ length: 200 }, (_, i) => ({ number: 'BIG' + String(i).padStart(6, '0'), status: 'shipped' })) });
const bigj = await big.json();
check('/partner/status: 200 ta turli raqam — hammasi yoziladi (128 chegarasi bo\'laklab)', big.status === 200 && bigj.saved === 200, JSON.stringify(bigj).slice(0, 120));
check('/partner/status: sarlavhasiz katta tana — 413', (await tHit('/partner/status', { method: 'POST', headers: { authorization: 'Bearer ' + D2D }, body: JSON.stringify({ events: [], pad: 'x'.repeat(70000) }) })).status === 413);
for (const v of kv.m.values()) v.u = Date.now() - 91 * 86400000;
const firstKey = [...kv.m.keys()][0];
kv.m.get(firstKey).u = Date.now();
const pr = await (await tracks.fetch(new Request('https://tracks/purge', { method: 'DELETE' }))).json();
check('purge: 90 kun yangilanmagan holat o\'chadi (200 dan ortiq ham), yangisi qoladi', kv.m.size === 1 && kv.m.has(firstKey) && pr.removed >= 202, JSON.stringify(pr));
check('TRACKS ulanmagan bo\'lsa /partner/status 503, /track bo\'sh', (await hit('/partner/status', { method: 'POST', headers: { authorization: 'Bearer sir' }, body: '{}' })).status === 503
  && JSON.stringify(await (await hit('/track', { method: 'POST', headers: { origin: 'https://x' }, body: '{"q":[{"c":"d2d","n":"RB123456789CN"}]}' })).json()) === '{"r":[]}');

/* --- Havola orqali o'qish (link): sahifa → skrinshot bilan bir xil shot. --- */
{
  const L = await import('./src/link.js');
  check('safeLink: https do\'kon — ha; IP, localhost, port, login — yo\'q', !!L.safeLink('https://www.trendyol.com/x-p-1') && !L.safeLink('http://127.0.0.1/x') && !L.safeLink('https://localhost/x') && !L.safeLink('https://shop.com:8080/x') && !L.safeLink('https://a:b@shop.com/x') && !L.safeLink('ftp://shop.com/x') && !L.safeLink('https://printer.local/x'));
  check('parsePrice: 1,299.00 · 1.299,00 · 129,99 · 1 299 · 12.345.678', L.parsePrice('1,299.00') === 1299 && L.parsePrice('1.299,00') === 1299 && L.parsePrice('129,99') === 129.99 && L.parsePrice('1 299') === 1299 && L.parsePrice('12.345.678') === 12345678 && L.parsePrice('') === 0);
  check('toKg: 800 g, 2 lb, KGM', L.toKg(800, 'GRM') === 0.8 && Math.abs(L.toKg(2, 'lb') - 0.907) < 0.01 && L.toKg('1.5', 'KGM') === 1.5);
  const ld = '<html><head><title>X</title><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},{"@type":"Product","name":"Nike Air Max 90 &amp; Co","brand":{"name":"Nike"},"weight":{"value":"850","unitCode":"GRM"},"offers":[{"@type":"Offer","price":"2.499,90","priceCurrency":"try"}]}]}</script></head></html>';
  const p1 = L.extractProduct(ld);
  check('extractProduct: JSON-LD @graph → nom, narx (1.234,56 shakli), valyuta, vazn', p1 && p1.source === 'jsonld' && p1.name === 'Nike Air Max 90 & Co' && p1.price === 2499.9 && p1.currency === 'TRY' && p1.weightKg === 0.85, JSON.stringify(p1));
  const agg = L.extractProduct('<script type="application/ld+json">[{"@type":["Product"],"name":"Kurtka","offers":{"@type":"AggregateOffer","lowPrice":39.5,"priceCurrency":"USD"}}]</script>');
  check('extractProduct: AggregateOffer lowPrice', agg && agg.price === 39.5 && agg.currency === 'USD');
  const mt = L.extractProduct('<meta property="og:title" content="Krem 50 ml"><meta property="og:site_name" content="Olive Young"><meta property="product:price:amount" content="25,000"><meta property="product:price:currency" content="KRW">');
  check('extractProduct: meta (og/product:price) zaxira', mt && mt.source === 'meta' && mt.price === 25000 && mt.currency === 'KRW' && mt.name === 'Krem 50 ml' && mt.store === 'Olive Young', JSON.stringify(mt));
  check('extractProduct: narxsiz sahifa — null', L.extractProduct('<title>Bosh sahifa</title><p>Salom</p>') === null);
  check('pageText: skript va uslubsiz, sarlavha bilan', /^Sarlavha: Kurtka/.test(L.pageText('<title>Kurtka</title><style>.a{}</style><script>var x=1</script><p>Narx: $49.99</p>')) && !/var x/.test(L.pageText('<script>var x=1</script>')));
  check('tldCountry: .co.uk, .com.tr, .cn; .com — noma\'lum', L.tldCountry('shop.co.uk') === 'Angliya' && L.tldCountry('trendyol.com.tr') === 'Turkiya' && L.tldCountry('jd.cn') === 'Xitoy' && L.tldCountry('nike.com') === '');

  const html = (body, ct = 'text/html; charset=utf-8', status = 200) => new Response(body, { status, headers: { 'content-type': ct } });
  const linkAsk = (link, fetchFn, ip) => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': ip },
    body: JSON.stringify({ link, lang: 'uz', usdRate: 12650 }) }), aiEnv({ AI_FETCH: fetchFn }), ctx);
  /* 1) JSON-LD: Claude umuman chaqirilmaydi. */
  const calls1 = [];
  const r1 = await linkAsk('https://www.trendyol.com/nike/air-max-p-123', async (u, i) => { calls1.push(String(u)); return /anthropic/.test(u) ? claudeText('x') : html(ld); }, '4.4.4.1');
  const j1 = await r1.json();
  check('link: JSON-LD → shot (TRY, vazn, do\'kon bazadan), Claude chaqirilmaydi, stop link', r1.status === 200 && j1.stop === 'link' && j1.via === 'jsonld' && j1.shot.found && j1.shot.currency === 'TRY' && j1.shot.weightKg === 0.85 && j1.shot.store === 'Trendyol' && j1.shot.country === 'Turkiya' && j1.shot.url === 'https://www.trendyol.com/nike/air-max-p-123' && calls1.length === 1 && !calls1.some(u => /anthropic/.test(u)) && j1.cards[0].type === 'product', JSON.stringify(j1).slice(0, 200));
  /* 2) Tuzilgan ma'lumot yo'q — sahifa matni arzon modelga. */
  const calls2 = [];
  const txt = '<title>Winter jacket</title><body>' + 'Warm winter jacket for men. '.repeat(20) + ' Price: £59.99 </body>';
  const r2 = await linkAsk('https://shop.example.co.uk/jacket', async (u, i) => { calls2.push(i && i.body ? JSON.parse(i.body) : String(u));
    if (/anthropic/.test(u)) return new Response(JSON.stringify({ model: 'claude-haiku-4-5', stop_reason: 'end_turn', usage: { input_tokens: 3000, output_tokens: 50 },
      content: [{ type: 'text', text: JSON.stringify({ name: 'Winter jacket', price: 59.99, currency: 'GBP', qty: 1, store: 'Example', category: 'kiyim', country: '', weightKg: 0, confidence: 0.85 }) }] }), { status: 200 });
    return html(txt); }, '4.4.4.2');
  const j2 = await r2.json();
  const cl2 = calls2.find(x => x && x.model);
  check('link: matn → arzon model (sxema bilan, sahifa matni ichida), GBP, davlat domendan', r2.status === 200 && j2.via === 'text' && j2.shot.found && j2.shot.currency === 'GBP' && j2.shot.country === 'Angliya' && cl2 && cl2.model === 'claude-haiku-4-5' && cl2.output_config.format.type === 'json_schema' && /Price: £59\.99/.test(cl2.messages[0].content) && !cl2.tools, JSON.stringify(j2).slice(0, 200));
  /* 3) Sayt to'sdi (403) — asosiy model web_fetch bilan, faqat shu domen. */
  const calls3 = [];
  const r3 = await linkAsk('https://www.amazon.com/dp/B0TEST', async (u, i) => { if (/anthropic/.test(u)) { calls3.push(JSON.parse(i.body));
      return new Response(JSON.stringify({ model: 'claude-sonnet-5', stop_reason: 'end_turn', usage: { input_tokens: 5000, output_tokens: 80 },
        content: [{ type: 'server_tool_use', id: 's1', name: 'web_fetch', input: { url: 'https://www.amazon.com/dp/B0TEST' } }, { type: 'text', text: 'Natija: {"name":"Echo Dot","price":49.99,"currency":"USD","store":"Amazon","category":"elektronika","country":"AQSh","weightKg":0.3,"confidence":0.9}' }] }), { status: 200 }); }
    return html('<html>Robot Check — enter the characters</html>'); }, '4.4.4.3');
  const j3 = await r3.json();
  check('link: to\'silgan sayt → web_fetch (faqat amazon.com), USD, do\'kon bazadan', r3.status === 200 && j3.via === 'fetch' && j3.shot.found && j3.shot.priceUsd === 49.99 && j3.shot.store === 'Amazon' && calls3.length === 1 && calls3[0].tools[0].type === 'web_fetch_20260209' && calls3[0].tools[0].allowed_domains[0] === 'amazon.com' && calls3[0].output_config.effort === 'low', JSON.stringify(j3).slice(0, 200));
  /* 4) Xavfli manzil — sahifa ham, Claude ham chaqirilmaydi. */
  let calls4 = 0;
  const j4 = await (await linkAsk('https://192.168.1.1/admin', async () => { calls4++; return html(''); }, '4.4.4.4')).json();
  check('link: IP-manzil — ochilmaydi, found=false', j4.stop === 'link' && j4.via === 'bad' && j4.shot.found === false && calls4 === 0 && j4.cards.length === 0);
  /* 5) Sahifa ochildi, lekin narx yo'q (qisqa) — found=false, Claude'siz. */
  let calls5 = 0;
  const j5 = await (await linkAsk('https://nike.com/', async (u) => { if (/anthropic/.test(u)) calls5++; return html('<title>Nike</title><p>Just do it</p>'); }, '4.4.4.5')).json();
  check('link: narxsiz qisqa sahifa — found=false, AI chaqirilmaydi', j5.via === 'none' && j5.shot.found === false && calls5 === 0, JSON.stringify(j5).slice(0, 120));
  const amz = L.extractProduct('<span id="productTitle" class="a-size-large"> Echo Dot (5th Gen) </span><div class="a-section"><span class="a-offscreen">$9.99</span></div><div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">$49.99</span></span></div>');
  check('extractProduct: Amazon — asosiy narx bloki (reklama narxi emas), nom', amz && amz.source === 'amazon' && amz.price === 49.99 && amz.currency === 'USD' && amz.name === 'Echo Dot (5th Gen)', JSON.stringify(amz));
  const amz2 = L.extractProduct('<link rel="canonical" href="https://www.amazon.com/dp/B0X"><title>Amazon.com: Kindle Paperwhite</title><div id="apex_desktop_newAccordionRow"><span class="a-price"><span class="a-offscreen">$149.99</span></span></div>');
  check('extractProduct: Amazon — apex_* bloki, nom <title> dan (productTitle yo\'q)', amz2 && amz2.price === 149.99 && amz2.name === 'Kindle Paperwhite', JSON.stringify(amz2));
  check('pageText: mahsulot qismidan boshlanadi (menyu tashlanadi)', /^Sarlavha: X\nKurtka narxi/.test(L.pageText('<title>X</title><nav>Menyu Menyu</nav><main><p>Kurtka narxi $5</p></main>')));
  check('looksBlocked: Amazon "continue shopping" oraliq sahifasi', L.looksBlocked('<p>Click the button below to continue shopping</p>') && !L.looksBlocked('<p>Echo Dot</p>'));
  /* Uzun matndan narx topilmasa — web_fetch ham sinab ko'riladi. */
  const calls6 = [];
  const long = '<title>Kurtka</title><body>' + 'Chiroyli kurtka, sifatli mato. '.repeat(30) + '</body>';
  const j6 = await (await linkAsk('https://shop.example.de/kurtka', async (u, i) => { if (/anthropic/.test(u)) { const b = JSON.parse(i.body); calls6.push(b.model + (b.tools ? ':tools' : ''));
      if (!b.tools) return new Response(JSON.stringify({ model: b.model, stop_reason: 'end_turn', usage: { input_tokens: 2000, output_tokens: 20 }, content: [{ type: 'text', text: '{"name":"","price":0,"currency":"","qty":1,"store":"","category":"universal","country":"","weightKg":0,"confidence":0}' }] }), { status: 200 });
      return new Response(JSON.stringify({ model: b.model, stop_reason: 'end_turn', usage: { input_tokens: 4000, output_tokens: 60 }, content: [{ type: 'text', text: '{"name":"Kurtka","price":79.9,"currency":"EUR","store":"Example","country":"Germaniya","weightKg":1.1,"confidence":0.8}' }] }), { status: 200 }); }
    return html(long); }, '4.4.4.6')).json();
  check('link: matndan narx chiqmasa web_fetch sinaladi (arzon → asosiy), EUR, sahifa holati javobda', j6.via === 'fetch' && j6.shot.found && j6.shot.currency === 'EUR' && calls6.join(',') === 'claude-haiku-4-5,claude-sonnet-5:tools' && j6.page && j6.page.status === 200 && j6.page.blocked === false && j6.usage.input === 6000, JSON.stringify({ via: j6.via, calls6, page: j6.page, u: j6.usage }));
  /* Qisqa havola yo'naltiradi — do'kon oxirgi manzildan, web_fetch ikkala domenga. */
  const redirs7 = [];
  const j7 = await (await linkAsk('https://a.co/d/abc123', async (u, i) => { if (/anthropic/.test(u)) return claudeText('x'); redirs7.push(String(u) + ':' + (i && i.redirect));
      if (/a\.co\//.test(u)) return new Response('', { status: 301, headers: { location: 'https://www.amazon.com/dp/B0TEST' } });
      return html(ld); }, '4.4.4.7')).json();
  check('link: yo\'naltirish qo\'lda (redirect: manual), har qadam tekshiriladi', redirs7.length === 2 && redirs7.every(x => /:manual$/.test(x)), redirs7.join(' | '));
  check('link: qisqa havola (a.co) → oxirgi manzil amazon.com: do\'kon Amazon, url oxirgisi', j7.shot.found && j7.shot.store === 'Amazon' && j7.shot.url === 'https://www.amazon.com/dp/B0TEST' && j7.shot.host === 'amazon.com', JSON.stringify(j7.shot).slice(0, 160));
  check('parseAiBody: uzun (2000 gacha) Amazon havolasi qabul qilinadi', parseAiBody(JSON.stringify({ link: 'https://www.amazon.com/dp/B0X?' + 'a=1&'.repeat(200) })).link.length > 400);
  /* Ochiq manzil ichki manzilga yo'naltirsa — ochilmaydi. */
  const seen8 = [];
  const j8 = await (await linkAsk('https://evil.example.com/r', async (u) => { seen8.push(String(u)); if (/anthropic/.test(u)) return claudeText('x');
      return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }); }, '4.4.4.8')).json();
  check('link: ichki/IP manzilga yo\'naltirish — ochilmaydi, found=false', j8.shot.found === false && !seen8.some(u => /169\.254/.test(u)), seen8.join(' | '));
  /* GBK sahifa to'g'ri o'qiladi (sarlavhadagi charset). */
  const gbkBytes = Buffer.from([0x3c,0x6d,0x65,0x74,0x61,0x20,0x70,0x72,0x6f,0x70,0x65,0x72,0x74,0x79,0x3d,0x22,0x6f,0x67,0x3a,0x74,0x69,0x74,0x6c,0x65,0x22,0x20,0x63,0x6f,0x6e,0x74,0x65,0x6e,0x74,0x3d,0x22,0xc4,0xd0,0xd0,0xac,0x22,0x3e,0x3c,0x6d,0x65,0x74,0x61,0x20,0x70,0x72,0x6f,0x70,0x65,0x72,0x74,0x79,0x3d,0x22,0x70,0x72,0x6f,0x64,0x75,0x63,0x74,0x3a,0x70,0x72,0x69,0x63,0x65,0x3a,0x61,0x6d,0x6f,0x75,0x6e,0x74,0x22,0x20,0x63,0x6f,0x6e,0x74,0x65,0x6e,0x74,0x3d,0x22,0x39,0x39,0x22,0x3e,0x3c,0x6d,0x65,0x74,0x61,0x20,0x70,0x72,0x6f,0x70,0x65,0x72,0x74,0x79,0x3d,0x22,0x70,0x72,0x6f,0x64,0x75,0x63,0x74,0x3a,0x70,0x72,0x69,0x63,0x65,0x3a,0x63,0x75,0x72,0x72,0x65,0x6e,0x63,0x79,0x22,0x20,0x63,0x6f,0x6e,0x74,0x65,0x6e,0x74,0x3d,0x22,0x43,0x4e,0x59,0x22,0x3e]);
  const j9 = await (await linkAsk('https://shop.example.cn/p/1', async (u) => /anthropic/.test(u) ? claudeText('x') : new Response(gbkBytes, { status: 200, headers: { 'content-type': 'text/html; charset=gbk' } }), '4.4.4.9')).json();
  check('link: GBK kodlangan sahifa — nom to\'g\'ri (男鞋), CNY', j9.shot.found && j9.shot.name === '男鞋' && j9.shot.currency === 'CNY', JSON.stringify(j9.shot).slice(0, 120));
  /* JSON-LD da valyuta yo'q — domendan (.com.tr → TRY). */
  const j10 = await (await linkAsk('https://www.example.com.tr/p/2', async (u) => /anthropic/.test(u) ? claudeText('x') : html('<script type="application/ld+json">{"@type":"Product","name":"Ceket","offers":{"price":"1499.90"}}</script>'), '4.4.4.10')).json();
  check('link: valyutasiz narx — domendan TRY (USD emas)', j10.shot.found && j10.shot.currency === 'TRY' && j10.shot.country === 'Turkiya', JSON.stringify(j10.shot).slice(0, 120));
  /* Arzon model yiqilsa (529) — 503 emas, web_fetch sinaladi. */
  const calls11 = [];
  const j11r = await linkAsk('https://shop.example.de/k2', async (u, i) => { if (/anthropic/.test(u)) { const b = JSON.parse(i.body); calls11.push(b.tools ? 'fetch' : 'text');
      if (!b.tools) return new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 });
      return new Response(JSON.stringify({ model: 'm', stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: '{"name":"Kurtka","price":50,"currency":"EUR"}' }] }), { status: 200 }); }
    return html(long); }, '4.4.4.11');
  const j11 = await j11r.json();
  check('link: arzon model yiqilsa 503 emas — web_fetch bilan topiladi', j11r.status === 200 && j11.via === 'fetch' && j11.shot.found && calls11.join(',') === 'text,fetch', JSON.stringify({ s: j11r.status, via: j11.via, calls11 }));
  const j12r = await linkAsk('https://shop.example.de/k3', async (u, i) => { if (/anthropic/.test(u)) return new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 }); return html(long); }, '4.4.4.12');
  const j12 = await j12r.json();
  check('link: ikkala AI yo\'li yiqilsa — 200, found=false ("narx o\'qilmadi", skrinshot taklifi)', j12r.status === 200 && j12.shot.found === false, JSON.stringify({ s: j12r.status, shot: j12.shot }));
  check('amazonClean: /Nom/dp/ASIN/ref=…?… → /dp/ASIN; boshqa sayt o\'zgarmaydi', L.amazonClean('https://www.amazon.com/Echo-Dot/dp/B09B8V1LZ3/ref=sr_1_1?crid=X') === 'https://www.amazon.com/dp/B09B8V1LZ3' && L.amazonClean('https://www.amazon.de/gp/product/B08KTZ8249?th=1') === 'https://www.amazon.de/dp/B08KTZ8249' && L.amazonClean('https://nike.com/x?y=1') === 'https://nike.com/x?y=1');
  const azPay = L.extractAmazon('<span id="productTitle"> Echo Dot </span><span class="a-offscreen">$9.99</span><span class="a-price priceToPay"><span class="a-offscreen">$49.99</span></span>');
  const azAttach = L.extractAmazon('<span id="productTitle">Kindle</span><input type="hidden" id="attach-base-product-price" value="139.99"><input type="hidden" id="attach-base-product-currency-symbol" value="$">');
  const azJson = L.extractAmazon('<span id="productTitle">Buch</span><script>{"priceAmount":24.95,"currencySymbol":"€"}</script>');
  check('extractAmazon: priceToPay, attach-base-product-price, priceAmount JSON', azPay.price === 49.99 && azAttach.price === 139.99 && azAttach.currency === 'USD' && azJson.price === 24.95 && azJson.currency === 'EUR', JSON.stringify([azPay, azAttach, azJson].map(x => x && x.price)));
  check('extractAmazon: Amazon bo\'lmagan sahifa — null', L.extractAmazon('<span class="a-price priceToPay"><span class="a-offscreen">$5</span></span>') === null);
  const seen13 = [];
  const j13 = await (await linkAsk('https://www.amazon.com/Echo-Dot/dp/B09B8V1LZ3/ref=sr_1_1?crid=X&keywords=echo', async (u) => { seen13.push(String(u)); if (/anthropic/.test(u)) return claudeText('x');
      return html('<span id="productTitle">Echo Dot (5th Gen)</span><span class="a-price priceToPay"><span class="a-offscreen">$49.99</span></span>'); }, '4.4.4.13')).json();
  check('link: Amazon havolasi toza /dp/ASIN bilan ochiladi, narx va belgilar javobda', j13.via === 'amazon' && j13.shot.found && j13.shot.priceUsd === 49.99 && seen13[0] === 'https://www.amazon.com/dp/B09B8V1LZ3' && j13.page.amazon && j13.page.amazon.priceToPay === true, JSON.stringify({ via: j13.via, seen13, a: j13.page && j13.page.amazon }));
  check('parseAiBody: faqat link — to\'g\'ri; buzuq link — bo\'sh', parseAiBody(JSON.stringify({ link: 'https://a.com/x' })).link === 'https://a.com/x' && typeof parseAiBody(JSON.stringify({ link: 'javascript:alert(1)' })) === 'string');
}

/* --- Xarajat nazorati: sarf yoziladi, kunlik $ byudjeti, "Qayerdan topaman"
   IP chegarasi (oshsa qidiruvsiz javob), buyurtma bo'limi faqat mavzuga. --- */
{
  const cB = new Counter({ storage: { sql: fakeSql() } }, { ALLOW_ORIGIN: 'https://x' });
  const envB = { ...env, COUNTER: { idFromName: () => 'main', get: () => ({ fetch: (u, i) => cB.fetch(new Request(u, i)) }) } };
  const calls = [];
  const costly = async (u, i) => { calls.push(JSON.parse(i.body));
    return new Response(JSON.stringify({ model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 4000 } }), { status: 200 }); };
  const askB = (q, extra = {}, body = {}, ip = '9.9.9.1') => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': ip },
    body: JSON.stringify({ q, lang: 'uz', usdRate: 12650, ...body }) }), { ...envB, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '50', AI_DAILY_TOTAL: '100', AI_FETCH: costly, ...extra }, ctx);
  const j1 = await (await askB('Qanday buyurtma qilaman?', { AI_DAILY_USD: '0.02' })).json();
  /* 1000×2 + 4000×1,25×2 = 12 000 → $0.012; 500×10 → $0.005; jami $0.017. */
  check('usage: keshga yozish va taxminiy $ javobda', j1.usage.cacheWrite === 4000 && Math.abs(j1.usage.usd - 0.017) < 1e-9, JSON.stringify(j1.usage));
  check('buyurtma savoli — buyurtma bo\'limi keshdan keyingi blokda', calls[0].system.length >= 3 && !/## Qanday buyurtma/.test(calls[0].system[0].text) && calls[0].system.slice(1).some(b => /## Qanday buyurtma qilaman/.test(b.text)));
  const stB = await (await cB.fetch(new Request('https://counter/stats?days=1'))).json();
  check('sarf yoziladi: ai_usd (mikro-$, tur bo\'yicha), ai_tok, kun bo\'yicha $', stB.byName.ai_usd.chat === 17000 && stB.byName.ai_tok.cache_write === 4000 && stB.usdByDay[today] === 17000, JSON.stringify({ u: stB.byName.ai_usd, d: stB.usdByDay }));
  await askB('krossovka qancha tushadi', { AI_DAILY_USD: '0.02' }, {}, '9.9.9.2');
  check('oddiy savol — buyurtma bo\'limi qo\'shilmaydi', !calls[1].system.some(b => /## Qanday buyurtma qilaman/.test(b.text)));
  const over = await askB('yana savol', { AI_DAILY_USD: '0.02' }, {}, '9.9.9.3');
  const overJ = await over.json();
  check('kunlik $ byudjeti tugasa — 429 (limit, budget), Claude chaqirilmaydi', over.status === 429 && overJ.code === 'limit' && overJ.scope === 'budget' && calls.length === 2, JSON.stringify(overJ));
  const n0 = calls.length;
  await askB('krossovka qayerdan', { AI_DAILY_FIND_PER_IP: '1' }, { find: true }, '9.9.9.4');
  await askB('krossovka qayerdan', { AI_DAILY_FIND_PER_IP: '1' }, { find: true }, '9.9.9.4');
  const hasWs = b => b.tools.some(t => t.type === 'web_search_20260209');
  check('"Qayerdan topaman" IP chegarasi: birinchisi qidiruv bilan, oshgani qidiruvsiz (rad emas)', calls.length === n0 + 2 && hasWs(calls[n0]) && !hasWs(calls[n0 + 1]));
  const stB2 = await (await cB.fetch(new Request('https://counter/stats?days=1'))).json();
  check('hisobotda ichki IP sanoqlari yo\'q, find_limit bor', !stB2.byName.ai_ipf && !stB2.byName.ai_ip && stB2.byName.ai.find_limit === 1);
}

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nWorker testlari o\'tdi.');
process.exit(fails ? 1 : 0);
