# Pochtam.uz — texnik topshiriq bo'yicha audit va rivojlantirish rejasi

Sana: 2026-09-15. Holat: 1 (audit), 2 (Pochtam Core), 3 (bosh sahifa) va 4 (universal kalkulyator) bosqichlari tugadi.
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
| 13. Jo'natmalar | 5 holat | "Bojxona" holati **oxiriga emas, ketma-ketlikka** qo'shiladi; eski `step` indekslari xaritalanadi (3→3, 4→5) |
| 14. Qo'llanmalarda CTA | kalkulyator tab bor | Har qo'llanmaga "Shu do'kondan hisoblash" va "Kuryerlarni solishtirish" — `postMessage` bilan ilovaga store/country uzatiladi |
| 15–18. AI | yo'q | Alohida worker `/ai`, Claude API, tool use; **hisob-kitob faqat `core/` orqali** (o'sha modullar worker'da ham ishlaydi). Panel alohida sahifa `ai/index.html`, iframe (qo'llanmalar kabi) — bosh sahifa og'irlashmaydi |
| 19–20. Server, xarajat | worker bor | API kaliti Cloudflare sirida; DO orqali IP/kun limiti; kesh (1 soat) va tool'lar bilan bir xabar ≈ $0.015 |
| 21–23. Havola, skrinshot | yo'q | 3-bosqichda havoladan faqat do'kon aniqlanadi, narx so'raladi; skrinshot — 8-bosqich, arxitektura tayyor (rasm → o'sha `landed` kirishi) |
| 24. Olish foydalimi | yo'q | `landed` ekranida bitta ixtiyoriy maydon "O'zbekistondagi narx" → "Tejash: …" |
| 25. Bugun Pochtam'da | `TIPS` | Saqlanadi; ustiga tirik kurs va qolgan me'yor; kanal ulanishi keyin |
| 26. Konsultatsiya | 11 xizmat | Saqlanadi; "Murakkab holatmi?" bloki holat bo'yicha xizmatga olib boradi; AI chegaradan chiqsa shu blokka yo'naltiradi |
| 27. Desktop menyu | chap ustun bor | Ustun tarkibi: Hisoblash, Do'konlar, Kuryerlar, Bojxona, Qo'llanmalar; pastda Xaridlarim, Pochtam AI |
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
| 3 | Bosh sahifa UX ✓ (2026-09-15) | hero + aqlli input (havola → do'kon, qisqa havola → alias, noma'lum domen → qidiruv, so'z → qidiruv), 4 ta tez o'tish, mashhur do'konlar tasmasi, kuryerlarni solishtirish bloki (core/tariffs), bloklar tartibi; mavjud bloklar qoladi; RU tarjimalar; byudjet 720 KB | ✓ smoke: 7 yangi tekshiruv, 390/1280 px |
| 4 | Universal kalkulyator ✓ (2026-09-15) | `landed` ekrani: narx/valyuta, miqdor, kategoriya, yo'nalish, og'irlik, quti (hajmiy), ichki yetkazish, kuryer takliflari (arzon/tez/optimal), jami tannarx, "foydalimi", `savePlanFrom` (name/qty/source); do'kon sahifasidan kirish | ✓ smoke: 5 tekshiruv; eski reja o'zgarmagan |
| 5 | Kuryer taqqoslash | filtrlar, ustuvorlik, hisoblangan summa; `compare` kengayadi | 3 kuryer uchun summa va sabab ko'rinadi |
| 6 | Xaridlarim + jo'natmalar | `mine` ekrani (Rejalar, Jo'natmalar, Sevimlilar, Hisob-kitoblar), "Bojxona" holati | eski ma'lumot o'z joyida |
| 7 | Pochtam AI | worker `/ai`, kalit sirda, limit; tool'lar `core/` dan; panel `ai/index.html`; tezkor variantlar; xato holati | AI hisobni o'zi yozmaydi (test); kalit repo va brauzerda yo'q |
| 8 | AI + funksiyalar | javob ostidagi tugmalar kalkulyator/taqqoslash/reja/qo'llanmani to'ldirilgan holda ochadi | tugmalar ishlaydi, o'lchov hodisalari keladi |
| 9 | Keyingi | havola tahlili (ochiq do'konlar), skrinshot, Score, real tracking | alohida topshiriq |

Har bosqich alohida commit(lar), har biridan keyin `smoke`, `guides`,
`check`, `worker` testlari yashil, sayt avtomatik joylanadi. Bosqichlar
2→3→4→5 tartibi qat'iy (keyingisi oldingisiga tayanadi), 6 mustaqil, 7–8
faqat 2 va 4 dan keyin.
