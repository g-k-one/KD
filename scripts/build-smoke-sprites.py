# Soft smoke clubs for Forge's kd atlas: domain-warped fractal noise under a torn round mask, lit from above, so a club reads
# as real smoke and not as a drawn shape. Output: scripts/forge-art/smoke1…4.png, picked up by build-forge-atlas.mjs.
# Usage: python scripts/build-smoke-sprites.py
from pathlib import Path

import numpy as np
from PIL import Image

N = 512
OUT = 128
ROOT = Path(__file__).parent / 'forge-art'


def noise(rng, cells):
    grid = (rng.random((cells, cells)) * 255).astype('uint8')
    return np.asarray(Image.fromarray(grid).resize((N, N), Image.BICUBIC), dtype='float32') / 255


def fbm(rng, base=3, octaves=6, gain=0.55):
    out, amp, total = np.zeros((N, N), 'float32'), 1.0, 0.0
    for o in range(octaves):
        out += amp * noise(rng, base * 2**o)
        total += amp
        amp *= gain
    return out / total


def warp(field, dx, dy):
    yy, xx = np.mgrid[0:N, 0:N]
    return field[np.clip((yy + dy).astype(int), 0, N - 1), np.clip((xx + dx).astype(int), 0, N - 1)]


def smoothstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def club(seed):
    rng = np.random.default_rng(seed)
    # warped twice: the billows of real smoke, not the flat clouds of plain noise
    base = warp(fbm(rng), (fbm(rng) - 0.5) * 150, (fbm(rng) - 0.5) * 150)
    base = warp(base, (fbm(rng) - 0.5) * 60, (fbm(rng) - 0.5) * 60)
    yy, xx = np.mgrid[-1:1:N * 1j, -1:1:N * 1j]
    r = np.hypot(xx, yy) + (fbm(rng, 4) - 0.5) * 0.65
    mask = smoothstep(0.86, 0.22, r)
    density = smoothstep(0.34, 0.68, base) * mask
    # lit from above: brighter where the density falls away downwards
    light = np.clip(0.76 + (density - np.roll(density, 14, axis=0)) * 1.1, 0.5, 1)
    rgba = np.dstack([light, light, light, density])
    img = Image.fromarray((rgba * 255).astype('uint8'), 'RGBA')
    return img.resize((OUT, OUT), Image.LANCZOS)


ROOT.mkdir(exist_ok=True)
for i, seed in enumerate((11, 23, 37, 58), 1):
    club(seed).save(ROOT / f'smoke{i}.png')
print('ok')
