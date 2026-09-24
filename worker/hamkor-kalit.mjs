/* Hamkor kuryer uchun yangi kalit: `node hamkor-kalit.mjs d2d`.
 *
 * Chiqadigan "id:kalit" juftini GitHub'dagi PARTNER_KEYS siriga qo'shing
 * (bir nechta bo'lsa vergul bilan: "d2d:…,globbing:…") va workflow'ni
 * qayta ishga tushiring. Kalitning o'zini kuryerga maxfiy kanal orqali
 * bering; chatga, kodga yoki commit'ga yozmang. Kalit almashtirilsa eskisi
 * darhol ishlamay qoladi. */
import { randomBytes } from 'node:crypto';

const id = String(process.argv[2] || '').toLowerCase();
if (!/^[a-z0-9_-]{2,32}$/.test(id) || id === 'sinov') {
  console.error('Foydalanish: node hamkor-kalit.mjs <kuryer-id>   (masalan: d2d, globbing; "sinov" band)');
  process.exit(1);
}
const key = 'pk_' + randomBytes(32).toString('base64url');
console.log(`${id}:${key}`);
