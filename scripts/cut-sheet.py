"""Cuts a 2×2 art sheet (transparent PNG, one pose per quarter) into four WebPs, cleaned and trimmed.

Usage: python scripts/cut-sheet.py <sheet.png> <out-dir> <name-tl> <name-tr> <name-bl> <name-br> [--size 480]

Cleaning: the background removal leaves specks of colour in the transparent area (and half-clear pixels around
them). Alpha under 24 goes to 0, then only the pieces of the picture that are big enough stay (the figure and what
it holds; anything under 2% of the largest piece is a speck). Each pose is trimmed to what is left, padded 4%,
put on a square canvas, scaled to --size and saved as WebP. A name of "-" skips that quarter.
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('sheet')
ap.add_argument('out')
ap.add_argument('names', nargs=4)
ap.add_argument('--size', type=int, default=480)
a = ap.parse_args()

sheet = Image.open(a.sheet).convert('RGBA')
w, h = sheet.size
os.makedirs(a.out, exist_ok=True)
for i, name in enumerate(a.names):
    if name == '-':
        continue
    x, y = (i % 2) * w // 2, (i // 2) * h // 2
    px = np.array(sheet.crop((x, y, x + w // 2, y + h // 2)))
    alpha = px[..., 3]
    alpha[alpha < 24] = 0
    # keep the big pieces only: the figure and the things it holds, not the specks around them
    labels, n = ndimage.label(alpha > 0)
    if n:
        sizes = ndimage.sum(np.ones_like(alpha), labels, range(1, n + 1))
        keep = np.isin(labels, np.flatnonzero(sizes >= sizes.max() * 0.02) + 1)
        alpha[~keep] = 0
    px[..., 3] = alpha
    px[alpha == 0, :3] = 0
    im = Image.fromarray(px)
    box = im.getbbox()
    im = im.crop(box)
    side = int(max(im.size) * 1.08)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    canvas = canvas.resize((a.size, a.size), Image.LANCZOS)
    dst = os.path.join(a.out, f'{name}.webp')
    canvas.save(dst, 'WEBP', quality=88, method=6)
    print(dst, os.path.getsize(dst) // 1024, 'KB')
