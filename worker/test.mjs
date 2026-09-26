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
const { runTool, buildSystem, TOOLS, parseAiBody, buildCards, mergeCart, toolAsk, parseCart, parseUrl, plainText } = await import('./src/ai.js');
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
  check('find: web_search vositasi qo\'shiladi (max_uses 2) va ko\'rsatma', !!ws && ws.max_uses === 2 && fcalls[0].system.some(b => /web_search/.test(b.text)), JSON.stringify(ws));
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
check('tizim ko\'rsatmasi: qoidalar, me\'yor, kuryer va do\'kon indeksi', /HECH QACHON o'zing/.test(sys) && /"freeUsd":200/.test(sys) && /MYMEEST/.test(sys) && /"name":"Taobao"/.test(sys) && /Giyohvandlik/.test(sys), sys.length + ' belgi');
check('tizim ko\'rsatmasida kalit yo\'q', !/sk-/.test(sys));
/* Indeks: og'ir matn maydonlari promptga tushmaydi — ular vositalardan
   keladi (find_store, check_banned, courier_quotes). Bu tekshiruv
   maydon qaytib qo'shilib qolishidan saqlaydi. */
check('tizim ko\'rsatmasi indeks: og\'ir maydonlar promptda yo\'q',
  !/"returns":/.test(sys) && !/"complexity":/.test(sys) && !/"limits":/.test(sys) && !/"domain":/.test(sys) && !/"note":/.test(sys));
/* 24 000: qoidalar qisqartirildi (takror va ziddiyatlar olib tashlandi,
   o'lcham jadvali va veb-qidiruv ko'rsatmasi vositaga/dinamik blokka
   ko'chdi) — 26 700 dan 22 600 ga. Oshirishdan oldin: buni vosita bera oladimi? */
check('tizim ko\'rsatmasi byudjeti: 24 000 belgidan kichik', sys.length < 24000, sys.length + ' belgi');
check('tizim ko\'rsatmasi keshlanadi (bir kunda bir marta tuziladi)', buildSystem() === sys);
check('kuryerlar indeksida "Buy for me" (buy) — haqi bilan, yo\'q bo\'lsa maydon yo\'q', /"name":"BOXETTE"[^}]*"buy":"Mavjud, 10% \(min \$5\)"/.test(sys) && !/"name":"D2D"[^}]*"buy"/.test(sys), (sys.match(/"name":"BOXETTE"[^}]*}/) || [''])[0]);
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

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nWorker testlari o\'tdi.');
process.exit(fails ? 1 : 0);
