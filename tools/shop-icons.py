#!/usr/bin/env python3
"""Do'kon logotiplarini kvadrat ilova-ikonka ko'rinishida tayyorlaydi.

Manba: stores/src/<id>.png (shaffof burchakli, kvadrat, yirik).
Natija: stores/<id>.webp + stores/index.json.

Nima uchun bu yerda: logotiplar ilgari 2:1 so'z-belgi edi va tashqi
favicon xizmatidan olinardi. Endi ular loyihada saqlanadi va kvadrat
plitka bo'lib chiziladi — ranggi o'zida, ostiga ohang qo'yish shart emas.

O'lcham: ekranda eng kattasi 64px, ya'ni 2x zichlikda 128px yetadi.
Sifat 78 da 43 ta fayl ~190 KB chiqadi; 86 da 228 KB bo'lib, byudjetga
(260 KB) juda yaqinlashadi, farqi esa ko'zga tashlanmaydi.

Ishlatish: python3 tools/shop-icons.py [--check]
"""

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'stores' / 'src'
OUT = ROOT / 'stores'
SIZE = 128
QUALITY = 78


def build(check):
    if not SRC.is_dir():
        print(f'{SRC} topilmadi')
        return 1
    files = sorted(SRC.glob('*.png'))
    if not files:
        print(f'{SRC} bo\'sh')
        return 1
    ids, total, changed = [], 0, 0
    for f in files:
        sid = f.stem
        ids.append(sid)
        dst = OUT / f'{sid}.webp'
        im = Image.open(f).convert('RGBA')
        if im.width != im.height:
            print(f' XATO  {sid}: kvadrat emas ({im.width}x{im.height})')
            return 1
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        if check:
            if not dst.exists():
                print(f' XATO  {sid}.webp yo\'q')
                return 1
            cur = Image.open(dst)
            if cur.size != (SIZE, SIZE):
                print(f' XATO  {sid}.webp o\'lchami {cur.size}, kerak {(SIZE, SIZE)}')
                return 1
        else:
            im.save(dst, 'WEBP', quality=QUALITY, method=6)
            changed += 1
        total += dst.stat().st_size

    idx = OUT / 'index.json'
    want = json.dumps(sorted(ids), ensure_ascii=False)
    if check:
        have = idx.read_text(encoding='utf-8').strip() if idx.exists() else ''
        if have != want:
            print(' XATO  stores/index.json ro\'yxati mos emas')
            return 1
        print(f'{len(ids)} ta do\'kon logotipi joyida ({total // 1024} KB).')
        return 0
    idx.write_text(want, encoding='utf-8')
    print(f'{changed} ta logotip: {SIZE}px, sifat {QUALITY} — jami {total // 1024} KB '
          f'(o\'rtacha {total / len(ids) / 1024:.1f} KB).')
    return 0


if __name__ == '__main__':
    sys.exit(build('--check' in sys.argv))
