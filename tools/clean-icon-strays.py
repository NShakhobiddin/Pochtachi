#!/usr/bin/env python3
"""Ikonka manbalaridagi qolib ketgan soya chiziqlarini tozalaydi.

Nima uchun: 3D ikonkalar fonidan ajratib olinganda pastdagi soyaning bir
bo'lagi ba'zan ingichka tasma bo'lib qolib ketadi. U asosiy shakldan
uzilgan holda, undan ancha pastda turadi va ekranda "ikonka ostidagi
chiziq" bo'lib ko'rinadi (do'konlardagi poyabzal ikonkasida shunday edi).

Qanday aniqlanadi: bog'langan bo'laklarga ajratamiz va faqat quyidagi
ikki holatdagilarni o'chiramiz —
  1) ingichka tasma: eni balandligidan 8 barobar katta va balandligi
     manba o'lchamining 3% idan kam;
  2) juda mayda parcha: asosiy shaklning 0.15% idan kichik.
Ko'p qismli gliflar (svc-*) bunga tushmaydi: ularning bo'laklari yirik
va tasma shaklida emas.

Ishlatish: python3 tools/clean-icon-strays.py [--check]
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ALPHA = 8            # shundan past alfa - bo'sh joy
STRIP_RATIO = 8      # eni / balandligi
STRIP_MAX_H = 0.03   # manba balandligining ulushi
TINY_SHARE = 0.0015  # asosiy shaklning ulushi


def components(alpha, w, h):
    """Noshaffof piksellarni bog'langan bo'laklarga ajratadi."""
    px = alpha.load()
    seen = bytearray(w * h)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] <= ALPHA or seen[y0 * w + x0]:
                continue
            q = deque([(x0, y0)])
            seen[y0 * w + x0] = 1
            cells = []
            minx = maxx = x0
            miny = maxy = y0
            while q:
                x, y = q.popleft()
                cells.append((x, y))
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > ALPHA:
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            out.append({'n': len(cells), 'box': (minx, miny, maxx, maxy), 'cells': cells})
    out.sort(key=lambda c: -c['n'])
    return out


def strays(comps, w, h):
    """Asosiysidan tashqari qaysi bo'laklar ortiqcha ekanini qaytaradi."""
    if len(comps) < 2:
        return []
    main = comps[0]['n']
    bad = []
    for c in comps[1:]:
        x0, y0, x1, y1 = c['box']
        cw, ch = x1 - x0 + 1, y1 - y0 + 1
        thin = cw >= ch * STRIP_RATIO and ch <= h * STRIP_MAX_H
        tiny = c['n'] <= main * TINY_SHARE
        if thin or tiny:
            bad.append((c, 'tasma' if thin else 'mayda'))
    return bad


def ghosts(comps, alpha, w, h):
    """Ko'rinadigan shakldan uzoqda qolgan juda past alfali piksellar.

    Fon ajratilgandan keyin ba'zan alfasi 1-8 (3% gacha) bo'lgan izlar
    qoladi. Ular ekranda arvoh chiziq bo'lib biladi, lekin bo'laklarga
    ajratishda "bo'sh" deb sanaladi. Shaklning atrofidagi yumshoq soya
    chekkasi buzilmasin uchun faqat ko'rinadigan piksellar qutisidan
    ancha uzoqdagilar o'chiriladi.
    """
    if not comps:
        return []
    xs0 = min(c['box'][0] for c in comps)
    ys0 = min(c['box'][1] for c in comps)
    xs1 = max(c['box'][2] for c in comps)
    ys1 = max(c['box'][3] for c in comps)
    pad = max(4, round(min(w, h) * 0.02))
    px = alpha.load()
    out = []
    for y in range(h):
        for x in range(w):
            a = px[x, y]
            if a == 0 or a > ALPHA:
                continue
            if xs0 - pad <= x <= xs1 + pad and ys0 - pad <= y <= ys1 + pad:
                continue
            out.append((x, y))
    return out


def main():
    check = '--check' in sys.argv
    files = sorted((ROOT / 'icons' / 'src').glob('*.webp'))
    if not files:
        print('icons/src bo\'sh')
        return 0
    dirty = 0
    for f in files:
        im = Image.open(f).convert('RGBA')
        w, h = im.size
        alpha = im.split()[3]
        comps = components(alpha, w, h)
        bad = strays(comps, w, h)
        drop = {id(b) for b, _ in bad}
        kept = [c for c in comps if id(c) not in drop]
        gh = ghosts(kept, alpha, w, h)
        if not bad and not gh:
            continue
        dirty += 1
        bits = [f'{c["n"]}px {kind}' for c, kind in bad]
        if gh:
            bits.append(f'{len(gh)}px arvoh')
        detail = ', '.join(bits)
        if check:
            print(f' XATO  {f.name}: {detail}')
            continue
        px = im.load()
        for c, _ in bad:
            for x, y in c['cells']:
                px[x, y] = (0, 0, 0, 0)
        for x, y in gh:
            px[x, y] = (0, 0, 0, 0)
        im.save(f, 'WEBP', lossless=True)
        print(f'  tozalandi  {f.name}: {detail}')
    if not dirty:
        print(f'{len(files)} ta manba ikonka toza.')
        return 0
    if check:
        print('\nIkonka manbalarida qolib ketgan soya bo\'laklari bor. '
              'Tozalash: python3 tools/clean-icon-strays.py, keyin npm run icons')
        return 1
    print(f'\n{dirty} ta fayl tozalandi. Endi: npm run icons')
    return 0


if __name__ == '__main__':
    sys.exit(main())
