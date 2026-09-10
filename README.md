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
flags/                         kuryerlar bosh oynasi uchun 3D bayroqlar (192 px WebP)
flags/src/                     bayroqlarning asl PNG nusxalari (saytga chiqmaydi)
logos/                         kuryer logotiplari (128x128 WebP)
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
npm run flag-icons       # flags/src/*.png -> flags/*.webp (kuryerlar bosh oynasi)
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

## Tillar

Ilova uch tilda: o'zbek lotin (`uz`), o'zbek kirill (`uzc`) va rus (`ru`).
Manba faqat lotinchada yoziladi; qolgan ikkitasi `applyLang` orqali har
chizishdan keyin DOM matn tugunlariga qo'llanadi (`aria-label` va
`placeholder` ham).

**Ruscha** — `RU` lug'ati (`dc.html` ichida), butun satr bo'yicha aniq
moslik. "43 ta do'kon" yoki "🇨🇳 Xitoy" kabi satrlarda boshidagi raqam va
bayroq ajratiladi, faqat qolgan qism tarjima qilinadi. Raqam ichida
turadigan satrlar (`me'yordan $120 ortiq`) `tx(lang, shablon, ...qiymat)`
orqali yasaladi: lug'atda `{0}` o'rinbosari bilan turadi, raqam keyin
qo'yiladi. Ma'lumotlar bazasidan kelgan matn (kuryer izohi, tariflar,
do'kon tavsifi) ruschaga tarjima qilinmagan — o'sha elementlar
`lang="uz"` bilan belgilangan, ruscha sahifada ular o'zbekcha qoladi.

**Kirill** — lug'atga bog'liq emas: har qanday o'zbekcha lotin satr
`toCyrProse` bilan avtomatik o'giriladi. Brend nomlari (do'kon, kuryer,
qo'llanma nomlari — `CYR_PHRASES`), valyuta kodlari va inglizcha
so'zlar (`CYR_KEEP`), manzil va e-mail lotin qoladi. Undoshdan keyingi
"ye" yumshatish belgisi bilan o'giriladi (kuryer -> курьер). Ilgari
kirill faqat lug'at kalitlari uchun ishlar edi va chuqur ekranlar
(bojxona bo'limlari, kuryer sahifalari) lotinchada qolib ketardi.

`translate="no"` qo'yilgan element ichidagi matnga `applyLang` tegmaydi.
Til tugmalari ("Ўзбекча") shunday belgilangan: ilgari ruscha rejimda ular
lotinga o'girilar va DOM matni bir marta almashtirilgach React uni qayta
chizmagani uchun qaytmay qolardi.

**Ruscha ko'plik.** "43 ta do'kon" kabi satrlarda son ajratilgach birlik
`RU_PLURAL` jadvalidan songa qarab tanlanadi (43 магазина, 20 курьеров,
7 инструкций, 2–3 раб. дня — oraliqda oxirgi son). Son va birlik alohida
elementda turganda (bosh sahifa kartalari) birlik `nUnit(lang, n, key)`
bilan view-modelda tanlanadi.

Smoke test ikkala tilda chuqur ekranlarni ham aylanib chiqadi: qidiruv,
kuzatuv, do'kon va kuryer papkalari, taqqoslash, bojxonaning oltita
bo'limi, xizmatlar. Ruscha rejimda `lang="uz"` ichidagi matn, kirillda
brend nomlari va manzillar hisobga olinmaydi.

## Qidiruv

Bitta maydon do'kon, kuryer va qo'llanmani birga izlaydi (`hqResults`).
So'rov `norm` bilan normallashtiriladi: registr, apostrof, kirill ->
lotin, `x` -> `ks`. Uch harfgacha bo'lgan so'rov so'z boshidan, uzunroq
so'rov istalgan joydan qidiriladi.

**Toifa sinonimlari** (`CAT_SYN`). "krossovka", "telefon", "кроссовки",
"одежда" kabi so'zlar do'kon matnida yo'q, lekin toifada bor: har do'kon
o'z toifasining nomi, tavsifi va sinonimlari bilan ham topiladi. Ruscha
so'zlar lotin harflarida yoziladi, chunki so'rov ham `norm` dan o'tadi
("кроссовки" -> "krossovki"). Davlat nomlari uchun `GEO_SYN`
("Турция" -> "turtsiya" -> Turkiya).

**Ko'p so'zli so'rov.** "pinduoduo qollanma" kabi so'rovda har bir so'z
alohida topilishi kerak, tartibi muhim emas (`matches` → `matchesOne`).

**Bojxona natijalari.** Bojxonaning oltita bo'limi (o'z sinonimlari bilan,
ruscha transliteratsiya ham: "таможня", "лимит") va taqiqlangan tovarlar
(`BANNED`, `syn` bilan) ham natijada chiqadi: "dron" taqiqlar ro'yxatini
o'sha pozitsiya ochilgan holda ochadi, "kalkulyator" bojxona
kalkulyatorini. Natija bo'lmasa toifa kartalari va bojxona havolalari
baribir turadi.

**Toifa qatori.** So'rov toifaga tegsa, natijaning tepasida "Poyabzal · 7
ta do'kon · Bo'lim" qatori chiqadi va butun papkani ochadi — ro'yxatda
faqat 5 ta do'kon ko'rsatiladi.

**Bo'sh holat.** Maydon bo'sh turganda oxirgi qidiruvlar, ko'p
qidiriladigan so'zlar (`HOT_QUERIES`, chip bosilganda so'rov joriy tilda
yoziladi), oltita toifa kartasi va bojxona kalkulyatori/taqiqlangan
tovarlarga havola turadi. Ilgari bu oyna bo'm-bo'sh edi.

Smoke test: bo'sh holat takliflari, `krossovka`/`telefon`/`кроссовки`/
`Турция` so'rovlari va toifa qatorining papkani ochishi.

Taqiqlangan tovarlar qidiruvi ham `norm` dan o'tadi va pozitsiyalarda
`syn` sinonim maydoni bor (vape, narkotik, tabletka, kvadrokopter, пиво…).

## Reja sehrgari

Besh qadam: mahsulot toifasi, davlat, do'kon, kuryer, hisob; keyin
"Sizning rejangiz" ko'rinishi va saqlash. Davlat tanlanganda do'kon
ro'yxatida avval o'sha davlatning do'konlari, keyin "Global" (ko'p
davlatga yuboradigan: Nike, Adidas, Sephora, Amazon) turadi — Global'lar
ichida ham toifaning o'zi universal marketpleyslardan oldin. Tagsarlavha
nechtasi global ekanini aytadi. Ilgari Global'lar umuman chiqmasdi va
"Poyabzal + AQSh" tanlagan foydalanuvchi Nike'ni ko'rmasdi.

Saqlangan rejalar bosh sahifada, kuzatuvda va Reja tabining birinchi
qadamida (sehrgar ustida, "Saqlangan rejalar") ko'rinadi.

## Do'konlar va kuryerlar

Ikkala bo'lim papka bilan ochiladi (do'konlar: tovar turi yoki davlat;
kuryerlar: yo'nalish). Do'kon sahifasidagi "N kuryerni ko'rish" tugmasi
do'kon davlatiga mos yo'nalish papkasini ochadi (Taobao -> Xitoy
yo'nalishi), Global do'konda "Barcha kuryerlar".

Kuryer papkasida "Taqqoslash" rejimi shu papkaga tegishli: boshqa papka
ochilganda yoki bo'lim almashganda o'chadi. Sarlavhadagi filtr varag'i
kuryer ekranlarida kuryer filtrlarini (yuborish turi, saralash; yo'nalish
papkasidan tashqarida davlat ham) ko'rsatadi. Escape avval ochiq varaqni
yopadi, keyingina ekranni.

## Bojxona kalkulyatori

`calc()`: oylik summa − $200 = ortiqcha; ortiqcha ulushiga mos vazn
nisbat bilan ajratiladi; bojxona qiymati = ortiqcha + shu vaznning
yetkazish xarajati; boj = max(qiymatning 30%, ortiqcha vazn × $3);
yig'im = BHM ning 25% (faqat ortiqcha bo'lganda). Maydonlar `num()` dan
o'tadi: vergul kasr sifatida, harf va manfiy qiymat tashlanadi. Dollar
summalari `usd()` bilan chiziladi: minglik ajratkich, $1 dan kichik
ortiqcha esa tiyin bilan ("$0.01" — 200.01 dollarda ham yig'im
undirilishi ko'rinib tursin). Bojxona tabidagi "Oy summasini qo'yish"
summani qo'yib, kalkulyatorning o'zini ochadi.

## Motion-tushuntirishlar (bojxona)

Uch bo'lim tepasida "Qanday ishlaydi · ≈ 1,5 daqiqa · 11 qadam" kartasi:
Bojsiz me'yor, Yagona bojxona to'lovi, Rasmiylashtirish tartibi. Har qadamda
sarlavha va batafsil izoh (`MOTION[bo'lim].steps[].t/.c`), qadam davomiyligi
matn uzunligiga qarab `moMs()` bilan 4,5–8,5 s (bo'lim ≈ 70–90 s). Pastda
segmentli vaqt chizig'i: har segment bosiladigan qadam, joriy segment qadam
davomiyligida to'ladi (`mo-bar-a/b` — nom almashib animatsiya qaytadan
boshlanadi). Oxirida harakat tugmasi (`MO_CTA`): kalkulyator yoki bojxona
organlari.

Sahnalar shablonda (`moScene.mNsK`, har sahna o'z `<svg>` ida, 360×200,
markazda qat'iy o'lchamda). So'mdagi raqamlar (BHM, yig'im, kurs, boj, jami)
`moExample()` dan — kalkulyator bilan bir xil formula, `normsAt()` va
`USD_RATE` dan tirik. SVG `<text>` ichida shablon o'rinbosari ko'rinmaydi
(u `<span>` ga o'raladi), shuning uchun tirik raqamlar sahna ustidagi HTML
qatlamida, o'sha koordinata va animatsiya sinfi bilan, kegl shkalasida.
Izohlardagi raqamlar `{0}` o'rinbosari va `steps[].v(ex)` orqali. Ruscha
lug'atda sarlavha, izoh va SVG so'zlari; animatsiya sinflari `.mo-*`,
harakatni kamaytirish rejimida kechikishsiz statik kadr. Ekran yoki bo'lim
almashganda to'xtaydi. Video fayl yo'q: hammasi index.html ichida (~100 KB,
gzip bilan ~25 KB), oflayn ishlaydi, shuning uchun index.html chegarasi
640 → 680 KB.

### Qo'llanmalarda

Har qo'llanmada beshta (Poizon va eBay'da oltita) video, har biri o'z
paneli tepasida (`guides/guide-motion.js`, uslublar `guide-common.css` dagi
`.gm-*`):

- **Boshlash** — "Qanday ishlaydi", 11 qadam, do'konga xos: nima bu, yo'llar,
  kuryer va ID, ro'yxat, qidiruv, manzil, to'lov, ombor, yo'l, bojxona, qabul.
- **Bosqichlar** — "Bosqichma-bosqich", qo'llanmaning o'z `STEPS` ro'yxatiga
  mos 10–12 qadam (Taobao'da 我的淘宝 → 我的地址 kabi aniq yo'llar, Trendyol'da
  turk maydonlari, Amazon'da ASIN va suite, eBay'da auksion va MBG).
- **Bojxona** — standart 9 qadam + do'konga xos `customsNote` (SHEIN'da pochta
  $100, Poizon'da ikki juft krossovka, Amazon'da sales tax, eBay'da ishlatilgan
  tovar qiymati).
- **Yetkazish** — standart 8 qadam + `cargoNote` (avia/avto, hajmiy vazn,
  konsolidatsiya, qayta qadoq, foto-hisobot, bosqichlar, qabul).
- **O'lchamlar** (`sizeKind: cloth|shoe`), eBay'da **Xavfsizlik**, Poizon'da
  **Originallik** — 6 qadam.

Sahnalar umumiy kutubxonadan (`SC`, ~40 ta parametrli sahna: brand, routes,
idcard, register, search, seller, address, pay, payFail, track, warehouse,
repack, fly, modes, weight, customs, customsOver, lanes, notify, unbox, size,
group, sku, auth, auction, listing, mbg, tax…), do'kon nomi, rangi, davlat, ID
va misol raqamlari `MOTION` dan (har `guides/inline/*.html` da `const TABS=`
oldida). Qadam: `{t, c, s, p}` — sarlavha, izoh, sahna nomi, sahna
parametrlari; davomiyligi matn uzunligiga qarab 4,5–8,5 s. Segmentli vaqt
chizig'i, oxirida keyingi tabga o'tuvchi tugma (`cta.tab`). Faqat faol
panelda o'ynaydi, boshqa tabga o'tilsa to'xtaydi. `tests/guides.mjs` har
qo'llanmada to'rt asosiy panelda karta borligini, Boshlash videosining 11
qadamini, tab almashishini va yopilishini tekshiradi.
Har qo'llanmaga ≈ 8 KB ssenariy matni qo'shildi, shuning uchun guides/inline
chegarasi 660 → 700 KB, bitta fayl 95 → 110 KB (gzip bittasi hali 30 KB dan kam); `guide-motion.js`
≈ 50 KB (gzip 15 KB), SW keshida.

## Kuzatuv va xizmatlar

Kuzatuv ekrani saqlangan rejalarni jo'natma sifatida ko'rsatadi: trek
raqami (bo'shliqsiz, katta harfda saqlanadi — "RB 1234 CN" kuryer saytida
topilmaydi), "Nusxa", holat tugmasi "Keyingi bosqich — belgilash" (holatni
foydalanuvchi o'zi belgilaydi, ilova kuryer tizimlariga ulanmagan).
Rejasiz jo'natma raqami alohida maydonda saqlanadi. Pastda kuzatuv
sahifasi bor kuryerlar ro'yxati.

Xizmatlar ikki yo'lakda (`SERVICES`, `lane`): xaridor va kuryerlik
tashkiloti; tanlangan yo'lak saqlanadi. "Bog'lanish" Telegramga xizmat
nomi yozilgan xabar bilan ochadi (`tgLink`), xabar interfeys tilida
(ruscha, kirill yoki lotin). t.me havolalari `openTg` orqali: Telegram Mini App
ichida `openTelegramLink`, tashqarida yangi oyna.

## Tanishuv

Bitta ekran: til tanlash (lotin, kirill, rus) va "O'tkazib yuborish".
Birinchi ochilishda til `autoLang()` bilan taxmin qilinadi: Telegram
foydalanuvchisining `language_code` yoki brauzer tili ruscha bo'lsa ekran
ruscha ochiladi va "Русский" kartasi belgilangan turadi; tanlov
foydalanuvchida qoladi. Tanlangan til va tanishuv o'tilgani `localStorage`
da (`v: 1` bilan) saqlanadi.

## Telegram bot ichida ochish

Ilova Telegram Mini App sifatida to'liq ekranda ochiladi. Botga ulash:

1. [@BotFather](https://t.me/BotFather) da botni tanlang.
2. **Bot Settings → Menu Button → Configure menu button** ni bosing va manzil sifatida
   `https://pochtam.uz/` ni kiriting (tugma nomi, masalan, "Pochtam").
3. Tarqatish uchun to'g'ridan-to'g'ri havola: `/newapp` bilan Mini App
   yarating (qisqa nom, masalan `app`), manzil — o'sha. Keyin havola
   `https://t.me/<bot>/app?mode=fullscreen` — Telegram 11+ da ilova darhol
   butun ekranda ochiladi, ilovaning o'z so'rovini kutmasdan.

Telegram ichida ilova o'zi:

- `ready` + `expand` va (Bot API 8.0 dan boshlab) `requestFullscreen` bilan
  butun ekranni egallaydi. So'rov versiya tekshiruvi bilan chaqiriladi
  (eski mijozda xato bermaydi) va birinchi urinish rad etilsa
  `isFullscreen` bo'lguncha 0,7 s oraliq bilan qayta so'raladi; oynani
  pastga tortib kichraytirsa barqarorlashgach yana yoyiladi;
- pastga tortganda yopilib ketmasligi uchun vertikal svaypni o'chiradi;
- Telegramning tepadagi tugmalari ostiga tushmaslik uchun `safeAreaInset` va
  `contentSafeAreaInset` qiymatlarini hisobga oladi;
- Telegramning "orqaga" tugmasini ilova navigatsiyasiga bog'laydi;
- tugmalarga yengil tebranish (haptic) bilan javob beradi.

Oddiy brauzerda bu kodning ta'siri yo'q — sayt avvalgidek ishlayveradi.

## O'z domeningizni ulash

Sayt GitHub Pages'da qolaveradi, faqat manzil o'zgaradi. Kod ichida
`nshakhobiddin.github.io/Pochtachi` deb yozilgan joy yo'q — hamma manzil
`tools/site.mjs` dan chiqadi: ildizda `CNAME` fayli bo'lsa (GitHub uni
o'zi yaratadi) sayt o'sha domenning ildizida deb hisoblanadi, bo'lmasa
GitHub Pages manzilida. Yo'llar nisbiy (`./`), shuning uchun `/Pochtachi/`
dan `/` ga ko'chishda hech narsa sinmaydi.

1. **Domen boshqaruvida (registrator) DNS yozuvlari.** Ildiz domen uchun
   4 ta `A` yozuv: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`; `www` uchun `CNAME` → `nshakhobiddin.github.io`.
   Faqat `www` yoki `app.` kabi subdomen ishlatilsa bitta `CNAME` yetadi.
2. **GitHub → Settings → Pages → Custom domain** ga domenni yozib Save.
   GitHub ildizga `CNAME` faylini commit qiladi (branch shu bo'lgani uchun
   push qilish shart emas). DNS tarqalgach (5 daqiqadan bir necha soatgacha)
   **Enforce HTTPS** ni belgilang.
3. **Qayta qurish.** Keyingi har qanday push (yoki `npm run build` + push)
   `index.html`, `sitemap.xml`, `robots.txt` va qo'llanmalardagi kanonik/OG
   manzillarni yangi domenga o'tkazadi. Workflow orqali o'lchov serverini
   qayta joylasangiz (Actions → "O'lchovni yoqish" → Run workflow) yangi
   domen `ALLOW_ORIGIN` ga o'zi qo'shiladi; eski GitHub manzili ham qoladi.
4. **Telegram.** BotFather'dagi Menu Button / Mini App manzilini yangi
   domenga almashtiring.

Eski manzil ishlayveradi: GitHub `nshakhobiddin.github.io/Pochtachi/` ni
yangi domenga yo'naltiradi.

## O'lchash

Hamkorlikni va ilovada joylashishni sotish uchun bitta savolga javob kerak:
qaysi ekran ochiladi va qaysi do'kon/kuryerga o'tiladi. Shusiz hamkorga
aytadigan raqam bo'lmaydi.

Uchinchi tomon xizmati yo'q. Manzil `METRICS_URL` da: **bo'sh** bo'lsa hech
qanday so'rov ketmaydi, to'ldirilsa faqat o'sha manzilga — ilovaning
"cbu.uz va o'z o'lchov serveridan boshqa tashqi so'rov yo'q" qoidasi
shunday saqlanadi (`tests/smoke.mjs` tekshiradi). Server `worker/` da
(Cloudflare Worker + Durable Object); uni `.github/workflows/metrics.yml`
bir tugma bilan joylaydi va manzilni ilovaga yozadi.

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

**Server tomoni.** `worker/` — Cloudflare Worker (bepul tarif yetadi).
Faqat sanoq saqlanadi: kun · hodisa · kalit → nechta; IP ham, xom hodisa ham
yozilmaydi, 90 kundan eski qatorlar o'chiriladi. Beacon faqat
`ALLOW_ORIGIN` dan qabul qilinadi, aks holda boshqa saytlar sanoqni
shishira oladi. Hisobot ikki ko'rinishda: `GET /stats?days=N` (JSON, token
bilan) va `GET /hisobot` — brauzerda ochiladigan sahifa: parol bir marta
kiritiladi, bugun/7/30/90 kun, ekranlar, do'kon va kuryerga o'tishlar,
qo'llanmalar, pullik xizmat murojaatlari chiziq bilan. Tafsilot:
`worker/README.md`.

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

**Belgilangan narx.** Xaridor xizmatlari "kelishilgan holda" emas, aniq
narx bilan (40 000 dan 300 000 so'mgacha; tashkilotlar uchun shartnoma va
oylik joylashish ham belgilangan, qolganlari loyiha bo'yicha). Narx
`price` maydonida raqam bo'lsa u Telegram xabariga ham qo'shiladi
(`contactAbout`): "«Boj hisobini tekshirish» xizmati (60 000 so'm)
bo'yicha yozmoqchiman" — ikki tomon ham bir xil raqamni ko'radi.
Narxni o'zgartirish: faqat `SERVICES[].price`.

**Og'riq nuqtalaridagi tugmalar** (`askSvc(icon, ctx)`, narx tugmaning
o'zida, xabarga holat qo'shiladi, `HAS_CONTACT` bo'lmasa ko'rinmaydi):

- Kalkulyator, me'yor oshganda — "Hisobni tekshirtirish" (xabarda summa,
  vazn, yetkazish va hisob);
- Kuzatuv, reja 20 kundan ortiq yo'lda bo'lsa — "N kun — ushlanib
  qoldimi?" (xabarda jo'natma, kuryer, trek, kunlar; `planAgeDays`);
- Taqiqlangan tovarlar, cheklangan (sariq) tovar ochilganda — "Qanday
  hujjat kerak?" (xabarda tovar nomi);
- Rasmiylashtirish tartibi, "qachon ushlab qolinadi" ro'yxati ostida —
  "Mutaxassis yordami".

Kirish nuqtalari bundan tashqari: bosh sahifadagi "Mutaxassis yordami"
kartochkasi va Bojxona bo'limidagi "Mutaxassis konsultatsiyasi". Har bir
murojaat `metrics.hit('svcAsk', xizmat)` bilan sanaladi.

## Hamkorlik havolalari

`AFF` obyekti (`const AFF = { id: 'https://…' }`): do'kon id ga hamkorlik
(affiliate) havolasi yozilsa "Saytga o'tish" va do'kon kartasidagi havola
shu manzilga o'tadi (`storeHref`), kartada "hamkorlik havolasi" belgisi,
sozlamalarda oshkoralik matni chiqadi (`HAS_AFF`). Bo'sh qoldirilgan
do'konda oddiy `url` ishlaydi. Narx foydalanuvchi uchun o'zgarmaydi.

Havolani qayerdan olish: AliExpress — AliExpress Portals yoki Admitad /
ePN; eBay — eBay Partner Network; Trendyol, Farfetch, ASOS, iHerb — Admitad
kabi tarmoqlar orqali; Amazon Associates O'zbekiston uchun cheklangan,
alohida tekshiring. Tarmoq bergan havolani `AFF` ga qo'ying, `npm run
build`. `tools/check-links.mjs` do'konning asl `url` ini tekshiradi,
hamkorlik havolasini emas.

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

Rasm uyalari 16 / 24 / 32 / 40 / 48 / 64 qadamlarida. Do'kon va kuryer
logotiplari 3D kvadrat ikonka — burchaklari shaffof, soyasi rasmning
ichida. Ular uyaga to'liq (`contain`, `inset: 0`) chiziladi, uya esa
kesmaydi (`overflow: visible`) va logotip bor bo'lsa rangsiz qoladi:
kesilsa burchaklari qirqiladi, rangli qolsa atrofida halqa ko'rinadi.
Chiziqli ikonkalarda `viewBox` doim 24, chiziq qalinligi esa o'lchamga bog'lab
tanlanadi (14 -> 2.7, 18 -> 2.1, 22 -> 1.75, 28 -> 1.4) — shunda ekranda
hamma joyda ~1.6px bo'lib chiqadi.

**Masofa.** `padding`, `gap`, `margin` faqat juft qadamlarda:
0 2 4 6 8 10 12 14 16 18 20 24 28 32.

**Soya.** Tayyor qatlamlardan yig'iladi: karta
(`0 1px 2px rgba(20,19,43,.04)` + `0 8px 20px -12px rgba(20,19,43,.24)`),
brend, yorug'lik (`0 14px 32px -16px rgba(17,21,132,.52)`), ramka
(`inset 0 0 0 1px` — brend `.09`, holat `.12`, neytral `#E3E3EE`).

**Mutaxassis yordami kartochkasi.** Bosh sahifa va Bojxona ekranidagi
kirish kartochkasi brend gradienti ustida turadi, ikonkasi esa oq 64 px
plita ichida 48 px da chiziladi: `icons/mutaxassis-3d.webp` (144 px =
48 px x3). Asl rasm cho'ziq (297x264) edi — `background-size: 48px 48px`
uni cho'zib yuborardi, shuning uchun manba shaffof chekka bilan kvadratga
keltirilgan.

**Qolgan ish.** `svc-*` (11 ta) tekis uslubda, lekin ular Xizmatlar
bo'limining ichki kartochkalarida turadi — ya'ni P3 da chizilgan
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

## Do'kon papkalari va qo'llanma ikonkalari

Do'kon papkalarining oltita 3D ikonkasi `icons/src/dok-*.webp` da
(universal, moda, poyabzal, elektronika, kosmetika, bolalar), ekranga
`icons/dok-*.webp` (174 px) chiqadi; ular qidiruv takliflari va reja
sehrgarida ham ishlatiladi. Qo'llanmalarning yettita ikonkasi
`icons/src/guide-*.webp` → `icons/guide-*.webp` (162 px): qo'llanmalar
ro'yxati, qo'llanma sarlavhasi va qidiruv natijasi. Ikkalasi ham
`node tools/optimize-icons.mjs` bilan yangilanadi.

## Do'kon va kuryer logotiplari

43 ta do'konning hammasida logotip bor: `stores/*.webp`, 128x128 px, jami ~230 KB.
20 ta kuryerning hammasida ham: `logos/*.webp`, 128x128 px, jami ~99 KB.
Ikkalasi ham bir xil uslubda — 3D matoviy kvadrat (squircle) ilova ikonkasi,
burchaklari shaffof va o'z soyasi bilan. Shuning uchun ular ilovada rangli
plita ustida emas, to'g'ridan-to'g'ri kartaning fonida chiziladi (`contain`,
shaffof plita, kesuvchi `overflow` yo'q) — plita qolsa ikonka atrofida
rangli halqa ko'rinib qolardi. Logotipi yo'q do'kon/kuryerda esa rangli
monogramma chiziladi. Asl PNG nusxalar `stores/src/` va `logos/src/` da,
512x512 (saytga chiqmaydi).

Qayta yasash:

```bash
npm run store-logos -- --from stores/src --force   # do'konlar
npm run logos                                      # kuryerlar
npm run build                       # service worker ro'yxati yangilanadi
```

Tafsilotlar `stores/README.md` da.

## Tashqi bog'liqliklar

Sayt tashqariga faqat bitta so'rov yuboradi — valyuta kursi uchun `cbu.uz` ga. Shriftlar, React, do'kon logotiplari va qolgan hamma narsa o'z domenimizda; smoke test buni har ishga tushishda tekshiradi. Birinchi ochilishdan keyin service worker qobiqni keshlaydi va ilova internetsiz ham ishlaydi.

**Shriftlar.** Butun ilova bitta oiladan foydalanadi — `Onest` (o'zgaruvchan shrift), `fonts/` ichida. Brauzer sahifadagi belgilarga qarab faqat keraklisini oladi: lotin (32 KB), kirillcha matn ko'rinsa yana 14 KB, bayroq ko'rinsa `flags.woff2` (44 KB). Ilgari ular `fonts.googleapis.com` -> `fonts.gstatic.com` zanjiri orqali kelardi va 238 KB chiqardi. Yangilash: `npm run fonts`.

**Bayroqlar.** `fonts/flags.woff2` (25 KB) — ilovada ishlatiladigan 23 ta bayroq: 🇺🇿 🇨🇳 🇺🇸 🇹🇷 🇬🇧 🇦🇪 🇰🇷 🇷🇺 🇰🇿 🇰🇬 🇹🇯 🇲🇾 🇪🇺 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇬🇷 🇨🇦 🇵🇱 🇵🇹 🇺🇦 🇨🇿.

Bayroqlar matn ichida turadi ("🇹🇷 Turkiya", kuryer tariflari, do'kon kartalari), shuning uchun ular rasm emas, rangli shrift (COLR/CPAL) sifatida beriladi — bitta fayl hammasini qoplaydi va Windows'da ham ko'rinadi (u yerda tizim shriftida bayroq yo'q).

Manba — `fonts/flags-src/*.svg`, [flag-icons](https://github.com/lipis/flag-icons) (MIT) ning tekis bayroqlari. Yangi davlat qo'shish: SVG ni `fonts/flags-src/<iso>.svg` sifatida qo'ying va `npm run flags` ni ishlating.

**3D bayroqlar — bitta ekranda.** Kuryerlar bo'limining bosh oynasida
(yo'nalish papkalari) bayroq emoji emas, 3D rasm: `flags/*.webp`, 9 ta
yo'nalish, jami 52 KB. U yerda bayroq yirik (64x48 va 48x36) va har
yo'nalishda bittadan — rasm o'zini oqlaydi. Qolgan hamma joyda emoji
qoladi: kuryer kartochkalarida, tarif jadvallarida va sehrgarda bayroq
o'nlab marta takrorlanadi, har biri alohida rasm so'rovi bo'lib ketardi.
Smoke test ikkalasini ham tekshiradi. Asl nusxalar `flags/src/` da
(512x384); yangilash: `npm run flag-icons`.

## Kompyuter ko'rinishi

1024 px dan keng ekranda ilova telefon ramkasi emas, ish stoli tartibida
ochiladi: pastki menyu chapdagi 248 px ustunga aylanadi (brend, ikonka va
nom yonma-yon, faol bo'lim yorug' fonda), sarlavha va kontent o'ngda.
Kontent ustuni 760 px dan keng bo'lmaydi — kartalar va matn o'qilishi
uchun shu yetadi; qo'llanma (iframe) o'zining web-tartibiga (uch ustun,
960 px) o'tadi. Pastdan chiqadigan varaqlar (filtr) markazda oyna bo'lib
ochiladi, toast kontent ustuni ustida turadi, reja sehrgarining pastki
tugmalari menyu ustuniga kirmaydi. Brend introsi yotiq ekranda balandlik
bo'yicha sig'diriladi (ilgari kenglik bo'yicha "cover" edi va logotip
ekrandan katta chiqardi).

Hammasi bitta `@media (min-width: 1024px)` blokida — ekranlarning o'zi
o'zgarmaydi, faqat qobiq (`header`, `main`, `nav`) grid bo'lib qayta
joylashadi. 900–1023 px oralig'i (planshet) avvalgidek: markazdagi telefon
ramkasi. Smoke testda 1280 px uchun alohida tekshiruv bor.

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

**Ikonkalar va service worker.** Foydalanuvchi "ikonkalar sekin chiqadi"
degan edi. Sekin tarmoq taqlidi (200 KB/s, 120 ms kechikish, worker ham
shu kanalda) shuni ko'rsatdi: bosh sahifa ikonkalari ilova ko'tarilishidan
oldin kelib bo'ladi, muammo boshqa joyda edi.

- Worker o'rnatilganda 161 faylni bir yo'la yuklardi — foydalanuvchi shu
  paytda ochgan do'kon papkasining logotiplari bilan tarmoqni talashardi.
  Endi qobiq kichik (22 fayl: HTML, skript, shrift, brend va bosh sahifa
  ikonkalari), qolgan 139 fayl sahifa tinchigach ('warm' xabari) ikki oqimda,
  keshda yo'qlarigina yuklanadi. Ro'yxatga olish ham `load` dan 1,5 s keyin.
- Takroriy ochilishda worker har chizilgan rasmni orqa fonda qayta
  so'rardi (stale-while-revalidate hammasiga qo'llangan edi) — bitta
  ochilishda ~100 so'rov. Rasm, shrift va vendor skriptlar endi faqat keshdan;
  yangilanish chiqqanda kesh nomi o'zgaradi va hammasi qaytadan olinadi.
- Do'kon logotiplari ro'yxati (`stores/index.json`) ilova ochilgach alohida
  so'ralardi, logotiplar shundan keyin chizilardi. Endi ro'yxat build paytida
  `index.html` ichiga yoziladi (`STORE_LOGO_IDS`) — birinchi chizilishdayoq
  turadi.
- Bosh sahifadagi to'rt kartochka va logotip `fetchpriority="high"`.

O'lchov (sekin tarmoq, 3x sekin protsessor, do'kon papkasi ochilganda):

| | Ilgari | Hozir |
|---|---|---|
| Ikkinchi ochilish, ilova ko'tarilishi | 2,8 s | 0,8 s |
| Ikkinchi ochilish, 8 logotip | 694 ms | 200 ms (keshdan) |
| Isitilgan ochilish, ilova ko'tarilishi | — | 0,5 s |
| Isitilgan ochilishda server so'rovlari | ~100 | 4 (HTML, skript, JSON, sw.js) |

**Bo'lim ikonkalari oldindan** (`warmIcons`). Ilova ko'tarilib 0,6 s
o'tgach sahifaning o'zi bo'lim ikonkalarini uch oqimda, past
ustuvorlikda yuklab qo'yadi: do'kon va bojxona papkalari, bayroqlar,
do'kon logotiplari (mashhurlik tartibida), kuryer logotiplari,
xizmatlar, taqiq belgilari. Ekran almashganda 1,2 s to'xtaydi — yangi
ekranning o'z ikonkalari oldin kelsin. Worker hali sahifani boshqarmagan
dastlabki soniyalarda ular brauzerning HTTP keshiga tushadi (GitHub Pages
`max-age=600` beradi), keyin worker isitishda o'sha keshdan oladi.
"Trafikni tejash" rejimida qilinmaydi. O'lchov (birinchi tashrif, sekin
tarmoq, bo'lim ochilganda ko'rinadigan ikonkalar): do'kon papkalari
214 -> 118 ms, do'kon logotiplari 576 -> 125 ms, kuryer bayroqlari
539 -> 114 ms — hammasi keshdan, serverga so'rovsiz.

Worker isitish tartibi ham ehtimol bo'yicha: intro,
do'kon papkalari ikonkalari, do'kon logotiplari, kuryer logotiplari va
bayroqlar, keyin qolgani — foydalanuvchi ilovani isitish tugamay yopsa ham
eng kerakli fayllar keshda bo'ladi.

Smoke test to'rt narsani tekshiradi: qobiq kichikligi, isitishdan keyin
butun ro'yxat keshda ekani, takroriy ochilishda rasm va shriftlar uchun
serverga so'rov yo'qligi, oflayn ochilishi.

Muhim: kechiktirilgan keshlashni `activate` ichida qilib bo'lmaydi —
faollashuv tugamaguncha fetch hodisalari kutib turadi va ilova 10 s
ochilmay qoldi (o'lchandi). Shuning uchun u sahifadan keladigan xabar
bilan ishga tushadi.

## O'lcham byudjeti

`npm run check` quyidagilarni tekshiradi: kuryer logotiplari ≤ 150 KB, ikonkalar ≤ 120 KB, shriftlar ≤ 120 KB, do'kon logotiplari ≤ 260 KB, qo'llanmalar ≤ 470 KB, `index.html` ≤ 560 KB. Chegaradan oshsa CI yiqiladi — bu tasodifan og'ir rasm qo'shilib qolishining oldini oladi.
