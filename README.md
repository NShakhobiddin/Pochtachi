# Pochtam

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
icons/                         3D bo'lim ikonkalari (`boj-*` — bojxona qatorlari), tab-bar,
                               brend logotipi (`brand*.webp`) va PWA ikonkalari
icons/src/                     ikonkalarning asl (katta) nusxalari (saytga chiqmaydi)
logos/                         kuryer logotiplari (128 px WebP)
logos/src/                     logotiplarning asl PNG nusxalari (saytga chiqmaydi)
stores/                        do'kon logotiplari (128x128 WebP) va index.json
stores/src/                    logotiplarning asl PNG nusxalari (saytga chiqmaydi)
guides/index.html              GENERATSIYA: qo'llanmalarning indekslanadigan ro'yxati
guides/inline/*.html           7 ta platforma qo'llanmasi (mustaqil sahifa ham)
guides/guide-base.css          qo'llanmalarning umumiy uslublari
                               (shu jumladan `figure.shot` — qadamlardagi ekran maketlari)
tools/normalize-mockups.mjs    maketlarning ramkasi, belgilari, tartibi va
                               ko'rsatkichlarini bir me'yorga soladi
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
npm run mockups          # qadamlardagi telefon maketlarini bir me'yorga keltirish
npm run store-logos      # do'kon logotiplari (--from DIR bilan tayyor rasmlardan)
npm run brand            # icons/src/intro/*.png -> logotip va ilova ikonkalari
npm run tint             # ikonka manbalarini brend toniga (238) keltirish
npm run intro            # icons/src/intro/*.png -> intro logotip bo'laklari
npm run glyphs           # icons/glyphs/*.png -> tekis svc-* belgilar
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
   `https://nshakhobiddin.github.io/Pochtachi/` ni kiriting (tugma nomi, masalan, "Pochtam").
3. Yoki `/newapp` orqali alohida Mini App yarating va shu manzilni bering.

Telegram ichida ilova o'zi:

- `ready` + `expand` va (Bot API 8.0 dan boshlab) `requestFullscreen` bilan butun ekranni egallaydi;
- pastga tortganda yopilib ketmasligi uchun vertikal svaypni o'chiradi;
- Telegramning tepadagi tugmalari ostiga tushmaslik uchun `safeAreaInset` va
  `contentSafeAreaInset` qiymatlarini hisobga oladi;
- Telegramning "orqaga" tugmasini ilova navigatsiyasiga bog'laydi;
- tugmalarga yengil tebranish (haptic) bilan javob beradi.

Oddiy brauzerda bu kodning ta'siri yo'q — sayt avvalgidek ishlayveradi.

## O'lchash

Hamkorlikni va ilovada joylashishni sotish uchun bitta savolga javob kerak:
qaysi ekran ochiladi va qaysi do'kon/kuryerga o'tiladi. Shusiz hamkorga
aytadigan raqam bo'lmaydi.

Uchinchi tomon xizmati yo'q. Manzil `METRICS_URL` da va u **bo'sh** — shu
holatda hech qanday so'rov ketmaydi va ilovaning "cbu.uz dan boshqa tashqi
so'rov yo'q" qoidasi buzilmaydi (`tests/smoke.mjs` ikkalasini ham
tekshiradi). Yoqish uchun `METRICS_URL` ga **o'zingizning** hisoblagichingiz
manzilini yozing.

**Nima yuboriladi.** Hodisa nomi, qo'pol kalit, ilova versiyasi va til:

```json
{ "v": "v1.0.0 · 19.08.2026", "l": "uz",
  "e": [{ "n": "screen", "k": "stores", "t": 1788521904608 },
        { "n": "store",  "k": "taobao", "t": 1788521912345 }] }
```

Hodisalar: `screen` (ekran ochildi), `store` va `courier` (tashqi saytga
o'tildi), `guide` (qo'llanma ochildi), `wizard` (reja yakunlandi), `svcAsk`
(pullik xizmat bo'yicha murojaat), `hamkor` (hamkorlik so'rovi).

**Nima yuborilmaydi.** Foydalanuvchi identifikatori, qidiruv matni, saqlangan
reja, sevimlilar — hech qachon. Brauzerda "Do Not Track" yoqilgan bo'lsa
umuman hech narsa yuborilmaydi.

**Qanday yuboriladi.** Hodisalar xotirada to'planadi va sahifa fonga
o'tganda yoki yopilganda bitta `sendBeacon` bilan ketadi (20 ta to'plansa
ham). Ya'ni har bosishda so'rov qilinmaydi.

**Server tomoni.** Eng arzon yo'l — Cloudflare Worker (bepul tarif yetadi).
Minimal ko'rinishi:

```js
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': 'https://nshakhobiddin.github.io',
                   'Access-Control-Allow-Methods': 'POST, OPTIONS',
                   'Access-Control-Allow-Headers': 'content-type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('', { status: 405, headers: cors });
    const { e = [] } = await req.json().catch(() => ({}));
    const kun = new Date().toISOString().slice(0, 10);
    for (const x of e.slice(0, 60)) {
      const kalit = `${kun}|${x.n}|${String(x.k).slice(0, 40)}`;
      const bor = Number(await env.HISOB.get(kalit)) || 0;
      await env.HISOB.put(kalit, String(bor + 1));
    }
    return new Response(null, { status: 204, headers: cors });
  }
};
```

`HISOB` — Workers KV ombori. Faqat sanoq saqlanadi, IP ham, xom hodisa ham
yozilmaydi. `Access-Control-Allow-Origin` ni o'z domeningizga qo'ying, aks
holda boshqa saytlar ham sanoqni shishira oladi.

## Pullik xizmatlar

Ilova ma'lumot xizmati sifatida bepul qoladi. Pulli qism — `SERVICES`
massividagi 11 ta xizmat: 5 tasi jismoniy shaxslar uchun (ushlangan
jo'natma, boj hisobini tekshirish, hujjat tayyorlash), 6 tasi kuryerlik
tashkilotlari uchun (litsenziya, shartnoma, bojxona bahsi, sayt/bot, trek
integratsiyasi, ilovada joylashish).

Bo'lim `CONTACT` bilan boshqariladi. `tg` yoki `phone` bo'sh bo'lsa
`HAS_CONTACT` false bo'ladi va bo'lim butunlay ko'rsatilmaydi — ochilgan
har bir tugma ogohlantirishga olib borishi o'rniga. Narxlar `SERVICES`
dagi `price` maydonida; boshqa joyda takrorlanmaydi.

Kirish nuqtalari ikkita: bosh sahifadagi "Mutaxassis yordami" kartochkasi
va Bojxona bo'limidagi "Mutaxassis konsultatsiyasi". Har bir xizmatning
"Bog'lanish" tugmasi Telegramni ochadi va xabar matnini oldindan yozadi.

## Brend logotipi

Yagona manba — `icons/src/intro/*.png`: logotipning vektor eksporti
bo'lakma-bo'lak (olti burchak, ichidagi yashil `p`, `Pochtam.` harflari).
Brend introsi ham shu bo'laklardan yig'iladi, ya'ni logotip va animatsiya
hech qachon bir-biridan uzoqlashmaydi. `npm run brand` ulardan lokapni
yig'ib to'rt faylni yasaydi:

| Fayl | Qayerda |
| --- | --- |
| `icons/brand.webp` | bosh ekran sarlavhasi — 36 px balandlikda, shiorsiz |
| `icons/brand-full.webp` | tanishuv ekrani — 240 px kenglikda, shior bilan |
| `icons/icon-192.png` | PWA ikonkasi |
| `icons/apple-touch-icon.png` | iOS ikonkasi |

Yashil `m` ortidagi ko'k quti — harfning kengligi va x-balandlikdan tayanch
chizig'igacha bo'lgan balandligi (`BOX_TOP`/`BOX_BOTTOM`), har tomondan
`BOX_PAD` ga kattaroq. Introda quti yo'q: u yerda harflar bittalab yig'iladi
va quti animatsiyani chalg'itardi.

Sarlavhada shior yo'q: 36 px balandlikdagi lokapda uning harflari 4 px ga
tushib o'qilmay qolardi. Tanishuv ekranida joy yetarli — shior so'z ostida
turadi va belgi butun ustunning markaziga tenglashadi. Nisbatlar
`WORD_SHARE`, `GAP_SHARE` va `TAG_GAP_SHARE` da — belgi va so'z o'lchamiga
bog'langan, shuning uchun lokap qaysi o'lchamda chiqsa ham buzilmaydi.
Ikonkalar oq fonda — shaffof bo'lsa tizim ularni qora bilan to'ldiradi va
ko'k belgi yo'qoladi.

## Dizayn tizimi

Bir necha bosqichli audit natijasi. Har bir band `tests/smoke.mjs` da
tekshiriladi, ya'ni tizimdan chetga chiqish CI da ushlanadi.

**Rang.** Asosiy rang `#1A1FB0` — logotipdagi ko'kning (ton 238) ilova
uchun ochroq pog'onasi. Butun oila shu tonda: bosilgan `#13189D`,
gradient `#5C61EB -> #1A1FB0 -> #0E127B`, ohang `#E9EAFD` va `#DCDDFA`.
Kulrang uch pog'ona: `#4E4F6B` kuchli, `#6B6C85` passiv (oq bilan
5.2:1, AA), `#A6A7BC` faqat bezak. Holat ranglari alohida: yashil
`#0F7B3E`, sariq `#B45309`, qizil `#9B1C1C`, moviy `#0E8595`.
Do'kon va kuryerlarning o'z brend ranglari tizimga kirmaydi.

Gradient ustidagi oq matn alohida hisoblanadi: uni fon rangi bilan emas,
ekrandan o'qilgan piksel bilan o'lchash kerak. Shaffofligi `.58` dan past
bo'lsa 11px yozuv AA dan chiqib ketadi — shuning uchun quyi chegara
`tests/smoke.mjs` da qo'yilgan (hozirgi eng pasti `.60`).

**Matn.** Kegl 11 / 13 / 15 / 17 / 22 / 26 / 34 (44 va 52 — bayroq
glifi). Har bir keglda ko'pi bilan ikki qalinlik: 11 -> 600/700,
13 va 15 -> 500/700, 17 -> 700, 22 va undan yuqorisi -> 800. Harf
oralig'i faqat keglga bog'liq: >=34px `-.035em`, 26px `-.03em`,
22px `-.025em`, 17px `-.02em`, 11-15px uchun `body` dagi `-.012em`.
Katta harfli yorliqlar `text-transform:uppercase` bilan, manbada
jumla ko'rinishida yoziladi — shunda ruscha tarjima ham ishlaydi.

**Ikonkalar — to'rt pog'ona, rol bo'yicha.**

| Pog'ona | Qayerda | Uslub | O'lcham |
| --- | --- | --- | --- |
| P1 | bo'lim qahramoni | 3D ko'p rangli (`*-3d`, `boj-*`) | 64px |
| P2 | papka / kategoriya | 3D bir rangli (`dok-*`) | 48px |
| P3 | ro'yxat va yorliq | tekis (`svc-*`, `ban/*`, `norm/*`) | 24-40px |
| P4 | interfeys | chiziqli SVG | 14/18/22/28px |

Bosh sahifadagi to'rt kartochka ikonkasi (`stores-3d`, `courier-3d`,
`customs-3d`, `guides-3d`) o'z plitasi bilan chizilgan — shuning uchun
ular ilova tomonidan qo'shimcha rangli plitaga solinmaydi, 64 px da
to'g'ridan-to'g'ri turadi. Bo'limning rangi yonidagi shevron doirasida
qoladi: `#E9EAFD` do'konlar, `#DDF1F4` kuryerlar, `#FBEFD6` bojxona,
`#E9F8EF` qo'llanmalar.

Rasm uyalari 16 / 24 / 32 / 40 / 48 / 64 qadamlarida. Chiziqli
ikonkalarda `viewBox` doim 24, chiziq qalinligi esa o'lchamga bog'lab
tanlanadi (14 -> 2.7, 18 -> 2.1, 22 -> 1.75, 28 -> 1.4) — shunda ekranda
hamma joyda ~1.6px bo'lib chiqadi.

**Masofa.** `padding`, `gap`, `margin` faqat juft qadamlarda:
0 2 4 6 8 10 12 14 16 18 20 24 28 32.

**Soya.** Tayyor qatlamlardan yig'iladi: karta
(`0 1px 2px rgba(20,19,43,.04)` + `0 8px 20px -12px rgba(20,19,43,.24)`),
brend, yorug'lik (`0 14px 32px -16px rgba(17,21,132,.52)`), ramka
(`inset 0 0 0 1px` — brend `.09`, holat `.12`, neytral `#E3E3EE`).

**Qolgan ish.** `svc-*` (11 ta) tekis uslubda, lekin ular Xizmatlar
bo'limining asosiy kartochkalarida turadi — ya'ni P3 da chizilgan
P1/P2 roli. Ularni 3D uslubda qayta chizdirish kerak. Aksincha,
`app-play` va `app-store` 3D, lekin mayda yordamchi belgilar — ular
P3 ga tushishi kerak.

## Brend introsi

Ilova har ochilganda ~3 soniyalik logotip animatsiyasi o'ynaydi: yashil P
qutiga tushadi, olti burchak to'ladi, "Pochtam" harflari ko'tariladi va
shiorni salat kursor yozib chiqadi. Ekranga tegilsa darhol o'tkazib
yuboriladi; harakatni kamaytirish yoqilgan bo'lsa umuman chiqmaydi.

Manba — Claude Design'dagi "Pochtam Telegram Intro" sahnasi. Undan
xoreografiya (vaqtlar, easing'lar, o'lchamlar) o'zgarishsiz olindi;
56 KB lik kompozitsiya dvigateli o'rniga `<head>` da kerakli beshta
funksiya yozilgan, logotip esa base64 (216 KB) emas, alohida WebP
bo'lak (`icons/intro/`, 59 KB).

Qoidalar: har ochilishda; harakatni kamaytirish yoqilgan bo'lsa yoki rasm
yuklanmasa umuman ko'rsatilmaydi; istalgan joyga tegilsa o'tkazib
yuboriladi; ilova shu vaqtda ortda ko'tariladi.

Intro hech qanday holat saqlamaydi. Testlar uni kutib o'tirmasligi uchun
`reducedMotion: 'reduce'` bilan ochiladi — bu ilovaning o'z qoidasi,
test uchun alohida kod emas.

Bo'laklarni qayta yasash: asl PNG larni `icons/src/intro/` ga qo'yib,
`npm run intro`.

## Do'kon logotiplari

43 ta do'konning hammasida logotip bor: `stores/*.webp`, 128x128 px, jami ~197 KB. Ular kvadrat ilova-ikonkasi ko'rinishida, shuning uchun ilovada kvadrat qutida, ohangsiz ko'rsatiladi. Asl PNG nusxalar `stores/src/` da (saytga chiqmaydi).

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
- «Yo'l» bo'limi «Reja» deb ataladi: qadamlar tanlangan javobni ko'rsatadi,
  o'tilgan qadamga bosib qaytish mumkin va bo'limdan chiqib qaytganda
  tanlovlar saqlanadi.
- Ettala qo'llanmaning qadamlarida telefon maketlari bor (jami 35 ta, SVG).
  Manbada joy oladi, lekin yaxshi siqiladi: bitta qo'llanma gzip bilan
  ~24 KB. Byudjet shuning uchun gzip bo'yicha ham tekshiriladi.

Do'kon logotiplari ham loyihaga ko'chirildi, shuning uchun ilovada uchinchi
tomon serveriga birorta ham so'rov qolmadi.

## O'lcham byudjeti

`npm run check` quyidagilarni tekshiradi: kuryer logotiplari ≤ 150 KB, ikonkalar ≤ 120 KB, shriftlar ≤ 120 KB, do'kon logotiplari ≤ 260 KB, qo'llanmalar ≤ 470 KB, `index.html` ≤ 420 KB. Chegaradan oshsa CI yiqiladi — bu tasodifan og'ir rasm qo'shilib qolishining oldini oladi.
