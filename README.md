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
fonts/flags.woff2              23 ta bayroq emojisi (Noto subseti, 44 KB)
icons/                         3D bo'lim ikonkalari, tab-bar ikonkalari, PWA ikonkalari
logos/                         kuryer logotiplari (128 px WebP)
logos/src/                     logotiplarning asl PNG nusxalari (saytga chiqmaydi)
stores/                        do'kon logotiplari (npm run store-logos bilan yuklanadi)
guides/index.html              GENERATSIYA: qo'llanmalarning indekslanadigan ro'yxati
guides/inline/*.html           7 ta platforma qo'llanmasi (mustaqil sahifa ham)
guides/guide-base.css          qo'llanmalarning umumiy uslublari
guides/guide-common.css        umumiy yordamchi uslublar
guides/guide.js                qo'llanmalarning umumiy skripti
tools/                         build, SEO, rasm/shrift va tekshiruv skriptlari
tests/smoke.mjs                asosiy yo'llarni tekshiruvchi smoke test
```

## Buyruqlar

```bash
npm install              # playwright (skriptlar va testlar uchun)
npm run build            # index.html, sw.js, SEO meta, qo'llanmalar ro'yxati
npm run check            # generatsiya fayllari mos va o'lcham byudjeti joyidami
npm test                 # smoke test (ilova, bo'limlar, kalkulyator, qo'llanma)
npm run links            # tashqi havolalarni tekshirish (haftalik CI ham qiladi)
npm run logos            # logos/src/*.png -> logos/*.webp qayta yasash
npm run store-logos      # do'kon logotiplarini bir marta yuklab, stores/ ga saqlash
npm run cover            # icons/og-cover.png ni qayta yasash
npm run serve            # lokal server: http://localhost:8000
```

Bayroq shriftini qayta yasash uchun (kamdan-kam kerak):

```bash
pip install fonttools brotli
python3 tools/subset_flags.py <noto-color-emoji-flags.woff2>
```

## Ma'lumotni yangilash

- **Bojxona me'yorlari** — `data/norms.json`. `from` — kuchga kirish sanasi; ilova joriy sanaga mos oxirgi qatorni oladi. Fayl yuklanmasa koddagi zaxira nusxa ishlatiladi, shuning uchun oflayn ham to'g'ri hisoblanadi. Kalkulyator matnlaridagi foizlar va summalar shu qiymatlardan hosil bo'ladi.
- **Do'kon va kuryerlar** — hozircha `Xarid Yordamchisi v2.dc.html` ichidagi `STORES` va `COURIERS` massivlarida.
- **Valyuta kursi** — Markaziy bankdan (cbu.uz) avtomatik olinadi, 6 soatda bir marta; olinmasa oxirgi saqlangan qiymat "oflayn zaxira" deb belgilanadi.
- **Xato haqida xabar** — ilovadagi tugma `REPORT_URL` manziliga olib boradi (hozir GitHub Issues; Telegram havolasiga almashtirish mumkin).

## Do'kon logotiplari

43 ta do'kon logotipi favicon xizmatidan olinadi. Ular service worker'ning alohida keshida saqlanadi — ya'ni har ochilishda emas, qurilmada bir marta yuklanadi va keyin oflayn ham ko'rinadi.

Tashqi so'rovni butunlay yo'q qilish uchun logotiplarni loyihaga saqlang:

```bash
npm run store-logos      # stores/*.webp va stores/index.json yasaladi
npm run build            # service worker ro'yxati yangilanadi
```

Buni GitHub'da ham qilish mumkin: **Actions → "Do'kon logotiplarini yuklash" → Run workflow**. Shundan keyin ilova `stores/index.json` ro'yxatiga qarab rasmni faqat o'z domenidan oladi. Logotipi topilmagan do'kon uchun rangli monogramma ko'rinadi.

## Tashqi bog'liqliklar

Sayt ishga tushganda faqat Google Fonts'ga murojaat qiladi (`Bricolage Grotesque`, `Onest`, `Noto Color Emoji`) va valyuta kursi uchun `cbu.uz` ga. React o'z domenimizdan yuklanadi, qolgan hamma narsa repozitoriy ichida. Birinchi ochilishdan keyin service worker qobiqni keshlaydi va ilova internetsiz ham ishlaydi.

## O'lcham byudjeti

`npm run check` quyidagilarni tekshiradi: logotiplar ≤ 150 KB, ikonkalar ≤ 120 KB, shriftlar ≤ 80 KB, qo'llanmalar ≤ 620 KB, `index.html` ≤ 420 KB. Chegaradan oshsa CI yiqiladi — bu tasodifan og'ir rasm qo'shilib qolishining oldini oladi.
