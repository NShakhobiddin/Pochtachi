// Sayt manzili bitta joydan olinadi.
//
// GitHub Pages'da o'z domeningizni ulasangiz (Settings → Pages → Custom
// domain) GitHub ildizga `CNAME` faylini qo'yadi — ichida faqat domen.
// Shu fayl bo'lsa sayt o'sha domenning ildizida, bo'lmasa
// https://nshakhobiddin.github.io/Pochtachi/ da deb hisoblanadi. Kanonik va
// OG manzillar, sitemap, robots.txt — hammasi shu qiymatdan chiqadi.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_SITE = 'https://nshakhobiddin.github.io/Pochtachi/';

function fromCname() {
  const f = join(ROOT, 'CNAME');
  if (!existsSync(f)) return '';
  const d = readFileSync(f, 'utf8').trim().split(/\s+/)[0] || '';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) return '';
  return `https://${d.toLowerCase()}/`;
}

export const SITE = fromCname() || DEFAULT_SITE;
export const ORIGIN = new URL(SITE).origin;      // https://domen
export const BASE = new URL(SITE).pathname;      // "/Pochtachi/" yoki "/"
