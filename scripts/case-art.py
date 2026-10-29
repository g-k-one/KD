"""Turns case art generated in ChatGPT into card pictures: public/img/cases/<slug>.webp (480×480, transparent).

Usage:
  python scripts/case-art.py                      # every PNG/WebP/JPG in public/img/_new/cases/, named <slug>.png
  python scripts/case-art.py sheet.png a b c d    # a 2×2 sheet: cuts it into a, b, c, d (top left, top right, bottom left, bottom right)

Each picture is trimmed to its subject, centred in a square with a small margin and saved as WebP. A picture whose
corners are not transparent (ChatGPT sometimes paints a checkerboard instead of real alpha) is reported and skipped,
and so is one whose subject runs into the frame edge (a handle or a muzzle flash cut off).
At the end it writes public/img/_new/cases/_preview.png: every case at 104 px on the site's dark background, to check
that it still reads at card size.
"""
import os
import sys
from PIL import Image

SRC = 'public/img/_new/cases'
DST = 'public/img/cases'
SIZE = 480
MARGIN = 0.04  # of the side, on each edge
PREVIEW = 104
BG = (17, 17, 17, 255)


def opaque_corners(im: Image.Image) -> bool:
    a = im.getchannel('A')
    w, h = im.size
    return sum(a.getpixel(p) > 200 for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]) >= 3


def cut_sides(im: Image.Image) -> list[str]:
    """Sides where the subject runs into the frame (opaque pixels in the outer 2 px), i.e. the art is cut off."""
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    w, h = im.size
    bands = {'top': (0, 0, w, 2), 'bottom': (0, h - 2, w, h), 'left': (0, 0, 2, h), 'right': (w - 2, 0, w, h)}
    return [side for side, box in bands.items() if a.crop(box).histogram()[255] > 4]


def square(im: Image.Image) -> Image.Image:
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(box)
    side = round(max(im.size) / (1 - 2 * MARGIN))
    out = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return out.resize((SIZE, SIZE), Image.LANCZOS)


def save(im: Image.Image, slug: str, done: list):
    im = im.convert('RGBA')
    if opaque_corners(im):
        print(f'SKIP {slug}: the background is not transparent, regenerate it or cut it out first')
        return
    cut = cut_sides(im)
    if cut:
        print(f'SKIP {slug}: cut off at the {", ".join(cut)} edge, regenerate it with more margin')
        return
    dst = os.path.join(DST, slug + '.webp')
    square(im).save(dst, 'WEBP', quality=86, method=6)
    done.append(dst)
    print(f'ok   {dst} ({os.path.getsize(dst) // 1024} KB)')


done: list[str] = []
if len(sys.argv) == 6:
    sheet = Image.open(sys.argv[1]).convert('RGBA')
    w, h = sheet.width // 2, sheet.height // 2
    for k, slug in enumerate(sys.argv[2:]):
        save(sheet.crop(((k % 2) * w, (k // 2) * h, (k % 2 + 1) * w, (k // 2 + 1) * h)), slug, done)
elif len(sys.argv) == 1:
    for f in sorted(os.listdir(SRC)):
        name, ext = os.path.splitext(f)
        if ext.lower() in ('.png', '.webp', '.jpg', '.jpeg') and not name.startswith('_'):
            save(Image.open(os.path.join(SRC, f)), name, done)
else:
    sys.exit(__doc__)

if done:
    cols = min(6, len(done))
    rows = (len(done) + cols - 1) // cols
    cell = PREVIEW + 16
    sheet = Image.new('RGBA', (cols * cell, rows * cell), BG)
    for k, p in enumerate(done):
        im = Image.open(p).resize((PREVIEW, PREVIEW), Image.LANCZOS)
        sheet.paste(im, ((k % cols) * cell + 8, (k // cols) * cell + 8), im)
    os.makedirs(SRC, exist_ok=True)
    sheet.save(os.path.join(SRC, '_preview.png'))
    print(f'{len(done)} cases, preview: {SRC}/_preview.png')
