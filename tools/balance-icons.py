"""Oltita ikonkaning "optik og'irligi"ni tenglashtiradi.

Ular turli nisbatda (krossovka keng, atir tor), shuning uchun bir xil
kvadrat qutida `object-fit:contain` bilan chizilganda biri kichik, biri
katta ko'rinadi. Bu yerda har biri kvadrat kanvasga shunday joylanadiki,
ekranda egallaydigan yuzasi bir-biriga yaqin bo'lsin. To'liq tenglashtirish
sun'iy chiqadi (keng buyum juda baland bo'lib ketadi), shuning uchun
tuzatish 70% ga yumshatiladi.
"""
import os
import numpy as np
from PIL import Image

N = ['universal','moda','poyabzal','elektronika','kosmetika','bolalar']
# Manba: shaffof fonli PNG lar (kesib olingan asl nusxalar).
SRC = os.environ.get('DOK_SRC', 'icons/src/raw-%s.webp')
C   = 400          # kvadrat kanvas
FIT = 0.90         # kattalashtirish uchun joy qoldiramiz
SOFT = 0.70        # tuzatishning qanchasi qo'llanadi

ims, areas, fits = [], [], []
for n in N:
    im = Image.open(SRC % n).convert('RGBA')
    a = np.asarray(im).astype(np.float32)[:,:,3] / 255.0
    s = (C * FIT) / max(im.size)
    ims.append(im); areas.append(a.sum() * s * s); fits.append(s)

mean = sum(areas) / len(areas)
ks = []
for im, ar, s in zip(ims, areas, fits):
    c = 1 + SOFT * ((mean / ar) ** 0.5 - 1)
    ks.append(s * c)
# Nisbatlarni saqlagan holda hammasini birdek kattalashtiramiz, shunda eng
# kattasi kanvasni to'liq egallaydi — bo'sh joy behuda ketmasin.
grow = C / max(k * max(im.size) for k, im in zip(ks, ims))
ks = [k * grow for k in ks]

print(f"{'ikonka':13} {'tuzatish':>9} {'yakuniy':>12}")
for n, im, ar, s, k in zip(N, ims, areas, fits, ks):
    c = k / s
    w, h = round(im.width * k), round(im.height * k)
    out = Image.new('RGBA', (C, C), (0,0,0,0))
    out.paste(im.resize((w, h), Image.LANCZOS), ((C-w)//2, (C-h)//2))
    out.save(f'icons/src/dok-{n}.webp', 'WEBP', quality=95, method=6)
    print(f'{n:13} {c:8.3f}x {w:5}x{h:<5}')
