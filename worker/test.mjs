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
check('beacon ichki sanoqqa yoza olmaydi (ai, ai_usd, ai_ip — byudjet va chegara)', parseBeacon(JSON.stringify({ e: [{ n: 'ai_usd', k: 'chat' }, { n: 'ai', k: 'q' }, { n: 'ai_ip', k: 'x' }, { n: 'ai_ipf', k: 'x' }, { n: 'ai_tok', k: 'input' }] }), '2026-09-09').length === 0);
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
const { runTool, buildSystem, TOOLS, parseAiBody, buildCards, mergeCart, toolAsk, parseCart, parseUrl, plainText, orderRules, costUsd, answerKey } = await import('./src/ai.js');
check('plainText: markdown belgilari olib tashlanadi, raqamli qadamlar qoladi', plainText('**Nike.com** — rasmiy.\n## Sarlavha\n- birinchi\n1. Qadam *muhim* `kod`') === 'Nike.com — rasmiy.\nSarlavha\n— birinchi\n1. Qadam muhim kod', JSON.stringify(plainText('**Nike.com** — rasmiy.\n## Sarlavha\n- birinchi\n1. Qadam *muhim* `kod`')));
import '../core/customs.js';
const Core = globalThis.PochtamCore;
/* AI_LINK_FETCH: havola testlari web_fetch zaxirasini ham tekshiradi (ishlab chiqarishda standart o'chiq — alohida test). */
const aiEnv = (extra = {}) => ({ ...env, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '3', AI_DAILY_TOTAL: '100', AI_LINK_FETCH: '1', ...extra });
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
  /* Havola o'qilmaydi: savol bilan kelgan url e'tiborsiz, web_fetch yo'q. */
  const seen3 = [];
  const r3 = await ask('Bu qancha turadi?', { AI_FETCH: async (u, i) => { seen3.push(JSON.parse(i.body)); return claudeText('ok'); } },
    { headers: { 'cf-connecting-ip': '2.2.2.11' }, body: { url: 'https://www.amazon.com/dp/B0X' } });
  check('url e\'tiborsiz: web_fetch yo\'q, xabarda havola yo\'q', r3.status === 200 && !(seen3[0].tools || []).some(t => /web_fetch/.test(t.type)) && !/amazon\.com\/dp/.test(JSON.stringify(seen3[0].messages)));
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
  !!orderRules('3-qadamni tushuntiring', [{ role: 'user', text: 'Men Taobao dan buyurtma qilmoqchiman' }]) && orderRules('krossovka qancha tushadi', []) === '' &&
  orderRules('boj to\'lovi qancha', []) === '' && !!orderRules('Uzcard kartasi o\'tadimi', []));
check('landed_cost: kategoriya ogohlantirishi natijada (promptdan ko\'chdi)', /Litiy batareya/.test(runTool('landed_cost', { priceUsd: 100, country: 'Xitoy', category: 'elektronika' }, tctx).caution || ''));
check('landed_cost: kategoriya id lari vosita tavsifida', /elektronika/.test(TOOLS.find(t => t.name === 'landed_cost').input_schema.properties.category.description));
/* Narx: Sonnet $2/$10, Haiku $1/$5; keshdan o'qish 0,1×, yozish 1,25×; qidiruv $0.01. */
check('costUsd: Sonnet — 1000 kirish + 10 000 keshdan + 100 chiqish = $0.005', Math.abs(costUsd('claude-sonnet-5', { input_tokens: 1000, cache_read_input_tokens: 10000, output_tokens: 100 }) - 0.005) < 1e-9);
check('costUsd: 1 soatlik kesh yozuvi 2× (Sonnet: 1000 → $0.004)', Math.abs(costUsd('claude-sonnet-5', { cache_creation_input_tokens: 1000, cache_creation: { ephemeral_1h_input_tokens: 1000 } }) - 0.004) < 1e-9);
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
/* Tovar fotosi (narxsiz): kind product, nom va inglizcha so'rov — ilova
   "Topish"ni shu so'rov bilan boshlaydi. Sxemada kind/query/brand. */
const photo = async () => new Response(JSON.stringify({ model: 'claude-haiku-4-5', stop_reason: 'end_turn', usage: { input_tokens: 1400, output_tokens: 70 },
  content: [{ type: 'text', text: JSON.stringify({ kind: 'product', name: 'Oq teri krossovka, Nike Air Force 1', brand: 'Nike', query: 'Nike Air Force 1 white sneakers', price: 0, currency: '', qty: 1, store: '', category: 'poyabzal', country: '', weightKg: 0, confidence: 0 }) }] }), { status: 200 });
const sp = await (await shot({ image: PNG1, mime: 'image/png', usdRate: 12650 }, { AI_FETCH: photo }, '3.3.3.7')).json();
check('shot: tovar fotosi — found=false, kind product, nom, brend, query, kartasiz', sp.shot.found === false && sp.shot.kind === 'product' && sp.shot.query === 'Nike Air Force 1 white sneakers' && sp.shot.brand === 'Nike' && sp.shot.category === 'poyabzal' && sp.cards.length === 0 && sp.stop === 'shot', JSON.stringify(sp.shot));
check('shot: sxemada kind (enum), query, brand', shotReq.output_config.format.schema.properties.kind.enum.join() === 'price,product,other' && ['kind', 'query', 'brand'].every(k => shotReq.output_config.format.schema.required.includes(k)));
/* Savat skrinshoti: bir nechta tovar — bitta jo'natma. */
const nm = normalizeShot({ kind: 'price', name: '', price: 0, currency: 'USD', store: 'Amazon', country: 'AQSh', category: '', weightKg: 0, confidence: 0.9,
  items: [{ name: 'Krossovka', price: 59.99, currency: 'USD', qty: 1, category: 'poyabzal', weightKg: 0 }, { name: 'Futbolka', price: 12.5, currency: 'USD', qty: 2, category: 'kiyim', weightKg: 0 },
    { name: 'Yetkazish', price: 0, currency: 'USD', qty: 1, category: '', weightKg: 0 }] }, 12650);
check('normalizeShot: savatda 2 tovar — jami 84.99 USD, "2 ta tovar", items, narxsiz qator tashlanadi', nm.found && nm.multi && nm.items.length === 2 && nm.price === 84.99 && nm.currency === 'USD' && nm.priceUsd === 84.99 && nm.qty === 1 && /^2 ta tovar: Krossovka, Futbolka/.test(nm.name) && nm.category === '' && nm.weightKg === 0 && nm.items[1].qty === 2, JSON.stringify(nm).slice(0, 200));
const nm2 = normalizeShot({ items: [{ name: 'A', price: 100, currency: 'CNY', qty: 1, category: 'kiyim va moda', weightKg: 0.5 }, { name: 'B', price: 20, currency: 'USD', qty: 1, category: 'kiyim va moda', weightKg: 0.3 }] }, 12650);
check('normalizeShot: turli valyuta — dollarda jami; vazn hammasida bor — yig\'indi; bir xil kategoriya', nm2.found && nm2.currency === 'USD' && nm2.price > 30 && nm2.price < 40 && nm2.weightKg === 0.8 && nm2.category === 'kiyim va moda', JSON.stringify(nm2).slice(0, 160));
const nm3 = normalizeShot({ name: '', price: 0, items: [{ name: 'Kurtka', price: 45, currency: 'EUR', qty: 1, category: 'kiyim', weightKg: 0 }] }, 12650);
check('normalizeShot: bitta tovar faqat items da — oddiy natija', nm3.found && !nm3.multi && nm3.name === 'Kurtka' && nm3.price === 45 && nm3.currency === 'EUR');
check('shot: sxemada items (nom, narx, valyuta, miqdor, kategoriya, vazn)', shotReq.output_config.format.schema.required.includes('items') && shotReq.output_config.format.schema.properties.items.items.required.join() === 'name,price,currency,qty,category,weightKg');
check('normalizeShot: narx bo\'lsa kind price; nomsiz product — other', normalizeShot({ kind: 'product', price: 10, currency: 'USD' }, 12650).kind === 'price' && normalizeShot({ kind: 'product', name: '' }, 12650).kind === 'other');
/* --- "Qidiruv so'zlari" (kw): tovar nomidan har do'kon tilida so'z --- */
{
  const { kwStores } = await import('./src/ai.js');
  const pk = parseAiBody(JSON.stringify({ q: 'suv idishi', kw: true, who: 'ayol', style: 'arzon', lang: 'uz' }));
  const pk2 = parseAiBody(JSON.stringify({ q: 'suv idishi', kw: 'ha', who: 'xxx', style: 'yoq' }));
  check('parseAiBody: kw true — who/style ro\'yxatdan; boshqa qiymat — kw yo\'q', pk.kw === true && pk.who === 'ayol' && pk.style === 'arzon' && pk2.kw === false && pk2.who === '' && pk2.style === '', JSON.stringify([pk.kw, pk.who, pk.style, pk2.kw]));
  const words = { en: 'water bottle', zh: '水杯', tr: 'su şişesi' };
  const ks = kwStores('universal', '', words);
  const tb = ks.find(s => s.id === 'taobao'), pdd = ks.find(s => s.id === 'pinduoduo'), am = ks.find(s => s.id === 'amazon');
  check('kwStores: Taobao xitoycha so\'z va qidiruv havolasi; Amazon inglizcha', tb && tb.lang === 'zh' && tb.query === '水杯' && tb.url === 'https://s.taobao.com/search?q=' + encodeURIComponent('水杯') && am && am.query === 'water bottle' && /amazon\.com\/s\?k=water\+bottle/.test(am.url), JSON.stringify([tb, am]));
  check('kwStores: Pinduoduo — havolasiz, faqat nusxa', pdd && pdd.copyOnly === true && pdd.url === '' && pdd.query === '水杯', JSON.stringify(pdd));
  check('kwStores: universal — Trendyol turkcha, ko\'pi bilan 6', ks.length <= 6 && ks.find(s => s.id === 'trendyol').query === 'su şişesi', ks.map(s => s.id).join());
  const ke = kwStores('elektronika', 'arzon', { en: 'wireless earbuds', zh: '蓝牙耳机', tr: 'kablosuz kulaklık' });
  check('kwStores: elektronika — Trendyol/Shein yo\'q', !ke.some(s => ['trendyol', 'shein'].includes(s.id)) && ke.length > 2, ke.map(s => s.id).join());
  const ko = kwStores('poyabzal', 'original', { en: 'Nike Air Force 1', zh: 'Nike Air Force 1 正品', tr: 'Nike Air Force 1' });
  check('kwStores: original poyabzal — brend do\'konlari, Poizon (nusxa) ham', ko.length > 2 && ko.some(s => s.id === 'poizon' && s.copyOnly) && !ko.slice(0, 2).some(s => ['pinduoduo', 'aliexpress'].includes(s.id)), ko.map(s => s.id).join());
  let kwReq = null;
  const fakeKw = async (u, i) => { kwReq = JSON.parse(i.body); return new Response(JSON.stringify({ model: 'claude-haiku-4-5', stop_reason: 'end_turn', usage: { input_tokens: 300, output_tokens: 60 },
    content: [{ type: 'text', text: JSON.stringify({ name: 'Suv idishi', category: 'universal', en: 'water bottle 1L', zh: '水杯 1升', tr: 'su şişesi 1 litre', tip: 'Taobao\'da 销量 bo\'yicha saralang' }) }] }), { status: 200 }); };
  const kr = await (await ask('suv idishi 1 litr', { AI_FETCH: fakeKw }, { headers: { 'cf-connecting-ip': '3.4.5.6' }, body: { kw: true, who: 'bola' } })).json();
  check('/ai kw: arzon model, sxema, javob — so\'zlar va do\'konlar, stop kw', kwReq.model === 'claude-haiku-4-5' && kwReq.output_config.format.schema.required.join() === 'name,category,en,zh,tr,tip' && /bolalar uchun/.test(kwReq.messages[0].content)
    && kr.stop === 'kw' && kr.text === '' && kr.kw.name === 'Suv idishi' && kr.kw.who === 'bola' && kr.kw.words.zh === '水杯 1升' && kr.kw.stores.length > 2 && kr.kw.stores.find(s => s.id === 'taobao').query === '水杯 1升' && /Taobao/.test(kr.kw.tip) && !kwReq.tools, JSON.stringify(kr).slice(0, 300));
  const kbad = await (await ask('nimadir', { AI_FETCH: async () => claudeText('json emas') }, { headers: { 'cf-connecting-ip': '3.4.5.7' }, body: { kw: true } })).json();
  check('/ai kw: JSON buzuq — nomi so\'rovdan, inglizcha so\'z so\'rovning o\'zi, kategoriya universal', kbad.kw.name === 'nimadir' && kbad.kw.words.en === 'nimadir' && kbad.kw.category === 'universal' && kbad.kw.stores.length > 0, JSON.stringify(kbad.kw).slice(0, 200));
  const kerr = await ask('x', { AI_FETCH: () => new Response('{}', { status: 529 }) }, { headers: { 'cf-connecting-ip': '3.4.5.8' }, body: { kw: true } });
  check('/ai kw: Claude yiqilsa 503', kerr.status === 503);
}
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

/* --- Havola o'qilmaydi (2026-10-03): eski ilova yuborgan link/url — e'tiborsiz. --- */
check('parseAiBody: faqat link yoki url — savol bo\'sh (400)', typeof parseAiBody(JSON.stringify({ link: 'https://a.com/x' })) === 'string' && typeof parseAiBody(JSON.stringify({ url: 'https://a.com/x' })) === 'string');
check('parseAiBody: savol + url — url e\'tiborsiz', (() => { const p = parseAiBody(JSON.stringify({ q: 'salom', url: 'https://a.com/x' })); return typeof p === 'object' && !('url' in p) && !('link' in p); })());

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
  check('kesh muddati standart 5 daqiqa (ttl yo\'q)', calls[0].system[0].cache_control.type === 'ephemeral' && !calls[0].system[0].cache_control.ttl && !calls[0].tools.find(t => t.cache_control).cache_control.ttl);
  check('usage: keshga yozish va taxminiy $ javobda', j1.usage.cacheWrite === 4000 && Math.abs(j1.usage.usd - 0.017) < 1e-9, JSON.stringify(j1.usage));
  check('buyurtma savoli — buyurtma bo\'limi keshdan keyingi blokda', calls[0].system.length >= 3 && !/## Qanday buyurtma/.test(calls[0].system[0].text) && calls[0].system.slice(1).some(b => /## Qanday buyurtma qilaman/.test(b.text)));
  const stB = await (await cB.fetch(new Request('https://counter/stats?days=1'))).json();
  check('sarf yoziladi: ai_usd (mikro-$, tur bo\'yicha), ai_tok, kun bo\'yicha $', stB.byName.ai_usd.chat === 17000 && stB.byName.ai_tok.cache_write === 4000 && stB.usdByDay[today] === 17000, JSON.stringify({ u: stB.byName.ai_usd, d: stB.usdByDay }));
  await askB('krossovka qancha tushadi', { AI_DAILY_USD: '0.02' }, {}, '9.9.9.2');
  check('oddiy savol — buyurtma bo\'limi qo\'shilmaydi', !calls[1].system.some(b => /## Qanday buyurtma qilaman/.test(b.text)));
  const over = await askB('yana savol', { AI_DAILY_USD: '0.02' }, {}, '9.9.9.3');
  const overJ = await over.json();
  check('kunlik $ byudjeti tugasa — 429 (limit, budget), Claude chaqirilmaydi', over.status === 429 && overJ.code === 'limit' && overJ.scope === 'budget' && calls.length === 2, JSON.stringify(overJ));
  /* Sifat sinovi: byudjet tugagan kunda ham ishlaydi (o'z byudjeti), sarfi
     ai_usd_eval da; model va fikrlash rejimi sarlavhadan (ro'yxatdagisi). */
  const evB = (hdr, extra = {}) => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': '9.9.9.9', ...hdr },
    body: JSON.stringify({ q: 'sinov savoli', lang: 'uz', usdRate: 12650 }) }), { ...envB, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '50', AI_DAILY_TOTAL: '100', AI_DAILY_USD: '0.02', AI_FETCH: costly, ...extra }, ctx);
  const e0 = calls.length;
  const evr = await evB({ 'x-pochtam-eval': 'sir', 'x-pochtam-model': 'claude-sonnet-5-5', 'x-pochtam-thinking': 'between_tools' });
  check('eval: foydalanuvchi byudjeti tugagan bo\'lsa ham 200; model va between_tools so\'rovda', evr.status === 200 && calls.length === e0 + 1 && calls[e0].model === 'claude-sonnet-5-5' && calls[e0].thinking && calls[e0].thinking.type === 'between_tools', JSON.stringify({ s: evr.status, m: calls[e0] && calls[e0].model, t: calls[e0] && calls[e0].thinking }));
  await evB({ 'x-pochtam-eval': 'sir', 'x-pochtam-model': 'claude-fable-5-1', 'x-pochtam-thinking': 'enabled' });
  check('eval: ro\'yxatdan tashqari model/rejim e\'tiborsiz — standart model, thinking yo\'q', calls[e0 + 1].model === 'claude-sonnet-5' && !calls[e0 + 1].thinking, JSON.stringify({ m: calls[e0 + 1].model, t: calls[e0 + 1].thinking }));
  const noEv = await evB({ 'x-pochtam-eval': 'notogri', 'x-pochtam-model': 'claude-sonnet-5-5' });
  check('eval parolisiz model sarlavhasi ishlamaydi (byudjet tugagan — 429)', noEv.status === 429 && calls.length === e0 + 2);
  await evB({}, { AI_DAILY_USD: '5', AI_THINKING: 'between_tools', AI_MODEL: 'claude-sonnet-5-5' });
  check('AI_THINKING=between_tools va AI_MODEL — oddiy so\'rovda ham', calls[e0 + 2].model === 'claude-sonnet-5-5' && calls[e0 + 2].thinking.type === 'between_tools');
  await new Promise(r => setTimeout(r, 30));
  const stE = await (await cB.fetch(new Request('https://counter/stats?days=1'))).json();
  check('eval sarfi ai_usd_eval da, foydalanuvchi kunlik $ (usdByDay) ga qo\'shilmaydi', stE.byName.ai_usd_eval && stE.byName.ai_usd_eval.chat === 34000 && stE.usdByDay[today] === 17000 * 2 + 17000, JSON.stringify({ e: stE.byName.ai_usd_eval, d: stE.usdByDay }));
  const n0 = calls.length;
  await askB('krossovka qayerdan', { AI_DAILY_FIND_PER_IP: '1' }, { find: true }, '9.9.9.4');
  await askB('krossovka qayerdan', { AI_DAILY_FIND_PER_IP: '1' }, { find: true }, '9.9.9.4');
  const hasWs = b => b.tools.some(t => t.type === 'web_search_20260209');
  check('"Qayerdan topaman" IP chegarasi: birinchisi qidiruv bilan, oshgani qidiruvsiz (rad emas)', calls.length === n0 + 2 && hasWs(calls[n0]) && !hasWs(calls[n0 + 1]));
  const stB2 = await (await cB.fetch(new Request('https://counter/stats?days=1'))).json();
  check('hisobotda ichki IP sanoqlari yo\'q, find_limit bor', !stB2.byName.ai_ipf && !stB2.byName.ai_ip && stB2.byName.ai.find_limit === 1);
}

/* --- Tayyor javob keshi: bir xil savol shu kuni — AI chaqirilmaydi. --- */
{
  const kv = new Map();
  const fakeKv = { get: async k => kv.get(k), put: async (k, v) => { kv.set(k, JSON.parse(JSON.stringify(v))); }, delete: async ks => { for (const k of [].concat(ks)) kv.delete(k); }, list: async ({ prefix }) => new Map([...kv].filter(([k]) => k.startsWith(prefix))) };
  const cC = new Counter({ storage: { sql: fakeSql(), ...fakeKv } }, { ALLOW_ORIGIN: 'https://x' });
  const envC = { ...env, COUNTER: { idFromName: () => 'main', get: () => ({ fetch: (u, i) => cC.fetch(new Request(u, i)) }) } };
  const waits = [];
  const ctxC = { waitUntil: p => { waits.push(p); return p; } };
  let n = 0, stopNext = 'end_turn';
  const fake = async () => { n++; return new Response(JSON.stringify({ model: 'claude-sonnet-5', stop_reason: stopNext, content: [{ type: 'text', text: 'Javob ' + n }], usage: { input_tokens: 100, output_tokens: 50 } }), { status: 200 }); };
  const askC = async (q, body = {}, extra = {}, ip) => { const r = await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': ip || '8.8.8.' + (n % 200) },
    body: JSON.stringify({ q, lang: 'uz', usdRate: 12650, ...body }) }), { ...envC, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '50', AI_DAILY_TOTAL: '100', AI_FETCH: fake, ...extra }, ctxC); await Promise.all(waits.splice(0)); return r; };
  const a1 = await (await askC('iPhone 15 qancha tushadi?')).json();
  const a2 = await (await askC('iphone 15  QANCHA tushadi')).json();
  check('javob keshi: bir xil savol (harf, bo\'shliq, ? farqi) — AI chaqirilmaydi, $0', n === 1 && a2.text === a1.text && a2.usage.cached === true && a2.usage.usd === 0, JSON.stringify({ n, a1: a1.text, a2: a2.text }));
  await askC('iphone 15 qancha tushadi', { lang: 'ru' });
  await askC('iphone 15 qancha tushadi', { find: true });
  await askC('iphone 15 qancha tushadi', { history: [{ role: 'user', text: 'salom' }, { role: 'assistant', text: 'salom' }] });
  await askC('iphone 15 qancha tushadi', { cart: { name: 'iPhone', price: 700, cur: 'USD', country: 'AQSh' } });
  check('javob keshi: boshqa til, rejim, tarix yoki joriy xarid — yangidan so\'raladi', n === 5, 'n=' + n);
  const sr = await askC('iphone 15 qancha tushadi', { stream: true });
  const sl = (await sr.text()).trim().split('\n').map(l => JSON.parse(l));
  check('javob keshi: oqim so\'rovi ham keshdan — NDJSON, bitta "done" qatori', n === 5 && /ndjson/.test(sr.headers.get('content-type')) && sl.length === 1 && sl[0].t === 'done' && sl[0].text === a1.text && sl[0].usage.cached, JSON.stringify(sl).slice(0, 120));
  stopNext = 'max_tokens';
  await askC('uzun savol'); await askC('uzun savol');
  check('javob keshi: kesilgan javob saqlanmaydi', n === 7, 'n=' + n);
  stopNext = 'end_turn';
  await askC('yoqilmagan kesh', {}, { AI_ANSWER_CACHE: '0' }); await askC('yoqilmagan kesh', {}, { AI_ANSWER_CACHE: '0' });
  check('AI_ANSWER_CACHE=0 — kesh yo\'q', n === 9, 'n=' + n);
  let emptyNext = true;
  const fakeEmpty = async () => { n++; const e = emptyNext; emptyNext = false; return new Response(JSON.stringify({ model: 'claude-sonnet-5', stop_reason: 'end_turn', content: e ? [] : [{ type: 'text', text: 'Javob ' + n }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }); };
  const e1 = await (await askC('bo\'sh javob', {}, { AI_FETCH: fakeEmpty })).json();
  const e2 = await (await askC('bo\'sh javob', {}, { AI_FETCH: fakeEmpty })).json();
  check('javob keshi: bo\'sh javob (zaxira matn) saqlanmaydi — keyingisi AI dan', e1.fallback === true && !e2.usage.cached && /^Javob \d+$/.test(e2.text), JSON.stringify([e1.text, e2.text]));
  const kwF = async () => { n++; return new Response(JSON.stringify({ model: 'claude-haiku-4-5', stop_reason: 'end_turn', usage: { input_tokens: 300, output_tokens: 60 },
    content: [{ type: 'text', text: JSON.stringify({ name: 'Choynak', category: 'universal', en: 'electric kettle', zh: '电热水壶', tr: 'su ısıtıcı', tip: '' }) }] }), { status: 200 }); };
  const nk = n;
  const kc1 = await (await askC('choynak', { kw: true }, { AI_FETCH: kwF })).json();
  const kc2 = await (await askC('choynak', { kw: true }, { AI_FETCH: kwF })).json();
  const kc3 = await (await askC('choynak', { kw: true, style: 'original' }, { AI_FETCH: kwF })).json();
  check('javob keshi: kw — bir xil so\'z keshdan, boshqa tanlov (original) — yangi', n === nk + 2 && kc1.kw && kc2.kw && kc2.usage.cached === true && kc2.kw.words.zh === '电热水壶' && !kc3.usage.cached && kc3.kw.style === 'original', 'n=' + (n - nk));
  const n1 = n;
  await askC('qidiruvli savol', { find: true }, { AI_DAILY_FIND_PER_IP: '1' }, '7.7.7.7');
  await askC('qidiruvli savol 2', { find: true }, { AI_DAILY_FIND_PER_IP: '1' }, '7.7.7.7');
  await askC('qidiruvli savol 2', { find: true }, { AI_DAILY_FIND_PER_IP: '1' }, '7.7.7.7');
  check('javob keshi: chegara tufayli qidiruvsiz javob qidiruv kalitida saqlanmaydi', n === n1 + 3, 'n=' + (n - n1));
  const k1 = await answerKey({ q: 'x', history: [], lang: 'uz', usdRate: 12650 }, '2026-09-29', 'a');
  const k2 = await answerKey({ q: 'x', history: [], lang: 'uz', usdRate: 12650 }, '2026-09-29', 'b');
  check('answerKey: model/ko\'rsatma o\'zgarsa boshqa kalit', k1 && k2 && k1 !== k2);
  /* Sifat sinovi: to'g'ri parol — keshsiz va IP chegarasisiz; noto'g'ri — oddiy. */
  const evalAsk = (tok, ip = '6.6.6.6') => worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': ip, 'x-pochtam-eval': tok },
    body: JSON.stringify({ q: 'iphone 15 qancha tushadi', lang: 'uz', usdRate: 12650 }) }), { ...envC, ANTHROPIC_API_KEY: 'sk-test', AI_DAILY_PER_IP: '1', AI_DAILY_TOTAL: '100', AI_FETCH: fake }, ctxC);
  const ne = n;
  const ev1 = await (await evalAsk('sir')).json(), ev2 = await evalAsk('sir');
  check('eval paroli: tayyor javob ishlatilmaydi, IP chegarasi yo\'q', n === ne + 2 && !ev1.usage.cached && ev2.status === 200, 'n=' + (n - ne));
  const bad = await (await evalAsk('notogri', '6.6.6.7')).json();
  check('noto\'g\'ri eval paroli — oddiy so\'rov (tayyor javob)', bad.usage && bad.usage.cached === true && n === ne + 2);
  const stC = await (await cC.fetch(new Request('https://counter/stats?days=1'))).json();
  check('hisobotda cache_hit sanaladi', stC.byName.ai.cache_hit === 4, JSON.stringify(stC.byName.ai));
  kv.set('a:eski', { day: '2020-01-01', body: { text: 'x' } });
  await cC.fetch(new Request('https://counter/purge', { method: 'DELETE' }));
  check('purge: eski kunning tayyor javoblari o\'chadi, bugungisi qoladi', !kv.has('a:eski') && [...kv.keys()].some(k => k.startsWith('a:')));
}

/* --- Gemini zaxirasi (2026-10-07): Claude so'rovi ↔ Gemini, avtomatik o'tish --- */
{
  const { toGemini, fromGemini, partsToBlocks } = await import('./src/gemini.js');
  const { shouldFallback } = await import('./src/ai.js');
  const PNGg = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  /* toGemini: tizim bloklari, rollar, rasm, vositalar, Claude chaqiruviga maxsus imzo, natija nom bilan, JSON sxema. */
  const gb = toGemini({ model: 'claude-sonnet-5', max_tokens: 900,
    system: [{ type: 'text', text: 'Qoidalar', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'Bu so\'rov: web_search bilan top' }, { type: 'text', text: 'Bugun: 2026-10-07' }],
    tools: [{ name: 'customs_duty', description: 'Boj', input_schema: { type: 'object', properties: { goodsUsd: { type: 'number' } }, required: ['goodsUsd'] }, cache_control: { type: 'ephemeral' } }, { type: 'web_search_20260209', name: 'web_search', max_uses: 1 }],
    messages: [{ role: 'user', content: 'avvalgi savol' }, { role: 'assistant', content: 'avvalgi javob' },
      { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNGg } }, { type: 'text', text: 'boj?' }] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: 'x', signature: 's' }, { type: 'tool_use', id: 'toolu_1', name: 'customs_duty', input: { goodsUsd: 320 } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"dutyUsd":36}' }] }],
    output_config: { format: { type: 'json_schema', schema: { type: 'object', properties: { a: { type: 'string' } } } } } }, {});
  const fd = gb.tools && gb.tools[0].functionDeclarations;
  check('toGemini: tizim bitta matn (web_search ko\'rsatmasi qidiruvsiz olib tashlanadi), rollar user/model', gb.systemInstruction.parts[0].text === 'Qoidalar\n\nBugun: 2026-10-07' && gb.contents.map(c => c.role).join() === 'user,model,user,model,user', JSON.stringify(gb.systemInstruction));
  check('toGemini: rasm inlineData, matn yonida', gb.contents[2].parts[0].inlineData.mimeType === 'image/png' && gb.contents[2].parts[0].inlineData.data === PNGg && gb.contents[2].parts[1].text === 'boj?');
  check('toGemini: vosita functionDeclarations (parametersJsonSchema), server vositasi (web_search) yo\'q', fd.length === 1 && fd[0].name === 'customs_duty' && fd[0].parametersJsonSchema.required[0] === 'goodsUsd' && !fd[0].cache_control && gb.tools.length === 1, JSON.stringify(gb.tools));
  check('toGemini: Claude chaqiruvi — thinking tashlanadi, functionCall maxsus imzo bilan; natija functionResponse (nom bilan)', gb.contents[3].parts.length === 1 && gb.contents[3].parts[0].functionCall.name === 'customs_duty' && gb.contents[3].parts[0].functionCall.args.goodsUsd === 320 && gb.contents[3].parts[0].thoughtSignature === 'skip_thought_signature_validator'
    && gb.contents[4].parts[0].functionResponse.name === 'customs_duty' && gb.contents[4].parts[0].functionResponse.response.dutyUsd === 36 && !gb.contents[4].parts[0].functionResponse.id, JSON.stringify(gb.contents.slice(3)));
  check('toGemini: JSON sxema responseJsonSchema, max_tokens maxOutputTokens, fikrlash sozlanmasa yuborilmaydi', gb.generationConfig.responseMimeType === 'application/json' && gb.generationConfig.responseJsonSchema.properties.a && gb.generationConfig.maxOutputTokens === 900 && !gb.generationConfig.thinkingConfig);
  check('toGemini: GEMINI_SEARCH=1 — googleSearch; GEMINI_THINKING=low — thinkingLevel LOW; tool_choice tool — ANY', (() => { const g2 = toGemini({ tools: [{ name: 'a', input_schema: { type: 'object' } }, { type: 'web_search_20260209', name: 'web_search' }], tool_choice: { type: 'tool', name: 'a' }, messages: [{ role: 'user', content: 'x' }] }, { GEMINI_SEARCH: '1', GEMINI_THINKING: 'low' });
    return g2.tools.length === 2 && !!g2.tools[1].googleSearch && g2.generationConfig.thinkingConfig.thinkingLevel === 'LOW' && g2.toolConfig.functionCallingConfig.mode === 'ANY' && g2.toolConfig.functionCallingConfig.allowedFunctionNames[0] === 'a'; })());
  /* fromGemini */
  const fg = fromGemini({ modelVersion: 'gemini-2.5-flash', candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: 'Hisob', thoughtSignature: 'S0' }, { text: 'layman' }, { functionCall: { name: 'customs_duty', args: { goodsUsd: 50 } }, thoughtSignature: 'S1' }, { functionCall: { name: 'courier_quotes', args: { kg: 1 } } }] } }],
    usageMetadata: { promptTokenCount: 1200, cachedContentTokenCount: 200, candidatesTokenCount: 80, thoughtsTokenCount: 20 } }, 'm');
  check('fromGemini: matn birlashadi (imzo bilan), 2 ta tool_use (birinchisida imzo), stop tool_use, usage', fg.content.length === 3 && fg.content[0].text === 'Hisoblayman' && fg.content[0].gsig === 'S0' && fg.content[1].type === 'tool_use' && fg.content[1].gsig === 'S1' && !fg.content[2].gsig && fg.content[1].gsrc && fg.stop_reason === 'tool_use'
    && fg.usage.input_tokens === 1000 && fg.usage.cache_read_input_tokens === 200 && fg.usage.output_tokens === 100 && fg.model === 'gemini-2.5-flash', JSON.stringify(fg));
  check('fromGemini: SAFETY / promptFeedback.blockReason — refusal; MAX_TOKENS — max_tokens', fromGemini({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }).stop_reason === 'refusal' && fromGemini({ promptFeedback: { blockReason: 'OTHER' } }).stop_reason === 'refusal' && fromGemini({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'a' }] } }] }).stop_reason === 'max_tokens');
  check('partsToBlocks: fikr qismlari (thought) tashlanadi, bo\'sh qismdagi imzo oxirgi blokka', (() => { const b = partsToBlocks([{ text: 'ichki', thought: true }, { text: 'Javob' }, { text: '', thoughtSignature: 'Z' }]); return b.length === 1 && b[0].text === 'Javob' && b[0].gsig === 'Z'; })());
  check('shouldFallback: kredit/chegara (400), kalit, 429/529/5xx, tarmoq — ha; oddiy 400 — yo\'q', shouldFallback({ error: 'You have reached your specified API usage limits.', status: 400 }) && shouldFallback({ error: 'x', status: 529 }) && shouldFallback({ error: 'x', status: 0 }) && shouldFallback({ error: 'x', status: 401 }) && !shouldFallback({ error: 'messages: bad', status: 400 }));
  check('costUsd: Gemini Flash narxi ($0.5/$3), Flash-Lite arzonroq', Math.abs(costUsd('gemini-2.5-flash', { input_tokens: 1e6, output_tokens: 1e6 }) - 3.5) < 1e-9 && costUsd('gemini-2.5-flash-lite', { input_tokens: 1e6, output_tokens: 0 }) === 0.1);

  /* Jonli yo'l: Claude chegarada (400 usage limits) → Gemini, vosita sikli. */
  const limitRes = () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.' } }), { status: 400 });
  const gsent = []; let gn = 0, aCalls = 0;
  const gemFake = async (u, i) => {
    if (/anthropic/.test(u)) { aCalls++; return limitRes(); }
    gsent.push({ url: u, key: i.headers['x-goog-api-key'], body: JSON.parse(i.body) }); gn++;
    const parts = gn === 1 ? [{ functionCall: { name: 'customs_duty', args: { goodsUsd: 320, kg: 2.5 } }, thoughtSignature: 'SIG1' }] : [{ text: '**Boj** 36 dollar. Taxminiy.' }];
    return new Response(JSON.stringify({ modelVersion: 'gemini-2.5-flash', candidates: [{ finishReason: 'STOP', content: { role: 'model', parts } }], usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: 40 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const gr = await (await ask('320 dollarlik 2.5 kg tovar uchun boj qancha?', { AI_FETCH: gemFake, GEMINI_API_KEY: 'g-test' }, { headers: { 'cf-connecting-ip': '7.1.1.1' } })).json();
  const r2 = gsent[1] && gsent[1].body.contents;
  check('zaxira: Claude chegarada → Gemini javob beradi (matn markdownsiz, boj kartasi, model gemini)', gr.text === 'Boj 36 dollar. Taxminiy.' && gr.cards[0].type === 'duty' && gr.tools.join() === 'customs_duty' && /gemini/.test(gr.model) && gr.usage.usd > 0 && gr.usage.gemini === 1, JSON.stringify(gr).slice(0, 240));
  check('zaxira: Gemini so\'rovi — kalit sarlavhada, generateContent; 2-raundda functionCall imzosi (SIG1) va functionResponse', /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent$/.test(gsent[0].url) && gsent[0].key === 'g-test'
    && r2 && r2[r2.length - 2].role === 'model' && r2[r2.length - 2].parts[0].thoughtSignature === 'SIG1' && r2[r2.length - 1].parts[0].functionResponse.name === 'customs_duty' && r2[r2.length - 1].parts[0].functionResponse.response.dutyUsd >= 0, JSON.stringify(r2 && r2.slice(-2)).slice(0, 300));
  check('zaxira: suhbat Gemini\'da qoladi — 2-raundda Claude chaqirilmaydi', aCalls === 1 && gn === 2, 'claude=' + aCalls + ' gemini=' + gn);
  /* Gemini ham ishlamasa — asl xato kodi (billing). */
  const both = await ask('x', { AI_FETCH: async u => /anthropic/.test(u) ? limitRes() : new Response(JSON.stringify({ error: { code: 503, message: 'overloaded', status: 'UNAVAILABLE' } }), { status: 503 }), GEMINI_API_KEY: 'g' }, { headers: { 'cf-connecting-ip': '7.1.1.2' } });
  check('zaxira: Gemini ham yiqilsa — 503 va asl sabab (billing)', both.status === 503 && (await both.json()).code === 'billing');
  /* AI_GEMINI_FALLBACK=0 — zaxira o'chiq; oddiy 400 — zaxiraga o'tmaydi. */
  let gTouched = 0;
  await ask('x', { AI_FETCH: async u => { if (!/anthropic/.test(u)) gTouched++; return limitRes(); }, GEMINI_API_KEY: 'g', AI_GEMINI_FALLBACK: '0' }, { headers: { 'cf-connecting-ip': '7.1.1.3' } });
  await ask('x', { AI_FETCH: async u => { if (!/anthropic/.test(u)) gTouched++; return new Response(JSON.stringify({ error: { type: 'invalid_request_error', message: 'messages: bad' } }), { status: 400 }); }, GEMINI_API_KEY: 'g' }, { headers: { 'cf-connecting-ip': '7.1.1.4' } });
  check('zaxira: AI_GEMINI_FALLBACK=0 va oddiy 400 da Gemini chaqirilmaydi', gTouched === 0, 'gemini=' + gTouched);
  /* Skrinshot: Claude yuklamada (529) → Gemini rasmni JSON sxema bilan o'qiydi. */
  let shotReqG = null;
  const shotG = await (await shot({ image: 'data:image/png;base64,' + PNGg, lang: 'uz', usdRate: 12650 }, { AI_FETCH: async (u, i) => { if (/anthropic/.test(u)) return new Response('{"error":{"type":"overloaded_error","message":"Overloaded"}}', { status: 529 }); shotReqG = JSON.parse(i.body);
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ kind: 'price', name: 'Nike Air Max 90', brand: 'Nike', query: '', price: 129.99, currency: 'USD', qty: 1, store: 'Nike', category: 'poyabzal', country: 'AQSh', weightKg: 0, confidence: 0.9, items: [] }) }] } }], usageMetadata: { promptTokenCount: 1300, candidatesTokenCount: 90 } }), { status: 200 }); }, GEMINI_API_KEY: 'g', GEMINI_SHOT_MODEL: 'gemini-2.5-flash-lite' }, '7.1.1.5')).json();
  check('zaxira: skrinshot Gemini\'da — rasm inlineData, sxema, arzon model; narx o\'qildi', shotG.shot && shotG.shot.found && shotG.shot.priceUsd === 129.99 && shotReqG.contents[0].parts.some(p => p.inlineData) && shotReqG.generationConfig.responseJsonSchema && shotG.stop === 'shot', JSON.stringify(shotG.shot || shotG).slice(0, 160));
  /* Qidiruv so'zlari: Claude kaliti yo'q, faqat Gemini — darhol Gemini. */
  let kwUrl = '';
  const kwG = await (await worker.fetch(new Request('https://w/ai', { method: 'POST', headers: { origin: 'https://x', 'cf-connecting-ip': '7.1.1.6' }, body: JSON.stringify({ q: 'termos 1 litr', kw: true, lang: 'uz' }) }),
    { ...env, GEMINI_API_KEY: 'g', AI_DAILY_PER_IP: '3', AI_DAILY_TOTAL: '100', AI_FETCH: async (u) => { kwUrl = u; return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ name: 'Termos', category: 'universal', en: 'thermos 1L', zh: '保温杯 1升', tr: 'termos 1 litre', tip: '' }) }] } }] }), { status: 200 }); } }, ctx)).json();
  check('faqat Gemini kaliti: qidiruv so\'zlari Gemini\'da (Claude chaqirilmaydi)', /generativelanguage/.test(kwUrl) && kwG.kw && kwG.kw.words.zh === '保温杯 1升' && kwG.kw.stores.length > 2, JSON.stringify(kwG).slice(0, 160));
  const stG = await worker.fetch(new Request('https://w/ai/status', { headers: { origin: 'https://x' } }), { ...env, GEMINI_API_KEY: 'g' }, ctx);
  check('/ai/status: faqat Gemini kaliti bo\'lsa ham ai:true', (await stG.json()).ai === true);
  /* Oqim: Claude 529 → Gemini SSE (alt=sse), matn bo'laklari ilovaga. */
  let sseUrl = '';
  const gss = await ask('boj qancha?', { AI_FETCH: async (u) => { if (/anthropic/.test(u)) return new Response('{"error":{"type":"overloaded_error","message":"Overloaded"}}', { status: 529 }); sseUrl = u;
    const ev = [{ candidates: [{ content: { role: 'model', parts: [{ text: 'Boj ' }] } }] }, { candidates: [{ content: { role: 'model', parts: [{ text: 'yo\'q.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 5 }, modelVersion: 'gemini-2.5-flash' }];
    return new Response(ev.map(e => 'data: ' + JSON.stringify(e) + '\r\n\r\n').join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } }); }, GEMINI_API_KEY: 'g' }, { headers: { 'cf-connecting-ip': '7.1.1.7' }, body: { stream: true } });
  const gls = await lines(gss); const gdone = gls.find(l => l.t === 'done') || {};
  check('zaxira oqimi: streamGenerateContent?alt=sse, matn bo\'laklari, done (gemini)', /:streamGenerateContent\?alt=sse$/.test(sseUrl) && gls.filter(l => l.t === 'text').map(l => l.d).join('') === 'Boj yo\'q.' && gdone.text === 'Boj yo\'q.' && /gemini/.test(gdone.model), JSON.stringify(gls).slice(0, 240));
  /* Model ro'yxati: birinchisi band (503 high demand) — keyingisi javob beradi. */
  const chainUrls = [];
  const chain = await (await ask('boj?', { AI_FETCH: async (u) => { if (/anthropic/.test(u)) return limitRes(); chainUrls.push(u);
    if (/gemini-3\.8-flash/.test(u)) return new Response(JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' } }), { status: 503 });
    return new Response(JSON.stringify({ modelVersion: 'gemini-3.7-flash', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Javob' }] } }] }), { status: 200 }); }, GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-3.8-flash, gemini-3.7-flash,gemini-2.5-flash' }, { headers: { 'cf-connecting-ip': '7.1.2.1' } })).json();
  check('Gemini model ro\'yxati: band model (503) — keyingisi; 3 tadan ortiq urinish yo\'q', chain.text === 'Javob' && chain.model === 'gemini-3.7-flash' && chainUrls.length === 2 && /gemini-3\.7-flash:generateContent/.test(chainUrls[1]), JSON.stringify(chainUrls));
  /* Sinov: x-pochtam-provider: gemini (faqat eval paroli bilan) — Claude chaqirilmaydi. */
  let evA = 0, evG = 0;
  const evFake = async u => { if (/anthropic/.test(u)) { evA++; return claudeText('c'); } evG++; return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'g' }] } }] }), { status: 200 }); };
  await ask('salom', { AI_FETCH: evFake, GEMINI_API_KEY: 'g' }, { headers: { 'cf-connecting-ip': '7.1.1.8', 'x-pochtam-eval': 'sir', 'x-pochtam-provider': 'gemini' } });
  await ask('salom 2', { AI_FETCH: evFake, GEMINI_API_KEY: 'g' }, { headers: { 'cf-connecting-ip': '7.1.1.9', 'x-pochtam-eval': 'notogri', 'x-pochtam-provider': 'gemini' } });
  check('eval: x-pochtam-provider gemini faqat to\'g\'ri parol bilan', evG === 1 && evA === 1, 'gemini=' + evG + ' claude=' + evA);
}

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nWorker testlari o\'tdi.');
process.exit(fails ? 1 : 0);
