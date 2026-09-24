# Pochtam — hamkor kuryer holat API

Pochtam (pochtam.uz) foydalanuvchisi xaridini "Xaridlarim"da kuzatadi.
Kuryeringiz hamkor bo'lsa, jo'natma holati (omborga keldi, yo'lga chiqdi,
bojxonada, olib ketishga tayyor, topshirildi) sizning tizimingizdan o'zi
keladi. Foydalanuvchi tugma bosmaydi, sizga "posilkam qayerda?" deb kamroq
yozadi. Kuryer sahifangizda esa "Holat o'zi yangilanadi" belgisi chiqadi.

Integratsiya bitta HTTP so'rovdan iborat: holat o'zgarganda POST yuborasiz.

## 1. Kalit olish

Ilovada Ma'lumotnoma → Sozlamalar → "Kuryerlik tashkilotiman" orqali
murojaat qiling. Sizga kuryer id (masalan `d2d`) va maxfiy kalit
(`pk_…`) beriladi. Kalit faqat sizning kuryeringiz nomidan yozadi.
Boshqa kuryer nomidan yozib bo'lmaydi.

Kalitni serverda saqlang, brauzer yoki mobil ilova kodiga qo'ymang.
Kalit oshkor bo'lsa, xabar bering: yangisi beriladi, eskisi darhol
o'chadi.

## 2. Holat yuborish

```
POST https://<pochtam-worker>/partner/status
Authorization: Bearer pk_…
Content-Type: application/json
```

Bitta hodisa:

```json
{ "number": "RB123456789CN", "status": "customs", "at": "2026-09-23T10:00:00Z", "note": "Toshkent-AERO" }
```

Bir nechta hodisa (200 tagacha, 64 KB gacha):

```json
{ "events": [
  { "number": "RB123456789CN", "status": "shipped", "at": "2026-09-21T09:00:00Z" },
  { "number": "YT2409220001",  "status": "received", "at": "2026-09-22T14:30:00+08:00" }
] }
```

| Maydon | Majburiy | Qiymat |
|---|---|---|
| `number` | ha | Mijozga bergan jo'natma raqamingiz: 6–40 belgi, lotin harf, raqam, `-`. Bo'shliq va kichik harf o'zi tozalanadi |
| `status` | ha | Quyidagi jadvaldan biri |
| `at` | tavsiya | Hodisa vaqti, ISO 8601. Bo'lmasa — qabul qilingan vaqt. Bir kundan ko'p kelajakdagi yoki 90 kundan eski vaqt ham qabul vaqtiga almashtiriladi |
| `note` | yo'q | 120 belgigacha izoh: shahar, filial, "boj to'lanishi kerak". **Ism, telefon, manzil yozmang** |

| `status` | Ma'nosi | Ilovada |
|---|---|---|
| `received` | Tovar xorijdagi omboringizga keldi | Yo'lda · Omborga keldi |
| `shipped` | O'zbekistonga jo'natildi | Yo'lda · Yo'lga chiqdi |
| `customs` | Bojxonada rasmiylashtirilmoqda | Yo'lda · Bojxonada |
| `held` | Bojxonada ushlandi, mijozdan harakat kerak | Qizil blok, "Ushlansa nima qilish kerak?" |
| `ready` | O'zbekistonda, olib ketishga tayyor | Yashil blok · Olib ketishga tayyor |
| `delivered` | Mijozga topshirildi | Keldi |

Javob:

```json
{ "ok": 2, "saved": 2, "courier": "d2d", "rejected": [] }
```

`rejected` — qabul qilinmagan hodisalar: `{ "i": 3, "error": "…" }`, bu
yerda `i` — `events` dagi tartib raqami. Hech biri qabul qilinmasa, javob
kodi `400` bo'ladi. `401` — kalit noto'g'ri. `413` — so'rov juda katta.

Qoidalar:

- Holat o'zgargan zahoti yuboring. Kechikkan yoki takroriy hodisa zarar
  qilmaydi: joriy holat — `at` si eng kech hodisa, bir xil hodisa ikki
  marta yozilmaydi.
- Ilovadagi qadam orqaga qaytmaydi. `held` dan keyin `ready` yuborsangiz,
  blok yashilga o'zgaradi.
- Sinov uchun haqiqiy bo'lmagan raqam ishlating (masalan
  `TEST-0001`). U 90 kundan keyin o'zi o'chadi.

## 3. Maxfiylik

- Pochtam jo'natma raqamini ochiq saqlamaydi. Kalit sifatida
  SHA-256(kuryer + raqam) saqlanadi, holatni faqat raqamni biladigan odam
  ko'ra oladi.
- Har kuryerning yozuvlari alohida. Boshqa kuryerdagi xuddi shu raqam
  ko'rinmaydi.
- 90 kun yangilanmagan yozuv o'chiriladi.
- Ilova holatni faqat o'z serverimizdan so'raydi. Mijozning ma'lumoti
  uchinchi tomonga ketmaydi.

## 4. Misol (curl)

```sh
curl -X POST "https://<pochtam-worker>/partner/status" \
  -H "Authorization: Bearer $POCHTAM_KEY" -H "Content-Type: application/json" \
  -d '{"number":"TEST-0001","status":"shipped","note":"Guanchjou omboridan"}'
```

---

## Для курьерских компаний (кратко, по-русски)

Отправляйте `POST /partner/status` с заголовком `Authorization: Bearer <ключ>`
при каждом изменении статуса. Тело запроса — `{ number, status, at, note }`
или `{ events: [...] }` (до 200 событий). Статусы: `received` (на складе
за рубежом), `shipped` (отправлено в Узбекистан), `customs` (на таможне),
`held` (задержано на таможне), `ready` (готово к выдаче), `delivered`
(вручено). В `note` (до 120 символов) не указывайте ФИО, телефон и адрес.
Номер отправления хранится только в виде хеша, данные удаляются через
90 дней без обновлений. Ключ выдаётся по заявке: «Настройки» → «Я курьерская
компания» в приложении.

---

## Loyiha egasi uchun

- Kalit yaratish: `cd worker && node hamkor-kalit.mjs d2d`. Chiqqan
  `d2d:pk_…` ni GitHub → Settings → Secrets → `PARTNER_KEYS` siriga
  qo'shing. Bir nechta kuryer bo'lsa, vergul bilan ajrating. Keyin
  "O'lchovni yoqish" workflow'ini ishga tushiring. Kuryer id —
  ilovadagi id: mymeest, meestchina, ethnologistics, tezparcel,
  abuexpress, silkroad, spacexpress, yellowpochta, globbing,
  teztezdelivery, smartpostus, cpost, yumecs, d2d, humodelivery,
  wikishopus, greenpost, boxette, ase, janapost.
- API'si yo'q kuryer holatni Telegram yoki Excel'da bersa, egasi uning
  nomidan yoza oladi: `Authorization: Bearer <METRICS_READ_TOKEN>` va
  body'da `"courier": "d2d"`.
- Workflow har ishga tushganda `sinov` kuryeri nomidan bitta holat yozib,
  ilova yo'li (`POST /track`) bilan o'qiydi. Bu jonli tekshiruv.
  `sinov` ilovada hamkor sifatida ko'rinmaydi.
