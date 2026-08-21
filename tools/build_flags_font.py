#!/usr/bin/env python3
"""fonts/flags-src/*.svg -> fonts/flags.woff2

Bayroqlar uchun rangli shrift (COLR/CPAL).

Nima uchun shrift: bayroqlar ilovada ham, qo'llanmalarda ham oddiy matn
ichida turadi ("🇹🇷 Turkiya", kuryer tariflari, do'kon kartalari). Shriftni
almashtirish bilan hammasi bir vaqtda o'zgaradi — shablonga tegish shart emas.

Manba — flag-icons (MIT) ning tekis SVG bayroqlari. Ilgari bu Noto Color
Emoji subseti edi: to'lqinli bayroqlar va ikki barobar katta fayl.

Nega COLR, OpenType-SVG emas: Chromium OT-SVG shriftlarini chizmaydi
(sinovda bo'sh joy qoldi), COLR/CPAL esa hamma joyda ishlaydi.

Ishlatish: python3 tools/build_flags_font.py
Talab: pip install fonttools brotli picosvg
"""
import re
import sys
from pathlib import Path

from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.transform import Transform
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from picosvg.svg import SVG

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'fonts' / 'flags-src'
OUT = ROOT / 'fonts' / 'flags.woff2'

# O'lchamlar avvalgi shrift bilan bir xil — matn tartibi o'zgarmasin.
UPEM, ADVANCE, ASCENT, DESCENT = 1024, 1275, 950, -250
FLAG_H = 740                       # bayroq balandligi (~0.72 em)
FLAG_W = round(FLAG_H * 4 / 3)     # 4:3
X0 = (ADVANCE - FLAG_W) // 2
Y0 = -60                           # pastki cheti bazisdan sal past

# Ekranda bayroq ~20 px; manba 480 birlik balandlikda. Ya'ni 24 birlik = 1 px.
# Shundan kichik detal ko'rinmaydi, lekin faylni kattalashtiradi.
MIN_DETAIL = 10.0

NAMED = {'red': '#ff0000', 'gold': '#ffd700', 'white': '#ffffff', 'black': '#000000',
         'blue': '#0000ff', 'green': '#008000', 'yellow': '#ffff00', 'silver': '#c0c0c0',
         'orange': '#ffa500', 'navy': '#000080', 'maroon': '#800000', 'olive': '#808000'}


def clean_source(text):
    """picosvg tushunmaydigan joylarni to'g'rilaymiz."""
    # <marker> tasvirga ta'sir qilmaydi (us.svg), lekin normallashtirishni to'xtatadi
    text = re.sub(r'<marker\b.*?</marker>', '', text, flags=re.S)
    text = re.sub(r'<marker\b[^>]*/>', '', text)
    text = re.sub(r'marker(-\w+)?="[^"]*"', '', text)
    # "1pt" kabi birliklar (it.svg, ua.svg) — chizishda ishlatilmaydi
    text = re.sub(r'stroke-width="[^"]*pt"', 'stroke-width="1"', text)
    return text


def to_rgba(fill, opacity):
    fill = (fill or '#000').strip().lower()
    fill = NAMED.get(fill, fill)
    if fill.startswith('#'):
        h = fill[1:]
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    elif fill.startswith('rgb'):
        r, g, b = (int(float(v)) for v in re.findall(r'[\d.]+', fill)[:3])
    else:
        r = g = b = 0
    return (r / 255, g / 255, b / 255, max(0.0, min(1.0, opacity)))


def flag_layers(path):
    """Bayroqni bir xil rangli qatlamlarga ajratadi: [(d, (r,g,b,a)), ...]

    picosvg SVG ni faqat oddiy <path> larga keltiradi: transform, use, mask va
    clip-path yechilgan bo'ladi — COLR uchun aynan shu kerak."""
    svg = SVG.fromstring(clean_source(path.read_text(encoding='utf-8'))).topicosvg()
    box = svg.view_box()
    out = []
    for ctx in svg.breadth_first():
        d = ctx.element.attrib.get('d')
        if not d:
            continue
        fill = ctx.attrib.get('fill', '#000')
        if fill in ('none', ''):
            continue
        op = float(ctx.attrib.get('fill-opacity', 1) or 1) * float(ctx.attrib.get('opacity', 1) or 1)
        if op <= 0.01:
            continue
        out.append((d, to_rgba(fill, op)))
    return out, (box.x, box.y, box.w, box.h)


def path_bbox(d):
    from fontTools.pens.boundsPen import ControlBoundsPen
    pen = ControlBoundsPen(None)
    parse_path(d, pen)
    return pen.bounds


def main():
    files = sorted(SRC.glob('*.svg'))
    if not files:
        sys.exit(f"{SRC} bo'sh — bayroq SVG fayllari kerak")

    letters = sorted({c.upper() for p in files for c in p.stem})
    ri_glyph = {L: f'u{0x1F1E6 + ord(L) - ord("A"):04X}' for L in letters}
    flag_glyph = {p.stem: 'flag' + p.stem.upper() for p in files}

    glyphs = {'.notdef': None}
    for g in ri_glyph.values():
        glyphs[g] = None
    colr, palette, dropped = {}, [], 0

    for p in files:
        layers, vb = flag_layers(p)
        sx, sy = FLAG_W / vb[2], FLAG_H / vb[3]
        # SVG ning y o'qi pastga, shriftniki yuqoriga qaraydi.
        xform = Transform(sx, 0, 0, -sy, X0 - vb[0] * sx, Y0 + FLAG_H + vb[1] * sy)

        base = flag_glyph[p.stem]
        glyphs[base] = None
        stack = []
        for i, (d, rgba) in enumerate(layers):
            bounds = path_bbox(d)
            # Ekranda ko'rinmaydigan mayda detal faylni kattalashtiradi, xolos.
            if not bounds or (bounds[2] - bounds[0] < MIN_DETAIL and bounds[3] - bounds[1] < MIN_DETAIL):
                dropped += 1
                continue
            pen = TTGlyphPen(None)
            # y o'qi ag'darilgani uchun kontur yo'nalishi teskari bo'lib
            # qoladi; TrueType nonzero to'ldirishida bu shaklni "teshik" qilib
            # qo'yadi va bayroqning bir qismi yo'qoladi. Yo'nalishni qaytaramiz.
            parse_path(d, TransformPen(ReverseContourPen(Cu2QuPen(pen, 1.0)), xform))
            name = f'{base}.l{i}'
            glyphs[name] = pen.glyph()
            if rgba not in palette:
                palette.append(rgba)
            stack.append((name, palette.index(rgba)))
        if not stack:
            sys.exit(f'{p.stem}: bitta ham qatlam qolmadi')
        colr[base] = stack

    order = list(glyphs)
    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    # Regional indicator harflari alohida ko'rinmaydi — ligatura bayroq beradi.
    fb.setupCharacterMap({0x1F1E6 + ord(L) - ord('A'): ri_glyph[L] for L in letters})

    empty = TTGlyphPen(None).glyph()
    notdef = TTGlyphPen(None)
    notdef.moveTo((60, 0)); notdef.lineTo((60, 700)); notdef.lineTo((560, 700)); notdef.lineTo((560, 0))
    notdef.closePath()
    glyphs['.notdef'] = notdef.glyph()
    fb.setupGlyf({g: (v if v is not None else empty) for g, v in glyphs.items()})

    # Chap yon bo'shliq (lsb) glifning haqiqiy xMin i bilan mos bo'lishi shart.
    # Aks holda brauzer konturni lsb ga tenglashtirib chapga suradi va rangli
    # qatlamlar bir-biridan siljib ketadi (bayroq buzilib chiqadi).
    zero = set(ri_glyph.values())
    glyf = fb.font['glyf']
    fb.setupHorizontalMetrics({
        g: (0 if g in zero or '.l' in g else ADVANCE,
            glyf[g].xMin if glyf[g].numberOfContours else 0)
        for g in order})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
    fb.setupNameTable({
        'familyName': 'XY Flags', 'styleName': 'Regular',
        'psName': 'XYFlags-Regular', 'version': '2.0',
        'copyright': 'Flag artwork: flag-icons (MIT), (c) 2013 Panayiotis Lipiridis',
    })
    fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=DESCENT,
                usWinAscent=ASCENT, usWinDescent=-DESCENT)
    fb.setupPost()

    fb.font['COLR'] = buildCOLR(colr)
    fb.font['CPAL'] = buildCPAL([palette])

    # Ikki regional indicator -> bitta bayroq
    rules = '\n'.join(
        f'    sub {ri_glyph[p.stem[0].upper()]} {ri_glyph[p.stem[1].upper()]} by {flag_glyph[p.stem]};'
        for p in files)
    addOpenTypeFeaturesFromString(fb.font, f'feature ccmp {{\n{rules}\n}} ccmp;\n')

    fb.font.flavor = 'woff2'
    fb.save(OUT)
    kb = OUT.stat().st_size / 1024
    print(f"{OUT.relative_to(ROOT)} yozildi — {len(files)} ta bayroq, "
          f"{len(palette)} ta rang, {kb:.0f} KB "
          f"({dropped} ta ko'rinmas detal tashlandi).")


if __name__ == '__main__':
    main()
