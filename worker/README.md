# Pochtam o'lchov serveri (Cloudflare Worker)

Ilova qaysi ekran ochilgani, qaysi do'kon/kuryer/qo'llanmaga o'tilgani va
pullik xizmatga necha marta yozilganini sanaydi. Bu server o'sha sanoqni
qabul qilib saqlaydi. **Faqat sanoq** saqlanadi: kun · hodisa · kalit →
nechta. IP, foydalanuvchi identifikatori, qidiruv matni, reja — hech qachon.
"Do Not Track" yoqilgan brauzerdan umuman hech narsa kelmaydi (ilova
yubormaydi).

Nega Cloudflare: bepul tarif kuniga 100 000 so'rov beradi, server
boshqarish yo'q, Durable Object (SQLite) sanoqni atomar yuritadi va KV ning
"kuniga 1 000 yozuv" chegarasi bu yerda yo'q.

## Terminalsiz o'rnatish (tavsiya)

`.github/workflows/metrics.yml` hammasini o'zi qiladi. Kerak: Cloudflare
hisobi va GitHub'da uchta sir (Settings → Secrets and variables → Actions →
New repository secret):

| Sir | Qayerdan |
|---|---|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → profil → API Tokens → Create Token → "Edit Cloudflare Workers" shabloni → Continue → Create → nusxalang |
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → Workers & Pages → o'ng ustunda "Account ID" |
| `METRICS_READ_TOKEN` | o'zingiz o'ylab topgan uzun parol — hisobotni o'qish uchun |

Avval Workers & Pages sahifasini bir marta ochib `workers.dev` subdomen
nomini tanlab qo'ying (birinchi ochilishda so'raydi). Keyin GitHub →
Actions → "O'lchovni yoqish (Cloudflare Worker)" → Run workflow. Workflow
Worker'ni joylaydi, parolni o'rnatadi, serverni sinaydi, manzilni ilovaga
yozib qayta quradi va push qiladi. Hisobot manzili log oxirida.

## Terminal orqali o'rnatish (10 daqiqa)

1. Cloudflare hisobi oching (bepul) va Node 18+ o'rnatilgan bo'lsin.
2. Shu papkada:

   ```bash
   cd worker
   npm install
   npx wrangler login          # brauzerda tasdiqlaysiz
   npx wrangler secret put READ_TOKEN
   # uzun tasodifiy satr kiriting, masalan: openssl rand -hex 24
   npx wrangler deploy
   ```

   Oxirida manzil chiqadi: `https://pochtam-metrics.<hisob>.workers.dev`.

3. Ilovaga manzilni yozing — `Xarid Yordamchisi v2.dc.html` da:

   ```js
   const METRICS_URL = 'https://pochtam-metrics.<hisob>.workers.dev/';
   ```

   keyin `npm run build` va push. Shu paytdan boshlab sahifa fonga o'tganda
   yoki yopilganda bitta beacon ketadi (har bosishda emas).

`wrangler.toml` dagi `ALLOW_ORIGIN` — ilova turgan sayt(lar), vergul bilan.
Boshqa domenga ko'chsangiz o'zgartiring, aks holda beacon 403 bilan
qaytadi. Workflow orqali joylansa ildizdagi `CNAME` dagi domen o'zi
qo'shiladi.

## Hisobot sahifasi

`https://pochtam-metrics.<hisob>.workers.dev/hisobot` — brauzerda ochiladigan
oddiy hisobot: parolni (READ_TOKEN) bir marta kiritasiz, u brauzerning o'zida
saqlanadi (manzilda emas, xatcho'p qilsa bo'ladi). Bugun / 7 / 30 / 90 kun
tugmalari, uchta jamlama (ekran ochilishi, do'kon va kuryerga o'tishlar,
murojaatlar), so'ng bo'limlar: ekranlar, do'konga o'tish, kuryerga o'tish,
qo'llanmalar, pullik xizmat, reja, hamkorlik, til, versiya — har biri
chiziq bilan. Sahifa tashqi resurs yuklamaydi va indekslanmaydi. "Chiqish"
parolni brauzerdan o'chiradi.

## Tekshirish (terminal)

```bash
# server tirikmi
curl https://pochtam-metrics.<hisob>.workers.dev/
# sinov beacon (Origin sarlavhasi shart)
curl -X POST https://pochtam-metrics.<hisob>.workers.dev/ \
  -H 'origin: https://nshakhobiddin.github.io' -H 'content-type: text/plain' \
  -d '{"v":"test","l":"uz","e":[{"n":"screen","k":"stores"},{"n":"store","k":"taobao"}]}'
# sanoq (oxirgi 7 kun)
curl -H 'authorization: Bearer <READ_TOKEN>' \
  'https://pochtam-metrics.<hisob>.workers.dev/stats?days=7'
```

Javob:

```json
{ "from": "2026-09-03", "to": "2026-09-09", "days": 7,
  "byDay": { "2026-09-09": 2 },
  "byName": { "screen": { "stores": 1 }, "store": { "taobao": 1 },
              "lang": { "uz": 1 }, "ver": { "test": 1 } } }
```

`byDay` — kuniga ochilgan ekranlar (faollik), `byName` — har hodisa
ichida kalitlar ko'p→kam tartibida. Hodisalar: `screen` (ekran), `store` va
`courier` (saytga o'tildi), `guide` (qo'llanma ochildi), `wizard` (reja
yakunlandi), `svcAsk` (pullik xizmatga murojaat, kaliti — xizmat), `hamkor`
(hamkorlik so'rovi); qo'shimcha `lang` va `ver`.

Kuryerga hisobot: `byName.courier` ichidan uning kaliti — oyda necha marta
saytiga o'tilgani; `byName.screen.courier` bilan solishtirsangiz ulushi
chiqadi. `?days=30` — oylik.

## Ochiq statistika (ixtiyoriy)

`PUBLIC_STATS = "1"` qilib qayta deploy qilsangiz `GET /public` tokensiz
ochiladi va 1 soat keshlanadi: oxirgi 7 kunda eng ko'p ochilgan 5 ta
do'kon, kuryer va qo'llanma hamda haftalik ekran soni. Ilovada "Bu hafta
eng ko'p tanlangan kuryer" kabi tirik signal uchun. Bu yerda ham faqat
sanoq bor, shaxsiy narsa yo'q.

## Pochtam AI (`POST /ai`)

Shu Worker ilovadagi AI yordamchisiga ham xizmat qiladi (`src/ai.js`).
Kalit — sir: `npx wrangler secret put ANTHROPIC_API_KEY` (yoki GitHub'da
`ANTHROPIC_API_KEY` sirini qo'shib workflow'ni qayta ishga tushirish).
Kalitsiz `/ai` 503 `{"code":"no_key"}` qaytaradi. Ilova ochilganda
`GET /ai/status` → `{ "ai": true|false }` so'raydi (5 daqiqa kesh) va
`false` bo'lsa AI tugmalarini umuman ko'rsatmaydi — foydalanuvchi "AI
mavjud emas" xabarini ko'rmaydi, savollar oddiy qidiruvga boradi.

So'rov (Origin tekshiriladi, `ALLOW_ORIGIN`) — yagona kirish: savol yoki
rasmdan kamida bittasi, yoniga joriy xarid va tarix. Havola o'qilmaydi
(2026-10-03): AI tovarni topadi va skrinshotdan hisoblaydi; eski ilova
yuborgan `link`/`url` e'tiborsiz qoladi.

```json
{ "q": "Shu tovarga boj tushadimi?", "lang": "uz", "usdRate": 12650,
  "image": "data:image/jpeg;base64,…", "find": true,
  "cart": { "name": "…", "store": "…", "country": "Xitoy", "price": 699, "cur": "CNY", "kg": 0.8, "courier": "D2D", "totalUsd": 102.2 },
  "history": [{ "role": "user", "text": "…" }, { "role": "assistant", "text": "…" }] }
```

Javob: `{ text, cards, cart, shot, tools: ["customs_duty", …], model, usage, stop }`.
Ilova FAQAT `cards` ni chizadi — har karta o'zi bilan kerakli hamma
narsani olib keladi (vosita kirishi `got` va natija), vosita nomlari
sanoq uchun. Turlar: `product` (skrinshotdan o'qilgan mahsulot), `ask`
(bitta savol, 2–4 variant), `links` (aniq mahsulot sahifalari), `stores`
(mos do'konlar + `got`), `store` (bazadagi do'kon), `warning` (taqiq),
`duty` (boj + `got`), `total` (jami + `got`), `couriers` (takliflar,
davlat, vazn), `cart` (joriy xarid). Vositalar: `customs_duty`,
`courier_quotes`, `landed_cost`, `check_banned`, `find_store`,
`suggest_stores` (natijasida `sizeNote`/`note`/`next` — kerak bo'lgandagina
keladigan ko'rsatma), `product_links`, `ask_user`.

Rasm (`image`, ≤ ~1 MB; ilova 1280 px ga kichraytiradi) avval arzon model
bilan o'qiladi (`readShot`, `AI_SHOT_MODEL`, standart `claude-haiku-4-5`,
tuzilgan JSON: rasm turi `kind` — `price` (narx ko'ringan sahifa),
`product` (tovar fotosi, narxsiz: nom, brend va inglizcha qidiruv so'rovi
`query` — ilova "Qidiruv so'zlari"ni shu bilan ochadi) yoki `other`; savat yoki
buyurtma skrinshotida bir nechta tovar bo'lsa `items` (har biri: nom,
narx, valyuta, miqdor, kategoriya, og'irlik; ko'pi bilan 10) — javobda
`multi: true`, umumiy narx (bir valyutada yoki dollarda) va nom
"N ta tovar: …"; nom, narx,
valyuta, miqdor, do'kon, kategoriya, davlat, og'irlik, ishonch) va natija
joriy xaridga qo'shiladi (`mergeCart`); savol bo'lmasa asosiy model
umuman chaqirilmaydi (`stop: "shot"`, ≈ $0.002). Rasm asosiy modelga
ko'rsatilmaydi va saqlanmaydi. `find: true` ("Qayerdan topaman") bo'lsa Claude'ning server
tomonidagi `web_search_20260209` (ko'pi bilan `AI_WEB_SEARCH_USES`, har
qidiruv $0.01) va tizim ko'rsatmasiga faqat shu holatda qisqa yo'riqnoma
qo'shiladi; `usage.search` — qidiruvlar soni, `/stats` da `search`.
**Qidiruv so'zlari (`kw: true`, 2026-10-05).** `{ q, kw: true, who, style }`
(`who`: `erkak`/`ayol`/`bola`, `style`: `original`/`arzon`, ikkalasi
ixtiyoriy) — asosiy model emas, arzon model (`AI_SHOT_MODEL`) sxemali
javob bilan tovar nomidan qisqa qidiruv so'zi tuzadi: inglizcha (Amazon,
AliExpress), xitoycha (Taobao, Pinduoduo, Poizon; brend lotincha,
original so'ralsa 正品/旗舰店) va turkcha (Trendyol). Do'konlar bazadan
kategoriya va tanlovga qarab olinadi (`kwStores`, ko'pi bilan 6), har
biriga o'z tilidagi so'z va qidiruv havolasi; havolasi yo'q ilovalar
(`copyOnly`) — faqat nusxa. Javob: `{ text: "", kw: { name, category,
words: { en, zh, tr }, tip, stores: [{ id, name, country, lang, query,
url, copyOnly }] }, stop: "kw" }`; ≈ $0.001, kunlik javob keshi bilan
(`/stats` da `kw`). Sabab: xorijiy do'konda eng katta to'siq — nima deb
yozishni bilmaslik; Taobao xitoycha so'z bilan ancha ko'p topadi.
**Gemini zaxirasi (2026-10-07).** `GEMINI_API_KEY` (Cloudflare siri;
workflow GitHub sirini o'zi o'rnatadi; kalitga ochiq barqaror Flash
modellarga 1 so'zli sinov yuborib, javob berganlarini oldinga qo'yib,
ko'pi bilan 3 tasini `GEMINI_MODEL` ga ro'yxat qilib yozadi — biri band
bo'lsa (429, 5xx, "high demand") Worker keyingisiga o'tadi; repo
o'zgaruvchisi `GEMINI_MODEL` bo'lsa — o'sha) bo'lsa, Claude ishlamay qolganda —
kredit/oylik chegara (400 "usage limits", "credit balance"), kalit
(401/403), yuklama (429, 529, 5xx) yoki tarmoq — xuddi shu so'rov
Gemini'ga ketadi va suhbat shu so'rov oxirigacha Gemini'da qoladi.
`src/gemini.js` Claude Messages so'rovini Gemini `generateContent`
shakliga o'giradi (vositalar — `functionDeclarations.parametersJsonSchema`,
JSON javob — `responseJsonSchema`, rasm — `inlineData`, oqim —
`streamGenerateContent?alt=sse`) va javobni yana Claude shakliga
qaytaradi: vositalar sikli, skrinshot, qidiruv so'zlari va oqim
o'zgarishsiz ishlaydi. Gemini 3 ning "fikr imzosi" (`thoughtSignature`)
keyingi raundga qaytariladi. Veb-qidiruv zaxirada standart o'chiq
(`GEMINI_SEARCH = "1"` — googleSearch). Sozlamalar: `AI_PROVIDER =
"gemini"` (asosiy provayder), `AI_GEMINI_FALLBACK = "0"` (zaxira o'chiq),
`GEMINI_SHOT_MODEL` (skrinshot/so'zlar uchun alohida arzon model),
`GEMINI_THINKING` (MINIMAL/LOW/MEDIUM/HIGH), `AI_GEMINI_PRICE =
"kirish,chiqish"` ($/1M token; standart Flash $0.5/$3). Zaxira javobi
tayyor javob keshiga yozilmaydi; `/stats` da `gemini` sanog'i. Sinov:
workflow `gemini_eval` — xuddi shu eval Gemini'da (`x-pochtam-provider:
gemini`, faqat eval paroli bilan).
Xatolar: 400 (kirish), 403 (begona Origin), 429 (`code: "limit"`, `scope`:
`ip`, `total` yoki `budget` — kunlik chegara), 503 (`no_key`, `key`,
`billing` — kredit yoki oylik sarf chegarasi, `upstream`).

Xarajat nazorati: har javobda `usage` (tokenlar, `cacheWrite`, taxminiy
`usd`); sarf `/stats` da `ai_usd` (mikro-dollar, so'rov turi: chat, find,
shot), `ai_tok` va `usdByDay` — /hisobot "AI xarajati" bo'limida.
`AI_DAILY_USD` — kunlik $ chegarasi (oshsa ertagacha 429 `budget`),
`AI_DAILY_FIND_PER_IP` — "Qayerdan topaman" IP uchun kuniga (oshsa rad
emas, veb-qidiruvsiz javob, `ai/find_limit`). Tizim ko'rsatmasida faqat
qoidalar va nomlar (~11 400 belgi); "Qanday buyurtma qilaman" bo'limi
faqat shu mavzudagi savolga keshdan keyingi blok bo'lib qo'shiladi
(`orderRules`).

Tayyor javob keshi (`answerKey`): tarixsiz, rasmsiz, havolasiz savol shu
kuni aynan qayta so'ralsa (til, rejim, kurs, joriy xarid ham bir xil)
javob Counter omboridan beriladi — AI chaqirilmaydi, chegara va xarajat
yo'q (`ai/cache_hit`, `usage.cached`). Kesilgan (`max_tokens`) javob
saqlanmaydi; eski kun javoblari purge'da o'chadi. `AI_ANSWER_CACHE = "0"`
— o'chiq. Ko'rsatma keshi muddati `AI_CACHE_TTL`: `5m` (standart) yoki
`1h`.

Sifat sinovi: `tests/ai.mjs` (23 savol, `tests/ai-eval.json`) —
workflow'ni `eval: true` bilan ishga tushirilganda joylashdan keyin
yuradi. So'rovda `x-pochtam-eval: <READ_TOKEN>` sarlavhasi: tayyor javob
ishlatilmaydi, IP va umumiy chegara yo'q; sarf alohida (`ai_usd_eval`,
chegarasi `AI_EVAL_DAILY_USD`, standart $5) — foydalanuvchilarning
`AI_DAILY_USD` byudjetini yemaydi. Oxirida taxminiy xarajat va bitta
`NATIJA …` qatori (o'tgan savollar, $/savol, vaqt/savol) chiqadi.
Modellarni solishtirish: workflow `compare: true` — bir xil savollar
Sonnet 5, Sonnet 5.5 va Sonnet 5.5 `between_tools` da, har biriga oqim
sinovi. Sinovda model `x-pochtam-model` (faqat `claude-sonnet-5`,
`claude-sonnet-5-5`) va `x-pochtam-thinking` (`adaptive`,
`between_tools`) sarlavhalari bilan almashtiriladi — faqat eval paroli
bilan.

Oxirgi solishtirish (2026-10-03, 24 savol, effort `low`): Sonnet 5 —
23/24, $0.0117/savol, 363 chiqish tokeni; Sonnet 5.5 — 23/24,
$0.0149/savol (+27%), 474 token; Sonnet 5.5 `between_tools` — 21/24,
$0.0158/savol, javoblari uzunroq, bir savolda vositani chaqirmadi. Sifat
teng, Sonnet 5.5 qimmatroq — `AI_MODEL` Sonnet 5 da qoldi. (Ikki mezon
to'g'ri javobni rad etgani uchun tuzatildi; natijalar tuzatilgan mezon
bo'yicha.)

Qoidalar `data/ai-rules.md` da, bilimlar bazasi `src/kb.generated.js`
(`node tools/ai-kb.mjs` tuzadi — qo'lda o'zgartirilmaydi), hisob-kitob
`core/` vositalari orqali. Sozlamalar `wrangler.toml`: `AI_MODEL`,
`AI_SHOT_MODEL`, `AI_DAILY_PER_IP`, `AI_DAILY_TOTAL`, `AI_DAILY_USD`,
`AI_DAILY_FIND_PER_IP`, `AI_MAX_TOKENS`,
`AI_EFFORT`, `AI_THINKING` (bo'sh — adaptiv; `between_tools` — oldindan
fikrlashsiz, Sonnet 5.5), `AI_EVAL_DAILY_USD`, `AI_WEB_SEARCH` ("0" — o'chiq), `AI_WEB_SEARCH_USES`.

Qo'riqlov kodda: javob matnidan markdown belgilari (`**`, `#`, `` ` ``,
"- ") olib tashlanadi (`plainText`) — qoidaga ishonib emas, ilovada
oddiy matn ko'rinadi; raqamlar faqat vositalardan (test: vositasiz "$…"
chiqsa xato).

Kesh (Claude prompt caching, prefiks tools → system → messages): statik
vositalarning oxirgisida va tizim ko'rsatmasining katta blokida
`cache_control`; server vositasi (web_search) ro'yxat
OXIRIDA — o'zgarsa ham statik qism keshdan o'qiladi. Tizim ko'rsatmasi
kunda bir marta tuziladi (`buildSystem` memo). Kun, til, kurs, joriy
xarid va vaziyat ko'rsatmalari — keshdan keyingi kichik bloklar.

Tizim ko'rsatmasi — indeks: kuryer, do'kon va taqiq ro'yxatlari qisqa
maydonlar bilan ketadi, tafsilotni vositalar qaytaradi (`find_store`,
`check_banned`, `courier_quotes`). Shuning uchun `buildSystem()` ga
maydon qo'shishdan oldin tekshiring — uni vosita bera oladimi? Test
byudjetni (24 000 belgi; hozir ≈ 22 600) va og'ir maydonlar yo'qligini
kuzatadi. Vositaga tegishli ko'rsatma (o'lcham jadvali, veb-qidiruv
tartibi) qoidalar faylida emas — vosita natijasida yoki faqat o'sha
holatda qo'shiladigan blokda keladi (Shopify Sidekick "just-in-time
instructions" naqshi).

Xarajat mo'ljali: tizim ko'rsatmasi ≈ 6,5 ming token keshda (o'qish
arzon), savol-javob ≈ 1–2 ming token; vosita bilan bir savol ≈ $0.03
(Sonnet 5). Kunlik umumiy chegara 300 savol ≈ $9/kun eng ko'pi bilan. Hisobotda
"Pochtam AI" bo'limi sanoqni ko'rsatadi (`ai`: ok, limit, err,
tool:…). Savol matni saqlanmaydi va log qilinmaydi.

Sinov: `AI_URL=https://pochtam-metrics.<hisob>.workers.dev/ai node
tests/ai.mjs` (ildizdan) — `tests/ai-eval.json` dagi savollar.

## Hamkor kuryer holat API (`POST /partner/status`, `POST /track`)

Hamkor kuryer jo'natma holatini o'z tizimidan yuboradi (`received`,
`shipped`, `customs`, `held`, `ready`, `delivered`), ilova esa xarid
kartasini o'zi oldinga suradi. To'liq tavsif kuryerlar uchun:
[`docs/hamkor-api.md`](../docs/hamkor-api.md). Kod: `src/track.js`.

- Kalitlar `PARTNER_KEYS` sirida: `"d2d:pk_…,globbing:pk_…"`. Yangi kalit:
  `node hamkor-kalit.mjs d2d`. GitHub'da shu nomli sir bo'lsa, workflow
  uni o'zi o'rnatadi. Kalit qaysi kuryerniki ekanini o'zi aytadi, boshqa
  kuryer nomidan yozib bo'lmaydi. 24 belgidan qisqa kalit hisobga
  olinmaydi.
- `READ_TOKEN` egasi istalgan kuryer nomidan yoza oladi (body'da
  `courier`). Bu API'si yo'q kuryerning holatini qo'lda kiritish va
  workflow'dagi `sinov` tekshiruvi uchun.
- Ombor — alohida Durable Object (`Tracks`, migratsiya `v2`). Kalit
  SHA-256(kuryer + raqam), ya'ni raqam ochiq saqlanmaydi. Tarixda 12
  tagacha hodisa turadi. 90 kun yangilanmagan yozuv kunlik cron'da
  o'chadi.
- Ilova `GET /ai/status` dan `partners` ro'yxatini oladi va faqat shu
  kuryerlar uchun `POST /track` so'raydi (20 tagacha, faqat ALLOW_ORIGIN
  dan).

## Telegram bot (`POST /tg`)

Bot shu Worker ichida ishlaydi (serverless, webhook) — alohida server kerak
emas. Kod: `src/tg.js`.

**Ulash (bir marta):**
1. Telegramda @BotFather → `/newbot` → bot nomi va username (`..._bot`) →
   BotFather kalit beradi (`123456:ABC…`). Kalitni chatga, kodga yoki
   commit'ga yozmang.
2. GitHub → Settings → Secrets and variables → Actions → New repository
   secret: nomi `TELEGRAM_BOT_TOKEN`, qiymati — o'sha kalit.
3. Actions → "O'lchovni yoqish" → Run workflow. Workflow kalitni Worker
   siriga yozadi, webhook'ni `/tg` ga ulaydi, buyruqlarni (/start, /kurs,
   /help, uz va ru) va chat pastidagi **"Pochtam"** menyu tugmasini (Mini
   App — sayt Telegram ichida ochiladi) o'rnatadi. Logda faqat `@username`.

**Bot nima qiladi** (faqat shaxsiy chatda):
- skrinshot (rasm yoki fayl) → narx o'qiladi (`readShot`, ilovadagi bilan
  bir xil) → tavsiya etilgan kuryer, arzonrog'i, boj, yig'im va jami $ va
  so'mda (Markaziy bank kursi, 6 soat keshda); "Batafsil — Pochtam'da"
  tugmasi Mini App'ni ochadi;
- matn → Pochtam AI javobi (`runAi`, vositalar bilan), do'kon havolalari
  tugmada;
- `/kurs` — dollar kursi; `/start`, `/help` — yo'riqnoma.
- **Ikki til** (o'zbek, rus): `/start` va `/til` da 🇺🇿/🇷🇺 tugmalari;
  tanlov chat bo'yicha eslab qolinadi (Tracks ombori, kalit — chat id
  xeshi), chat menyu tugmasi va Mini App shu tilda ochiladi (`?lang=`).
  Asosiy til — o'zbek: rus tili tanlanmaguncha bot (Telegram tili qanday
  bo'lmasin) o'zbekcha javob beradi, menyu tugmasi ilovani `?lang=uz` bilan
  ochadi. Buyruqlar va bot tavsifi ham ikki tilda (workflow).

Xavfsizlik va chegara: Telegram har so'rovda `X-Telegram-Bot-Api-Secret-Token`
yuboradi — u kalitdan hosil qilinadi (`tgSecret`: SHA-256, 48 belgi), boshqa
hech kim `/tg` ga yozolmaydi (403). Kunlik chegara ilova bilan bir xil
(`AI_DAILY_PER_IP`, umumiy `AI_DAILY_TOTAL` va `AI_DAILY_USD`), kalit — chat
id xeshi. Telegram qayta yuborgan yangilanish (update_id) ikki marta
javoblanmaydi. Rasm va matn saqlanmaydi; xarajat hisobotda `tg_shot`,
`tg_chat` bo'lib ko'rinadi. Bot oylik me'yorni bilmaydi — hisob "shu oyda
boshqa jo'natma bo'lmasa" deb yoziladi; to'liq hisob Mini App'da.

Mini App manzili: `TG_APP_URL` (bo'lmasa `https://pochtam.uz/`). Sayt
Telegram ichida o'zi moslashadi (to'liq ekran, Telegram "Orqaga" tugmasi,
xavfsiz chegaralar).

## Oqim (`POST /ai` + `stream: true`)

`stream: true` bo'lsa, javob `application/x-ndjson` bo'ladi. Qatorlar
turi:
- `{"t":"status","s":"<vosita>"}`
- `{"t":"text","d":"…","r":<raund>}`
- oxirida `{"t":"done", …}` yoki `{"t":"error","code":…}`.

`done` ichidagi maydonlar oqimsiz javob bilan bir xil. Kirish, Origin va
kunlik chegara xatolari oqim boshlanmasdan, oddiy JSON bo'lib qaytadi.

Worker Claude'ga `stream: true` bilan murojaat qiladi va SSE ni
`readSse` bilan yig'adi:
- `thinking` bloklari imzosi bilan saqlanadi;
- `tool_use` / `server_tool_use` kirishi `input_json_delta` bo'laklaridan
  tiklanadi;
- `web_search_tool_result` o'zgarishsiz qoladi;
- iqtiboslar `citations_delta` dan to'planadi.

Shu tufayli vositalar tsikli oqimsiz rejim bilan bir xil ishlaydi.

Fikrlash darajasi: oddiy savolda `AI_EFFORT` (`low`), veb-qidiruv va
havolada `AI_EFFORT_FIND` (`medium`). Workflow har safar oqimli savol
beradi va birinchi so'z hamda butun javob necha soniyada kelganini
yozadi.

## Saqlash muddati va xarajat

Har kuni 03:00 UTC da 90 kundan eski qatorlar o'chiriladi (`crons`).
Bepul tarif: kuniga 100 000 so'rov, Durable Object SQLite 5 GB — sanoq
uchun yetarli. Bir kunda 1 000 foydalanuvchi ≈ 2–3 ming beacon.

## Lokal test

```bash
cd worker && npm test          # beacon tahlili, sanoq va /ai (soxta Claude, tarmoqsiz)
npx wrangler dev               # http://localhost:8787 da haqiqiy Worker
```

Ilova tomonidagi qoida o'zgarmaydi: `METRICS_URL` bo'sh bo'lsa hech qanday
so'rov ketmaydi (smoke test tekshiradi), to'ldirilsa faqat shu manzilga.

**Havola o'qilmaydi (2026-10-03).** Ilgari `link` bilan sahifa o'qilardi (JSON-LD, matn, web_fetch). Jonli sinovda ko'p do'konlar narxni robotlardan yashirdi (Trendyol — Cloudflare captcha, AliExpress — narx JavaScript bilan), shuning uchun yo'l olib tashlandi: ilova havola tashlansa skrinshot so'raydi (nom havoladan yoki ulashish matnidan; narx ulashish matnida bo'lsa — `core/share.js` bilan AI'siz).
