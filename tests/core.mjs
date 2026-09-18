/* Pochtam Core testlari (tarmoqsiz, brauzersiz): boj formulasi va yordamchi
   funksiyalar. Qiymatlar qo'lda hisoblangan — VMQ 244-son qoidasi bo'yicha.
   `node tests/core.mjs` */
import { readFileSync } from 'node:fs';
/* Fayl oddiy skript: globalThis.PochtamCore ni o'rnatadi (brauzer, Worker va
   Node'da bir xil). */
import '../core/customs.js';
import '../core/tariffs.js';
import '../core/landed.js';
const core = globalThis.PochtamCore;
const normsFile = JSON.parse(readFileSync(new URL('../data/norms.json', import.meta.url), 'utf8'));

let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? '  ok  ' : ' XATO '} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const near = (a, b, eps = 0.005) => Math.abs(a - b) <= eps;

const N = { freeUsd: 200, dutyPct: 0.30, minPerKg: 3, bhm: 440000, feeShare: 0.25 };
const RATE = 12650;

/* Kalkulyatorning standart misoli: $320, 2,5 kg, $9/kg. Ortiqcha $120, unga
   to'g'ri keladigan vazn 0,9375 kg, yetkazish ulushi $8,44; bojxona qiymati
   $128,44; 30% = $38,53 > 0,9375 × $3; boj 487 420 so'm + yig'im 110 000. */
const a = core.customsDuty({ goodsUsd: 320, shipUsd: 2.5 * 9, kg: 2.5, norms: N, usdRate: RATE });
check('misol: bojxona qiymati $128,44', near(a.cv, 128.4375), a.cv.toFixed(4));
check('misol: boj $38,53 (qiymat bo\'yicha)', near(a.dutyUsd, 38.53125) && a.basis === 'value', a.dutyUsd.toFixed(4) + ' ' + a.basis);
check('misol: boj 487 420 so\'m, yig\'im 110 000, jami 597 420', Math.round(a.dutyUzs) === 487420 && a.feeUzs === 110000 && Math.round(a.totalUzs) === 597420, `${Math.round(a.dutyUzs)} ${a.feeUzs} ${Math.round(a.totalUzs)}`);
check('misol: yig\'im dollarda', near(a.feeUsd, 110000 / RATE), a.feeUsd.toFixed(3));

/* Me'yor ichida: boj ham, yig'im ham yo'q. */
const b = core.customsDuty({ goodsUsd: 150, shipUsd: 5, kg: 1, norms: N, usdRate: RATE });
check('me\'yor ichida: 0', b.dutyUsd === 0 && b.feeUzs === 0 && b.basis === 'none' && b.totalUzs === 0);

/* Aynan me'yorda ($200): ortiqcha 0 → to'lov yo'q. */
const c = core.customsDuty({ goodsUsd: 200, shipUsd: 20, kg: 2, norms: N, usdRate: RATE });
check('aynan me\'yorda: 0', c.dutyUsd === 0 && c.basis === 'none');

/* Og'ir va arzon: vazn bo'yicha hisob ustun. $205, 0,4 kg? yo'q — $1000, 10 kg, $4/kg:
   ortiqcha $800, ulush 0,8, vazn 8 kg → $24; qiymat: cv = 800 + 40×0,8 = 832 → $249,6.
   Vazn ustun bo'lishi uchun: $220, 30 kg, $1/kg: ortiqcha 20, ulush 0,0909, vazn 2,727 kg → $8,18;
   cv = 20 + 30×0,0909 = 22,73 → 30% = $6,82 → vazn bo'yicha $8,18. */
const d = core.customsDuty({ goodsUsd: 220, shipUsd: 30, kg: 30, norms: N, usdRate: RATE });
check('vazn bo\'yicha hisob ustun', d.basis === 'weight' && near(d.dutyUsd, 30 * (20 / 220) * 3), d.dutyUsd.toFixed(4) + ' ' + d.basis);

/* Oyda avval ishlatilgan me'yor: qolgan $100 bilan. */
const e = core.customsDuty({ goodsUsd: 150, shipUsd: 10, kg: 1, freeUsd: 100, norms: N, usdRate: RATE });
check('qolgan me\'yor $100: ortiqcha $50', near(e.excessGoods, 50) && near(e.cv, 50 + 10 * (50 / 150)), e.cv.toFixed(4));

/* Manfiy va bo'sh kirishlar buzmaydi. */
const f = core.customsDuty({ goodsUsd: -5, shipUsd: 'x', kg: null, norms: N, usdRate: RATE });
check('manfiy/bo\'sh kirish → 0', f.dutyUsd === 0 && f.totalUzs === 0 && f.cv === 0);
const g = core.customsDuty({ goodsUsd: '320', shipUsd: '22,5', kg: '2,5', norms: N, usdRate: String(RATE) });
check('satr kirish (vergul bilan) raqamdek', near(g.dutyUsd, 38.53125), g.dutyUsd.toFixed(4));

/* Me'yorlar bo'sh bo'lsa (yuklanmagan) — 0, xato emas. */
const h = core.customsDuty({ goodsUsd: 320, shipUsd: 20, kg: 2, norms: {}, usdRate: RATE });
check('me\'yorsiz → 0 (formula raqam to\'qimaydi)', h.dutyUsd === 0 && h.feeUzs === 0);

/* normsAt: sanaga mos oxirgi qator. */
const list = [{ from: '2025-08-01', bhm: 412000 }, { from: '2026-09-01', bhm: 440000 }];
check('normsAt: 2026-09-15 → 440 000', core.normsAt(list, '2026-09-15').bhm === 440000);
check('normsAt: 2026-08-31 → 412 000', core.normsAt(list, '2026-08-31').bhm === 412000);
check('normsAt: juda erta sana → birinchi qator', core.normsAt(list, '2020-01-01').bhm === 412000);
check('normsAt: bo\'sh → null', core.normsAt([], '2026-01-01') === null);

/* data/norms.json bilan mos: bugungi me'yor 440 000 va misol 597 420. */
const today = core.normsAt(normsFile.norms);
const j = core.customsDuty({ goodsUsd: 320, shipUsd: 22.5, kg: 2.5, norms: today, usdRate: RATE });
check('data/norms.json bilan misol 597 420', Math.round(j.totalUzs) === 597420 && today.src, Math.round(j.totalUzs) + ' · ' + (today.src || ''));

/* Hajmiy og'irlik. */
check('hajmiy: 40×30×30 / 5000 = 7,2 kg', near(core.volumetricKg(40, 30, 30, 5000), 7.2));
check('hajmiy: bo\'luvchi berilmasa 5000', near(core.volumetricKg(50, 50, 40), 20));
check('hisob og\'irligi: kattasi', core.billableKg(2.5, 7.2) === 7.2 && core.billableKg(9, 7.2) === 9);

/* ---- Tariflar (core/tariffs.js + data/tariffs.json) ---- */
const TAR = JSON.parse(readFileSync(new URL('../data/tariffs.json', import.meta.url), 'utf8'));
const src = readFileSync(new URL('../Xarid Yordamchisi v2.dc.html', import.meta.url), 'utf8');
const ci = src.indexOf('const COURIERS = '); const cj = src.indexOf('\n', ci);
const COURIERS = new Function('return ' + src.slice(ci + 17, cj).replace(/;$/, ''))();
/* Har kuryerning har tarif qatori jadvalda bor va matni o'sha. */
let missing = 0, textMismatch = 0, rows = 0;
for (const c of COURIERS) (c.tariffs || []).forEach((t, i) => {
  rows++;
  const r = (TAR.couriers[c.id] || [])[i];
  if (!r) missing++; else if (r.text !== t.v || r.c !== t.c) textMismatch++;
});
check(`tariflar: ${rows} qator jadvalda, matn mos`, !missing && !textMismatch, `yo'q: ${missing}, farq: ${textMismatch}`);
const quoteRows = Object.values(TAR.couriers).flat().filter(t => t.kind === 'quote').length;
check('tariflar: hamma qator hisoblanadigan (quote yo\'q)', quoteRows === 0, quoteRows + ' ta quote');
check('tariflar: fx EUR va GBP bor', TAR.fx.EUR > 0.5 && TAR.fx.GBP > 0.5);

const FX = TAR.fx, opt = { fx: FX, usdRate: RATE };
const my = TAR.couriers.mymeest;
const uk = my.find(t => t.c === 'Angliya');
check('MYMEEST Angliya 0,3 kg → 7 GBP posilka', near(core.tariffCost(uk, 0.3, opt).amount, 7) && near(core.tariffCost(uk, 0.3, opt).usd, 7 * FX.GBP));
check('MYMEEST Angliya 0,8 kg → 8,25 GBP', near(core.tariffCost(uk, 0.8, opt).amount, 8.25));
check('MYMEEST Angliya 2 kg → 19 GBP (9,5 × 2)', near(core.tariffCost(uk, 2, opt).amount, 19));
const over = core.tariffCost(uk, 31, opt);
check('MYMEEST Angliya 31 kg → chegaradan tashqari', !over.ok && over.over);
const us = my.find(t => t.c === 'AQSh');
check('MYMEEST AQSh 2 kg → 0,95 × 20 = $19', near(core.tariffCost(us, 2, opt).usd, 19));
check('MYMEEST AQSh 0,4 kg → $4,75 posilka', near(core.tariffCost(us, 0.4, opt).usd, 4.75));
const mc = TAR.couriers.meestchina[0];
const mcq = core.tariffCost(mc, 3, opt);
check('MEEST China 3 kg → $30 ("dan" belgisi bilan)', near(mcq.usd, 30) && mcq.from === true);
check('perkg: 0,2 kg uchun eng kam 0,5 kg hisoblanadi', near(core.tariffCost(mc, 0.2, opt).usd, 5));
const ase = TAR.couriers.ase[0];
check('ASE Turkiya 1,2 kg → 175 000 so\'m → $' + (175000 / RATE).toFixed(2), near(core.tariffCost(ase, 1.2, opt).amount, 175000) && near(core.tariffCost(ase, 1.2, opt).usd, 175000 / RATE, 0.01));
check('ASE Turkiya 3 kg → narx so\'raladi (chegara 2 kg)', !core.tariffCost(ase, 3, opt).ok);
check('quote qator → ok=false', !core.tariffCost({ kind: 'quote' }, 1, opt).ok);
check('countryKey: AQSh/USA/Amerika bir xil', core.countryKey('AQSh') === core.countryKey('USA') && core.countryKey('Amerika') === 'aqsh');
check('countryKey: Angliya/Buyuk Britaniya/UK bir xil', core.countryKey('Buyuk Britaniya') === 'angliya' && core.countryKey('UK') === 'angliya');

/* Xitoy → 2 kg: takliflar va tartib. */
const q = core.courierQuotes({ couriers: COURIERS, tariffs: TAR, country: 'Xitoy', kg: 2, usdRate: RATE });
check('Xitoy 2 kg: kamida 8 ta taklif', q.length >= 8, q.length + ' ta');
check('Xitoy takliflari faqat Xitoy tarifidan', q.every(x => core.countryKey(x.country) === 'xitoy'));
const cheap = core.rankQuotes(q, 'cheap');
check('eng arzon birinchi', cheap[0].ok && cheap.every((x, i) => i === 0 || !x.ok || x.usd >= cheap[i - 1].usd), cheap.slice(0, 3).map(x => x.name + ' $' + x.usd.toFixed(2)).join(', '));
const fast = core.rankQuotes(q, 'fast');
check('eng tez birinchi', fast[0].dnum != null && fast.every((x, i) => i === 0 || !x.ok || x.dnum == null || x.dnum >= (fast[i - 1].dnum ?? -1)), fast.slice(0, 3).map(x => x.name + ' ' + x.dnum + 'k').join(', '));
const opt1 = core.rankQuotes(q, 'optimal');
check('optimal: narxi ma\'lumlar oldinda', opt1.length === q.length && opt1[0].ok);
const noC = core.courierQuotes({ couriers: COURIERS, tariffs: TAR, country: 'Marsdan', kg: 1, usdRate: RATE });
check('noma\'lum davlat → bo\'sh', noC.length === 0);

/* ---- Jami tannarx (core/landed.js) ---- */
const L = core.landedCost({ priceUsd: 320, qty: 1, domesticUsd: 0, kg: 2.5, shipPerKg: 9, norms: N, usdRate: RATE });
check('landed: misol — kargo $22,5, boj $38,53, yig\'im $8,70', near(L.shipUsd, 22.5) && near(L.dutyUsd, 38.53125) && near(L.feeUsd, 110000 / RATE), `${L.shipUsd} ${L.dutyUsd.toFixed(3)} ${L.feeUsd.toFixed(3)}`);
check('landed: jami $389,73', near(L.totalUsd, 320 + 22.5 + 38.53125 + 110000 / RATE, 0.001), L.totalUsd.toFixed(3));
const L2 = core.landedCost({ priceUsd: 50, qty: 3, domesticUsd: 5, kg: 0.6, shipPerKg: 10, norms: N, usdRate: RATE });
check('landed: 3 dona → tovar $150, vazn 1,8 kg, kargo $18', L2.goodsUsd === 150 && near(L2.billKg, 1.8) && near(L2.shipUsd, 18));
check('landed: me\'yor ichida boj 0', L2.dutyUsd === 0 && near(L2.totalUsd, 150 + 5 + 18));
const L3 = core.landedCost({ priceUsd: 100, kg: 1, dims: { l: 50, w: 40, h: 40 }, shipPerKg: 8, norms: N, usdRate: RATE });
check('landed: hajmiy 16 kg > 1 kg → kargo $128', near(L3.billKg, 16) && near(L3.shipUsd, 128));
const L4 = core.landedCost({ priceUsd: 250, kg: 1, shipUsd: 15, norms: N, usdRate: RATE, localPriceUzs: 4300000 });
check('foydalimi: tejash hisoblanadi', L4.worth === true && near(L4.savingUzs, 4300000 - L4.totalUzs, 0.5) && L4.savingPct > 0, Math.round(L4.savingUzs) + ' so\'m');
const L5 = core.landedCost({ priceUsd: 250, kg: 1, shipUsd: 15, norms: N, usdRate: RATE, localPriceUzs: 3000000 });
check('foydalimi: mahalliy arzon bo\'lsa worth=false', L5.worth === false);

/* ---- Do'konlarning yetkazish davlatlari (from) ---- */
const KB = await import('../worker/src/kb.generated.js');
const tarifDavlat = new Set();
for (const rows of Object.values(TAR.couriers)) for (const r of rows) tarifDavlat.add(r.c);
const yomon = [];
for (const s of KB.STORES) {
  const from = Array.isArray(s.from) ? s.from : [];
  if (!from.length) { yomon.push(s.id + ': from yo\'q'); continue; }
  if (s.country !== from[0]) yomon.push(s.id + ': country ≠ from[0]');
  for (const c of from) if (!tarifDavlat.has(c)) yomon.push(s.id + ': ' + c + ' — kuryer tarifi yo\'q');
}
check('har bir do\'kon kuryer tarifi bor davlatlardan yuboradi', yomon.length === 0, yomon.slice(0, 4).join(' | '));
check('"Global" davlat qolmadi', !KB.STORES.some(s => s.country === 'Global' || (s.from || []).includes('Global')));
const kopDavlat = KB.STORES.filter(s => (s.from || []).length > 1).length;
check('ko\'p davlatdan yuboradigan do\'konlar belgilangan', kopDavlat >= 10, kopDavlat + ' ta do\'kon');

console.log(fails ? `\n${fails} ta tekshiruv o'tmadi.` : '\nCore testlari o\'tdi.');
process.exit(fails ? 1 : 0);
