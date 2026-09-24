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
data/tariffs.json              kuryer tariflari tuzilgan ko'rinishda (core/tariffs.js hisoblaydi)
data/categories.json           kategoriyalar va taxminiy vazn (universal kalkulyator, AI)
data/ai-rules.md               Pochtam AI javob qoidalari (tizim ko'rsatmasi, matn)
core/                          Pochtam Core: boj, tarif va tannarx — ilova, qo'llanma, worker uchun bitta
worker/                        Cloudflare Worker: o'lchov (/, /stats, /hisobot) va Pochtam AI (/ai)
worker/src/kb.generated.js     GENERATSIYA: AI bilimlar bazasi (ro'yxatlar + qoidalar), tools/ai-kb.mjs
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
tests/core.mjs                 Pochtam Core formulalari va tariflar yaxlitligi
tests/ai-eval.json, ai.mjs     Pochtam AI sinov to'plami (tirik worker bilan, ixtiyoriy)
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
- **Valyuta kursi** — Markaziy bankdan (cbu.uz) avtomatik olinadi, 6 soatda bir marta. Bitta so'rovda **barcha valyutalar** keladi (`FX_UZS`: USD, EUR, CNY, TRY, KRW, RUB, AED…), shuning uchun skrinshotdagi narx qaysi valyutada bo'lsa ham joriy kurs bo'yicha o'giriladi (`lcFxOf`); kurs olinmasa oxirgi saqlangan jadval ishlatiladi va "oflayn zaxira" deb belgilanadi, u ham bo'lmasa `data/tariffs.json` dagi zaxira kurs.
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
"Sizning rejangiz" ko'rinishi va saqlash. Davlat tanlanganda o'sha
davlatdan yuboradigan barcha do'konlar chiqadi (`storeFrom(s)` —
do'konning `from` ro'yxati): avval davlati asosiy bo'lganlar, keyin
qo'shimcha yo'nalish sifatida yuboradiganlar; tagsarlavha nechtasi
qo'shimcha ekanini aytadi. Qatorda tanlangan davlat yoziladi, "Global"
degan uya yo'q (2026-09-18).

Saqlangan rejalar bosh sahifada, kuzatuvda va Reja tabining birinchi
qadamida (sehrgar ustida, "Saqlangan rejalar") ko'rinadi.

**2026-09-24 (soddalashtirishning 4-bosqichi):** sehrgar olib tashlanmadi —
u AI'siz yo'l: "Do'kon va kuryer tanlash". Kirish joylari: Xaridlarimdagi
"Do'kon va kuryerni o'zim tanlayman", Bojxonadagi "Do'kon tanlash" va AI
o'chiq bo'lsa bosh sahifadagi tugma (`aiOff`). Nomlar: "Yangi xarid",
"Hisobni ko'rish", "Sizning tanlovingiz", "Xaridlarimga qo'shish".

## Do'konlar va kuryerlar

Ikkala bo'lim papka bilan ochiladi (do'konlar: tovar turi yoki davlat;
kuryerlar: yo'nalish).

**Do'konning yetkazish davlatlari.** Har bir do'konda `from: [...]` —
u qaysi davlat(lar)dan olib kelinadi (`country` — birinchisi, ya'ni
asosiysi). Ro'yxat faqat kuryer tarifi bor davlatlardan iborat (Xitoy,
AQSh, Turkiya, Angliya, Germaniya, Koreya, BAA — `LC_COUNTRIES` bilan bir
xil), shuning uchun papkadan kuryerga va kalkulyatorga o'tish har doim
ishlaydi; buni `tests/core.mjs` tekshiradi. Ilgari 43 do'konning 24 tasi
"Global" deb belgilangan edi va bitta tushunarsiz uyaga yig'ilardi
(2026-09-18 da tarqatildi): endi Amazon AQSh, Germaniya va Angliya
papkalarida, SHEIN Xitoy va Turkiyada ko'rinadi. Do'kon sahifasida
sarlavha ostida davlatlar qatori, bittadan ko'p bo'lsa "Qaysi davlatdan
olib kelamiz" chiplari — chip almashtirilganda eng arzon uchta kuryer,
"N kuryerni ko'rish" papkasi va kalkulyator o'sha davlat bo'yicha
qayta hisoblanadi (`couriersForStore(store, origin)`).

Do'kon sahifasidagi "N kuryerni ko'rish" tugmasi tanlangan davlatga mos
yo'nalish papkasini ochadi (Taobao -> Xitoy yo'nalishi).

Kuryer papkasida "Taqqoslash" rejimi shu papkaga tegishli: boshqa papka
ochilganda yoki bo'lim almashganda o'chadi. Sarlavhadagi filtr varag'i
kuryer ekranlarida kuryer filtrlarini (yuborish turi, saralash; yo'nalish
papkasidan tashqarida davlat ham) ko'rsatadi. Escape avval ochiq varaqni
yopadi, keyingina ekranni.

## Bosh sahifa (3-bosqich, 2026-09-16 da soddalashtirildi)

**Uch bo'lim (2026-09-24, soddalashtirishning 1-bosqichi).** Foydalanuvchi
to'rtta savol bilan keladi: qayerdan topaman, qanchaga tushadi, qanday olib
kelaman, hozir qayerda. Ilova esa butun sohani tushuntirmoqchi edi: 23 ekran,
bosh sahifada 12 kirish nuqtasi, menyuda 5 tab va o'rtada "Reja" tugmasi,
kompyuterda yana 2 band. Endi:

- **Menyu uchta:** Boshlash · Xaridlarim · Ma'lumotnoma (`TABS = ['home',
  'mine', 'ref']`), telefonda ham, kompyuterda ham bir xil.
- **Boshlash** — faqat savol: maydon (yozish, aytish, havola, rasm),
  "Topdim — qanchaga tushadi?" (skrinshot), "Hali topmadim — qayerdan
  olaman?", "Narxni o'zim yozaman" va "Oxirgi hisob". Turlar chiplari, uch
  plitka, Xaridlarim kartasi, mashhur do'konlar, mutaxassis, kurs va kunlik
  maslahat olib tashlandi (balandlik 1 358 → 684 px, so'zlar 137 → 46,
  tugmalar 28 → 5). Turini AI nomdan o'zi aniqlaydi; nom yozilmasa "Do'konlarni
  ko'rsat" maydonga qaytaradi; AI o'chiq bo'lsa nom qidiruvga boradi.
- **Ma'lumotnoma** (`ref`, `refRows`) — Do'konlar, Kuryerlar, Bojxona,
  Qo'llanmalar, Pochtam AI (yoqiq bo'lsa), Mutaxassis yordami (aloqa bo'lsa),
  Sozlamalar (til va joriy kurs). Ichidagi ekranlar `push` bilan ochiladi —
  "orqaga" ro'yxatga qaytaradi, menyuda Ma'lumotnoma belgilangan turadi.
- **Reja sehrgari** menyuda emas: Xaridlarim → "Reja tuzish" / "Yangi reja"
  (ro'yxat ostida doim bor) va Bojxona; chala reja to'xtagan joyidan davom
  etadi.
- **Tanishtiruv** 2 qadam: asosiy tugma va uch bo'lim; kompyuterda karta
  butun balandlikdagi menyu yonida turadi.

Bosh sahifaning o'zi savol (2026-09-18, ikkinchi audit): sarlavha
**"Nima mahsulot qidiryapsiz?"**, ostida mahsulot nomi maydoni va mikrofon,
kategoriya chiplari, so'ng uchta yo'l (`whereVm`, `cur === 'home'`):

- **"Topdim — qanchaga tushadi?"** (asosiy, binafsha) — skrinshot →
  `aiShot` → natija ekrani. Ostida qanday olish ko'rsatmasi: "Do'kon
  ilovasida mahsulotni oching, narx ko'ringan ekranni suratga oling va shu
  yerdan yuklang" — ilgari bu faqat xatodan keyin aytilardi.
- **"Hali topmadim — qayerdan olaman?"** — originallik va byudjet chiplari
  ochiladi → "Do'konlarni ko'rsat" → `suggest_stores` + veb-qidiruv
  (quyida).
- **"Narxni o'zim yozaman"** — kalkulyator nom va kategoriya bilan; AI
  o'chiq bo'lsa ham shu yo'l ishlaydi (ilgari o'chiqda asosiy oqim
  yo'qolardi).

Alohida savol ekrani, "Nima olib kelmoqchisiz?" sarlavhasi va "Jami narx"
plitkasi olib tashlandi: ikki marta savol berilib, bitta ortiqcha bosish
bo'layotgan, plitka esa parallel yo'l edi. Tez o'tish 3 ta ma'lumotnoma
(Do'konlar, Kuryerlar, Taqiqni tekshirish). Yozilgan nom va tanlangan
kategoriya natija kartasiga o'tadi. Natija chiqqach bosh sahifada
**"Oxirgi hisob"** kartasi (`localStorage.xy_last`, `lastRes`) — chiqib
ketilsa ham hisob yo'qolmaydi.

**Ovozli kiritish** (`micToggle`). Brauzerning o'z nutq tanish moslamasi
(Web Speech API) — server ham, API ham, qo'shimcha xarajat ham yo'q, tanish
qurilmaning o'zida bajariladi. Til ilova tiliga qarab (`uz-UZ` / `ru-RU`).
Brauzer qo'llab-quvvatlamasa tugma umuman chizilmaydi — o'lik tugma
ko'rsatilmaydi.

Havola va nom yozish qidiruv ekraniga ko'chdi (sarlavhadagi lupa).
`linkStore()` u yerda ishlaydi: havola bo'lsa domen bo'yicha do'kon
topiladi (`STORES.domain` yoki `DOMAIN_ALIAS` — `tb.cn`, `amzn.to`,
`dewu.com` kabi qisqa va mobil manzillar) va natijaning tepasida turadi;
ro'yxatda yo'q domen — domen so'zi bilan izlanadi. AI o'chiq bo'lsa bosh
sahifada bitta karta qoladi: **Do'kon yoki mahsulot qidirish** → qidiruv.
Oqim hech qachon to'xtab qolmaydi (TZ 21).

**AI bayrog'i.** Ilova ochilganda Worker'dan `GET /ai/status` →
`{ ai: true|false }` (kalit bormi; 5 daqiqa kesh, oxirgi holat
`localStorage.xy_ai`, `checkAi()`). `false` bo'lsa AI izi qolmaydi:
kamera ko'rinmaydi, placeholder "Havola yoki mahsulot nomi", namuna
"Nike Air Max", savol qidiruvga boradi, kompyuter menyusida "Pochtam AI"
yo'q. Foydalanuvchi "AI mavjud emas" xabarini hech qachon ko'rmaydi.
Noma'lum holat (tarmoq yo'q, birinchi ochilish) — o'chiq.

Bosh sahifada oltita blok, har biri bitta vazifa uchun, takrori yo'q:

1. bitta maydon (kamera ichida, ostida namuna);
2. **tez o'tish** — Jami narx, Do'konlar, Kuryerlar, Taqiqni tekshirish
   (Qo'llanmalar va Bojxona pastki menyuda, shuning uchun bu yerda
   takrorlanmaydi; Do'konlar va Kuryerlar bo'limlariga kirish faqat shu
   yerdan);
3. **Xaridlarim** kartasi — rejalar, jo'natmalar, sevimlilar, hisoblar
   (jamlanma bilan);
4. **mashhur do'konlar** tasmasi (`POPULAR_STORES`, "Barchasi" — do'konlar
   bo'limi);
5. mutaxassis yordami (pullik xizmatlar);
6. kurs (bosilsa sozlamalar) va kunning maslahati (`TIPS`, ixcham karta).

Alohida "Pochtam AI" kartasi yo'q (2026-09-17): AI bosh sahifadagi
maydonning o'zida — savol, tovar so'rovi, kamera.

Olib tashlangan takrorlar (2026-09-16): to'rt bo'lim kartasi (tez o'tish
va pastki menyu bilan bir xil), "Kuryerlarni solishtirish" bloki (kuryerlar
ro'yxatidagi "Vazn bo'yicha hisob" paneli shu ishni qiladi), "Birinchi
marta buyurtma qilyapsizmi?" kartasi (pastki menyuning markazidagi "Reja"
tugmasi shu), bosh sahifadagi "Sevimlilar" tasmasi va "Mening rejalarim"
(ikkalasi Xaridlarim ichida). Sahifa balandligi 2000 px dan 990 px ga
tushdi. Sarlavhadagi kuzatuv tugmasi ham olib tashlandi — jo'natmalar
faqat Xaridlarim → Jo'natmalar tabida (sarlavhada bosh sahifada faqat
qidiruv qoldi). Lug'atdan 15 ta o'lik tarjima (olib tashlangan bloklar va
eski tanishuv savoli) o'chirildi. O'lchov hodisalari: `hero`
(link:<do'kon> | link:? | ai | text), `quick` (landed, stores, couriers,
banned, ai, ai:*).

## Universal kalkulyator — Jami narx (4-bosqich)

Ekran `landed` (tez o'tishdagi "Jami narx", do'kon sahifasidagi "Shu
do'kondan xarajatni hisoblash", keyinroq AI). Kirish: nom (ixtiyoriy),
narx va valyuta (USD / EUR / GBP / so'm — EUR va GBP `data/tariffs.json`
dagi zaxira kurslar, so'm — joriy kurs), miqdor, kategoriya
(`data/categories.json`, build `CATEGORIES` ga yozadi), yo'nalish (7 davlat),
og'irlik (yozilmasa kategoriya bo'yicha taxmin), do'kon ichida yetkazish,
quti o'lchami (hajmiy og'irlik = uzunlik×kenglik×balandlik/5000, kattasi
olinadi). Kuryer: yo'nalish va hisob og'irligi bo'yicha uchta eng arzon
taklif + eng tez (`courierQuotes`, `rankQuotes`), "Eng arzon / Eng tez /
Optimal" belgilari, birinchisi tanlangan. Natija: `landedCost` — mahsulot,
ichki yetkazish, kargo, boj, yig'im, jami ($ va so'm), boj sababi.
"Olish foydalimi?" — O'zbekistondagi narx kiritilsa tejash so'm va foizda.
Bojsiz me'yor kalendar oyga beriladi, shuning uchun shu oyda rejalardan
yozilgan jo'natmalar ("Bu oyda" bloki, `st.monthly`) qoldiqni kamaytiradi
va izohda ko'rsatiladi: "Bu oyda $320 kelgan — bojsiz qoldiq $0". Reja
o'chirilsa uning oylik yozuvi ham o'chadi.

**Rejaga qo'shish** — `savePlanFrom()`: sehrgar va kalkulyator uchun bitta
yo'l. Reja obyektining eski maydonlari o'zgarmagan; kalkulyator qo'shimcha
`name`, `qty`, `source:'landed'` beradi (sehrgar `source:'wizard'`). Reja
sarlavhasi `name || cat`. Eski rejalar avvalgidek chiziladi.

Holat `st.lc` (LC_DEFAULT) — saqlanmaydi. Hodisalar: `calc_open`
(quick | store:<id>), `calc_done`, `add_to_plan`.

## Kuryerlarni solishtirish (5-bosqich)

Kuryerlar ro'yxatida **"Vazn bo'yicha hisob"** paneli: Tarif (avvalgi
ko'rinish) yoki 1 / 2 / 5 / 10 kg; kg tanlansa davlat chiplari (papkadan
kelgan yo'nalish birinchi: `FOLDER_COUNTRY`) va ustuvorlik (Arzon / Tez /
Optimal). Har kartada shu yo'nalish uchun hisoblangan summa
(`courierQuotes` + `rankQuotes`, kuryerning eng yaxshi taklifi), ro'yxat
ustuvorlik bo'yicha tartiblanadi, jadvalda tarifi yo'q kuryerlar oxirida
"narx so'raladi" bilan. Taqqoslash jadvalida birinchi qator — "Hisob · N kg
· Davlat". Bosh sahifadagi blokning "Hammasini ko'rish"i va jami narx
ekranidagi "Kuryerlarni solishtirish" ro'yxatni panel yoqilgan holda
ochadi (`openCourierCalc`). Holat `ccKg/ccCountry/ccPri` saqlanmaydi.
Pochtam Score uchun joy: `score` maydoni yo'q — ma'lumot bo'lmaguncha
reyting chiqmaydi (TZ 7).

## Xaridlarim va jo'natma holatlari (6-bosqich)

**Kuryer siz uchun sotib oladi (2026-09-24, 3-bosqich).** ZenMarket/Buyee
naqshi: foydalanuvchi do'konda ro'yxatdan o'tmaydi, to'lamaydi, manzil
yozmaydi — kuryer o'zi sotib olib, olib keladi. Natija ekranida (kuryer
kartasi ostida) va xarid ekranida ("Narx" holatida) blok: shu davlatdan
olib keladigan va `svc` da "Buy for me" bor 3 tagacha kuryer
(`buyersFor`) — xizmat haqi matndan ("10%", "10% (min $5)" → ≈ $),
bo'lmasa "Haqini kuryer aytadi"; kargo va muddat tarifdan. "Yozish"
kuryer Telegramini `?text=` tayyor xabar bilan ochadi (`b4mVm`: tovar,
do'kon va davlat, narx, miqdor, og'irlik, havola yoki "skrinshotni
yuboraman"), xabar buferga ham nusxalanadi; Telegram ichida
`openTelegramLink`. Xarid kartasida "Kuryer men uchun sotib olsin" —
xarid ekranidagi blokka olib boradi. Pochtam AI ham biladi: kuryerlar
indeksida `buy` maydoni, qoidalarda to'lov qadamida shu variant.

**Xarid kartasi (2026-09-24, soddalashtirishning 2-bosqichi).** Xaridlarimda
tablar yo'q — bitta ro'yxat. Har xarid bitta karta: nom, do'kon · kuryer,
jami, besh holatli chiziq **Topish → Narx → Buyurtma → Yo'lda → Keldi** va
bitta keyingi harakat tugmasi. Saqlangan reja qadamlari (`PLAN_STEPS`,
0..5) o'zgarmagan, faqat beshtaga yig'iladi (`stageOf`): 0 → Narx,
1 → Buyurtma, 2–4 (omborda, yo'lda, bojxonada) → Yo'lda, 5 → Keldi.
Tugmalar birinchi shaxsda (`BUY_NEXT`): "Buyurtma qildim", "Omborga yetib
keldi", "Yo'lga chiqdi", "Bojxonaga keldi", "Qo'limga tegdi".

- **Topish** (`p.find`) — narxi yo'q, faqat nomi bor xarid. Boshlashdagi
  "Hali topmadim → Do'konlarni ko'rsat" uni yaratadi (`addFind`, bir xil nom
  takrorlanmaydi). Kartada "Skrinshot yuklash" va "Do'konlarni ko'rsat";
  skrinshot natijasi "Xaridlarimga qo'shish" bilan saqlanganda yangi karta
  emas, o'sha karta "Narx" holatiga o'tadi (`_findId`).
- **Narx** — kartada "Qanday buyurtma qilaman?" (do'kon qo'llanmasi yoki AI,
  `orderHelp` — natija ekrani bilan bitta funksiya).
- **Buyurtma va Yo'lda** — kartaning o'zida jo'natma raqami (bo'shliqsiz,
  katta harf), kuryer sayti havolasi, 20 kundan ortiq bo'lsa "ushlanib
  qoldimi?". Kunlar buyurtma sanasidan (`p.ordered`) sanaladi.
- Ostida: **Kelganlar** (yopiq, sanog'i bilan), **Oxirgi hisoblar** (3 ta,
  "Hammasi"), **Saqlanganlar** (sevimli do'kon, kuryer, qo'llanma) va
  "Boshqa jo'natmani kuzatish" (`shipments` — rejasiz raqam va kuryer
  saytlari). "Yangi xarid" Boshlashdagi savolga olib boradi; "Do'kon va
  kuryerni o'zim tanlayman" — Reja sehrgari.
- Xarid ekrani (`plan`) kartaning kengaytmasi: o'sha chiziq, harakat,
  raqam va yordam (`buyVm` — ikkalasi uchun bitta manba), ostida jami,
  "Batafsil holat" (6 bosqich) va hisob-kitob.

`mine` ekrani (bosh sahifadagi "Xaridlarim" kartasi): tablar **Rejalar**
(`myPlans`), **Jo'natmalar** (mavjud kuzatuv bloki shu tab ostida
chiziladi: `sShip`), **Sevimlilar** (`favRow`, ro'yxat ko'rinishida),
**Hisoblar** — "Jami narx" kalkulyatorining oxirgi 10 natijasi
(`st.calcs`, `PERSIST`; kalkulyatordan chiqishda `noteCalc()` snapshot
oladi, bir xil kirish takrorlanmaydi; qatorni bosish kirishlar bilan qayta
ochadi). Bo'sh holatlar tushuntiriladi. Ma'lumot kalitlari o'zgarmadi —
migratsiya yo'q.

Jo'natma holatlari v2 (TZ 13): Reja → Buyurtma qilindi → Omborda → Yo'lda →
**Bojxonada** → Keldi (`PLAN_STATUS`, `PLAN_STEPS`, oxirgi indeks
`PLAN_LAST = 5`). Eski rejalar `fixPlan` da o'tkaziladi: `sv` belgisi
bo'lmagan rejada 4 ("Keldi") → 5, keyin `sv: 2`. Real tracking yo'q va
shunday deb yoziladi; holat qo'lda belgilanadi. Kuryer API uchun joy:
`trackedList[].site` (kuryer kuzatuv sahifasi) va `track`.

## Pochtam AI (7–8-bosqich)

**Yagona yordamchi (2026-09-19).** Ommabop ilovalar (Amazon Rufus →
Alexa for Shopping, Taobao Pailitao va AI qidiruvi, Google Lens) bitta
naqshga keldi: bitta kirish hamma narsani qabul qiladi, foydalanuvchi
rejim tanlamaydi, javob karta bo'lib chiqadi. Pochtam ham shunday:

- **Bitta manzil.** Matn, rasm, havola va joriy xarid `POST /ai` ga
  ketadi. Alohida `/ai/shot` yo'q (2026-09-19 da olib tashlandi — ikki
  yo'l bitta ishni qilardi).
- **Bitta kirish.** Bosh sahifadagi maydon: yozish, aytish (mikrofon),
  havola tashlash, rasm biriktirish (`whSubmit` kirish turini o'zi
  ajratadi: havola → do'kon yoki AI sahifani o'qiydi, savol → AI, nom →
  keyingi qadam kartalari).
- **Bitta xarid holati** — oxirgi skrinshot natijasi (`lastRes`,
  `localStorage.xy_last`): tovar, do'kon, davlat, narx, valyuta, vazn.
  Har AI so'rovi bilan `cartForAi()` shundan xarid obyektini tuzadi
  (ilova hisoblagan jami va kuryer bilan), worker uni ko'rsatmaga qo'shadi
  (`cartLine`), skrinshot uni to'ldiradi (`mergeCart`) — foydalanuvchi bir
  narsani ikki marta aytmaydi. Alohida `cart` nusxasi yo'q (2026-09-19:
  ikki joyda saqlanardi, bittasi hech qayerda o'qilmasdi).
- **Bitta javob shakli.** Worker `cards[]` qaytaradi: `product`, `ask`,
  `links`, `stores`, `store`, `warning`, `duty`, `total`, `couriers`,
  `cart`; har karta o'zi bilan ilovaga kerak hamma narsani olib keladi
  (vosita kirishi `got` — "Kalkulyatorda ochish" to'ldirilgan holda ochilsin
  — va natija). Ilova FAQAT `cards` ni chizadi, vosita nomlarini va ichki
  natijalarni bilmaydi (`tools` javobda faqat nomlar, sanoq uchun). Bu
  Rufus naqshi: model yo'naltiradi, kartani ishonchli manba (core) to'ldiradi.
  `ask` — AI bitta narsani so'rasa, foydalanuvchi yozmaydi, bosiladigan
  variant tanlaydi (`ask_user` vositasi).
- **Narx o'zgarmadi.** Rasmni arzon model o'qiydi (`readShot`), asosiy
  modelga rasm ko'rsatilmaydi; savolsiz skrinshotda asosiy model umuman
  chaqirilmaydi — bitta skrinshot ≈ $0.002.

AI — suhbatdosh emas, shakl to'ldiruvchi: skrinshotdan narxni o'qiydi,
erkin so'rovni tushunadi, hisobni esa `core/` bajaradi. Kirish nuqtalari
(2026-09-18 dan): bosh sahifadagi "Skrinshot yuklash" kartasi (asosiy),
"Qayerdan topaman?" kartasi → `where` tanlov ekrani, natija ekranidagi
"Qanday buyurtma qilaman?", `where` ekranidagi "Boshqa savol bormi?" va
kompyuter menyusidagi bo'lim. "Qanday ishlaydi" yo'q. AI o'chiq bo'lsa
(`/ai/status`) bularning hech biri ko'rinmaydi. Suhbat faqat brauzer xotirasida
(`aiMsgs`), saqlanmaydi.

**Skrinshot yuklash** (`aiShot`). Fayl brauzerda canvas bilan 1280 px ga
kichraytirilib JPEG (0.82) qilinadi va `POST /ai` ga ketadi (`image`
data URL, `lang`, `usdRate`, `cart`). Worker (`readShot`) bitta chaqiruv bilan,
vositasiz, arzon modelga (`AI_SHOT_MODEL`, standart `claude-haiku-4-5`)
tuzilgan JSON so'raydi: nom, narx, valyuta, miqdor, do'kon, kategoriya,
davlat, og'irlik (sahifada bo'lsa), ishonch (`SHOT_SCHEMA`,
`output_config.format`; rad etilsa matndan JSON). Valyuta
`data/tariffs.json` `fx` bilan dollarga o'giriladi (CNY/TRY/KRW/AED/RUB
taxminiy — `fxApprox`). **Jami hisob faqat skrinshot orqali** (2026-09-17,
`result` ekrani, `resultVm`): kamera bosilishi bilan "Jami narx" natija
ekrani ochiladi ("o'qilmoqda"), javob kelgach karta — mahsulot, narx,
do'kon · davlat (do'kon bazadan nomi/domeni bo'yicha; davlat — do'konniki,
bo'lmasa AI taxmini, bo'lmasa valyutadan — "taxmin" belgisi bilan), **eng
arzon kuryer** va muddati (tezroq variant bir qatorda), og'irlik (sahifadan
yoki kategoriya taxmini), qatorlar (narx, kargo, boj, yig'im), jami
dollar va so'mda, boj eslatmasi; ostida taqiq/cheklov (nom bo'yicha
`bannedHits`), kategoriya ogohlantirishi, oylik me'yor, past ishonch.
Hisob `landedCalc()` da (kalkulyator bilan bitta kod), AI faqat rasmni
o'qidi. Tugmalar: **Qanday buyurtma qilaman?** — Pochtam AI ga tayyor
savol (do'kon, davlat, mahsulot, narx, kuryer) → `data/ai-rules.md`
"Qanday buyurtma qilaman" bo'limi bo'yicha qadam-baqadam yo'riqnoma va
mos kuryerlar; **Vaznni aniqlashtirish** — kalkulyator to'ldirilgan holda
(banner "Skrinshotdan o'qildi"); **Rejaga qo'shish**; **Boshqa kuryerlar**.
Narx topilmasa — sariq karta (3 qadam: sahifani oching, narx ko'ringan
joyni skrinshot qiling, qayta yuklang) va Qayta yuklash / Qo'lda hisoblash
/ Qayerdan topaman?; server javob bermasa — "Hozir o'qiy olmadim" + Qayta
urinish / Qo'lda hisoblash. Rasm serverda saqlanmaydi va log qilinmaydi.
Narx: bir skrinshot ≈ 1 500 kirish tokeni, chat savolidan bir necha
barobar arzon.

**Qayerdan topaman?** (tanlov ekrani, `where` — `whereVm`). Chat emas,
bosiladigan tanlov: 1-qadam "Nima qidiryapsiz?" — `data/categories.json`
dagi 6 kategoriya chipi va ixtiyoriy aniqlik maydoni ("41 razmer");
kategoriya tanlangach 2-qadam "Qanaqasi?" — Faqat original / Arzonroq ham
bo'ladi va byudjet ($50 / $100 / $300 / Farqi yo'q). "Do'konlarni ko'rsat"
bosilganda savolni ilova o'zi tuzadi ("Poyabzal va krossovka qidiryapman
(41 razmer). Faqat original. Byudjet $100 gacha. Qaysi do'kondan
topaman?") va Pochtam AI ga yuboradi — foydalanuvchi gap tuzmaydi. Pastda
"Boshqa savol bormi? Pochtam AI ga yozing" — erkin savol yo'li (telefonda
AI ekraniga yagona kirish). So'rov → `data/ai-rules.md` "Qayerdan topaman"
bo'limi: AI
kategoriya, originallik, o'lcham, byudjetni ajratadi, `suggest_stores`
vositasi (`worker/src/ai.js`) bazadan mos do'konlarni tanlaydi (kategoriya
hal qiluvchi, originallik "Yuqori", byudjet → narx segmenti) va har biriga
qidiruv havolasi beradi (`SEARCH_URL`, 27 do'kon; qolganlarida do'kon
manzili). Ilova javobni **natija kartasi** qilib chizadi (`aiVm`):
"Tushundim" chiplari (vosita kirishidan: kategoriya · original · byudjet),
AI matni, do'kon kartalari (logotip, davlat · narx segmenti · originallik,
"Qidirish" yangi oynada), `landed_cost` bo'lsa "Taxminiy jami" qatori,
"Kalkulyatorda ochish". Xato — sariq karta ("Hozir javob bera olmadim" /
"Bugungi savollar chegarasi tugadi") + Jami narx va Do'konlar tugmalari.
Bo'sh holat (faqat kompyuter menyusidan): "Nima kerak?" + bitta namuna.

**Aniq mahsulot havolalari — veb-qidiruv (2026-09-18).** "Do'konlarni
ko'rsat" so'rovi `find: true` bilan ketadi; worker shunda Claude'ning
server tomonidagi `web_search_20260209` vositasini qo'shadi (`max_uses`
`AI_WEB_SEARCH_USES`, standart 2; `AI_WEB_SEARCH=0` — o'chiq) va
qoidalar bo'yicha AI indekslanadigan do'konlarda (Amazon, AliExpress,
eBay, Trendyol, SHEIN, brend saytlari) aniq mahsulot sahifalarini topib
`product_links` vositasiga beradi — nom, https havola, do'kon, narx,
valyuta. Worker havolalarni tekshiradi (`toolLinks`: faqat https, takror
va xavfli manzillar tashlanadi, 5 tagacha), ilova ularni "Topilgan
sahifalar · bugun" kartalari qilib chizadi (`linksOf`: do'kon logotipi,
narx joriy kurs bilan dollarga o'girilgan, "Ochish") va ostida "narx va
mavjudlik o'zgarishi mumkin, ochib tekshiring, keyin skrinshot qiling".
Taobao, Pinduoduo, Poizon qidiruv tizimlarida yo'q — ularga qidiruv
havolasi qoladi. Narxi: har qidiruv $0.01 + tokenlar, bitta "find" so'rovi
≈ $0.05–0.06; oddiy savollarda veb-qidiruv umuman yo'q. Uzun server-vosita
navbati (`pause_turn`) davom ettiriladi, qidiruvlar soni `usage.search`
va o'lchovda `search` sifatida sanaladi.

**Qanday ishlaydi.** Ilova savolni, oxirgi 6 xabarni, tilni va joriy kursni
o'lchov serveriga yuboradi (`METRICS_URL + 'ai'`, `worker/src/ai.js`).
Worker Claude API'ga murojaat qiladi — kalit Cloudflare sirida
(`ANTHROPIC_API_KEY`), brauzerga hech qachon tushmaydi. Uch qatlam:

- **Qoidalar** — `data/ai-rules.md`: kim, qaysi tilda, nimani aytmaydi,
  bojxona faktlari, murakkab holatda Xizmatlarga yo'naltirish. Oddiy
  matn, kodga tegmasdan tahrirlanadi.
- **Bilimlar bazasi** — `worker/src/kb.generated.js`: manbadagi
  kuryerlar, do'konlar, taqiqlar, xizmatlar, qo'llanmalar hamda
  `data/*.json` dan `tools/ai-kb.mjs` tuzadi (`npm run build` ichida,
  `--check` mosligini tekshiradi). Ilova va AI bir manbadan gapiradi.
- **Vositalar** — `customs_duty`, `courier_quotes`, `landed_cost`,
  `check_banned`, `find_store`. Hisob-kitob faqat shu vositalar orqali va
  ular `core/` modullarini chaqiradi: AI raqamni o'zi yozmaydi, natija
  ilovadagi kalkulyator bilan bir xil (`worker/test.mjs` tekshiradi).

Javob ostida vositaga qarab tugma chiqadi: "Kalkulyatorda ochish" (narx,
vazn, davlat to'ldirilgan `landed`), "Kuryerlarni ko'rish" (`courierfolder`,
vazn paneli), "Taqiqlar ro'yxati", "Do'konni ochish" — 8-bosqichning
birinchi qismi.

**Chegaralar va xarajat.** Bitta IP uchun kuniga `AI_DAILY_PER_IP` (20),
hammasi uchun `AI_DAILY_TOTAL` (300) savol — `wrangler.toml`; veb-qidiruv
`AI_WEB_SEARCH` / `AI_WEB_SEARCH_USES`. IP
saqlanmaydi: kun va sir bilan tuzlangan xesh sanaladi, 90 kunda o'chadi.
Savol ≤ 600 belgi, javob ≤ 2048 token (fikrlash tokenlari ham shu
chegaradan yeydi), tizim ko'rsatmasi Claude keshida (`cache_control`).
Model `AI_MODEL` (claude-sonnet-5), fikrlash darajasi `AI_EFFORT`.

**Tizim ko'rsatmasi — indeks, baza emas (2026-09-17).** Ilgari kuryer,
do'kon va taqiq ro'yxatlari to'liq matn bo'lib har so'rovda qayta
yuborilardi (38 368 belgi ≈ 12 400 token), vaholanki o'sha ma'lumotni
vositalar serverda o'qiydi — bir xil narsa ikki marta ketardi. Endi
promptda faqat indeks: kuryer (nom, davlat, muddat, rejim, kuzatuv),
do'kon (nom, davlat, kategoriya, narx segmenti, originallik,
to'g'ridan-to'g'ri), taqiq (nom, daraja). Tafsilot vositadan keladi —
qaytarish sharti, murakkablik, tur va domen `find_store` da, qonuniy
manba va izoh `check_banned` da, summa va muddat `courier_quotes` da;
qoida `data/ai-rules.md` da yozilgan. Natija: 22 131 belgi ≈ 7 600 token
(−42%). Worker testi og'ir maydonlar qaytib qo'shilib qolishidan
saqlaydi va 26 000 belgi byudjetini tekshiradi.

**Narx.** Bitta savol (vosita chaqiruvi bilan 2 ta so'rov, kesh hisobga
olingan): ilgari Opus 5 + to'liq baza ≈ $0.111, endi Sonnet 5 + indeks
≈ $0.031 — **72% arzon**. Kunlik 300 savol chegarasida oyiga ~$996
o'rniga ~$282. Skrinshot alohida: `AI_SHOT_MODEL` (claude-haiku-4-5),
bitta chaqiruv ≈ $0.002 — u o'zgarmadi. Hisobotda (`/hisobot`) "Pochtam AI" bo'limi: javob, chegara,
xato, ishlatilgan vositalar.

**Yoqish.** GitHub'da `ANTHROPIC_API_KEY` sirini qo'shib "O'lchovni yoqish"
workflow'ini qayta ishga tushiring — u kalitni Worker'ga sir sifatida
yozadi. Kalitsiz `/ai` 503 qaytaradi, ilova "AI vaqtincha mavjud emas" deb
ko'rsatadi; 429 da "bugungi chegara tugadi". Kalkulyator, kuryerlar va
qolgan hamma narsa ishlayveradi.

**Sinov.** `tests/ai-eval.json` — 16 savol (boj, kuryer, taqiq, do'kon,
me'yor, ruscha, mavzudan tashqari) va mezonlar: kerakli vosita
chaqirilganmi, javobda kutilgan ifoda bormi, vositasiz raqam yo'qmi, til
to'g'rimi. `AI_URL=https://<worker>/ai node tests/ai.mjs` — tirik worker
bilan; `AI_URL` bo'lmasa o'tkazib yuboriladi.

Sinov: `tests/ai-eval.json` da tovar so'rovi uchun 3 savol (vosita
`suggest_stores`, javobda havola matni emas — tugma). Worker testlari:
`/ai` ga rasm (rasm bloki, JSON sxema, zaxira yo'l, CNY → USD, `stop:
"shot"`), `suggest_stores` reytingi, `buildCards` shartnomasi. Smoke: bosh sahifa maydoni va namuna, natija kartasi ("Tushundim"
chiplari, do'kon kartalari, taxminiy jami), xato kartasi, bo'sh holat,
skrinshot → natija ekrani (soxta `/ai`: nom, narx, do'kon · davlat,
eng arzon kuryer, jami $102.26, tugmalar), "Vaznni aniqlashtirish" →
to'ldirilgan kalkulyator, "Qanday buyurtma qilaman?" → AI savoli,
"topilmadi" kartasi → bo'sh kalkulyator, `where` tanlov ekrani (chiplar,
tuzilgan savol), qidiruvdagi havola (Taobao, `amzn.to`, noma'lum domen),
AI o'chiq holati (soxta `/ai/status`: kartalar o'rnida qidiruv).

Rejadagi `ai/index.html` iframe o'rniga ekran ilovaning o'zida: javob
ostidagi tugmalar ilova holatini to'ldirishi kerak (kalkulyator, kuryer
paneli), iframe'da bu `postMessage` orqali ikki tomonlama bo'lardi. Narxi
— `index.html` ga ~16 KB (byudjet ichida).

## Pochtam Core

Biznes mantiq UI dan ajratilgan, `core/` da, oddiy skript sifatida
(brauzerda `PochtamCore`, Node va Cloudflare Worker'da modul — bir xil
kod). Qoida raqamlari bu yerda yozilmaydi, `data/` dan keladi:

| Modul | Vazifa | Ma'lumot |
|---|---|---|
| `core/customs.js` | `customsDuty()` — boj va yig'im; `normsAt()`, `volumetricKg()`, `billableKg()` | `data/norms.json` |
| `core/tariffs.js` | `tariffCost()` — bitta tarif qatori uchun summa; `courierQuotes()` — yo'nalish va vazn bo'yicha barcha kuryerlar; `rankQuotes()` — arzon / tez / optimal | `data/tariffs.json` |
| `core/landed.js` | `landedCost()` — tovar + ichki yetkazish + kargo + boj + yig'im, hajmiy og'irlik, "olish foydalimi?" | — |

**Bitta formula, beshta chaqiruv.** Ilgari boj arifmetikasi beshta joyda
alohida yozilgan edi (kalkulyator, reja sehrgari, motion-namuna, bosh
sahifa misoli, qo'llanma dvigateli — oxirgisida zaxira stavkalar kodda).
Endi hammasi `customsDuty()` ni chaqiradi. Refaktor oltin qiymatlar
bilan tekshirildi: 14 ta holat (kalkulyator 6, motion, sehrgar 3,
qo'llanma 3) oldin va keyin aynan bir xil. `data/norms.json` — yagona
manba: build uni ilovadagi `NORMS` ro'yxatiga va har qo'llanmaga
(`window.XY_NORMS`) yozadi, `--check` farqni ushlaydi.

**Tariflar tuzilgan.** `data/tariffs.json` — 20 kuryerning 68 tarif
qatori: `text` (saytdagi asl yozuv, ko'rsatish uchun) va hisob uchun
`kind`: `brackets` (vazn oralig'i: posilka / kg / 100 g uchun narx),
`perkg` (`from` — "dan", ya'ni eng kam), `quote` (narx so'raladi;
hozir yo'q). Valyuta USD/EUR/GBP/UZS; EUR va GBP `fx` zaxira kurslari
bilan, UZS joriy kurs bilan dollarga o'giriladi. Ikkilanadigan qatorlar
(masalan saytda ikki qiymat) kattasi olinib `note` da izohlangan.
`perkg` tarifda eng kam 0,5 kg hisoblanadi (reja sehrgari qoidasi).
Test har qatorning jadvalda borligini va matni o'zgarmaganini tekshiradi.

`data/categories.json` — 6 kategoriya (ilovadagi `WIZ_CATS` va
`STORE_CATS` kalitlari bilan bir xil), odatiy og'irlik va cheklov izohi.

Testlar: `node tests/core.mjs` (tarmoqsiz, brauzersiz; `npm test` ning
birinchi qadami).

## Bojxona kalkulyatori

Formula `core/customs.js` da (yuqoriga qarang); bu bo'lim natijaning
ko'rsatilishi haqida. Qoida: oylik summa − $200 = ortiqcha; ortiqcha ulushiga mos vazn
nisbat bilan ajratiladi; bojxona qiymati = ortiqcha + shu vaznning
yetkazish xarajati; boj = max(qiymatning 30%, ortiqcha vazn × $3);
yig'im = BHM ning 25% (faqat ortiqcha bo'lganda). Maydonlar `num()` dan
o'tadi: vergul kasr sifatida, harf va manfiy qiymat tashlanadi. Dollar
summalari `usd()` bilan chiziladi: minglik ajratkich, $1 dan kichik
ortiqcha esa tiyin bilan ("$0.01" — 200.01 dollarda ham yig'im
undirilishi ko'rinib tursin). Bojxona tabidagi "Oy summasini qo'yish"
summani qo'yib, kalkulyatorning o'zini ochadi.

**Bojxona — 3 sahifa (2026-09-24, 4-bosqich).** Olti bo'limli hub o'rniga
foydalanuvchi savoli bilan uchta qator (`CUSTOMS_PAGES`): "Qancha
to'layman?" (kalkulyator, me'yor, yagona to'lov), "Nimani olib kirib
bo'lmaydi?" (taqiqlar), "Bojxonada nima bo'ladi?" (tartib, organlar).
Eski bo'lim raqamlari (`customsSec` 0..5) saqlangan — `SEC_PAGE` ularni
sahifaga bog'laydi, `focusSec(i)` sahifani ochib, kerakli bo'limga
(`data-sec`) aylantiradi; qidiruv, motion va AI havolalari o'zgarmadi.

**Sodda til (4-bosqich).** Jargon oddiy so'zga: "vositachi kerak" →
"kuryer orqali", "hajmiy og'irlik" → "quti o'lchami bo'yicha og'irlik",
YIDXP → my.gov.uz, "trek raqam" → "jo'natma raqami", BHM o'rniga
so'mdagi summa ("qat'iy yig'im"), kuryer xizmatlari `SVC_LABEL` bilan
o'zbekcha (Konsolidatsiya → "Posilkalarni birlashtirish" va h.k.).
Pochtam AI ham shu so'zlarda yozadi (`data/ai-rules.md`, uslub qoidasi).

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

**Tanishtiruv (2026-09-17).** Tanishuvdan keyin bosh sahifada bir marta
"coach marks": ekran xiralashadi (SVG niqob, teshik burchaklari yumaloq),
bitta joy yoritiladi, yonida qisqa izoh, "O'tkazib yuborish" va "Keyingi"
(oxirgisida "Tushunarli"). 5 qadam: maydon, kamera (AI yoqiq bo'lsa),
to'rt plitka, Xaridlarim, pastki menyu — nishonlar `data-tour` atributi
bilan, o'lchov `tourMeasure()` (shell'ga nisbatan, nishon avval
`scrollIntoView`), karta joy bo'lsa pastda, bo'lmasa tepada. Escape
yopadi, fokus "Keyingi" tugmasida (`role="dialog"`). Ko'rilgani
`localStorage.xy_tour`; Sozlamalar → "Ilova bilan tanishish" qayta
ochadi. O'lchov: `tour` (start, done, skip:N, replay). Teshik
koordinatalari shablonda emas — SVG atributida `{{ }}` brauzer konsolida
xato beradi — `tourMeasure()` ularni DOM'ga o'zi yozadi.

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

Shu server `POST /ai` bilan Pochtam AI'ga ham xizmat qiladi (yuqoridagi
bo'lim): AI savoli — foydalanuvchi o'zi yozgan matn — faqat o'sha manzilga
ketadi va saqlanmaydi (Cloudflare loglarida ham yozilmaydi: worker savol
matnini log qilmaydi).

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
| `icons/icon-512.png` | PWA ikonkasi, katta (Chrome o'rnatish oynasi 192 va 512 ni so'raydi) |
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

`npm run check` quyidagilarni tekshiradi: kuryer logotiplari ≤ 150 KB, ikonkalar ≤ 120 KB, shriftlar ≤ 120 KB, do'kon logotiplari ≤ 260 KB, qo'llanmalar ≤ 700 KB, `index.html` ≤ 840 KB (2026-09-15: TZ bosqichlari — bosh sahifa, jami narx, kuryer solishtirish paneli, Xaridlarim, Pochtam AI ekrani — uchun 680 dan 760 ga; 2026-09-17: skrinshot natija ekrani uchun 800 ga; 2026-09-18: savol ekrani, ovozli kiritish va Markaziy bank valyuta jadvali uchun 840 ga oshirildi; hozir ~804 KB, gzip ~192 KB). Chegaradan oshsa CI yiqiladi — bu tasodifan og'ir rasm qo'shilib qolishining oldini oladi.
