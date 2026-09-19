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

So'rov (Origin tekshiriladi, `ALLOW_ORIGIN`) — yagona kirish: savol, rasm
yoki havoladan kamida bittasi, yoniga joriy xarid va tarix:

```json
{ "q": "Shu tovarga boj tushadimi?", "lang": "uz", "usdRate": 12650,
  "image": "data:image/jpeg;base64,…", "url": "https://…", "find": true,
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
tuzilgan JSON: nom, narx, valyuta, miqdor, do'kon, kategoriya, davlat,
og'irlik, ishonch) va natija joriy xaridga qo'shiladi (`mergeCart`); savol
ham, havola ham yo'q bo'lsa asosiy model umuman chaqirilmaydi
(`stop: "shot"`, ≈ $0.002). Rasm asosiy modelga ko'rsatilmaydi va
saqlanmaydi. Havola bo'lsa `web_fetch` faqat o'sha domenga ruxsat bilan
qo'shiladi. `find: true` ("Qayerdan topaman") bo'lsa Claude'ning server
tomonidagi `web_search_20260209` (ko'pi bilan `AI_WEB_SEARCH_USES`, har
qidiruv $0.01) va tizim ko'rsatmasiga faqat shu holatda qisqa yo'riqnoma
qo'shiladi; `usage.search` — qidiruvlar soni, `/stats` da `search`.
Xatolar: 400 (kirish), 403 (begona Origin), 429 (`code: "limit"` — IP yoki
umumiy kunlik chegara), 503 (`no_key`, `key`, `upstream`).

Qoidalar `data/ai-rules.md` da, bilimlar bazasi `src/kb.generated.js`
(`node tools/ai-kb.mjs` tuzadi — qo'lda o'zgartirilmaydi), hisob-kitob
`core/` vositalari orqali. Sozlamalar `wrangler.toml`: `AI_MODEL`,
`AI_SHOT_MODEL`, `AI_DAILY_PER_IP`, `AI_DAILY_TOTAL`, `AI_MAX_TOKENS`,
`AI_EFFORT`, `AI_WEB_SEARCH` ("0" — o'chiq), `AI_WEB_SEARCH_USES`.

Kesh (Claude prompt caching, prefiks tools → system → messages): statik
vositalarning oxirgisida va tizim ko'rsatmasining katta blokida
`cache_control`; server vositalari (web_search, web_fetch) ro'yxat
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
