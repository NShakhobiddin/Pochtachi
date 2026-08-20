#!/usr/bin/env node
// Qo'llanmalardagi kalkulyatorni ilovadagi hisob bilan moslashtiradi.
//
// Topilgan farqlar (barcha 7 qo'llanmada bir xil edi):
//   1. dollar kursi qo'lda 11 857 deb yozilgan edi — ilovada esa Markaziy bank
//      kursi ishlatiladi (oflayn zaxira 12 650). Bitta ilovada ikki xil kurs.
//   2. me'yor ($200) yetkazish xarajati bilan birga hisoblanardi va "$3/kg dan
//      kam emas" qoidasi butun vaznga qo'llanardi. Ilovada esa me'yor tovar
//      qiymatiga qo'llanadi, yetkazishning ortiqcha qismga to'g'ri keladigan
//      ulushi nisbat bo'yicha qo'shiladi. Natijada bitta jo'natma uchun ikki
//      xil boj chiqardi.
//   3. bojxona yig'imi (BHM ning 25 foizi, ~103 000 so'm) umuman yo'q edi —
//      me'yordan oshgan har bir jo'natmada yakuniy summa shuncha kam chiqardi.
//
// Skript idempotent: ikkinchi marta ishga tushirilsa hech nimani o'zgartirmaydi.
// Ishlatish: node tools/patch-guide-calc.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'guides', 'inline');
const MARK = 'XY_NORMS';

// Ikki xil yozilish uchraydi (bir qatorda va ikki qatorda) — ikkalasi ham
// bir xil mantiq, shuning uchun regexp bilan qidiramiz.
const OLD_EXCESS_RE = /  const limit=num\('channel'\);\n  const remain=Math\.max\(0,limit-num\('used'\)\);\n  const excess=Math\.max\(0,customsValue-remain\);/;
const NEW_EXCESS = `  const limit=num('channel');
  const remain=Math.max(0,limit-num('used'));
  /* Me'yor tovar qiymatiga qo'llanadi; yetkazishning ortiqcha qismga to'g'ri
     keladigan ulushi nisbat bo'yicha qo'shiladi — ilovadagi hisob bilan bir xil.
     Ilgari yetkazish ham me'yordan chegirilib, boj oshib ketardi. */
  const goodsTotal=Math.max(0,customsValue-shipUsd);
  const excessGoods=Math.max(0,goodsTotal-remain);
  const ratio=goodsTotal>0 ? excessGoods/goodsTotal : 0;
  const excess=excessGoods+shipUsd*ratio;`;

const OLD_DUTY_RE = /  let duty=0, dutyNote='';\n  if\(excess>0\)\{\n(?:\s*const pct=excess\*0\.30(?:;|,)\s*(?:\n\s*const )?perKg=billed\*3;\n)\s*duty=Math\.max\(pct,perKg\);\n\s*dutyNote = perKg>pct \? 'min \$3\/kg qoidasi qo’llandi' : '30% stavka';\n  \}/;

const NEW_DUTY = `  /* Me'yorlar ilovadagi bilan bir xil manbadan keladi (guide.js ularni
     data/norms.json dan oladi), topilmasa amaldagi qiymatlar ishlatiladi. */
  const N = (typeof window !== 'undefined' && window.XY_NORMS) || {};
  const DUTY_PCT = N.dutyPct > 0 ? N.dutyPct : 0.30;
  const MIN_PER_KG = N.minPerKg >= 0 ? N.minPerKg : 3;
  const FEE_SHARE = N.feeShare >= 0 ? N.feeShare : 0.25;
  const FEE_UZS = (N.bhm > 0 ? N.bhm : 412000) * FEE_SHARE;

  let duty=0, dutyNote='', fee=0;
  if(excess>0){
    // Ortiqcha qiymatga to'g'ri keladigan vazn ulushi (ilovadagi kabi)
    const excessKg = billed*ratio;
    const pct = excess*DUTY_PCT;
    const perKg = excessKg*MIN_PER_KG;
    duty = Math.max(pct,perKg);
    dutyNote = perKg>pct ? ('min $'+MIN_PER_KG+'/kg qoidasi qo’llandi') : (Math.round(DUTY_PCT*100)+'% stavka');
    fee = FEE_UZS;
  }`;

const OLD_TOTAL_RE = /  const totalUsd=([^\n;]+);\n  const totalUzs=totalUsd\*usdUzs;/;
const NEW_TOTAL = `  const totalUsd=__TOTAL_USD__;
  // Bojxona yig'imi so'mda undiriladi, shuning uchun yakuniy summaga qo'shiladi.
  const totalUzs=totalUsd*usdUzs+fee;
  const totalUsdAll=usdUzs>0 ? totalUzs/usdUzs : totalUsd;`;


const OLD_SUM_LINE = `'<div class="sum">≈ $'+fmt2(totalUsd)+' · hisob og’irligi '`;
const NEW_SUM_LINE = `'<div class="sum">≈ $'+fmt2(totalUsdAll)+' · hisob og’irligi '`;

const OLD_DUTY_ROW = `'<div class="rrow"><span>Bojxona to’lovi <span style="opacity:.7;font-weight:400">('+dutyNote+')</span></span><span>$'+fmt2(duty)+'</span></div>'`;
const NEW_DUTY_ROW = OLD_DUTY_ROW + `+
       '<div class="rrow"><span>Bojxona yig’imi (BHM '+Math.round(FEE_SHARE*100)+'%)</span><span>'+fmt(fee)+' so’m</span></div>'`;

let patched = 0, skipped = 0;
for (const file of readdirSync(DIR).filter(f => f.endsWith('.html')).sort()) {
  const path = join(DIR, file);
  let html = readFileSync(path, 'utf8');
  if (html.includes(MARK)) { skipped++; continue; }

  const before = html;
  /* Almashtirishlar funksiya orqali beriladi: matnlarda `$'` va `$&` kabi
     ketma-ketliklar bor, oddiy satr berilsa ular maxsus belgi sifatida
     talqin qilinib, kodni buzadi. */
  html = html.replace(OLD_EXCESS_RE, () => NEW_EXCESS);
  html = html.replace(OLD_DUTY_RE, () => NEW_DUTY);
  html = html.replace(OLD_TOTAL_RE, (m, expr) => NEW_TOTAL.replace('__TOTAL_USD__', expr));
  html = html.replace(OLD_SUM_LINE, () => NEW_SUM_LINE);
  html = html.replace(OLD_DUTY_ROW, () => NEW_DUTY_ROW);
  // Kursning boshlang'ich qiymati (guide.js uni ilovaning kursi bilan almashtiradi)
  html = html.replace(/(id="usdrate"[^>]*?value=")\d+(")/, '$112650$2');

  if (html === before || !html.includes(MARK)) {
    console.error(`${file}: mos keladigan joy topilmadi — qo'lda tekshiring`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(path, html);
  patched++;
}
console.log(`${patched} ta qo'llanma yangilandi, ${skipped} tasi allaqachon yangilangan.`);
