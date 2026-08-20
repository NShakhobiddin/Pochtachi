# Do'kon logotiplari

Bu papkadagi `<do'kon-id>.webp` fayllari 128 px WebP ko'rinishida saqlanadi.
Ular ikki yo'l bilan hosil qilinadi:

```bash
npm run store-logos                 # favicon xizmatlaridan yuklab oladi (internet kerak)
npm run store-logos -- --from DIR   # tayyor rasmlar solingan papkadan oladi
```

`--from` rejimida papkadagi fayllar do'konlarga moslanadi: yonida
`logo_manifest.csv` bo'lsa, moslash `domain` ustuni bo'yicha aniq bajariladi,
bo'lmasa fayl nomidan (`01_taobao.png` → `taobao`).

`index.json` — mavjud logotiplar ro'yxati. Ilova shu ro'yxatga qarab rasmni
faqat o'z domenidan oladi. **Ro'yxat bo'sh bo'lmasa**, unda yo'q do'kon uchun
tashqi xizmatga umuman murojaat qilinmaydi — rangli monogramma ko'rinadi.
Shu sababli ilova hech qanday uchinchi tomon serveriga bog'lanmaydi (smoke
test buni tekshiradi).

## Hozircha logotipi yo'q do'konlar

Quyidagilar monogramma bilan ko'rinadi — rasm qo'shilsa, `--from` bilan
qayta ishga tushirish kifoya:

- `victoriassecret` — victoriassecret.com
- `toysrus` — toysrus.com
- `smythstoys` — smythstoys.com
- `faoschwarz` — faoschwarz.com
- `mattel` — creations.mattel.com

Logotiplar tegishli brendlarning tovar belgilari; ular faqat o'sha do'konni
ko'rsatish uchun ishlatiladi.
