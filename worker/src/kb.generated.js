/* AVTOMATIK FAYL — qo'lda o'zgartirmang. Manba: Xarid Yordamchisi v2.dc.html, data/*.json,
   data/ai-rules.md. Yangilash: node tools/ai-kb.mjs (npm run build ichida). */
export const RULES = "# Pochtam AI — javob qoidalari\n\nBu fayl AI yordamchisining tizim ko'rsatmasi. Worker uni so'zma-so'z Claude'ga\nberadi (`worker/src/kb.generated.js` orqali, `npm run build` yangilaydi).\nQoidalar o'zgarsa faqat shu faylni tahrirlang — kod o'zgarmaydi. Har\nso'rovda ketadi, shuning uchun qisqa: vositaga tegishli tafsilot vosita\ntavsifida va natijasida keladi, bu yerda takrorlanmaydi.\n\n## Kimsan va qanday ishlaysan\n\nSen — Pochtam AI, pochtam.uz ilovasining yordamchisi. Mavzu: O'zbekistonga\nchet eldan (Xitoy, AQSh, Turkiya, Yevropa, Koreya, BAA va boshqa) shaxsiy\nxarid: do'konlar, kuryerlar va tariflari, bojxona me'yorlari va to'lovlari,\ntaqiqlangan tovarlar, ilova funksiyalari. Mustaqil ma'lumot xizmatisan,\ndavlat organi emassan, bojxona bilan bog'liq emassan.\n\nIlovada bitta kirish bor: foydalanuvchi yozadi, aytadi, havola tashlaydi\nyoki mahsulot sahifasining skrinshotini biriktiradi — rejim tanlamaydi.\nSo'rov bilan **joriy xarid** keladi (tovar, do'kon, davlat, narx, valyuta,\nvazn, kuryer, ilova hisoblagan jami): uni qayta so'rama, shundan foydalan.\nSkrinshotni arzon model o'qiydi va jami narxni ilova o'zi hisoblab\nko'rsatadi — sen jamini takrorlamaysan, savolga javob berasan.\n\nNiyatni aniqla, mos vositani chaqir; javobni ilova karta qilib chizadi:\n\n| Niyat | Vosita | Javobda |\n|---|---|---|\n| Qayerdan olaman | `suggest_stores` (+ berilsa `web_search` → `product_links`) | 3–4 do'kon sababi bilan; skrinshotga chaqiruv |\n| Qancha turadi | `landed_cost`, yoki `customs_duty` + `courier_quotes` | Summa va nimadan iboratligi |\n| Qaysi kuryer | `courier_quotes` | 2–3 variant: arzon, tez |\n| Olib kirsa bo'ladimi | `check_banned` | Taqiq/cheklov va sababi |\n| Qanday buyurtma qilaman | `find_store` (qo'llanma bormi), `courier_quotes` | 6–8 raqamli qadam (quyida) |\n| Bitta narsa yetishmayapti | `ask_user` | Bitta savol, 2–4 bosiladigan variant |\n\n## Til va uslub\n\n- Foydalanuvchi tilida: o'zbek lotin (`uz`), o'zbek kirill (`uzc`) yoki rus\n  (`ru`). Til aralashtirma. Sizlab gapir; salomga bir so'z, darrov ishga.\n- Qisqa: 2–4 gap. Ro'yxat kerak bo'lsa raqamli qadamlar (`1.`) — ilova\n  ularni belgilanadigan ro'yxat qiladi. Sarlavha, jadval, yulduzcha,\n  panjara ishlatma. URL yozma — havolalar vositalardan karta bo'lib chiqadi.\n- Raqamlar o'qish oson ko'rinishda: $128, 597 000 so'm, 2,5 kg.\n- Yetishmagan narsa javobni butunlay o'zgartirsa `ask_user`; aks holda\n  oqilona taxmin qil va taxminni aytib qo'y (masalan \"taxminiy vazn\").\n\n## Raqamlar — faqat vositalardan\n\n- Boj, yig'im, jami narx, kuryer summasi va muddatini HECH QACHON o'zing\n  hisoblama yoki taxmin qilma — vositani chaqir va natijadagi raqamlarni\n  o'zgartirmasdan keltir. Vazn noma'lum bo'lsa kategoriyani ber, vosita\n  taxmin qiladi.\n- Raqamli javob oxirida bir marta: hisob taxminiy, yakuniy summani bojxona\n  organi va kuryer belgilaydi. Vosita xato bersa — hisoblay olmaganingni\n  ayt va ilovadagi \"Jami narx\" kalkulyatoriga yo'naltir.\n- \"Narx so'rov bo'yicha\" (`quote`) tarifli kuryer uchun summa aytma,\n  \"kuryerdan so'raladi\" de. Tarif to'liq yoki 0,5 kg ga yumaloqlanadi;\n  hajmiy og'irlik (uzunlik × kenglik × balandlik / 5000) kattaroq bo'lsa\n  kargo shu bo'yicha; ombor, qadoqlash, sug'urta alohida bo'lishi mumkin.\n\n## Faktlar — faqat shu yerdagi va bazadagi\n\n- Bojxona qoidalari — quyidagi bo'limdan; kuryer, do'kon, taqiq,\n  xizmatlar — bazadan. Quyidagi ro'yxatlar qisqa INDEKS; tafsilot\n  vositadan: do'konning qaytarish sharti, murakkabligi, domeni —\n  `find_store`; taqiqning qonuniy manbasi — `check_banned`; kuryer\n  summasi, muddati, kuzatuvi — `courier_quotes`. Indeksda yo'q narsani\n  to'qima: qonun raqami, sana, tarif, do'kon sharti, kuryer va'dasi,\n  kuryerning tovar cheklovi (u uchun kuryer saytini tekshirishni ayt).\n- Bazada yo'q do'kon so'ralsa — \"ro'yxatimizda yo'q\" de. Istisno:\n  \"Qayerdan olaman\" javobida mashhur do'konni belgilab aytish mumkin\n  (\"ro'yxatimizda yo'q: tarif va originallik bahosi yo'q\").\n- Bilmagan narsada \"Bu haqda aniq ma'lumotim yo'q\" de va manbani ayt:\n  ilovadagi Bojxona bo'limi, kuryer sayti, my.gov.uz (YIDXP), ilovadagi\n  Xizmatlar (pullik konsultatsiya). Mavzudan tashqari savolni bir gapda\n  muloyim rad et. Huquqiy kafolat berma: \"albatta o'tadi\" emas, \"me'yor\n  ichida bo'lsa boj yo'q\".\n\n## Bojxona me'yorlari (VMQ 244-son, 19.04.2025 asosida)\n\n- Bojsiz me'yor — bir kalendar oyda har bir qabul qiluvchi uchun `freeUsd`\n  dollar (qiymat NORMS da va vositalar natijasida). Oy ichida kelgan barcha\n  jo'natmalar qiymati qo'shib hisoblanadi, kuryer yoki pochtadan qat'i\n  nazar; buyurtma kuni emas, bojxonaga kelgan kun hisobga olinadi.\n- Me'yordan oshsa to'lov faqat ortiqcha qismdan: $260 lik tovarda hisob\n  $60 dan boshlanadi.\n- Yagona bojxona to'lovi: ortiqcha qismning bojxona qiymatidan `dutyPct`\n  (30%) yoki har ortiqcha kilogramm uchun `minPerKg` ($3) — kattasi.\n  Bojxona qiymatiga ortiqcha ulushga mos yetkazish haqi ham kiradi.\n  Ustiga rasmiylashtirish yig'imi: BHM ning `feeShare` (25%), summadan\n  qat'i nazar bir xil. Boj dollarda hisoblanib Markaziy bank kursi\n  bo'yicha so'mga o'tkaziladi.\n- Imtiyoz faqat shaxsiy va oilaviy foydalanish uchun; bir xil tovar ko'p\n  miqdorda (10 ta telefon) tijorat deb hisoblanishi mumkin.\n- Qiymat chek yoki invoys bo'yicha; bozor narxidan ancha past ko'rsatilsa\n  bojxona qayta baholaydi. Qiymatni pasaytirib yozish — jarima va\n  jo'natmani ushlab qolish sababi.\n- Rasmiylashtirish: kuryer jo'natmani bojxona nazoratiga topshiradi,\n  deklaratsiya ro'yxatga olinadi; qabul qiluvchiga YIDXP (my.gov.uz) yoki\n  mobil ilova orqali xabarnoma keladi; tasdiqlash past va o'rta xavfda\n  ixtiyoriy, yuqori xavfda majburiy; me'yordan ortiq bo'lsa boj va yig'im\n  to'langach jo'natma chiqariladi. Nomiga kelgan jo'natmalar va oylik\n  hisob my.gov.uz kabinetida ko'rinadi.\n- Hujjat yetishmasa, maqsad bahsli bo'lsa, ko'rik yoki ekspertiza\n  tugamagan bo'lsa jo'natma vaqtincha saqlovga olinadi; muddat ichida\n  chek, invoys, to'lov tasdig'i yoki sertifikat topshiriladi; saqlov\n  cho'zilsa ombor haqi bo'lishi mumkin.\n- Alkogol va tamaki xalqaro pochta va kuryer orqali taqiqlangan; brend\n  nusxasi (replika) bojxonada olib qo'yiladi. Powerbank va litiy batareya\n  avia bilan yuborilmaydi; telefon IMEI ro'yxatidan o'tkaziladi; aerozol\n  va spirtli atir avia jo'natmada cheklanadi — kuryer ro'yxatini tekshirish.\n\n## Qayerdan olaman\n\nFoydalanuvchi biror narsa sotib olmoqchi (\"krossovka, original, 41,\n$100 gacha\" — imlo xatolari bilan ham) yoki \"qayerdan olsam\" desa. So'rov\nko'pincha ilovadagi chiplardan tayyor keladi — kategoriya, originallik va\nbyudjet aniq bo'lsa qo'shimcha savol berma. Maqsad: to'g'ri do'konga olib\nborish va narx ko'ringan sahifaning skrinshotini oldirish.\n\n1. So'rovdan ajrat: kategoriya, kimga, original kerakmi, o'lcham, byudjet\n   (USD ga o'gir). Yetishmaganini taxmin qil.\n2. `suggest_stores` (category, original, budgetUsd, query — inglizcha).\n   3–4 do'konni sabab bilan ayt: originallik, narx segmenti,\n   to'g'ridan-to'g'ri yetkazish, qo'llanma bor. Natijadagi `sizeNote`\n   (o'lcham) va `note` (originallik) bo'lsa qisqa keltir.\n3. Qanday topishni bir-ikki gapda: qidiruvga nima yozish (inglizcha yoki\n   xitoycha), filtrlar (o'lcham, narx, \"original\"/\"旗舰店\" — flagship),\n   sotuvchi reytingi va sharhlar.\n4. Skrinshotga chaqir: mahsulot sahifasini oching, narx, nom va (bo'lsa)\n   og'irlik ko'ringan joyni suratga oling — ilova do'kon, davlat, eng\n   arzon kuryer, boj va jami narxni o'zi chiqaradi. Bu rejimda jamini\n   aytma, `landed_cost` chaqirma.\n\nKonkret mahsulot, hozirgi narxi va mavjudligini sen bilmaysan — \"topib\nberaman\" dema (veb-qidiruv berilgan bo'lsa u alohida ko'rsatma bilan\nkeladi). Havola berilsa `web_fetch` bilan sahifani o'qi: nom, narx,\nvalyuta; ochilmasa skrinshot so'ra. Narx ham, skrinshot ham yo'q, \"qancha\ntushadi\" desa — nimani skrinshot qilishni ayt yoki narxni so'ra.\n\n## Qanday buyurtma qilaman\n\nNatija kartasidagi tugma shu savolni yuboradi: \"Men <do'kon> (<davlat>)\ndan <mahsulot> buyurtma qilmoqchiman, kuryer <nom>. Qanday buyurtma\nqilaman?\" Javob — 6–8 raqamli qadam, har biri 1–2 gap:\n\n1. Do'kon: ilova/sayt, ro'yxatdan o'tish, til va valyuta; ilovada\n   qo'llanmasi bor do'kon bo'lsa (`find_store` → guide) shuni ayt.\n2. Mahsulot: sotuvchi reytingi, sharhlar, o'lcham jadvali; original kerak\n   bo'lsa rasmiy do'kon/flagship.\n3. Manzil: do'kon tovarni O'zbekistonga emas, kuryerning o'sha davlatdagi\n   omboriga yuboradi — manzilni kuryer ilovasidan olib, do'konda aynan\n   shunday yozish (ID/kod bilan).\n4. To'lov: qaysi kartalar o'tadi (Visa/Mastercard; ba'zi do'konlarda faqat\n   mahalliy karta — vositachi kerak), so'm kartasi masalasi.\n5. Kuryerga xabar: buyurtma va trek raqamini kuryer ilovasiga kiritish,\n   mahsulot nomi va qiymatini to'g'ri yozish (bojxona uchun).\n6. Kuryerlar: `courier_quotes` bilan shu davlatdan 2–3 variant (arzon /\n   tez), farqi — muddat, kuzatuv, yumaloqlash.\n7. Bojxona: me'yor, YIDXP xabarnomasi, boj bo'lsa qanday to'lanadi\n   (`customs_duty` chaqirilsa aniq summa).\n8. Qabul: kuryer ofisi yoki uyga yetkazish, pasport, tekshirish.\n\nHar qadamda faqat bazada bor fakt; do'kon sharti aniq bo'lmasa \"do'kon\nsahifasida tekshiring\" de. Oxirida taxminiy muddatni ayt.\n\n## Ilova funksiyalari (yo'naltirish uchun)\n\n- Bosh sahifa — \"Nima mahsulot qidiryapsiz?\": maydon (yozish, aytish,\n  havola, rasm biriktirish) va uch yo'l: \"Topdim — qanchaga tushadi?\"\n  (skrinshot → natija kartasi: do'kon, davlat, eng arzon kuryer, muddat,\n  boj, jami), \"Hali topmadim — qayerdan olaman?\" (chiplar → sen),\n  \"Narxni o'zim yozaman\" (kalkulyator). \"Oxirgi hisob\" kartasi saqlanadi.\n- Natija kartasida \"Qanday buyurtma qilaman?\" (qo'llanma yoki sen),\n  \"Vaznni aniqlashtirish\" (kalkulyator to'ldirilgan), \"Rejaga qo'shish\",\n  \"Boshqa kuryerlar\".\n- \"Jami narx\" — kalkulyator: narx, miqdor, vazn, quti, davlat, kuryer →\n  jami, \"olish foydalimi?\". \"Kuryerlar\" → \"Vazn bo'yicha hisob\" —\n  taqqoslash. \"Bojxona\" — me'yorlar, taqiqlar, tartib, kalkulyator,\n  manzillar. \"Xaridlarim\" — rejalar, jo'natmalar (Reja, Buyurtma qilindi,\n  Omborda, Yo'lda, Bojxonada, Keldi), sevimlilar, hisoblar. Qo'llanmalar:\n  Taobao, Pinduoduo, Poizon, SHEIN, Trendyol, Amazon, eBay.\n- \"Xizmatlar\" — pullik konsultatsiya: tezkor savol, ushlangan jo'natma,\n  boj hisobini tekshirish, hujjatlar, taqiq tekshiruvi; tashkilotlar\n  uchun yuridik, shartnoma, bahs, texnik, integratsiya. Murakkab holat\n  (jo'natma ushlangan, bahs, hujjat) — qisqa yo'l-yo'riq va mos xizmat.\n";
export const NORMS = [
 {
  "from": "2025-08-01",
  "bhm": 412000,
  "freeUsd": 200,
  "dutyPct": 0.3,
  "minPerKg": 3,
  "feeShare": 0.25,
  "src": "VMQ 244-son, 19.04.2025"
 },
 {
  "from": "2026-09-01",
  "bhm": 440000,
  "freeUsd": 200,
  "dutyPct": 0.3,
  "minPerKg": 3,
  "feeShare": 0.25,
  "src": "VMQ 244-son, 19.04.2025"
 }
];
export const TARIFFS = {
 "updated_at": "2026-09-15",
 "note": "Kuryer tariflari tuzilgan ko'rinishda. `text` — kuryer saytidagi asl yozuv, `rows`/`price` — hisob uchun. kind: brackets (vazn oralig'i bo'yicha), perkg (kg uchun narx; `from` — 'dan', ya'ni eng kam), quote (narx so'raladi). Valyuta USD/EUR/GBP/UZS; EUR va GBP `fx` orqali dollarga o'giriladi, UZS — joriy kurs bilan.",
 "fx": {
  "note": "USD ga o'girish zaxira kurslari (CBU dan olinsa almashtiriladi). 1 birlik necha USD. CNY/TRY/KRW/AED/RUB — skrinshotdan o'qilgan narx va kalkulyator valyuta chiplari uchun taxminiy.",
  "EUR": 1.08,
  "GBP": 1.27,
  "CNY": 0.14,
  "TRY": 0.03,
  "KRW": 0.00073,
  "AED": 0.27,
  "RUB": 0.011
 },
 "couriers": {
  "mymeest": [
   {
    "i": 0,
    "c": "Angliya",
    "text": "0.05–0.5 kg: 7 GBP/posilka; 0.501–1 kg: 8.25 GBP/posilka; 1.001–30 kg: 9.50 GBP/kg",
    "days": "5 kundan boshlab",
    "dnum": 5,
    "kind": "brackets",
    "currency": "GBP",
    "rows": [
     {
      "upTo": 0.5,
      "price": 7,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 8.25,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 9.5,
      "per": "kg"
     }
    ]
   },
   {
    "i": 1,
    "c": "Gretsiya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "",
    "dnum": null,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 2,
    "c": "Ispaniya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 3,
    "c": "Italiya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 4,
    "c": "Germaniya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 5,
    "c": "Kanada",
    "text": "0.05–1 kg: 16.65 USD/posilka; 1.001–30 kg qatorida 7.70 va 8.95 USD qiymatlari ko'rsatilgan",
    "days": "",
    "dnum": null,
    "kind": "brackets",
    "currency": "USD",
    "rows": [
     {
      "upTo": 1,
      "price": 16.65,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8.95,
      "per": "kg"
     }
    ],
    "note": "1 kg dan yuqorida saytda 7.70 va 8.95 USD ko'rsatilgan — kattasi olindi"
   },
   {
    "i": 6,
    "c": "Polsha",
    "text": "0.05–0.5 kg: 7 EUR; 0.501–1 kg: 8 EUR; 1.001–30 kg: 9.50 EUR/kg",
    "days": "5 kundan boshlab",
    "dnum": 5,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 7,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 8,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 9.5,
      "per": "kg"
     }
    ]
   },
   {
    "i": 7,
    "c": "Portugaliya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 8,
    "c": "AQSh",
    "text": "0.05–0.5 kg: 4.75 USD/posilka; 0.501–30 kg: 0.95 USD har 100 g",
    "days": "taxm. 10 kun",
    "dnum": 10,
    "kind": "brackets",
    "currency": "USD",
    "rows": [
     {
      "upTo": 0.5,
      "price": 4.75,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 0.95,
      "per": "100g"
     }
    ]
   },
   {
    "i": 9,
    "c": "Ukraina",
    "text": "0.05–1 kg: 10.75 EUR/posilka; 1.001–30 kg: 7.75 EUR/kg",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 1,
      "price": 10.75,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 7.75,
      "per": "kg"
     }
    ]
   },
   {
    "i": 10,
    "c": "Fransiya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "",
    "dnum": null,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   },
   {
    "i": 11,
    "c": "Chexiya",
    "text": "0.05–0.5 kg: 5.50 EUR; 0.501–1 kg: 6.50 EUR; 1.001–30 kg: 8 EUR/kg",
    "days": "",
    "dnum": null,
    "kind": "brackets",
    "currency": "EUR",
    "rows": [
     {
      "upTo": 0.5,
      "price": 5.5,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 6.5,
      "per": "parcel"
     },
     {
      "upTo": 30,
      "price": 8,
      "per": "kg"
     }
    ]
   }
  ],
  "meestchina": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "10 USD/kg dan",
    "days": "8 kundan boshlab",
    "dnum": 8,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": true
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "6 USD/kg dan",
    "days": "17 kundan boshlab",
    "dnum": 17,
    "kind": "perkg",
    "currency": "USD",
    "price": 6,
    "from": true
   },
   {
    "i": 2,
    "c": "Koreya",
    "text": "11.7 USD/kg dan",
    "days": "10 kundan boshlab",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 11.7,
    "from": true
   }
  ],
  "ethnologistics": [
   {
    "i": 0,
    "c": "Qirg'iziston",
    "text": "8 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 8,
    "from": false
   },
   {
    "i": 1,
    "c": "Qirg'iziston",
    "text": "30 USD/kg",
    "days": "36 soat",
    "dnum": 2,
    "kind": "perkg",
    "currency": "USD",
    "price": 30,
    "from": false
   },
   {
    "i": 2,
    "c": "Qirg'iziston",
    "text": "5 USD/kg",
    "days": "10 ish kunidan",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 5,
    "from": false
   },
   {
    "i": 3,
    "c": "Tojikiston",
    "text": "8 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 8,
    "from": false
   },
   {
    "i": 4,
    "c": "Tojikiston",
    "text": "30 USD/kg",
    "days": "36 soat",
    "dnum": 2,
    "kind": "perkg",
    "currency": "USD",
    "price": 30,
    "from": false
   },
   {
    "i": 5,
    "c": "Tojikiston",
    "text": "5 USD/kg",
    "days": "10 ish kunidan",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 5,
    "from": false
   },
   {
    "i": 6,
    "c": "Qozog'iston",
    "text": "8 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 8,
    "from": false
   },
   {
    "i": 7,
    "c": "Qozog'iston",
    "text": "30 USD/kg",
    "days": "36 soat",
    "dnum": 2,
    "kind": "perkg",
    "currency": "USD",
    "price": 30,
    "from": false
   },
   {
    "i": 8,
    "c": "Qozog'iston",
    "text": "5 USD/kg",
    "days": "10 ish kunidan",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 5,
    "from": false
   },
   {
    "i": 9,
    "c": "Rossiya",
    "text": "12 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 12,
    "from": false
   },
   {
    "i": 10,
    "c": "Rossiya",
    "text": "30 USD/kg",
    "days": "36 soat",
    "dnum": 2,
    "kind": "perkg",
    "currency": "USD",
    "price": 30,
    "from": false
   },
   {
    "i": 11,
    "c": "Rossiya",
    "text": "5 USD/kg",
    "days": "10 ish kunidan",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 5,
    "from": false
   },
   {
    "i": 12,
    "c": "BAA",
    "text": "8 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 8,
    "from": false
   },
   {
    "i": 13,
    "c": "Turkiya",
    "text": "8 USD/kg",
    "days": "3–5 ish kuni",
    "dnum": 5,
    "kind": "perkg",
    "currency": "USD",
    "price": 8,
    "from": false
   },
   {
    "i": 14,
    "c": "Turkiya",
    "text": "30 USD/kg",
    "days": "36 soat",
    "dnum": 2,
    "kind": "perkg",
    "currency": "USD",
    "price": 30,
    "from": false
   },
   {
    "i": 15,
    "c": "Turkiya",
    "text": "5 USD/kg",
    "days": "10 ish kunidan",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 5,
    "from": false
   }
  ],
  "tezparcel": [
   {
    "i": 0,
    "c": "Angliya",
    "text": "7 GBP/kg (UKda to'lov) yoki 9.5 USD/kg (O'zbekistonda to'lov)",
    "days": "7–14 ish kuni",
    "dnum": 14,
    "kind": "perkg",
    "currency": "USD",
    "price": 9.5,
    "note": "O'zbekistonda to'lov varianti; UK da to'lansa 7 GBP/kg"
   },
   {
    "i": 1,
    "c": "AQSh",
    "text": "9 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 9,
    "from": false
   },
   {
    "i": 2,
    "c": "Germaniya",
    "text": "7,5 EUR",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "EUR",
    "price": 7.5,
    "from": false
   }
  ],
  "abuexpress": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "6 USD",
    "days": "7–10 kun (sayt umumiy va'da)",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 6,
    "from": false
   },
   {
    "i": 1,
    "c": "Turkiya",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   }
  ],
  "silkroad": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "9,9 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 9.9,
    "from": false
   }
  ],
  "spacexpress": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "9,5 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 9.5,
    "from": false
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "5,9 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 5.9,
    "from": false
   }
  ],
  "yellowpochta": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   }
  ],
  "globbing": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "12 USD/kg",
    "days": "5–10 ish kuni",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 12,
    "from": false
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "13–14 USD/kg (sayt jadvalida ikki qiymat)",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 14,
    "note": "Sayt jadvalida 13–14 USD/kg — kattasi olindi"
   },
   {
    "i": 2,
    "c": "Angliya",
    "text": "13 USD/kg",
    "days": "7–10 ish kuni",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 13,
    "from": false
   },
   {
    "i": 3,
    "c": "Germaniya",
    "text": "13 USD/kg",
    "days": "7–9 ish kuni",
    "dnum": 9,
    "kind": "perkg",
    "currency": "USD",
    "price": 13,
    "from": false
   },
   {
    "i": 4,
    "c": "Italiya",
    "text": "13 USD/kg",
    "days": "7–9 ish kuni",
    "dnum": 9,
    "kind": "perkg",
    "currency": "USD",
    "price": 13,
    "from": false
   },
   {
    "i": 5,
    "c": "Ispaniya",
    "text": "13 USD/kg",
    "days": "7–9 ish kuni",
    "dnum": 9,
    "kind": "perkg",
    "currency": "USD",
    "price": 13,
    "from": false
   }
  ],
  "teztezdelivery": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "9 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 9,
    "from": false
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "5,88 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 5.88,
    "from": false
   }
  ],
  "smartpostus": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "8,3 USD",
    "days": "3–7 ish kuni",
    "dnum": 7,
    "kind": "perkg",
    "currency": "USD",
    "price": 8.3,
    "from": false
   }
  ],
  "cpost": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   }
  ],
  "yumecs": [
   {
    "i": 0,
    "c": "Rossiya",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   },
   {
    "i": 1,
    "c": "Turkiya",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   },
   {
    "i": 2,
    "c": "Xitoy",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   },
   {
    "i": 3,
    "c": "Koreya",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   },
   {
    "i": 4,
    "c": "BAA",
    "text": "9 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 9,
    "from": false
   },
   {
    "i": 5,
    "c": "Malayziya",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   }
  ],
  "d2d": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "9.49 USD/kg; Avia Seriya 11.5; Avia Brand 13",
    "days": "4–7 kun",
    "dnum": 7,
    "kind": "perkg",
    "currency": "USD",
    "price": 9.49,
    "note": "Oddiy tovar; Avia Seriya 11.5, Avia Brand 13 USD/kg"
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "5.5 USD/kg Toshkent; 5.8 USD/kg viloyatlar; Seriya/Brand 7.5",
    "days": "20–25 kun",
    "dnum": 25,
    "kind": "perkg",
    "currency": "USD",
    "price": 5.5,
    "note": "Toshkent; viloyatlar 5.8, Seriya/Brand 7.5 USD/kg"
   }
  ],
  "humodelivery": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 10,
    "from": false
   },
   {
    "i": 1,
    "c": "Xitoy",
    "text": "7 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 7,
    "from": false
   }
  ],
  "wikishopus": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "13.49 USD/kg",
    "days": "5–7 ish kuni",
    "dnum": 7,
    "kind": "perkg",
    "currency": "USD",
    "price": 13.49,
    "from": false
   },
   {
    "i": 1,
    "c": "AQSh",
    "text": "10.49 USD/kg",
    "days": "5–7 ish kuni",
    "dnum": 7,
    "kind": "perkg",
    "currency": "USD",
    "price": 10.49,
    "from": false
   }
  ],
  "greenpost": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "9,5 USD",
    "days": "7–10 kun Xitoy omboridan Toshkentgacha",
    "dnum": 10,
    "kind": "perkg",
    "currency": "USD",
    "price": 9.5,
    "from": false
   }
  ],
  "boxette": [
   {
    "i": 0,
    "c": "AQSh",
    "text": "160 000 UZS/kg",
    "days": "3–9 ish kuni",
    "dnum": 9,
    "kind": "perkg",
    "currency": "UZS",
    "price": 160000,
    "from": false
   },
   {
    "i": 1,
    "c": "AQSh",
    "text": "130 000 UZS/kg",
    "days": "9–16 ish kuni",
    "dnum": 16,
    "kind": "perkg",
    "currency": "UZS",
    "price": 130000,
    "from": false
   },
   {
    "i": 2,
    "c": "Turkiya",
    "text": "130 000 UZS/kg",
    "days": "9–16 ish kuni",
    "dnum": 16,
    "kind": "perkg",
    "currency": "UZS",
    "price": 130000,
    "from": false
   }
  ],
  "ase": [
   {
    "i": 0,
    "c": "Turkiya",
    "text": "0–0.5kg 60 000; 0.5–0.6kg 75 000; 0.6–1kg 125 000; 1–1.1kg 135 000; 1.1–1.5kg 175 000; 1.5–1.6kg 185 000; 1.6–2kg 225 000 UZS",
    "days": "2–3 ish kuni (Istanbul ombori → Toshkent)",
    "dnum": 3,
    "kind": "brackets",
    "currency": "UZS",
    "rows": [
     {
      "upTo": 0.5,
      "price": 60000,
      "per": "parcel"
     },
     {
      "upTo": 0.6,
      "price": 75000,
      "per": "parcel"
     },
     {
      "upTo": 1,
      "price": 125000,
      "per": "parcel"
     },
     {
      "upTo": 1.1,
      "price": 135000,
      "per": "parcel"
     },
     {
      "upTo": 1.5,
      "price": 175000,
      "per": "parcel"
     },
     {
      "upTo": 1.6,
      "price": 185000,
      "per": "parcel"
     },
     {
      "upTo": 2,
      "price": 225000,
      "per": "parcel"
     }
    ],
    "note": "2 kg dan og'ir posilka uchun narx so'raladi"
   }
  ],
  "janapost": [
   {
    "i": 0,
    "c": "Xitoy",
    "text": "6,10 USD",
    "days": "",
    "dnum": null,
    "kind": "perkg",
    "currency": "USD",
    "price": 6.1,
    "from": false
   }
  ]
 }
};
export const CATEGORIES = [
 {
  "id": "kiyim va moda",
  "label": "Kiyim va moda",
  "kgPerItem": 0.6,
  "examples": "ko'ylak, kurtka, sumka, aksessuar",
  "caution": ""
 },
 {
  "id": "poyabzal",
  "label": "Poyabzal va krossovka",
  "kgPerItem": 1.2,
  "examples": "krossovka, etik, sandal",
  "caution": "Quti bilan hajmiy og'irlik oshadi — ko'p kuryer qutisiz yuborishni taklif qiladi."
 },
 {
  "id": "elektronika",
  "label": "Elektronika va texnika",
  "kgPerItem": 0.8,
  "examples": "telefon, quloqchin, gadjet, komponent",
  "caution": "Litiy batareya va powerbank avia bilan yuborilmaydi; telefon O'zbekistonda IMEI ro'yxatidan o'tkaziladi."
 },
 {
  "id": "kosmetika",
  "label": "Kosmetika va parfyumeriya",
  "kgPerItem": 0.4,
  "examples": "parvarish, atir, bo'yoq",
  "caution": "Aerozol va spirtli atirlar avia jo'natmada cheklanadi — kuryerning ro'yxatini tekshiring."
 },
 {
  "id": "bolalar",
  "label": "Bolalar va o'yinchoq",
  "kgPerItem": 0.9,
  "examples": "kiyim, o'yinchoq, aravacha",
  "caution": ""
 },
 {
  "id": "universal",
  "label": "Universal",
  "kgPerItem": 1,
  "examples": "uy-ro'zg'or, sport, boshqa",
  "caution": ""
 }
];
export const COUNTRIES = [
 "AQSh",
 "Angliya",
 "BAA",
 "Chexiya",
 "Fransiya",
 "Germaniya",
 "Gretsiya",
 "Ispaniya",
 "Italiya",
 "Kanada",
 "Koreya",
 "Malayziya",
 "Polsha",
 "Portugaliya",
 "Qirg'iziston",
 "Qozog'iston",
 "Rossiya",
 "Tojikiston",
 "Turkiya",
 "Ukraina",
 "Xitoy"
];
export const COURIERS = [
 {
  "id": "mymeest",
  "name": "MYMEEST",
  "days": "5 kundan boshlab",
  "dnum": 5,
  "mode": "avia",
  "countries": "Angliya, Gretsiya, Ispaniya, Italiya, Germaniya, Kanada, Polsha, Portugaliya, AQSh, Ukraina, Fransiya, Chexiya",
  "tracking": true,
  "trusted": false,
  "note": "12 mamlakatdan xaridlarni yetkazish, kalkulyator va tracking mavjud. Xizmatlar omborga qarab farq qiladi.",
  "updated": "15.08.2026",
  "limits": [
   "Telefon: Cheklangan: ayrim yo'nalishlarda mobil qurilmalar cheklovi bor",
   "Batareya/Powerbank: Taqiqlangan/cheklangan (yo'nalishga bog'liq)",
   "Parfyum: Ko'p Yevropa yo'nalishlarida taqiqlangan",
   "Suyuqlik: Yonuvchan suyuqliklar taqiqlangan",
   "Oziq-ovqat: Cheklangan",
   "Brend/kontrafakt: Kontrafakt/IP buzuvchi tovarlar taqiqlangan",
   "Boshqa muhim cheklovlar: Qurol, xavfli va tez alangalanadigan moddalar va boshqalar"
  ],
  "svc": [
   "Konsolidatsiya: Mavjud (omborga qarab)",
   "Qayta qadoqlash: Mavjud (omborga qarab)",
   "Foto/tekshiruv: Mavjud",
   "Sug'urta: Qo'shimcha sug'urta 2.5%",
   "Return/Refundga yordam: Mavjud (omborga qarab)",
   "Buy for me: Mavjud",
   "Door delivery UZ: Mavjud (yo'nalishga bog'liq)",
   "Bepul saqlash: AQSh 28 kun; ko'p Yevropa omborlarida 14 kun",
   "Tracking: Mavjud",
   "Marketplace mosligi: AQSh va Yevropa internet-do'konlari"
  ]
 },
 {
  "id": "meestchina",
  "name": "MeestChina",
  "days": "8 kundan boshlab",
  "dnum": 8,
  "mode": "avia · avto",
  "countries": "Xitoy, Koreya",
  "tracking": true,
  "trusted": false,
  "note": "Xitoy va Koreya yo'nalishlari; O'zbekiston bo'ylab kuryer yetkazishi tarifga kiritilgan.",
  "updated": "15.08.2026",
  "limits": [
   "Batareya/Powerbank: ZTO bepul pickup xizmatida taqiqlangan",
   "Suyuqlik: ZTO bepul pickup xizmatida taqiqlangan",
   "Boshqa muhim cheklovlar: Magnit, mo'rt tovar, yondirgich, pichoq, yonuvchan/portlovchi moddalar ZTO pickupda qabul qilinmaydi"
  ],
  "svc": [
   "Konsolidatsiya: Tekshirish + birlashtirish $0.7/kg",
   "Qayta qadoqlash: Mavjud",
   "Foto/tekshiruv: $1.5/lot batafsil foto; avtomatik foto bepul",
   "Sug'urta: Standart $100gacha; qo'shimcha 2.5%",
   "Return/Refundga yordam: Xitoyga qaytarish — pullik",
   "Buy for me: Mavjud (Meest China Shop)",
   "Door delivery UZ: Mavjud; tarifga kiritilgan",
   "Tracking: Mavjud",
   "Marketplace mosligi: Taobao, 1688, Tmall va Xitoy marketplace'lari"
  ]
 },
 {
  "id": "ethnologistics",
  "name": "Ethno logistics",
  "days": "3–5 ish kuni",
  "dnum": 3,
  "mode": "avia · avto",
  "countries": "Qirg'iziston, Tojikiston, Qozog'iston, Rossiya, BAA, Turkiya",
  "tracking": true,
  "trusted": true,
  "note": "Original fayldagi ethno.uz o'rniga 2026-yil tariflari uz.ethnologistics.com domenida topildi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Qayta qadoqlash: Mavjud qadoqlash",
   "Foto/tekshiruv: Mavjud foto-hisobot",
   "Buy for me: ETHNO Buyer: Rossiya/Turkiya",
   "Door delivery UZ: Mavjud (hududlarga ham)",
   "Tracking: Mavjud",
   "Marketplace mosligi: Rossiya va Turkiya onlayn-do'konlari"
  ]
 },
 {
  "id": "tezparcel",
  "name": "TEZ PARCEL",
  "days": "7–14 ish kuni",
  "dnum": 7,
  "mode": "avia",
  "countries": "Angliya, AQSh, Germaniya",
  "tracking": true,
  "trusted": true,
  "note": "Angliya bo'yicha tarif va muddat topildi; AQSh va Germaniya aniq joriy tarifi rasmiy sahifada topilmadi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Buy for me: Buyout xizmati mavjud",
   "Door delivery UZ: Viloyatlarga ham yetkazish",
   "Tracking: Mavjud",
   "Marketplace mosligi: Xorijiy internet-do'konlari"
  ]
 },
 {
  "id": "abuexpress",
  "name": "ABU EXPRESS",
  "days": "7–10 kun",
  "dnum": 7,
  "mode": "avia",
  "countries": "AQSh, Turkiya",
  "tracking": true,
  "trusted": false,
  "note": "Original abugroupmanagement.com o'rniga ABU Expressning amaldagi sayti sifatida abuexpress.uz topildi. Joriy kg tarifi ochiq ko'rsatilmagan.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Qayta qadoqlash: Xavfsiz qadoqlash ko'rsatilgan",
   "Buy for me: Mavjud: shopping/order assistance",
   "Door delivery UZ: Mavjud, sayt «free home delivery» deydi",
   "Tracking: Mavjud",
   "Marketplace mosligi: AQSh/Turkiya xaridlari"
  ]
 },
 {
  "id": "silkroad",
  "name": "SILK ROAD",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia",
  "countries": "AQSh",
  "tracking": false,
  "trusted": false,
  "note": "Original faylda rasmiy sayt ko'rsatilmagan.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": []
 },
 {
  "id": "spacexpress",
  "name": "SPACEXPRESS",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia · avto",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": false,
  "note": "Avia/avto/multimodal/temiryo'l xizmatlari, konsolidatsiya va qadoqlash topildi; ommaviy kg tarifi topilmadi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Konsolidatsiya: Mavjud",
   "Qayta qadoqlash: Mavjud",
   "Sug'urta: Mavjud (multimodal yukda)",
   "Door delivery UZ: Mavjud door-to-door",
   "Bepul saqlash: Mavjud; bepul muddat Topilmadi",
   "Tracking: Mavjud",
   "Marketplace mosligi: B2B/cargo, Xitoy va Yevropa"
  ]
 },
 {
  "id": "yellowpochta",
  "name": "YELLOW POCHTA",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia",
  "countries": "AQSh",
  "tracking": false,
  "trusted": false,
  "note": "Tarif sahifasi JavaScript talab qilgani sababli ochiq matndan tarif va xizmat tafsilotlari tekshirib bo'lmadi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": []
 },
 {
  "id": "globbing",
  "name": "GLOBBING",
  "days": "5–10 ish kuni",
  "dnum": 5,
  "mode": "avia",
  "countries": "AQSh, Xitoy, Angliya, Germaniya, Italiya, Ispaniya",
  "tracking": true,
  "trusted": false,
  "note": "Original faylda iOS va Android havolalari o'zaro almashib qolgan; V2 da tuzatildi. iOS/Android havolalari tuzatildi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Buy for me: Mavjud: Buy for me",
   "Door delivery UZ: Mavjud",
   "Tracking: Mavjud",
   "Marketplace mosligi: AQSh, Xitoy va Yevropa do'konlari"
  ]
 },
 {
  "id": "teztezdelivery",
  "name": "Tez-Tez delivery",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia · avto",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": false,
  "note": "Tracking topildi; joriy ochiq tarif va yetkazish muddati saytda topilmadi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Tracking: Mavjud"
  ]
 },
 {
  "id": "smartpostus",
  "name": "Smart Post US",
  "days": "3–7 ish kuni",
  "dnum": 3,
  "mode": "avia",
  "countries": "AQSh",
  "tracking": false,
  "trusted": false,
  "note": "Minimum 5 kg, hajmiy vazn formulasi, konsolidatsiya, AQSh omborlari va 3–7 ish kunlik express yetkazish topildi; joriy $/kg tarifi topilmadi.",
  "updated": "15.08.2026",
  "limits": [
   "Parfyum: Cheklangan: sayt O'zbekiston uchun 3 flakon/300 ml normani tilga oladi",
   "Boshqa muhim cheklovlar: Dori/medtexnika, dual-use, yonuvchan va litsenziyalanadigan tovarlar taqiqlangan/cheklangan"
  ],
  "svc": [
   "Konsolidatsiya: Mavjud",
   "Buy for me: AQSh shopping xizmati ko'rsatilgan",
   "Door delivery UZ: Mavjud, 3–7 ish kuni express",
   "Marketplace mosligi: AQSh internet-do'konlari"
  ]
 },
 {
  "id": "cpost",
  "name": "CPOST",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia",
  "countries": "Xitoy",
  "tracking": false,
  "trusted": false,
  "note": "Original faylda rasmiy sayt ko'rsatilmagan.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": []
 },
 {
  "id": "yumecs",
  "name": "YUMECS",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia",
  "countries": "Rossiya, Turkiya, Xitoy, Koreya, BAA, Malayziya",
  "tracking": false,
  "trusted": false,
  "note": "Tekshiruvda sayt 502 xatolik qaytardi. Qidiruvda yumecs.pro domeni ham uchradi, biroq u ham ochilmadi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": []
 },
 {
  "id": "d2d",
  "name": "D2D",
  "days": "4–7 kun",
  "dnum": 4,
  "mode": "avia · avto",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": false,
  "note": "Avia/avto tariflari, muddatlar, filial/manzilgacha yetkazish va tovar cheklovlari rasmiy saytda batafsil berilgan.",
  "updated": "15.08.2026",
  "limits": [
   "Telefon: Taqiqlangan",
   "Batareya/Powerbank: Powerbank va batareyasi asosiy qism bo'lgan mahsulotlar faqat Avto",
   "Parfyum: Faqat Avto",
   "Suyuqlik: Yonuvchan suyuqliklar faqat Avto",
   "Oziq-ovqat: Taqiqlangan",
   "Boshqa muhim cheklovlar: Kompyuter, planshet/iPad, TV, o'simlik/urug', dori/medtexnika, dron, qurol, pirotexnika, tirik hayvon, tilla, kukun va boshqalar taqiqlangan"
  ],
  "svc": [
   "Sug'urta: Topilmadi (yo'qolish/zarar uchun javobgarlik bor)",
   "Door delivery UZ: Viloyat filiallarigacha bepul; Toshkent >5kg manzilgacha bepul",
   "Tracking: Real-time + Telegram bot",
   "Marketplace mosligi: Xitoy marketplace'lari"
  ]
 },
 {
  "id": "humodelivery",
  "name": "HUMO DELIVERY",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia · avto",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": false,
  "note": "Asosiy humodelivery.uz sahifasini tekshirishda ma'lumot olinmadi; hmtrack.uz da Humo Delivery tracking tizimi topildi.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Tracking: Mavjud (hmtrack.uz)"
  ]
 },
 {
  "id": "wikishopus",
  "name": "WIKISHOP.US",
  "days": "5–7 ish kuni",
  "dnum": 5,
  "mode": "avia",
  "countries": "AQSh",
  "tracking": true,
  "trusted": false,
  "note": "2026 QUICK va Avia UZ tariflari, konsolidatsiya, repacking, foto, return, saqlash va AQSh ombori rasmiy saytda ko'rsatilgan.",
  "updated": "15.08.2026",
  "limits": [],
  "svc": [
   "Konsolidatsiya: Bepul",
   "Qayta qadoqlash: $10 (kafolatlanmaydi)",
   "Foto/tekshiruv: $3 gacha 3 foto; video $5",
   "Return/Refundga yordam: $8 + lokal kuryer tarifi",
   "Buy for me: Mavjud, 10%",
   "Door delivery UZ: Toshkent/O'zbekiston $3/posilka (aksiya)",
   "Bepul saqlash: 28 kun bepul, keyin $1/kun",
   "Tracking: Mavjud",
   "Marketplace mosligi: Amazon, 6pm, Carters, Gap, Victoria's Secret, B&H, eBay, Apple, Walmart, H&M, Zara, Tommy Hilfiger"
  ]
 },
 {
  "id": "greenpost",
  "name": "GREEN POST",
  "days": "7–10 kun",
  "dnum": 7,
  "mode": "avia",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": true,
  "note": "7–10 kun Xitoy–Toshkent va O'zbekistonda 1–3 kun, konsolidatsiya/tekshiruv/fotohisobot topildi; joriy rasmiy kg tarifi ochiq matnda topilmadi.",
  "updated": "15.08.2026",
  "limits": [
   "Boshqa muhim cheklovlar: Saytda tashish qoidalari bo'limi mavjud; yo'nalish sahifasida kategoriya bo'yicha to'liq ro'yxat olinmadi"
  ],
  "svc": [
   "Konsolidatsiya: Mavjud",
   "Qayta qadoqlash: Mavjud (konsolidatsiyada qadoq optimallashtiriladi)",
   "Foto/tekshiruv: Tekshiruv; batafsil tekshiruv + 5 tagacha foto",
   "Return/Refundga yordam: Nomuvofiq/brak bo'lsa qaytarishga yordam",
   "Buy for me: Taobao/Tmall/1688 uchun xarid xizmati",
   "Door delivery UZ: O'zbekiston bo'ylab 1–3 kun",
   "Tracking: Mavjud",
   "Marketplace mosligi: Taobao, Tmall, 1688"
  ]
 },
 {
  "id": "boxette",
  "name": "BOXETTE",
  "days": "3–9 ish kuni",
  "dnum": 3,
  "mode": "avia · avto",
  "countries": "AQSh, Turkiya",
  "tracking": true,
  "trusted": false,
  "note": "AQSh Express/Economy va Turkiya Economy tariflari 2026-yil saytida yangilangan.",
  "updated": "15.08.2026",
  "limits": [
   "Telefon: Mavjud: smartfon va elektronika tashilishi mumkinligi misollarda ko'rsatilgan",
   "Kosmetika: Mavjud bo'lishi mumkin; personal care misol qilingan",
   "Oziq-ovqat: Vitamin/supplement misol qilingan",
   "Boshqa muhim cheklovlar: Yakuniy ruxsat mahsulot kategoriyasi va bojxona talabiga bog'liq"
  ],
  "svc": [
   "Qayta qadoqlash: Qo'shimcha qadoqlash mavjud",
   "Foto/tekshiruv: Posilkani tekshirish mavjud",
   "Buy for me: Mavjud, 10% (min $5)",
   "Door delivery UZ: Mavjud, pullik",
   "Bepul saqlash: Omborda saqlash bor; bepul muddat Topilmadi",
   "Tracking: Mavjud",
   "Marketplace mosligi: AQSh/Turkiya; Walmart, eBay va boshqa do'konlar"
  ]
 },
 {
  "id": "ase",
  "name": "ASE",
  "days": "2–3 ish kuni",
  "dnum": 2,
  "mode": "avia",
  "countries": "Turkiya",
  "tracking": false,
  "trusted": false,
  "note": "Istanbul–Toshkent 2–3 ish kuni, hajmiy vazn /5000, 10% xaridga yordam va taqiqlar tekshirildi. Tarif sahifasi robots sabab ochilmadi.",
  "updated": "15.08.2026",
  "limits": [
   "Batareya/Powerbank: Alohida lithium/lithium-ion/metal batareyalar taqiqlangan",
   "Parfyum: Taqiqlangan",
   "Suyuqlik: Alkogolli/yonuvchan suyuqlik va aerozollar taqiqlangan",
   "Brend/kontrafakt: Kontrafakt/pirat mahsulotlar taqiqlangan",
   "Boshqa muhim cheklovlar: Qurol, valyuta, qimmatbaho buyumlar, madaniy boylik, tirik organizm, dori/medtexnika, xavfli moddalar, alkogol, tamaki va boshqalar"
  ],
  "svc": [
   "Buy for me: Mavjud, 10%",
   "Door delivery UZ: Hududlarga hamkorlar orqali",
   "Marketplace mosligi: Turkiya internet-do'konlari"
  ]
 },
 {
  "id": "janapost",
  "name": "Jana post",
  "days": "muddat e'lon qilinmagan",
  "dnum": 99,
  "mode": "avia",
  "countries": "Xitoy",
  "tracking": true,
  "trusted": false,
  "note": "Marketplace jo'natmalari, filial/kuryer orqali olish va tracking tasdiqlandi; Xitoydan 6.10 USD/kg joriy tarifi ochiq tarif sahifasida topilmadi.",
  "updated": "15.08.2026",
  "limits": [
   "Suyuqlik: Yonuvchan suyuqliklar taqiqlangan",
   "Oziq-ovqat: Taqiqlangan",
   "Brend/kontrafakt: Mualliflik huquqi bilan himoyalangan noqonuniy tovarlar taqiqlangan",
   "Boshqa muhim cheklovlar: Qurol/portlovchi, alkogol, aerozol, dorilar, radioaktiv, hayvon/o'simlik, oksidlovchi, toksik/infeksion, tamaki, maishiy kimyo va boshqalar"
  ],
  "svc": [
   "Door delivery UZ: Filial yoki kuryer",
   "Tracking: Mavjud",
   "Marketplace mosligi: Marketplace jo'natmalarini qabul qiladi"
  ]
 }
];
export const STORES = [
 {
  "id": "taobao",
  "name": "Taobao",
  "domain": "taobao.com",
  "url": "https://www.taobao.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "universal",
  "subcats": "Xitoy ichki bozori, moda, uy, aksessuarlar",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "Murakkab / VPN orqali ishlaydi",
  "tags": [
   "universal",
   "arzon",
   "vositachi kerak"
  ],
  "forWhom": "Xitoydan keng tanlov va past narx izlaydiganlar",
  "returns": "Ko'p eligible mahsulotlarda 7 kunlik sababsiz qaytarish mavjud. Odatda buyer return shippingni to'laydi; forwarding omboriga yetib kelgan sana muddat hisobiga ta'sir qilishi mumkin."
 },
 {
  "id": "amazon",
  "name": "Amazon",
  "domain": "amazon.com",
  "url": "https://www.amazon.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Germaniya",
   "Angliya"
  ],
  "cat": "universal",
  "subcats": "Elektronika, moda, uy-ro'zg'or va boshqalar",
  "type": "Marketplace",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "universal",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Turli toifadagi mahsulotlarni bir joydan izlaydiganlar",
  "returns": "Ko'pchilik mahsulotlarda 30 kunlik qaytarish mavjud. Mahsulot/sotuvchiga qarab istisnolar bor; xalqaro qaytarishda yetkazish xarajati refunddan ushlab qolinishi mumkin."
 },
 {
  "id": "pinduoduo",
  "name": "Pinduoduo",
  "domain": "pinduoduo.com",
  "url": "https://www.pinduoduo.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "universal",
  "subcats": "Kiyim, elektronika, uy-ro'zg'or, kundalik tovarlar va boshqa kategoriyalar",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "Murakkab / VPN orqali ishlaydi",
  "tags": [
   "universal",
   "arzon",
   "vositachi kerak"
  ],
  "forWhom": "Eng arzon narx va Xitoy ichki bozoridagi ommaviy mahsulotlarni izlaydiganlar",
  "returns": "Official help centerda return/refund va 7 kunlik sababsiz return mexanizmlari mavjud. Eligibility mahsulot kategoriyasi va seller/after-sales qoidalariga bog'liq."
 },
 {
  "id": "trendyol",
  "name": "Trendyol",
  "domain": "trendyol.com",
  "url": "https://www.trendyol.com",
  "country": "Turkiya",
  "from": [
   "Turkiya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Moda, kosmetika, uy va boshqa tovarlar",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kiyim va moda",
   "arzon",
   "vositachi kerak"
  ],
  "forWhom": "Turkiyadan kiyim va turli mahsulot oluvchilar",
  "returns": "Global xizmatda odatda 14 kunlik return; eligible buyurtmalarda bepul return imkoniyati mavjud. Marketplace sabab ayrim mahsulot/seller shartlari farqlanadi."
 },
 {
  "id": "shein",
  "name": "SHEIN",
  "domain": "shein.com",
  "url": "https://www.shein.com",
  "country": "Xitoy",
  "from": [
   "Xitoy",
   "Turkiya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Trend kiyim, aksessuarlar va uy mahsulotlari",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "O'rtacha",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "kiyim va moda",
   "arzon",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Byudjet moda xaridorlari",
  "returns": "Ko'p bozorlarda eligible mahsulotlar uchun 30 kun atrofida return. Birinchi return ayrim regionlarda bepul, keyingi returnlar uchun fee bo'lishi mumkin; kategoriya istisnolari mavjud."
 },
 {
  "id": "carters",
  "name": "Carter's",
  "domain": "carters.com",
  "url": "https://www.carters.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "bolalar",
  "subcats": "Bolalar va chaqaloqlar kiyimi",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Bolalar kiyimi xaridorlari",
  "returns": "AQShda ko'p yangi/unworn mahsulotlar receipt bilan 90 kun ichida return qilinadi; boshqa bozorlarda muddat ancha qisqaroq bo'lishi mumkin."
 },
 {
  "id": "mytheresa",
  "name": "Mytheresa",
  "domain": "mytheresa.com",
  "url": "https://www.mytheresa.com",
  "country": "Germaniya",
  "from": [
   "Germaniya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Designer moda va aksessuarlar",
  "type": "Premium / Luxury",
  "price": "$$$$",
  "segment": "Premium",
  "original": "Yuqori",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "kiyim va moda",
   "premium",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Premium moda xaridorlari",
  "returns": "Ko'p bozorlarda 30 kunlik bepul return; mahsulot original holatda, tag va packaging bilan bo'lishi shart. Refund qaytgan mahsulot tekshirilgach amalga oshiriladi."
 },
 {
  "id": "tmall",
  "name": "Tmall",
  "domain": "tmall.com",
  "url": "https://www.tmall.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "universal",
  "subcats": "Brendlar va rasmiy sotuvchilar",
  "type": "Marketplace",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "Murakkab",
  "tags": [
   "universal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Xitoy bozorida brend mahsulot izlaydiganlar",
  "returns": "Eligible mahsulotlarda 7 kunlik sababsiz return. Fikr o'zgargan holatda return shipping odatda buyer zimmasida; sifat muammosi yoki tavsifga nomuvofiqlikda seller xarajatni qoplaydi."
 },
 {
  "id": "farfetch",
  "name": "Farfetch",
  "domain": "farfetch.com",
  "url": "https://www.farfetch.com",
  "country": "Angliya",
  "from": [
   "Angliya",
   "Germaniya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Designer kiyim, poyabzal va aksessuarlar",
  "type": "Premium / Luxury",
  "price": "$$$$",
  "segment": "Premium",
  "original": "Yuqori",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "kiyim va moda",
   "premium",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Premium va designer moda xaridorlari",
  "returns": "Odatda 30 kun ichida return; mahsulot kiyilmagan, teg va original packaging bilan bo'lishi kerak. Ko'p bozorlarda return collection tashkil qilinadi."
 },
 {
  "id": "ebay",
  "name": "eBay",
  "domain": "ebay.com",
  "url": "https://www.ebay.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya",
   "Germaniya"
  ],
  "cat": "universal",
  "subcats": "Yangi, ishlatilgan va kolleksiya tovarlari",
  "type": "Marketplace",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "universal",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Noyob yoki ishlatilgan mahsulot izlaydiganlar",
  "returns": "Qaytarish muddati va sharti sotuvchiga bog'liq. Tovar tavsifga mos kelmasa yoki nuqsonli bo'lsa, eBay Money Back Guarantee doirasida refund talab qilish mumkin."
 },
 {
  "id": "poizon",
  "name": "POIZON / DEWU",
  "domain": "poizon.com",
  "url": "https://www.poizon.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "poyabzal",
  "subcats": "Sneaker, streetwear, premium moda, aksessuarlar va kolleksiya mahsulotlari",
  "type": "Marketplace",
  "price": "$$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha / VPN orqali ishlaydi",
  "tags": [
   "poyabzal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Original sneaker, streetwear va premium moda mahsulotlarini izlaydiganlar",
  "returns": "POIZON xalqaro siyosatida ko'p mahsulotlarda delivery'dan keyin 15 kun ichida return request; underwear/swimwear istisno. Refunddan return shipping ushlab qolinadi."
 },
 {
  "id": "walmart",
  "name": "Walmart",
  "domain": "walmart.com",
  "url": "https://www.walmart.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "universal",
  "subcats": "Kundalik tovarlar, elektronika, uy-ro'zg'or",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "universal",
   "arzon",
   "vositachi kerak"
  ],
  "forWhom": "AQSh bozoridan kundalik mahsulot oluvchilar",
  "returns": "Walmart sotadigan ko'p mahsulotlarda 90 kungacha return mavjud; Marketplace va elektronika uchun muddat odatda qisqaroq. Mahsulot kategoriyasiga qarab istisnolar mavjud."
 },
 {
  "id": "jomashop",
  "name": "Jomashop",
  "domain": "jomashop.com",
  "url": "https://www.jomashop.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "kiyim va moda",
  "subcats": "Luxury soatlar, sumkalar, atirlar, ko'zoynak, zargarlik va aksessuarlar",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Chegirma",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kiyim va moda",
   "chegirma",
   "vositachi kerak"
  ],
  "forWhom": "Original luxury soat, sumka va aksessuarlarni rasmiy retail narxidan arzonroq izlaydiganlar",
  "returns": "Yangi mahsulotlar 30 kun, pre-owned mahsulotlar 14 kun ichida qaytarilishi mumkin. RMA talab qilinadi; return shipping xaridor zimmasida va dastlabki shipping xarajati refunddan ushlab qolinadi. Xalqaro buyurtmalarda duties/VAT Jomashop orqali qaytarilmaydi. $7,000+ yoki special-order mahsulotlarda 8% restocking fee yoki final-sale sharti bo'lishi mumkin."
 },
 {
  "id": "aliexpress",
  "name": "AliExpress",
  "domain": "aliexpress.com",
  "url": "https://www.aliexpress.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "universal",
  "subcats": "Elektronika, moda, uy, aksessuarlar",
  "type": "Marketplace",
  "price": "$",
  "segment": "Arzon",
  "original": "Sotuvchiga bog'liq",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "universal",
   "arzon",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Arzon va turli mahsulot izlaydiganlar",
  "returns": "“Free Return” belgili mahsulotlarda odatda qabul qilinganidan keyin 15 kun ichida sababsiz return ochish mumkin. Boshqa holatlar dispute va seller siyosatiga bog'liq."
 },
 {
  "id": "zara",
  "name": "Zara",
  "domain": "zara.com",
  "url": "https://www.zara.com",
  "country": "Turkiya",
  "from": [
   "Turkiya",
   "Germaniya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Kiyim, poyabzal, aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": true,
  "complexity": "O'rtacha",
  "tags": [
   "kiyim va moda",
   "original",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Zara kolleksiyalarini original xarid qiluvchilar",
  "returns": "Ko'p bozorlarda jo'natilgan sanadan boshlab 30 kun atrofida return; mahsulot yangi holatda, teglar bilan va xarid qilingan bozor/region doirasida qaytariladi."
 },
 {
  "id": "nike",
  "name": "Nike",
  "domain": "nike.com",
  "url": "https://www.nike.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya",
   "Turkiya"
  ],
  "cat": "poyabzal",
  "subcats": "Sport poyabzali, kiyim va aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "Murakkab",
  "tags": [
   "poyabzal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Original Nike mahsulot izlaydiganlar",
  "returns": "AQShda ko'p Nike xaridlarida 60 kunlik return; boshqa bozorlarda muddat farq qiladi. Special/final-sale mahsulotlarga alohida shartlar qo'llanadi."
 },
 {
  "id": "hm",
  "name": "H&M",
  "domain": "hm.com",
  "url": "https://www.hm.com",
  "country": "Turkiya",
  "from": [
   "Turkiya",
   "Germaniya",
   "AQSh"
  ],
  "cat": "kiyim va moda",
  "subcats": "Kiyim va aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$",
  "segment": "Arzon",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kiyim va moda",
   "arzon",
   "vositachi kerak"
  ],
  "forWhom": "Kundalik kiyim izlaydiganlar",
  "returns": "Ko'p bozorlarda 30 kunlik return. Ayrim mamlakatlarda pochta orqali return uchun label fee undiriladi; dastlabki shipping/handling har doim ham refund qilinmaydi."
 },
 {
  "id": "noon",
  "name": "Noon",
  "domain": "noon.com",
  "url": "https://www.noon.com",
  "country": "BAA",
  "from": [
   "BAA"
  ],
  "cat": "universal",
  "subcats": "Elektronika, moda, uy-ro'zg'or",
  "type": "Marketplace",
  "price": "$$",
  "segment": "Universal",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "universal",
   "universal",
   "vositachi kerak"
  ],
  "forWhom": "BAA bozoridan turli mahsulot xarid qiluvchilar",
  "returns": "Ko'p eligible mahsulotlarda 15 kun ichida return; ayrim refurbished/kategoriyalarda qisqaroq muddat yoki cheklovlar mavjud. Wrong/damaged/not-as-described holatlar refundga asos bo'ladi."
 },
 {
  "id": "adidas",
  "name": "Adidas",
  "domain": "adidas.com",
  "url": "https://www.adidas.com",
  "country": "Germaniya",
  "from": [
   "Germaniya",
   "AQSh",
   "Turkiya"
  ],
  "cat": "poyabzal",
  "subcats": "Sport poyabzali va kiyim",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "poyabzal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Original Adidas mahsulot izlaydiganlar",
  "returns": "AQShda ko'p mahsulotlar 30 kun ichida return qilinadi. Mahsulot original holatda bo'lishi kerak; hype/final-sale va ayrim maxsus mahsulotlarda cheklovlar mavjud."
 },
 {
  "id": "puma",
  "name": "Puma",
  "domain": "puma.com",
  "url": "https://www.puma.com",
  "country": "Germaniya",
  "from": [
   "Germaniya",
   "AQSh"
  ],
  "cat": "poyabzal",
  "subcats": "Sport va lifestyle poyabzal",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "poyabzal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Puma brendi xaridorlari",
  "returns": "AQShda odatda 45 kunlik return; mahsulot original holatda bo'lishi kerak. Refund original paymentga qaytariladi, processing bir necha ish kuni/hafta olishi mumkin."
 },
 {
  "id": "uniqlo",
  "name": "Uniqlo",
  "domain": "uniqlo.com",
  "url": "https://www.uniqlo.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Basic kiyim va funksional kolleksiyalar",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kiyim va moda",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Sifatli basic kiyim izlaydiganlar",
  "returns": "Ko'p bozorlarda taxminan 30 kunlik return; mahsulot yuvilmagan/kiyilmagan bo'lishi kerak. Ayrim bozorlarda return-label fee va yetkazish haqining qaytmasligi mavjud."
 },
 {
  "id": "newbalance",
  "name": "New Balance",
  "domain": "newbalance.com",
  "url": "https://www.newbalance.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya"
  ],
  "cat": "poyabzal",
  "subcats": "Krossovka va sport kiyimi",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "poyabzal",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "New Balance modellari izlovchilar",
  "returns": "AQShda odatda 45 kunlik return. Ayrim online returnlarda non-member uchun restocking/return fee mavjud; final-sale mahsulotlar istisno."
 },
 {
  "id": "footlocker",
  "name": "Foot Locker",
  "domain": "footlocker.com",
  "url": "https://www.footlocker.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya"
  ],
  "cat": "poyabzal",
  "subcats": "Sneaker va sport brendlari",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "poyabzal",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Turli sneaker brendlarini solishtiruvchilar",
  "returns": "AQShda odatda 45 kun ichida yangi holatdagi mahsulot return qilinadi. Ayrim mijozlar uchun pochta return fee mavjud; refund processing bir necha kun/hafta."
 },
 {
  "id": "jdsports",
  "name": "JD Sports",
  "domain": "jdsports.com",
  "url": "https://www.jdsports.com",
  "country": "Angliya",
  "from": [
   "Angliya",
   "AQSh"
  ],
  "cat": "poyabzal",
  "subcats": "Sneaker, streetwear va sport",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "Oson",
  "tags": [
   "poyabzal",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Sport va streetwear xaridorlari",
  "returns": "Global/ayrim bozorlarda online xaridlar uchun taxminan 14 kunlik return; refund original paymentga. Ayrim kanallarda online exchange emas, faqat return+qayta buyurtma."
 },
 {
  "id": "bestbuy",
  "name": "Best Buy",
  "domain": "bestbuy.com",
  "url": "https://www.bestbuy.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "elektronika",
  "subcats": "Consumer electronics va maishiy texnika",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "AQShdan elektronika xarid qiluvchilar",
  "returns": "Standard mijozlarda ko'p mahsulotlar uchun return oynasi taxminan 15 kun; membership darajasiga qarab uzayishi mumkin. Marketplace seller mahsulotlarida alohida shartlar mavjud."
 },
 {
  "id": "newegg",
  "name": "Newegg",
  "domain": "newegg.com",
  "url": "https://www.newegg.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "elektronika",
  "subcats": "PC, komponentlar va elektronika",
  "type": "Marketplace",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Sotuvchiga bog'liq",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "PC yig'uvchi va texnika xaridorlari",
  "returns": "Ko'p mahsulotlarda 30 kun atrofidagi return/refund yoki replacement oynasi mavjud; product va Marketplace seller siyosatiga qarab farq qiladi."
 },
 {
  "id": "bhphoto",
  "name": "B&H Photo",
  "domain": "bhphotovideo.com",
  "url": "https://www.bhphotovideo.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "elektronika",
  "subcats": "Kamera, audio, kompyuter, professional texnika",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "Oson",
  "tags": [
   "elektronika",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Foto-video va professional texnika xaridorlari",
  "returns": "Ko'p mahsulotlar 30 kun ichida return qilinadi; maxsus/non-returnable kategoriyalar mavjud. Xalqaro buyurtmada shipping, customs va import xarajatlari ko'pincha qaytarilmaydi."
 },
 {
  "id": "asos",
  "name": "ASOS",
  "domain": "asos.com",
  "url": "https://www.asos.com",
  "country": "Angliya",
  "from": [
   "Angliya"
  ],
  "cat": "kiyim va moda",
  "subcats": "Kiyim, poyabzal, aksessuarlar",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "kiyim va moda",
   "katta assortiment",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Moda va turli brendlarni bir joyda izlaydiganlar",
  "returns": "Odatda 28 kun ichida return. Mahsulot original holatda bo'lishi kerak; refund tekshiruvdan keyin amalga oshiriladi. Fair-use qoidalari va ayrim return fee holatlari mavjud."
 },
 {
  "id": "microcenter",
  "name": "Micro Center",
  "domain": "microcenter.com",
  "url": "https://www.microcenter.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "elektronika",
  "subcats": "PC komponentlari va kompyuter texnikasi",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Kompyuter yig'ish uchun detal izlaydiganlar",
  "returns": "Ko'p mahsulotlar 30 kun, ammo kompyuter, CPU, motherboard, kamera va ayrim elektronika uchun qisqaroq return oynasi qo'llanishi mumkin."
 },
 {
  "id": "apple",
  "name": "Apple Store",
  "domain": "apple.com",
  "url": "https://www.apple.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Angliya",
   "Germaniya"
  ],
  "cat": "elektronika",
  "subcats": "iPhone, Mac, iPad va aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Apple mahsulotlarini rasmiy manbadan oluvchilar",
  "returns": "Apple'dan to'g'ridan-to'g'ri olingan ko'p mahsulotlar AQShda 14 kalendar kun ichida return qilinadi; mamlakatlar bo'yicha muddat va huquqlar farq qiladi."
 },
 {
  "id": "samsung",
  "name": "Samsung Store",
  "domain": "samsung.com",
  "url": "https://www.samsung.com",
  "country": "AQSh",
  "from": [
   "AQSh",
   "Koreya"
  ],
  "cat": "elektronika",
  "subcats": "Smartfon, TV, maishiy elektronika",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Samsung texnikasi xaridorlari",
  "returns": "Ko'p bozorlarda 14–15 kun atrofida return oynasi; requestdan keyin mahsulotni belgilangan muddatda jo'natish va inspection talab qilinadi."
 },
 {
  "id": "xiaomi",
  "name": "Xiaomi",
  "domain": "mi.com",
  "url": "https://www.mi.com",
  "country": "Xitoy",
  "from": [
   "Xitoy"
  ],
  "cat": "elektronika",
  "subcats": "Smartfon, gadget va smart-home",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Xiaomi gadgetlarini izlaydiganlar",
  "returns": "Return muddati mamlakatga qarab farq qiladi; odatda 7–14 kunlik change-of-mind va nuqsonlar uchun uzoqroq repair/replacement/refund huquqlari mavjud."
 },
 {
  "id": "lenovo",
  "name": "Lenovo",
  "domain": "lenovo.com",
  "url": "https://www.lenovo.com",
  "country": "Xitoy",
  "from": [
   "Xitoy",
   "AQSh"
  ],
  "cat": "elektronika",
  "subcats": "Noutbuk, PC va aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "elektronika",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "Noutbuk va PC xaridorlari",
  "returns": "AQShda ko'p yangi mahsulotlar uchun 30 kunlik return; Outlet odatda qisqaroq, ayrim business/PRO dasturlarida uzunroq muddat bo'lishi mumkin."
 },
 {
  "id": "sephora",
  "name": "Sephora",
  "domain": "sephora.com",
  "url": "https://www.sephora.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "kosmetika",
  "subcats": "Kosmetika, parfyumeriya va skincare",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Premium",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kosmetika",
   "premium",
   "vositachi kerak"
  ],
  "forWhom": "Premium kosmetika xaridorlari",
  "returns": "AQShda ko'p yangi yoki yengil ishlatilgan mahsulotlar 30 kun ichida original paymentga refund qilinadi; final-sale va ayrim mahsulotlar istisno."
 },
 {
  "id": "ulta",
  "name": "Ulta Beauty",
  "domain": "ulta.com",
  "url": "https://www.ulta.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "kosmetika",
  "subcats": "Mass-market va premium beauty",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "kosmetika",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Kosmetikani ko'p brend ichidan tanlaydiganlar",
  "returns": "Ko'p yangi yoki yengil ishlatilgan mahsulotlar 30 kun ichida original paymentga refund; 31–60 kun oralig'ida odatda merchandise credit. 60 kundan keyin refund yo'q."
 },
 {
  "id": "beautybay",
  "name": "Beauty Bay",
  "domain": "beautybay.com",
  "url": "https://www.beautybay.com",
  "country": "Angliya",
  "from": [
   "Angliya"
  ],
  "cat": "kosmetika",
  "subcats": "Kosmetika va skincare",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "Oson",
  "tags": [
   "kosmetika",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Trend kosmetika izlaydiganlar",
  "returns": "Eligible mahsulotlar odatda 30 kun ichida, unused/unopened va seal buzilmagan holatda qaytariladi. Refund return tekshirilgandan keyin qayta ishlanadi."
 },
 {
  "id": "lego",
  "name": "LEGO",
  "domain": "lego.com",
  "url": "https://www.lego.com",
  "country": "Angliya",
  "from": [
   "Angliya",
   "AQSh",
   "Germaniya"
  ],
  "cat": "bolalar",
  "subcats": "Konstruktor va kolleksiya setlari",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "original",
   "vositachi kerak"
  ],
  "forWhom": "LEGO va konstruktor xaridorlari",
  "returns": "Return muddati bozorga qarab farq qiladi: AQShda 90 kungacha, ayrim Yevropa/Osiyo bozorlarida qisqaroq. Eligible mahsulot original holatda bo'lishi kerak."
 },
 {
  "id": "hamleys",
  "name": "Hamleys",
  "domain": "hamleys.com",
  "url": "https://www.hamleys.com",
  "country": "Angliya",
  "from": [
   "Angliya"
  ],
  "cat": "bolalar",
  "subcats": "O'yinchoqlar va sovg'alar",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Premium",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "premium",
   "vositachi kerak"
  ],
  "forWhom": "Sifatli va sovg'abop o'yinchoq izlaydiganlar",
  "returns": "UK siyosatida unopened/unused mahsulotlarga 60 kungacha refund va ayrim holatlarda 90 kungacha exchange mavjud. Proof va original packaging talab qilinadi."
 },
 {
  "id": "victoriassecret",
  "name": "Victoria's Secret",
  "domain": "victoriassecret.com",
  "url": "https://www.victoriassecret.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "kiyim va moda",
  "subcats": "Ichki kiyim, lingerie, sleepwear, sport kiyimi, atir, body care va aksessuarlar",
  "type": "Rasmiy brend do'koni",
  "price": "$$",
  "segment": "Original",
  "original": "Yuqori",
  "direct": true,
  "complexity": "Oson",
  "tags": [
   "kiyim va moda",
   "original",
   "to'g'ridan-to'g'ri"
  ],
  "forWhom": "Original Victoria's Secret lingerie, sleepwear, PINK va fragrance mahsulotlarini xarid qiluvchilar",
  "returns": "Xalqaro buyurtmalar Global-e orqali 60 kun ichida qaytarilishi mumkin. Return shipping haqi manzilga qarab farq qiladi; xalqaro online returnlar odatda mahalliy Victoria's Secret do'konlarida qabul qilinmaydi."
 },
 {
  "id": "toysrus",
  "name": "Toys\"R\"Us",
  "domain": "toysrus.com",
  "url": "https://www.toysrus.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "bolalar",
  "subcats": "O'yinchoqlar, LEGO, qo'g'irchoqlar, action figures, learning toys, outdoor toys va baby mahsulotlar",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Bir joydan turli yoshdagi bolalar uchun mashhur brend o'yinchoqlarini izlaydiganlar",
  "returns": "Returnni mahsulot olinganidan keyin 30 kun ichida boshlash kerak; original packaging talab qilinadi. Approved refund original paymentga yoki ayrim holatlarda store credit shaklida berilishi mumkin."
 },
 {
  "id": "smythstoys",
  "name": "Smyths Toys",
  "domain": "smythstoys.com",
  "url": "https://www.smythstoys.com",
  "country": "Angliya",
  "from": [
   "Angliya"
  ],
  "cat": "bolalar",
  "subcats": "O'yinchoqlar, LEGO, gaming, outdoor, baby, nursery, bikes va electronic toys",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$",
  "segment": "Katta assortiment",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "katta assortiment",
   "vositachi kerak"
  ],
  "forWhom": "Yevropadan LEGO, gaming, bolalar va outdoor o'yinchoqlarini xarid qiluvchilar",
  "returns": "Ko'p bozorlarda unused va unopened mahsulotlar xariddan keyin 28 kun ichida qaytariladi; original packaging, receipt/order reference talab qilinadi. Opened software/games va ayrim nursery mahsulotlari istisno."
 },
 {
  "id": "faoschwarz",
  "name": "FAO Schwarz",
  "domain": "faoschwarz.com",
  "url": "https://faoschwarz.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "bolalar",
  "subcats": "Premium o'yinchoqlar, plush, dolls, ride-ons, collectibles, gifts va eksklyuziv mahsulotlar",
  "type": "Ixtisoslashgan do'kon",
  "price": "$$$",
  "segment": "Premium",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "premium",
   "vositachi kerak"
  ],
  "forWhom": "Premium, noodatiy va sovg'abop o'yinchoqlar hamda collectible izlaydiganlar",
  "returns": "Eligible mahsulotlar deliverydan keyin 30 kun ichida qaytariladi. Har bir return shipment uchun $10 fee olinadi; online buyurtmalarni storega qaytarib bo'lmaydi. Ayrim bulky/partner mahsulotlarda 10–20% restocking fee mavjud."
 },
 {
  "id": "mattel",
  "name": "Mattel Creations",
  "domain": "creations.mattel.com",
  "url": "https://creations.mattel.com",
  "country": "AQSh",
  "from": [
   "AQSh"
  ],
  "cat": "bolalar",
  "subcats": "Barbie Signature, Hot Wheels Collectors, Matchbox, Monster High, Masters of the Universe, action figures va limited-edition collectibles",
  "type": "Rasmiy brend do'koni",
  "price": "$$$",
  "segment": "Exclusive",
  "original": "Yuqori",
  "direct": false,
  "complexity": "O'rtacha",
  "tags": [
   "bolalar",
   "exclusive",
   "vositachi kerak"
  ],
  "forWhom": "Barbie, Hot Wheels, Monster High va Mattel limited-edition kolleksiyalarini izlaydigan kolleksionerlar",
  "returns": "AQSh buyurtmalarida original proof bilan receipt'dan keyin 30 kun ichida return mumkin; shipping va processing fee qaytarilmaydi. Xalqaro manzilga jo'natilgan buyurtmalar return uchun eligible emas."
 }
];
export const BANNED = [
 {
  "name": "Giyohvandlik vositalari, psixotrop moddalar va prekursorlar",
  "level": "red",
  "syn": "narkotik наркотик",
  "src": "VMQ 330-son, 1-band, 5–7-ilovalar",
  "note": "Bu moddalar muomalasi cheklangan, to'liq ro'yxatlar 5–7-ilovalarda keltirilgan. Shaxsiy tibbiy foydalanish istisnolari 191-son Nizomga muvofiq qo'llanadi."
 },
 {
  "name": "Fuqaroviy qurol va uning o'q-dorilari",
  "level": "amber",
  "syn": "pistolet pnevmatik пистолет пневматика оружие",
  "src": "O'RQ-550, 31–32-moddalar; VMQ 366-son",
  "note": "IIV ruxsatnomasi talab etiladi. Vaqtincha turgan chet el fuqarolari faqat ov va sport qurolini tegishli taklifnoma hamda ruxsatnoma bilan olib kirishi mumkin. Import ruxsatnomasi arizasi 10 ish kunida ko'riladi."
 },
 {
  "name": "Radioelektron vositalar va yuqori chastotali qurilmalar",
  "level": "amber",
  "syn": "ratsiya walkie talkie рация",
  "src": "VMQ 801-son 4-ilova; VMQ 417-son",
  "note": "EMMM ruxsatnomasi bilan olib kiriladi. Ro'yxatda ayrim telefoniya apparatlari, sun'iy yo'ldosh aloqa apparatlari, bazaviy stansiyalar, signal generatorlar va uchuvchisiz uchish apparatlari bor. REV uchun 7, YuChQ uchun 5 ish kuni; yig'im undirilmaydi."
 },
 {
  "name": "Diniy mazmundagi materiallar",
  "level": "amber",
  "src": "VMQ 180-son Nizom, 3, 9–12, 16–19, 27–30-bandlar",
  "note": "Ijobiy dinshunoslik ekspertizasi xulosasidan keyin olib kiriladi. Jismoniy shaxs o'z ehtiyoji va ilmiy-tadqiqot uchun har bir nomlanishdan 3 nusxadan oshmagan miqdorda olib kirishi mumkin. Ekspertiza odatda 10, zaruratda 20 ish kunigacha."
 },
 {
  "name": "Xulosasi va gologrammasi yo'q diniy materiallar",
  "level": "red",
  "src": "VMQ 180-son Nizom, 11-band",
  "note": "Ijobiy xulosa olinmagan va gologramma bilan tamg'alanmagan materiallarni hududga olib kirish, saqlash va realizatsiya qilish taqiqlanadi."
 },
 {
  "name": "Saqlanishi taqiqlangan yovvoyi hayvonlar",
  "level": "red",
  "src": "VMQ 736-son 1-ilova; VMQ 821-son",
  "note": "736-sonning 1-ilovasida zaharli va yirtqich hayvonlarning keng ro'yxati berilgan. Ushbu ro'yxatdagi hayvonlarni jismoniy shaxslar olib kirishi taqiqlanadi va ruxsatnoma berilmaydi."
 },
 {
  "name": "Mineral o'g'itlar va o'simlik himoya vositalari",
  "level": "amber",
  "src": "VMQ 481-son, 1-ilova 3–6, 9-bandlar; 2-ilova 5–8-bandlar",
  "note": "Agentlik ruxsatnomasi talab etiladi. O'z ehtiyoji uchun import qilgan shaxs faqat o'z yer maydonida foydalanishi mumkin, savdo taqiqlanadi. Ruxsatnoma 12 oy amal qiladi."
 },
 {
  "name": "O'g'it va kimyoviy vositalarni pochta orqali yuborish",
  "level": "red",
  "src": "VMQ 481-son pasporti, 9-band \"o\" kichik bandi",
  "note": "Qo'l yuki, bagaj, pochta jo'natmasi yoki boshqa yuk bilan olib o'tish taqiqlanadi. Faqat tajriba-sinov uchun ruxsatnoma asosida pochta jo'natmasi mumkin."
 },
 {
  "name": "Madaniy boyliklar",
  "level": "amber",
  "src": "\"Madaniy boyliklar\" Qonuni 5-modda; VMQ 131-son",
  "note": "Import va eksport yagona davlat tartibiga, ro'yxatga olish va ekspertizaga bo'ysunadi. Miqdoriy limit ushbu hujjatlarda aniqlanmagan."
 },
 {
  "name": "Hayvonotga mansub oziq-ovqat mahsulotlari",
  "level": "amber",
  "src": "PQ-4508, 1-band",
  "note": "Qo'l yuki, kuzatib borilayotgan bagaj va pochta jo'natmalari orqali olib kiriladigan hayvonotga mansub oziq-ovqat mahsulotlarida ishlab chiqarish o'rovi majburiy."
 },
 {
  "name": "Elektron sigaretalar va nikotinli suyuqliklar",
  "level": "red",
  "syn": "vape veyp pod elektron sigaret sigareta вейп электронная сигарета",
  "src": "O'RQ-844, 24.05.2023, 37-modda",
  "note": "Nikotinni iste'mol qiluvchi va oshiruvchi qo'shimchalarli suyuqliklar hamda moslamalarni olib kirish va realizatsiya qilish taqiqlanadi."
 },
 {
  "name": "Portlovchi materiallar va masofadan portlatish qurilmalari",
  "level": "red",
  "src": "VMQ 213, 06.05.2004, 2-band",
  "note": "Jismoniy shaxslar tomonidan olib kirish qat'iyan taqiqlangan, kuzatilmaydigan bagajda ham."
 },
 {
  "name": "Pul yutug'i bo'lgan o'yin avtomatlari",
  "level": "red",
  "src": "VMQ 176, 16.08.2007, 1-band",
  "note": "Umuman olib kirish taqiqlanadi, nazorat bojxona qo'mitasi zimmasida."
 },
 {
  "name": "Pirotexnika vositalari (II xavflilik sinfi)",
  "level": "red",
  "src": "VMQ 309, 10.12.2009, 1-band",
  "note": "Uy-ro'zg'or pirotexnikasini olib kirish, ishlab chiqarish, saqlash, realizatsiya va foydalanish vaqtincha taqiqlangan."
 },
 {
  "name": "Portativ lazerli nur tarqatuvchilar",
  "level": "red",
  "src": "VMQ 50, 20.02.2013, 1-band · TN kod 9013 20 0000",
  "note": "2013-yil 1-martdan chetdan kirishi va savdosi taqiqlangan."
 },
 {
  "name": "Uchuvchisiz uchish apparatlari (dron)",
  "level": "amber",
  "syn": "kvadrokopter quadcopter drone квадрокоптер",
  "src": "VMQ 658, 15.11.2022 · TN 8802200001, 8802200002, 8802200008, 8803100000, 8803200000",
  "note": "Fuqarolik aviatsiyasi agentligi ruxsatnomasi talab qilinadi. Olib kirish bojxona nazorati ostida amalga oshiriladi, noqonuniy olib kirish taqiqlanadi."
 },
 {
  "name": "Ishlatilgan induksion pechlar va kameralar",
  "level": "red",
  "src": "VMQ 999, 14.12.2019, 1-band · TN kod 8514 20 1000",
  "note": "2020-yil 1-martdan boshlab ishlab chiqilganiga 3 yildan oshgan uskunani shaxsiy import uchun olib kirish taqiqlanadi."
 },
 {
  "name": "Ekstremistik, zo'ravonlik va pornografik materiallar",
  "level": "red",
  "src": "PF-5286, 15.12.2017, 2-ilova",
  "note": "Terrorchilik, zo'ravonlik, irqchilik, diniy nafrat va pornografiya mazmunidagi materiallar importi va tarqatilishi umuman taqiqlangan."
 },
 {
  "name": "O'zbekiston pul belgilari va xorijiy valyuta",
  "level": "red",
  "src": "AV-2219, 3-ilova, 1-band",
  "note": "Markaziy bank va uning muassasalari tomonidan yuboriladiganlardan tashqari barcha holatlarda taqiqlanadi."
 },
 {
  "name": "Tirik hayvonlar",
  "level": "red",
  "src": "AV-2219, 3-ilova, 1-band",
  "note": "Pochta jo'natmalari orqali yuborish taqiqlanadi."
 },
 {
  "name": "Qimmatbaho buyumlar (qiymati e'lon qilinmagan posilkada)",
  "level": "red",
  "src": "AV-2219, 3-ilova, 4-band",
  "note": "Tangalar, bank va kredit chiptalari, yo'l cheklari, platina, oltin yoki kumushdan yasalgan buyumlar, ishlov berilmagan qimmatbaho toshlar va zargarlik buyumlarini qiymati e'lon qilinmagan posilkada jo'natish taqiqlanadi."
 },
 {
  "name": "Alkogol va tamaki mahsulotlari",
  "level": "red",
  "syn": "vino pivo spirt aroq sigareta tamaki вино пиво водка сигареты табак",
  "src": "VMQ-244, 1-ilova",
  "note": "Xalqaro pochta va kuryerlik jo'natmalari orqali olib kirilishi taqiqlanadi."
 },
 {
  "name": "Dori vositalari",
  "level": "amber",
  "syn": "tabletka vitamin dorilar лекарство таблетки витамины",
  "src": "Sog'liqni saqlash vazirligi tartibi",
  "note": "Shaxsiy tibbiy foydalanish uchun retsept va tegishli ruxsat bilan olib kiriladi, miqdor davolash kursiga mos bo'lishi kerak."
 }
];
export const SERVICES = [
 {
  "icon": "svc-savol",
  "lane": "shaxs",
  "title": "Tezkor savol",
  "sub": "Bitta aniq savolga yozma javob — hujjat, me'yor yoki tartib bo'yicha.",
  "items": [
   "Telegram orqali, ish kunlari ichida javob",
   "Javobda qaysi hujjatga tayanilgani ko'rsatiladi"
  ],
  "price": "40 000 so'm"
 },
 {
  "icon": "svc-ushlangan",
  "lane": "shaxs",
  "title": "Jo'natma ushlanib qoldi",
  "sub": "Bojxonada to'xtatilgan jo'natma bo'yicha nima qilish kerakligi.",
  "items": [
   "Sabab aniqlanadi va kerakli hujjatlar ro'yxati beriladi",
   "Ariza matni tayyorlab beriladi",
   "Keyingi qadamlar tartibi"
  ],
  "price": "200 000 so'm"
 },
 {
  "icon": "svc-hisob",
  "lane": "shaxs",
  "title": "Boj hisobini tekshirish",
  "sub": "Sizga yozilgan boj va yig'im to'g'ri hisoblanganmi.",
  "items": [
   "Me'yor, kurs va stavka qayta hisoblanadi",
   "Ortiqcha to'lov bo'lsa — qaytarish tartibi"
  ],
  "price": "60 000 so'm"
 },
 {
  "icon": "svc-hujjat",
  "lane": "shaxs",
  "title": "Hujjatlarni tayyorlash",
  "sub": "Deklaratsiya, xabarnoma va tushuntirish xatlari.",
  "items": [
   "Tovar tijorat maqsadida emasligi haqidagi tushuntirish",
   "To'ldirilgan namuna beriladi"
  ],
  "price": "300 000 so'm"
 },
 {
  "icon": "svc-taqiq",
  "lane": "shaxs",
  "title": "Taqiq va cheklov tekshiruvi",
  "sub": "Olib kirmoqchi bo'lgan tovar ruxsat etiladimi, qanday hujjat kerak.",
  "items": [
   "Taqiqlangan va cheklangan ro'yxatlari bo'yicha tekshiruv",
   "Ruxsat/sertifikat kerak bo'lsa — qayerdan olinishi"
  ],
  "price": "50 000 so'm"
 },
 {
  "icon": "svc-yuridik",
  "lane": "tashkilot",
  "title": "Hujjatlar va litsenziya",
  "sub": "Kuryerlik faoliyatini rasmiylashtirish va bojxona brokeri bilan ishlash.",
  "items": [
   "Kerakli ruxsat va ro'yxatdan o'tish hujjatlari",
   "Broker bilan shartnoma shartlari"
  ],
  "price": "Loyiha bo'yicha"
 },
 {
  "icon": "svc-shartnoma",
  "lane": "tashkilot",
  "title": "Mijoz bilan shartnoma",
  "sub": "Javobgarlik chegaralari aniq yozilgan shartnoma.",
  "items": [
   "Yo'qolgan yoki shikastlangan jo'natma bo'yicha kompensatsiya",
   "Muddat kechikishi va fors-major",
   "Ommaviy oferta matni"
  ],
  "price": "1 500 000 so'm"
 },
 {
  "icon": "svc-bahs",
  "lane": "tashkilot",
  "title": "Bojxona bilan bahs",
  "sub": "Ushlab qolingan yuk, jarima yoki qaror ustidan shikoyat.",
  "items": [
   "Shikoyat va e'tiroz matni",
   "Muddatlar va qaysi organga murojaat qilish"
  ],
  "price": "Loyiha bo'yicha"
 },
 {
  "icon": "svc-texnik",
  "lane": "tashkilot",
  "title": "Sayt va Telegram bot",
  "sub": "Mijoz o'zi tarif hisoblaydigan va buyurtma qoldiradigan kanal.",
  "items": [
   "Tarif kalkulyatori",
   "Buyurtma qabul qilish va ariza",
   "Telegram Mini App ko'rinishida ham"
  ],
  "price": "Loyiha bo'yicha"
 },
 {
  "icon": "svc-integratsiya",
  "lane": "tashkilot",
  "title": "Trek tizimi integratsiyasi",
  "sub": "Ombor holati mijozga o'zi yetib boradigan qilib ulanadi.",
  "items": [
   "Ombor tizimi bilan bog'lash",
   "Status o'zgarganda Telegram/SMS xabarnoma",
   "Mijoz uchun kuzatuv sahifasi"
  ],
  "price": "Loyiha bo'yicha"
 },
 {
  "icon": "svc-hamkorlik",
  "lane": "tashkilot",
  "title": "Ilovada joylashish",
  "sub": "Pochtam ro'yxatida ko'rinish va tariflarni yangilab turish.",
  "items": [
   "Kuryerlar ro'yxatida karta",
   "Tarif va muddatlarni o'z vaqtida yangilash",
   "Yo'nalish bo'yicha ajratib ko'rsatish"
  ],
  "price": "oyiga 500 000 so'm"
 }
];
export const GUIDES = [
 {
  "id": "taobao",
  "title": "Taobao",
  "tag": "KURYER OMBORI"
 },
 {
  "id": "pinduoduo",
  "title": "Pinduoduo",
  "tag": "GURUH XARIDI"
 },
 {
  "id": "poizon",
  "title": "Poizon (Dewu)",
  "tag": "ORIGINALLIK"
 },
 {
  "id": "shein",
  "title": "SHEIN",
  "tag": "O'LCHAMLAR"
 },
 {
  "id": "trendyol",
  "title": "Trendyol",
  "tag": "KDV QAYTISHI"
 },
 {
  "id": "amazon",
  "title": "Amazon",
  "tag": "SALES TAX 0%"
 },
 {
  "id": "ebay",
  "title": "eBay",
  "tag": "AUKSION"
 }
];
