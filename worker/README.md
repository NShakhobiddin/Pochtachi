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

`wrangler.toml` dagi `ALLOW_ORIGIN` — ilova turgan sayt. Boshqa domenga
ko'chsangiz o'zgartiring, aks holda beacon 403 bilan qaytadi.

## Tekshirish

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

## Saqlash muddati va xarajat

Har kuni 03:00 UTC da 90 kundan eski qatorlar o'chiriladi (`crons`).
Bepul tarif: kuniga 100 000 so'rov, Durable Object SQLite 5 GB — sanoq
uchun yetarli. Bir kunda 1 000 foydalanuvchi ≈ 2–3 ming beacon.

## Lokal test

```bash
cd worker && npm test          # beacon tahlili va sanoq (tarmoqsiz)
npx wrangler dev               # http://localhost:8787 da haqiqiy Worker
```

Ilova tomonidagi qoida o'zgarmaydi: `METRICS_URL` bo'sh bo'lsa hech qanday
so'rov ketmaydi (smoke test tekshiradi), to'ldirilsa faqat shu manzilga.
