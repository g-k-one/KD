# Soft smoke clubs for Forge's kd atlas: a little low-frequency noise under a round mask, lit from above: simple, smooth puffs
# with no fine detail, which read as smoke at speed. Output: scripts/forge-art/smoke1…4.png, picked up by build-forge-atlas.mjs.
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


def fbm(rng, base=2, octaves=3, gain=0.5):
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
    base = warp(fbm(rng), (fbm(rng) - 0.5) * 90, (fbm(rng) - 0.5) * 90)
    yy, xx = np.mgrid[-1:1:N * 1j, -1:1:N * 1j]
    r = np.hypot(xx, yy) + (fbm(rng) - 0.5) * 0.4
    mask = 1 - smoothstep(0.2, 0.9, r)
    density = (0.45 + 0.55 * smoothstep(0.32, 0.66, base)) * mask
    # lit from above: brighter where the density falls away downwards
    light = np.clip(0.86 + (density - np.roll(density, 40, axis=0)) * 0.5, 0.7, 1)
    rgba = np.dstack([light, light, light, density])
    img = Image.fromarray((rgba * 255).astype('uint8'), 'RGBA')
    return img.resize((OUT, OUT), Image.LANCZOS)


ROOT.mkdir(exist_ok=True)
for i, seed in enumerate((11, 23, 37, 58), 1):
    club(seed).save(ROOT / f'smoke{i}.png')
print('ok')
