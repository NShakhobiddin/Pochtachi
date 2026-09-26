# Pochtam.uz — texnik topshiriq bo'yicha audit va rivojlantirish rejasi

Sana: 2026-09-17. Holat: 1–9 bosqichlar tugadi (audit, Pochtam Core, bosh sahifa, universal kalkulyator, kuryer solishtirish, Xaridlarim, Pochtam AI, AI funksiyalar, "bitta maydon → bitta natija" soddalashtirish). Navbat: 10.
Tamoyil: **EXTEND, DO NOT REBUILD** — mavjud ilova saqlanadi, funksiyalar
bir-biriga bog'lanadi, ustiga aqlli qatlam qo'shiladi.

## 1. Mavjud loyiha qanday qurilgan

- Manba — bitta fayl: `Xarid Yordamchisi v2.dc.html` (6 807 qator, Claude
  Design shabloni + React 18). `npm run build` undan `index.html`, `sw.js`,
  `guides/index.html`, `sitemap.xml`, `robots.txt` yasaydi. Generatsiya
  qilingan fayllar qo'lda tahrirlanmaydi.
- Qo'llanmalar alohida sahifalar: `guides/inline/*.html` (7 ta), umumiy
  dvigatel `guides/guide-engine.js` (kalkulyator shu yerda ham bor),
  `guides/guide-motion.js` (video-tushuntirishlar). Ilova ularni iframe da ochadi.
- Server: `worker/` — Cloudflare Worker + Durable Object (o'lchov: sanoq,
  `/hisobot` sahifasi). Ilova faqat cbu.uz va shu worker'ga so'rov yuboradi.
- Sayt: GitHub Pages, domen `pochtam.uz` (CNAME). Telegram Mini App rejimi bor.
- Marshrutlash: ekranlar `state.stack` orqali, URL o'zgarmaydi (history faqat
  "orqaga" uchun). Alohida URL faqat qo'llanmalarda — SEO shu yerda.
- Tillar: o'zbek lotin (asosiy), o'zbek kirill, rus. Ingliz yo'q. Tarjima
  `tr()` lug'ati orqali, matn tugunlari avtomatik almashadi.
- Testlar: `tests/smoke.mjs` (brauzer, ~150 tekshiruv), `tests/guides.mjs`,
  `worker/test.mjs`, `npm run check` (build mosligi, o'lcham byudjeti:
  index.html ≤ 680 KB, hozir 667 KB).

## 2. Mavjud funksiyalar ro'yxati (hech biri o'chirilmaydi)

| Bo'lim | Ekranlar (`stack` nomi) | Holat |
|---|---|---|
| Tanishuv | `onboard` | til tanlash, o'tkazib yuborish |
| Bosh sahifa | `home` | sarlavha, "birinchi marta" kartasi, 4 bo'lim kartasi, mutaxassis, tirik kurs, mini-kalkulyator, "Bugungi foydali" (`TIPS`), sevimlilar, yaqinda ko'rilganlar |
| Do'konlar | `stores`, `storefolder`, `store` | 43 do'kon, tovar turi / davlat papkalari, filtr varag'i, qidiruv, hamkorlik havolalari (`AFF`) |
| Kuryerlar | `couriers`, `courierfolder`, `courier`, `compare` | 20 kuryer, yo'nalish papkalari, 3 tagacha taqqoslash (tarif yorlig'i, muddat, tur, davlatlar, tracking) |
| Bojxona | `customs`, `csec` (6 bo'lim) | me'yorlar (`NORMS` + `data/norms.json`), yagona to'lov, taqiqlar (`BANNED`, 23 ta, manba bilan), rasmiylashtirish (`PROC_STEPS`, `HOLD_REASONS`), kalkulyator, organlar (`OFFICES`); motion-tushuntirishlar |
| Reja | `wizard` (5 qadam), `plan` | reja obyekti: kategoriya, davlat, do'kon, kuryer, narx, kg, kuryer haqi, boj, yig'im, jami; oylik me'yorga qo'shiladi |
| Kuzatuv (jo'natmalar) | `shipments` | trek raqam, reja holati (5 ta: Reja, Buyurtma qilindi, Omborda, Yo'lda, Keldi), qo'lda o'zgartiriladi |
| Qidiruv | `search` | do'kon, kuryer, qo'llanma; kirill/lotin; oxirgi qidiruvlar |
| Qo'llanmalar | `guides`, `fullguide` | 7 ta, iframe, har birida kalkulyator va videolar |
| Xizmatlar | `services` | 11 pullik xizmat, belgilangan narx, Telegram orqali murojaat |
| Sozlamalar | `settings` | til, kurs yangilash, xabar berish, hamkorlik |
| Umumiy | — | offline (SW), Telegram to'liq ekran, o'lchov, kompyuter tartibi (1024 px+) |

Doimiy holat (`localStorage`, kalit `xy_state_v1`): `lang, onboarded, plans,
monthly, trackNo, storeCountries, storeCats, storeDirect, storeGroup,
storeFolderBy, courierCountries, courierMode, sort, lastTab, svcLane, favs,
searches`. Kurs alohida: `xy_usd_rate`. **Yangi funksiyalar shu kalitlarga
tegmaydi, faqat yangi ixtiyoriy maydon qo'shadi — migratsiya kerak emas.**

## 3. Ma'lumot qayerda va takrorlangan qoidalar

Biznes ma'lumot manbada JS massivlari sifatida turadi: `STORES` (52 KB),
`COURIERS` (38 KB), `BANNED`, `NORMS`, `QTY_NORMS`, `PROC_STEPS`,
`HOLD_REASONS`, `OFFICES`, `SERVICES`, `TIPS`, `WIZ_CATS`, `STORE_CATS`,
`COURIER_ORIGINS`. Me'yorlar `data/norms.json` dan yuklanadi (koddagi nusxa —
zaxira). Bu TZ 9-bandiga qisman mos: me'yorlar markazlashgan, qolgani emas.

**Topilgan takrorlanishlar (TZ 9 buzilishi):**

1. Boj formulasi 4 joyda alohida yozilgan: kalkulyator (`calc`), bosh
   sahifadagi mini-kalkulyator, reja sehrgari (`wz`), motion-namuna
   (`moExample`). Hammasi `normsAt()` dan me'yor oladi, lekin arifmetika
   takrorlangan — biri o'zgarsa qolgani orqada qoladi.
2. `guides/guide-engine.js` da beshinchi nusxa, ustiga **zaxira raqamlar
   kodga yozilgan** (`0.30`, `3`, `0.25`, `412000`). Me'yor yangilansa
   qo'llanma kalkulyatori eski qiymat bilan qolishi mumkin.
3. Kuryer tariflari **matn** (68 qator, hammasi "0.05–0.5 kg: 7 GBP; …"
   ko'rinishida). Raqamli faqat sarlavha tarifi `price` ($/kg). Shuning uchun
   hozirgi taqqoslash faqat yorliqni solishtiradi, yakuniy xarajatni emas.
   TZ 6 va 10 buni talab qiladi — tariflarni tuzilgan qilish shart.
4. Kategoriyalar ikki ro'yxatda (`WIZ_CATS`, `STORE_CATS`), vazn taxmini,
   cheklov belgisi yo'q.

**Yo'q kontent (TZ 8):** aeroport orqali olib kirish, IMEI qoidalari,
"cheklangan tovarlar" alohida ro'yxati, shaxsiy foydalanish qoidalari, FAQ.
Bular kod emas, huquqiy manbaga tayangan matn — buyurtmachidan manba kerak.

## 4. TZ bandlari → mavjud holat → qaror

| TZ | Mavjud | Qaror |
|---|---|---|
| 4. Hero, universal input | mini-kalkulyator va qidiruv bor | Yangi blok tepaga; input havola/so'z/savolni o'zi ajratadi; "Hisoblash" o'rniga "Boshlash" (hisob narx+vaznsiz bo'lmaydi). Mavjud bloklar pastda qoladi |
| 5. Do'konlar davlat bo'yicha | papkalar bor (tur / davlat) | O'zgarmaydi; kartaga 2 ta tugma: "Qo'llanma", "Shu do'kondan hisoblash" (kalkulyatorga store/country uzatiladi) |
| 6. Kuryer taqqoslash | 3 ta kuryer, yorliqlar | Tariflar tuzilgach: davlat, vazn, hajmiy vazn, ustuvorlik (arzon/tez/optimal), har kuryer uchun **hisoblangan** summa. "So'rov bo'yicha" tarifli kuryerlar ro'yxat oxirida, halol yorliq bilan |
| 7. Pochtam Score | yo'q | Faqat maydon va formula joyi (`score: null`); ma'lumot bo'lmasa ko'rsatilmaydi |
| 8. Bojxona tuzilmasi | 6 bo'lim | Mavjud 6 tasi qoladi; yangi bo'limlar kontent kelgach qo'shiladi; AI yordamchisi 6-bosqichda |
| 9. Rules engine | `data/norms.json` | Qaror: `norms.json` yagona manba bo'lib qoladi (nom o'zgarsa SW va yuklovchilar sinadi); `core/customs.js` — bitta formula, hamma joy shundan chaqiradi. Taqiqlar (`BANNED`, red/amber) manbada, keyingi bosqichda `data/` ga ✓ |
| 10. Universal kalkulyator | kalkulyator + sehrgar | Yangi ekran `landed`: narx, valyuta, davlat, do'kon, kategoriya, miqdor, vazn, hajmiy vazn, ichki yetkazish, kuryer → jami tannarx kartasi + 3 kuryer |
| 11. Rejaga qo'shish | `savePlan` | Reja obyektiga ixtiyoriy maydonlar: `name, url, image, qty, domestic, volumetric, source:'landed'`. Eski rejalar o'zgarmaydi |
| 12. Xaridlarim | reja, kuzatuv, sevimlilar alohida | Bitta ekran `mine`, ichida tablar; holat kalitlari o'zgarmaydi |
| 13. Jo'natmalar | 5 holat | "Bojxonada" 4-o'ringa qo'shildi; eski `step` 4 → 5 (`sv:2` belgisi) ✓ |
| 14. Qo'llanmalarda CTA | kalkulyator tab bor | Har qo'llanmaga "Shu do'kondan hisoblash" va "Kuryerlarni solishtirish" — `postMessage` bilan ilovaga store/country uzatiladi |
| 15–18. AI | ✓ `worker/src/ai.js` | O'sha worker'da `/ai`, Claude API, 5 ta vosita (`core/` orqali); qoidalar `data/ai-rules.md`, baza `kb.generated.js`. Panel iframe emas, ilovaning o'z ekrani `ai` (javob tugmalari ilova holatini to'ldiradi; +16 KB) |
| 19–20. Server, xarajat | ✓ | Kalit `ANTHROPIC_API_KEY` sirida; DO orqali IP/kun (20) va umumiy (300) chegara; tizim ko'rsatmasi keshda; savol matni saqlanmaydi |
| 21–23. Havola, skrinshot | ✓ | Havola → do'kon (3-bosqich); skrinshot → `/ai` (rasm) → nom, narx, valyuta → natija ekrani (8-bosqich) |
| 24. Olish foydalimi | yo'q | `landed` ekranida bitta ixtiyoriy maydon "O'zbekistondagi narx" → "Tejash: …" |
| 25. Bugun Pochtam'da | `TIPS` | Saqlanadi; ustiga tirik kurs va qolgan me'yor; kanal ulanishi keyin |
| 26. Konsultatsiya | 11 xizmat | Saqlanadi; "Murakkab holatmi?" bloki holat bo'yicha xizmatga olib boradi; AI chegaradan chiqsa shu blokka yo'naltiradi |
| 27. Desktop menyu | ✓ qisman | Chap ustunda 5 mobil tab + Xaridlarim, Pochtam AI (`.xy-desk`, faqat ≥1024px); "Hisoblash"/"Do'konlar"/"Kuryerlar" bo'limlari bosh sahifa orqali |
| 28. Mobil menyu | Bosh, Qo'llanmalar, Reja (markaz), Bojxona, Sozlamalar | **Qaror kerak** (5-bo'limga qarang) |
| 30. Papkalar | bitta fayl | `data/`, `core/`, `worker/`, `ai/` qo'shiladi; UI bitta faylda qoladi (Claude Design shabloni) — TZ "mavjud arxitekturaga moslashtirilsin" deydi |
| 32. Xavfsizlik | React (XSS xavfsiz) | AI paneli markdown'ni `innerHTML` siz chizadi; kirish 2 000 belgi; rasm ≤ 2 MB (keyin) |
| 33. Performance | byudjet 680 KB | AI va universal kalkulyator qo'shilgach byudjet 720 KB ga (hujjatlashtiriladi); AI paneli iframe — talab bo'yicha |
| 35. Tillar | uz, uz-kirill, ru | Yangi matnlar `tr()` lug'atiga; AI foydalanuvchi tilida |
| 36. SEO | faqat qo'llanma URL lari | Hech narsa o'zgarmaydi |
| 37. Analytics | `metrics.hit` (7 hodisa) | Yangi hodisalar: `calc_open, calc_done, ai_question, courier_compare, add_to_plan, consult_click`; worker ro'yxati kengaytiriladi |

## 5. Qaror talab qiladigan nuqtalar

1. **Mobil pastki menyu.** TZ: Bosh, Do'konlar, AI, Kuryerlar, Xaridlarim.
   Xavf: Bojxona va Qo'llanmalar menyudan tushib qoladi — qo'llanmalar
   saytning asosiy kontenti va SEO manbai, bojxona esa eng ko'p so'raladigan
   bo'lim. Taklif: Bosh, Do'konlar, AI (markaz), Bojxona, Xaridlarim;
   kuryerlar va qo'llanmalar bosh sahifada, qidiruvda va AI orqali.
   Yaxshisi, 2 hafta o'lchov (`/hisobot`, `screen` bo'limi) ko'rib, keyin
   yakuniy qaror. AI tayyor bo'lguncha markazda "Reja" qoladi.
2. **Tariflar.** 68 qatorni tuzilgan jadvalga o'giraman (matn saqlanadi,
   yoniga `rows`). "… dan" yoki "so'rov bo'yicha" tarifli kuryerlar uchun
   aniq narx yo'q — ular "narx so'raladi" deb ko'rsatiladi. Kuryerlardan
   yangi tarif olinsa, faqat JSON yangilanadi.
3. **Yangi bojxona bo'limlari** (aeroport, IMEI, cheklangan, shaxsiy
   foydalanish, FAQ): manba matnlari kerak. Manbasiz matn yozilmaydi.
4. **AI kaliti va byudjeti.** Anthropic Console kaliti, kunlik chegara
   (masalan $5), bepul limit (masalan 10 savol/kun).
5. **Nomlar.** "Xaridlarim" bo'limi; "Hisoblash" desktop menyuda universal
   kalkulyatorni ochadi.

## 6. O'zgaradigan va yangi fayllar

O'zgaradi: `Xarid Yordamchisi v2.dc.html` (ekranlar, formula chaqiruvlari,
menyu, reja maydonlari), `guides/guide-engine.js` (formula `core/` dan),
`guides/inline/*.html` (CTA tugmalar), `tools/build.mjs` (core/ va data/
ni SW keshiga, byudjet), `tools/check-budget.mjs`, `sw.js` (generatsiya),
`worker/src/index.js` (yangi hodisa nomlari), `tests/*`, `README.md`.

Yangi: `data/customs-rules.json`, `data/couriers-tariffs.json` (yoki
`COURIERS` ichida `rows`), `data/categories.json`, `core/customs.js`,
`core/tariffs.js`, `core/landed.js`, `core/recommend.js`, `ai/index.html`,
`ai/ai.js`, `worker-ai/` (yoki `worker/src/ai.js`), `tests/core.mjs`,
`data/ai-rules.md`.

`core/` modullari brauzerda (ilova, qo'llanmalar, AI paneli) va Worker'da
(AI tool'lari) **bir xil** ishlaydi — bu "AI biznes qoidani to'qimaydi"
talabining texnik kafolati.

## 7. Xavflar

| Xavf | Yechim |
|---|---|
| Formulani markazlashtirganda natija o'zgaradi | `tests/core.mjs`: hozirgi kalkulyator, sehrgar va qo'llanma kalkulyatoridan 30 ta "oltin" holat yoziladi, refaktordan keyin aynan shu natijalar |
| Tariflarni tuzilgan qilishda xato | Har qator uchun matn saqlanadi va test matn↔jadval mosligini tekshiradi; kuryer sahifasida ikkisi ham ko'rinadi |
| Reja obyektining o'zgarishi eski rejalarni sindiradi | Faqat ixtiyoriy maydonlar; eski reja `total` bilan avvalgidek chiziladi; smoke testda eski formatli reja seed qilinadi |
| Holatlar ketma-ketligiga "Bojxona" qo'shish | `step` raqamini yangi tartibga xaritalash `loadState` da; test |
| index.html byudjeti | AI paneli va katta matnlar alohida fayllarda; byudjet 720 KB, sabab README da |
| AI xarajati va suiiste'mol | Origin tekshiruvi, IP/kun limiti (DO), Telegram `initData` imzosi, kirish uzunligi, kunlik umumiy chegara |
| AI noto'g'ri raqam aytadi | Raqamlar faqat tool natijasidan; sinov to'plami (50–80 savol, mavzudan tashqari ham); har javobda manba |
| Claude API ishlamasa | Panel "AI vaqtincha mavjud emas" + tezkor tugmalar oddiy ekranlarga; ilova qolgani ishlaydi |
| Mobil menyuda bo'limlar yo'qolishi | O'lchov bilan qaror; qidiruv va bosh sahifa orqali kirish saqlanadi |

## 8. Bosqichlar

| # | Bosqich | Nima qilinadi | Qabul mezoni |
|---|---|---|---|
| 1 | Audit | shu hujjat | ✓ |
| 2 | Pochtam Core ✓ (2026-09-15) | `core/customs.js`, 5 ta chaqiruv shu modulga; `data/norms.json` yagona manba (build ilova va qo'llanmalarga yozadi); tariflar tuzilgan (`data/tariffs.json`, 68/68), `core/tariffs.js`; `data/categories.json`; `core/landed.js`; `tests/core.mjs` (50 tekshiruv) | ✓ 14 oltin holat bir xil; guide-engine'da hardcode yo'q |
| 3 | Bosh sahifa UX ✓ (2026-09-15; 16-da soddalashtirildi: 4 bo'lim kartasi, solishtirish bloki, "Birinchi marta", sevimlilar tasmasi va rejalar bloki olib tashlandi — 7 blok qoldi) | hero + aqlli input (havola → do'kon, qisqa havola → alias, noma'lum domen → qidiruv, so'z → qidiruv), 4 ta tez o'tish, mashhur do'konlar tasmasi, kuryerlarni solishtirish bloki (core/tariffs), bloklar tartibi; mavjud bloklar qoladi; RU tarjimalar; byudjet 720 KB | ✓ smoke: 7 yangi tekshiruv, 390/1280 px |
| 4 | Universal kalkulyator ✓ (2026-09-15) | `landed` ekrani: narx/valyuta, miqdor, kategoriya, yo'nalish, og'irlik, quti (hajmiy), ichki yetkazish, kuryer takliflari (arzon/tez/optimal), jami tannarx, "foydalimi", `savePlanFrom` (name/qty/source); do'kon sahifasidan kirish | ✓ smoke: 5 tekshiruv; eski reja o'zgarmagan |
| 5 | Kuryer taqqoslash ✓ (2026-09-15) | "Vazn bo'yicha hisob" paneli (kg, davlat, arzon/tez/optimal), kartalarda hisoblangan summa va tartib, taqqoslash jadvalida hisob qatori, bosh sahifa va jami narxdan prefill | ✓ smoke: 4 tekshiruv |
| 6 | Xaridlarim + jo'natmalar ✓ (2026-09-15) | `mine` ekrani (Rejalar, Jo'natmalar, Sevimlilar, Hisoblar — kalkulyatorning oxirgi 10 hisobi), "Bojxonada" holati (PLAN_LAST=5, fixPlan migratsiyasi sv:2) | ✓ eski reja 4→5 ko'chadi; smoke: 4 tekshiruv |
| 7 | Pochtam AI ✓ (2026-09-16) | worker `/ai` (Claude API, kalit sirda, IP/umumiy kunlik chegara), 5 vosita `core/` dan, `data/ai-rules.md`, `kb.generated.js`; ilovada `ai` ekrani (tez savollar, tarix, 503/429 holatlari, bosh sahifa kartasi, universal maydondagi savol, desktop menyu); `tests/ai-eval.json` + `tests/ai.mjs` | ✓ worker testi: vosita natijasi core bilan bir xil, kalitsiz 503; smoke: 9 tekshiruv; kalit repo va brauzerda yo'q |
| 8 | AI + funksiyalar ✓ (2026-09-16) | Bosh sahifada asosiy funksiya: **Skrinshot yuklash** (`/ai/shot`, Haiku, tuzilgan JSON → kalkulyator) va **Tovar topish** (`suggest_stores`, do'kon havolalari, o'lcham jadvali, jami narx) + "Qanday ishlaydi" qo'llanmasi; javob tugmalari: kalkulyator, kuryer paneli, taqiqlar, do'kon, havolalar. Qoladi: AI'dan to'g'ridan-to'g'ri reja tuzish | worker 78 tekshiruv, smoke 189; TZ 21–23 (havola, skrinshot) yopildi |
| 9 | "Bitta maydon → bitta natija" ✓ (2026-09-17) | AI chalkash edi (7 kirish nuqtasi, bo'sh chat, takror tugmalar, o'lik "AI mavjud emas"). Endi: bosh sahifada **bitta maydon** (kamera ichida, ostida bosiladigan namuna); `GET /ai/status` bayrog'i — kalit yo'q bo'lsa AI izi yo'q; skrinshot → to'g'ridan-to'g'ri Jami narx (banner: o'qilmoqda / o'qildi / o'qilmadi); AI ekrani — natija kartasi ("Tushundim" chiplari, do'kon kartalari, taxminiy jami), xato sariq karta + ishlaydigan tugmalar, bo'sh chat yo'q; 30 ga yaqin o'lik tarjima o'chirildi | smoke 193, worker 80; foydalanuvchi hech qachon o'lik tugma yoki bo'sh chat ko'rmaydi |
| 10 | "Jami hisob faqat skrinshot orqali" ✓ (2026-09-17) | Kalkulyator formasi asosiy yo'l emas: skrinshot → `result` ekrani — AI rasmdan nom, narx, do'kon, davlat, kategoriya, vaznni o'qiydi (`/ai/shot` sxemasi kengaydi), ilova `landedCalc()` bilan eng arzon kuryerni tanlaydi, muddat, boj, yig'im, jami (USD/so'm), taqiq va kategoriya eslatmalarini ko'rsatadi; "Qanday buyurtma qilaman?" — AI ga tayyor savol, `ai-rules.md` "Qanday buyurtma qilaman" bo'limi (8 qadam, kuryer tanlovi); yonida "Qayerdan topaman?" — yordamchi chat (`ai-rules.md` "Qayerdan topaman": ro'yxatdan tashqari do'konlar ham, qanday topish va skrinshot qilish); kalkulyator "Vaznni aniqlashtirish" orqali qoladi | smoke 203, worker testlari; foydalanuvchi uchun bitta harakat — skrinshot — va bitta natija kartasi |
| 11 | "Bitta harakat — bitta natija" ✓ (2026-09-18) | Bosh sahifadagi havola maydoni olib tashlandi (skrinshot bilan raqobatlashib, asosiy yo'lni ko'rsatmay qo'yayotgan edi): endi ketma-ket ikkita karta — katta "Skrinshot yuklash" va "Hali topmadingizmi?" ostidagi "Qayerdan topaman?"; havola va nom yozish qidiruvga ko'chdi (`linkStore()` — havola natijaning tepasida do'kon bo'lib chiqadi); "Qayerdan topaman?" chat emas, `where` tanlov ekrani — kategoriya chipi + ixtiyoriy aniqlik, keyin originallik va byudjet, savolni ilova o'zi tuzib AI ga yuboradi; AI o'chiqda bitta "qidirish" kartasi; tanishtiruv yangi kartalarga moslandi | smoke 205, worker/core/qo'llanma testlari; foydalanuvchi gap tuzmaydi — faqat bosadi |
| 12 | Do'konlar davlat bo'yicha taqsimlandi ✓ (2026-09-18) | 43 do'konning 24 tasi "Global" uyasida turardi: davlat papkasi, sehrgar va kalkulyator ular uchun ishlamasdi. Endi har do'konda `from: [...]` — kuryer tarifi bor haqiqiy yetkazish davlatlari (Amazon: AQSh, Germaniya, Angliya; SHEIN: Xitoy, Turkiya); do'kon har bir davlat papkasida ko'rinadi, do'kon sahifasida "Qaysi davlatdan olib kelamiz" chiplari kuryer, tarif va kalkulyatorni almashtiradi; sehrgar ham `from` bo'yicha ishlaydi; "Buyuk Britaniya" → "Angliya" (tarif nomi bilan bir xil) | smoke 210, core ma'lumot tekshiruvi (har bir `from` davlatida kuryer bor) |
| 13 | "Savoldan boshlanadigan oqim" ✓ (2026-09-18) | Oqim endi savoldan boshlanadi: "Nima mahsulot qidiryapsiz?" — nom yoziladi, aytiladi (brauzerning bepul nutq tanish moslamasi, serversiz) yoki turi tanlanadi; keyin ikkita javob — "Topdim — qanchaga tushadi?" (skrinshot) va "Hali topmadim — qayerdan olaman?" (do'kon tavsiyasi), natijadan keyin uchinchisi — "Qanday buyurtma qilaman?". Valyuta: Markaziy bankdan bitta so'rovda barcha kurslar olinadi, skrinshotdagi har qanday valyuta (KRW, RUB, AED…) joriy kurs bo'yicha o'giriladi. Kuryer yo'qligi endi texnik til bilan aytilmaydi: "tarif topilmadi" o'rniga "{davlat} dan olib keladigan kuryer yo'q" yoki "narxini kuryerdan so'rash kerak" | smoke 214, core/worker testlari; o'lcham byudjeti 840 KB (gzip 192 KB) |
| 14 | "Uch savol bir ekranda" ✓ (2026-09-18, ikkinchi audit) | Bosh sahifaning o'zi savol: "Nima mahsulot qidiryapsiz?" + maydon, mikrofon, chiplar, uchta yo'l (skrinshot, qayerdan olaman, narxni o'zim yozaman — AI o'chiqda ham); alohida savol ekrani, sarlavha osti va "Jami narx" plitkasi olib tashlandi; skrinshot ko'rsatmasi tugma ostida. Natija ekrani javobdan boshlanadi: jami va so'm tepada, "kuryer · muddat · taxminan 13-oktabrgacha" (`etaText`), "Qanday buyurtma qilaman?" pastda yopishib turadi; natija saqlanadi — bosh sahifada "Oxirgi hisob". Buyurtma: qo'llanmasi bor do'kon (7 ta) uchun ilovadagi qo'llanma ochiladi, qolganiga AI, javobdagi raqamli qadamlar belgilanadigan ro'yxat. Aniq havolalar: `find` so'rovida Claude veb-qidiruvi (2 tagacha, $0.01/qidiruv) + `product_links` vositasi — "Topilgan sahifalar" kartalari | smoke 219, worker testlari (find, pause_turn, product_links tozalash); index.html 783 KB |
| 15 | "Yagona yordamchi" ✓ (2026-09-19) | Ommabop ilovalar tahlili (Amazon Rufus/Alexa for Shopping, Taobao Pailitao va AI qidiruvi, Google Lens, ChatGPT/Perplexity, Superbuy/CSSBuy, MyUS, Wildberries) asosida AI qismi yagona qilindi: bitta manzil (`/ai` matn+rasm+havola+joriy xarid), bitta kirish (maydon + mikrofon + biriktirish, rejim tugmalarisiz), bitta xarid obyekti (`cart`, har so'rov bilan ketadi), bitta javob shakli (`cards[]`: product, total, couriers, links, stores, warning, ask, cart), `ask_user` bilan bosiladigan aniqlashtiruvchi savol; qoidalar "niyat → karta" jadvaliga keltirildi. Narx o'zgarmadi: rasmni arzon model o'qiydi, savolsiz skrinshotda asosiy model chaqirilmaydi | smoke 224, worker testlari (yagona kirish, faqat rasm, rasm+savol, havola), eval 23 savol |
| 16 | "AI qismi: takror va keraksiz qismlar" ✓ (2026-09-19, uchinchi audit) | Muvaffaqiyatli loyihalardan olingan naqshlar: Amazon Rufus (model yo'naltiradi, kartani ishonchli manba to'ldiradi; so'rov turiga qarab model), Shopify Sidekick (bitta agent + vositalar, vositaga tegishli ko'rsatma tizim ko'rsatmasida emas — "just-in-time"), Klarna (o'lchov va qo'riqlov: eval to'plami, sanoq, inson/kalkulyator yo'li), Claude prompt caching (statik prefiks: tools → system, dinamik qism keyin). Olib tashlandi: `/ai/shot` va `handleShot`/`parseShotBody` (ikki yo'l bitta ish), ilovadagi `cart`/`xy_cart` (ikki joyda saqlanib, faqat AI ga echo bo'lardi — endi `lastRes` yagona), ilovadagi vosita nomiga bog'liq karta yig'ish (`m.tools` → faqat `cards`, worker `tools` da faqat nomlar), qoidalardagi takror va ziddiyatlar (2–4/2–6 gap, "so'ra"/`ask_user`, veb-qidiruv qoidasi 3 joyda, o'lcham jadvali har savolda). Qo'shildi: `buildCards` to'liq shartnoma (`duty`, `store`, `got`, `kg`), `suggest_stores` natijasida `sizeNote`/`next` (JIT), statik vositalarda `cache_control` va server vositalari oxirida, `buildSystem` memo. Natija: tizim ko'rsatmasi 26 664 → 22 564 belgi (−15%), worker'da bitta manzil, ilova va worker o'rtasida bitta shartnoma (`cards`). |
| 17 | "Qo'rqitmaydigan sayt" — 1-bosqich ✓ (2026-09-24) | Foydalanuvchi og'rig'i tahlili (qayerdan topaman, qanchaga tushadi, qanday olib kelaman, qayerda) va global naqshlar (ZenMarket/Buyee — foydalanuvchi o'rganmaydi; Amazon Import Fees Deposit, Temu — bitta yakuniy raqam; Shop app, Parcels — bitta ro'yxat). Menyu 5+2 → 3 (Boshlash · Xaridlarim · Ma'lumotnoma), bosh sahifada 8 ikkilamchi blok olib tashlandi, yangi Ma'lumotnoma ekrani, sehrgar Xaridlarimga ko'chdi, tanishtiruv 2 qadam, maslahatlar va mashhur do'konlar ma'lumoti o'chirildi (−25 KB). |
| 18 | "Xarid kartasi" — 2-bosqich ✓ (2026-09-24) | Xaridlarimdagi 4 tab (Rejalar, Jo'natmalar, Sevimlilar, Hisoblar) va alohida jo'natmalar ro'yxati o'rniga bitta ro'yxat: har xarid — karta, besh holat (Topish → Narx → Buyurtma → Yo'lda → Keldi, `stageOf` eski 6 qadamni yig'adi, migratsiyasiz), bitta keyingi harakat, kartaning o'zida jo'natma raqami va kuryer sayti. "Topish" kartasi "Do'konlarni ko'rsat" dan boshlanadi va skrinshot qo'shilganda "Narx" ga o'tadi. Buyurtma yordami natija ekrani va karta uchun bitta (`orderHelp`). Kunlar buyurtma sanasidan. Sehrgardagi rejalar ro'yxati olib tashlandi. |
| 19 | "Kuryer siz uchun sotib oladi" — 3-bosqich ✓ (2026-09-24) | ZenMarket/Buyee naqshi, operatsiyasiz: natija va xarid ekranida "Buy for me" xizmati bor 3 tagacha kuryer (12 kuryerda bor; haqi "10%", "10% (min $5)" bo'lsa ≈ $ bilan), kargo va muddat; "Yozish" — kuryer Telegrami tayyor xabar bilan (tovar, do'kon, narx, og'irlik). Xarid kartasida havola. AI indeksida `buy` maydoni va qoida (tizim ko'rsatmasi 23 130 belgi). "Boshqa kuryerlar" havolasi 40 px teginish maydoni. |
| 20 | "Sodda til va qisqa Bojxona" — 4-bosqich ✓ (2026-09-24) | Bojxona 6 bo'limli hubdan 3 savolli sahifaga ("Qancha to'layman?", "Nimani olib kirib bo'lmaydi?", "Bojxonada nima bo'ladi?"; `SEC_PAGE`, `focusSec`); jargon oddiy so'zga (vositachi → kuryer orqali, hajmiy og'irlik → quti o'lchami bo'yicha og'irlik, YIDXP → my.gov.uz, trek → jo'natma raqami, BHM → so'mdagi qat'iy yig'im, kuryer xizmatlari `SVC_LABEL`); AI qoidasida ham shu so'zlar; Reja sehrgari qoldi — AI'siz "Do'kon va kuryer tanlash" ("Yangi xarid", "Xaridlarimga qo'shish"), AI o'chiq bo'lsa bosh sahifada | bajarildi |
| 21 | "Holat o'zi yangilanadi" — 5-bosqich ✓ (2026-09-24) | Hamkor kuryer holat API: kuryer `POST /partner/status` bilan holat yuboradi (received, shipped, customs, held, ready, delivered). Kalit `PARTNER_KEYS` sirida, kuryerga bog'langan. Raqam SHA-256 xesh bilan saqlanadi, 90 kun. Ilova `POST /track` bilan so'raydi va xarid kartasini o'zi suradi; ushlanishda qizil blok va Bojxona 3-sahifasi. Kuryer sahifasida "Holat o'zi yangilanadi". Kuryerlar uchun hujjat: `docs/hamkor-api.md`, kalit: `worker/hamkor-kalit.mjs`. Workflow har safar `sinov` kuryeri bilan yozib-o'qib tekshiradi | bajarildi; birinchi hamkor kuryer bilan kelishuv — biznes vazifa |
| 22 | To'liq audit ✓ (2026-09-26) | Worker: Durable Object omboriga bir chaqiruvda 128 kalitdan ko'p berilmaydi (200 hodisali /partner/status va purge xato berardi — bo'laklab), tana hajmi sarlavhasiz ham tekshiriladi, READ_TOKEN vaqtga bog'liq bo'lmagan taqqoslash bilan, bo'sh domenli web_fetch qo'shilmaydi, HEAD /. Ilova: 609 ekran×til×kenglik aylanib chiqildi (konsol xatosi, toshish, 404, buzuq rasm — 0); ruscha rejimda Reja sehrgari, do'kon papkalari, davlatlar, tariflar, taqqoslash izohi tarjimasiz edi (62 kalit, tarkibli satrlar tx), lug'atdagi 2 ziddiyatli takror; 3 ta 32 px dan kichik tugma; AI havola kartasi faqat https, "$130" (ilgari "130 USD ≈ $130"); yolg'on "Telegram'ga yuborildi" o'lik kodi; hamkor holati so'rovi band bo'lsa navbatga turadi. Haftalik havola tekshiruvi 3 hafta qizil edi: shablon manzillar va o'z Worker'imiz tekshirilmaydi, katta do'konlarning javobsizligi ogohlantirish; Taobao App Store havolasi Xitoy do'koniga. sitemap lastmod — commit sanasi | bajarildi; yumecs.uz va spaceexpress.uz ochilmaydi — kuryerlardan so'rash kerak |

Har bosqich alohida commit(lar), har biridan keyin `smoke`, `guides`,
`check`, `worker` testlari yashil, sayt avtomatik joylanadi. Bosqichlar
2→3→4→5 tartibi qat'iy (keyingisi oldingisiga tayanadi), 6 mustaqil, 7–8
faqat 2 va 4 dan keyin.
