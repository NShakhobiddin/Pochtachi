"""Glif ikonkalarini bitta tekis brend rangiga keltiradi.

Manba to'plamdagi gliflar turli rangda (qora, qizil, oltin) va ichida
ohang bor. Ular ilovadagi tekis chiziqli belgilarga o'xshamaydi, ustiga
WebP ham ohangli tasvirni yomon siqadi. Bu skript glifning qorong'i
qismini to'liq siyoh rangiga, oq ichki detallarini esa teshikka
aylantiradi — natijada tekis, brendga mos va ikki barobar yengil.

Ishlatish:  python3 tools/flatten-glyphs.py <manba-papka>
Chiqish:    icons/src/svc-*.webp (asl o'lcham) va icons/svc-*.webp (96 px)
"""
import sys, os
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'icons/glyphs'
INK = np.array([59, 44, 201], np.float32)     # #3B2CC9
SIZE = 96                                      # ekranda 38 px, 2.5x

# manba glif -> ilovadagi nom
PICK = {
    'contact': 'svc-savol', 'inspection': 'svc-ushlangan', 'calculator': 'svc-hisob',
    'prescription': 'svc-hujjat', 'cancel': 'svc-taqiq', 'decl-officer': 'svc-yuridik',
    'manifesto': 'svc-shartnoma', 'choice': 'svc-bahs', 'hand-phone': 'svc-texnik',
    'step-declare': 'svc-integratsiya', 'commercial': 'svc-hamkorlik',
}

total = 0
for src, name in PICK.items():
    path = os.path.join(SRC, src + '.png')
    if not os.path.exists(path):
        print('yo\'q:', path); continue
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    lum = (a[:, :, :3] @ np.array([.299, .587, .114], np.float32)) / 255.0
    alpha = a[:, :, 3] / 255.0 * np.clip((1 - lum) * 1.15, 0, 1)
    rgb = np.broadcast_to(INK, a[:, :, :3].shape)
    im = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    im = im.crop(im.getbbox())
    im.save(f'icons/src/{name}.webp', 'WEBP', lossless=True, method=6, exact=True)
    small = im.copy(); small.thumbnail((SIZE, SIZE), Image.LANCZOS)
    small.save(f'icons/{name}.webp', 'WEBP', lossless=True, method=6, exact=True)
    total += os.path.getsize(f'icons/{name}.webp')
print(f'{len(PICK)} ta glif, jami {total // 1024} KB')
