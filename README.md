# Xarid Yordamchisi

Chet el do'konlari, kuryerlar, bojxona kalkulyatori va bosqichma-bosqich qo'llanmalar — O'zbekiston uchun mo'ljallangan mobil web-ilova.

**Onlayn:** https://nshakhobiddin.github.io/Pochtachi/

## Manba qayerda

Yagona manba — **`Xarid Yordamchisi v2.dc.html`**. Bu Claude Design loyihasining `.dc.html` fayli: `<x-dc>` shabloni va ilova skripti bir joyda. Dizaynni Claude Design'da tahrirlash mumkin, kodni esa shu faylda.

`index.html` va `sw.js` — **generatsiya qilinadi**, ularni qo'lda tahrirlamang:

```bash
npm run build     # index.html + sw.js + SEO meta va qo'llanmalar ro'yxati
```

## Loyiha tuzilishi

```
Xarid Yordamchisi v2.dc.html   manba: <x-dc> shabloni + ilova skripti
index.html                     GENERATSIYA: saytning kirish nuqtasi
sw.js                          GENERATSIYA: offline uchun service worker
support.js                     dc-runtime (shablonni React bilan render qiladi)
manifest.webmanifest           PWA manifesti
data/norms.json                bojxona me'yorlari (kodga tegmasdan yangilanadi)
vendor/                        React va ReactDOM (unpkg'dagi asl fayllar)
fonts/                         matn shriftlari (o'z domenimizda) va bayroq subseti
icons/                         3D bo'lim ikonkalari (`boj-*` — bojxona qatorlari), tab-bar va PWA ikonkalari
icons/src/                     ikonkalarning asl (katta) nusxalari (saytga chiqmaydi)
logos/                         kuryer logotiplari (128 px WebP)
logos/src/                     logotiplarning asl PNG nusxalari (saytga chiqmaydi)
stores/                        do'kon logotiplari (224x112 WebP) va index.json
stores/src/                    logotiplarning asl PNG nusxalari (saytga chiqmaydi)
guides/index.html              GENERATSIYA: qo'llanmalarning indekslanadigan ro'yxati
guides/inline/*.html           7 ta platforma qo'llanmasi (mustaqil sahifa ham)
guides/guide-base.css          qo'llanmalarning umumiy uslublari
                               (shu jumladan `figure.shot` — qadamlardagi ekran maketlari)
guides/guide-common.css        umumiy yordamchi uslublar
guides/guide-engine.js         qo'llanmalarning umumiy render kodi (7 tasi uchun bitta)
guides/guide.js                qo'llanmalarning umumiy skripti
tools/                         build, SEO, rasm/shrift va tekshiruv skriptlari
tests/smoke.mjs                asosiy yo'llarni tekshiruvchi smoke test
```

## Buyruqlar

```bash
npm install              # playwright (skriptlar va testlar uchun)
npm run build            # index.html, sw.js, SEO meta, qo'llanmalar ro'yxati
npm run check            # generatsiya fayllari mos va o'lcham byudjeti joyidami
npm test                 # smoke test + 7 ta qo'llanmaning tekshiruvi
npm run links            # tashqi havolalarni tekshirish (haftalik CI ham qiladi)
npm run logos            # logos/src/*.png -> logos/*.webp qayta yasash
npm run icons            # icons/src/*.webp -> icons/*.webp (ekran o'lchamiga moslash)
npm run store-logos      # do'kon logotiplari (--from DIR bilan tayyor rasmlardan)
npm run cover            # icons/og-cover.png ni qayta yasash
npm run fonts            # matn shriftlarini Google Fonts'dan qayta yuklab olish
npm run serve            # lokal server: http://localhost:8000
```

Bayroq shriftini qayta yasash uchun (yangi davlat qo'shilganda):

```bash
pip install fonttools brotli picosvg
npm run flags        # fonts/flags-src/*.svg -> fonts/flags.woff2
```

## Ma'lumotni yangilash

- **Bojxona me'yorlari** — `data/norms.json`. `from` — kuchga kirish sanasi; ilova joriy sanaga mos oxirgi qatorni oladi. Fayl yuklanmasa koddagi zaxira nusxa ishlatiladi, shuning uchun oflayn ham to'g'ri hisoblanadi. Kalkulyator matnlaridagi foizlar va summalar shu qiymatlardan hosil bo'ladi.
- **Do'kon va kuryerlar** — hozircha `Xarid Yordamchisi v2.dc.html` ichidagi `STORES` va `COURIERS` massivlarida.
- **Valyuta kursi** — Markaziy bankdan (cbu.uz) avtomatik olinadi, 6 soatda bir marta; olinmasa oxirgi saqlangan qiymat "oflayn zaxira" deb belgilanadi.
- **Xato haqida xabar** — ilovadagi tugma `REPORT_URL` manziliga olib boradi (hozir GitHub Issues; Telegram havolasiga almashtirish mumkin).

## Telegram bot ichida ochish

Ilova Telegram Mini App sifatida to'liq ekranda ochiladi. Botga ulash:

1. [@BotFather](https://t.me/BotFather) da botni tanlang.
2. **Bot Settings → Menu Button → Configure menu button** ni bosing va manzil sifatida
   `https://nshakhobiddin.github.io/Pochtachi/` ni kiriting (tugma nomi, masalan, "Xarid Yordamchisi").
3. Yoki `/newapp` orqali alohida Mini App yarating va shu manzilni bering.

Telegram ichida ilova o'zi:

- `ready` + `expand` va (Bot API 8.0 dan boshlab) `requestFullscreen` bilan butun ekranni egallaydi;
- pastga tortganda yopilib ketmasligi uchun vertikal svaypni o'chiradi;
- Telegramning tepadagi tugmalari ostiga tushmaslik uchun `safeAreaInset` va
  `contentSafeAreaInset` qiymatlarini hisobga oladi;
- Telegramning "orqaga" tugmasini ilova navigatsiyasiga bog'laydi;
- tugmalarga yengil tebranish (haptic) bilan javob beradi.

Oddiy brauzerda bu kodning ta'siri yo'q — sayt avvalgidek ishlayveradi.

## Do'kon logotiplari

43 ta do'konning hammasida logotip bor: `stores/*.webp`, 224x112 px, jami ~178 KB. Ular so'z-belgi (wordmark) ko'rinishida, shuning uchun ilovada cho'ziq qutida ko'rsatiladi. Asl PNG nusxalar `stores/src/` da (saytga chiqmaydi).

Qayta yasash:

```bash
npm run store-logos -- --from stores/src --force
npm run build                       # service worker ro'yxati yangilanadi
```

Tafsilotlar `stores/README.md` da.

## Tashqi bog'liqliklar

Sayt tashqariga faqat bitta so'rov yuboradi — valyuta kursi uchun `cbu.uz` ga. Shriftlar, React, do'kon logotiplari va qolgan hamma narsa o'z domenimizda; smoke test buni har ishga tushishda tekshiradi. Birinchi ochilishdan keyin service worker qobiqni keshlaydi va ilova internetsiz ham ishlaydi.

**Shriftlar.** Butun ilova bitta oiladan foydalanadi — `Onest` (o'zgaruvchan shrift), `fonts/` ichida. Brauzer sahifadagi belgilarga qarab faqat keraklisini oladi: lotin (32 KB), kirillcha matn ko'rinsa yana 14 KB, bayroq ko'rinsa `flags.woff2` (44 KB). Ilgari ular `fonts.googleapis.com` -> `fonts.gstatic.com` zanjiri orqali kelardi va 238 KB chiqardi. Yangilash: `npm run fonts`.

**Bayroqlar.** `fonts/flags.woff2` (25 KB) — ilovada ishlatiladigan 23 ta bayroq: 🇺🇿 🇨🇳 🇺🇸 🇹🇷 🇬🇧 🇦🇪 🇰🇷 🇷🇺 🇰🇿 🇰🇬 🇹🇯 🇲🇾 🇪🇺 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇬🇷 🇨🇦 🇵🇱 🇵🇹 🇺🇦 🇨🇿.

Bayroqlar matn ichida turadi ("🇹🇷 Turkiya", kuryer tariflari, do'kon kartalari), shuning uchun ular rasm emas, rangli shrift (COLR/CPAL) sifatida beriladi — bitta fayl hammasini qoplaydi va Windows'da ham ko'rinadi (u yerda tizim shriftida bayroq yo'q).

Manba — `fonts/flags-src/*.svg`, [flag-icons](https://github.com/lipis/flag-icons) (MIT) ning tekis bayroqlari. Yangi davlat qo'shish: SVG ni `fonts/flags-src/<iso>.svg` sifatida qo'ying va `npm run flags` ni ishlating.

## Tezlik

Sayt birinchi bo'yog'ini uchinchi tomon serverlariga bog'lamaydi: shrift ham,
Telegram SDK'si ham o'z domenimizdan yoki umuman yuklanmaydi. Shuning uchun
tashqi xizmat sekinlashsa ham ilova bir xil tezlikda ochiladi.

Bir xil sharoitda o'lchov (mobil ekran, 4x sekin protsessor, tashqi hostlar
turli kechikish bilan):

| Tashqi host kechikishi | Ilgari (FCP) | Hozir (FCP) |
|---|---|---|
| 0 ms (ideal) | 548 ms | 596 ms |
| 150 ms | 708 ms | 560 ms |
| 300 ms | 888 ms | 556 ms |
| ochilmaydi | 10 892 ms | 592 ms |

Birinchi yuklash trafigi: **1345 KB -> 770 KB**, so'rovlar 34 -> 27,
tashqi hostlar 3 -> 1 (faqat valyuta kursi uchun `cbu.uz`).

Nima qilindi:

- Telegram SDK'si `<head>` dagi bloklovchi skript emas — faqat Telegram ichida
  va asinxron yuklanadi.
- Shriftlar `fonts/` da, service worker keshida.
- Qo'llanmalar ilova ochilishida emas, "Qo'llanmalar" bo'limi ochilganda
  oldindan yuklanadi (birinchi yuklashdan ~490 KB olib tashlandi).
- Qo'llanmalarning bir xil render kodi bitta `guide-engine.js` da.
- Ikonkalar ekrandagi o'lchamiga moslangan.
- Uzun ro'yxatlarda `content-visibility`; renderVals() ichidagi og'ir
  ro'yxatlar faqat o'z ekrani ochiqligida quriladi.
- Ilova ichidan ochilmaydigan eski qadam-ekrani (`GUIDES` massivi va uning
  skrinshot o'rni) olib tashlandi — `index.html` 11 KB ga qisqardi.

Do'kon logotiplari ham loyihaga ko'chirildi, shuning uchun ilovada uchinchi
tomon serveriga birorta ham so'rov qolmadi.

## O'lcham byudjeti

`npm run check` quyidagilarni tekshiradi: kuryer logotiplari ≤ 150 KB, ikonkalar ≤ 120 KB, shriftlar ≤ 120 KB, do'kon logotiplari ≤ 260 KB, qo'llanmalar ≤ 470 KB, `index.html` ≤ 420 KB. Chegaradan oshsa CI yiqiladi — bu tasodifan og'ir rasm qo'shilib qolishining oldini oladi.
