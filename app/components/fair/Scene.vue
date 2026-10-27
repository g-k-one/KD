<script setup lang="ts">
/*
 * The Provably Fair banner's art, as heavy as the home page's chicken: a big glass-green shield with a white check in
 * front, a laptop behind it on the left, a chalkboard and a blueprint further back. Each layer moves with the pointer
 * by its depth (--px / --py from the band, BannerBleed); the shield and the check float out of step. Over it all, very
 * faint, a few columns of code rain down like the Matrix — the player's own hash and seeds, a character at a time.
 * Transform and opacity only; reduced motion stills the floats and the rain.
 */
const props = defineProps<{ hash: string; client: string; nonce: number }>()

// the rain: a handful of columns, each a run of the player's own characters, at its own place, speed and delay
const COLS = [
  { x: 6, d: 7.5, dl: -1.2, n: 16 },
  { x: 19, d: 9.5, dl: -6.1, n: 12 },
  { x: 33, d: 8.2, dl: -3.4, n: 18 },
  { x: 52, d: 10.4, dl: -8.0, n: 14 },
  { x: 68, d: 7.8, dl: -4.6, n: 16 },
  { x: 81, d: 9.1, dl: -0.4, n: 12 },
  { x: 93, d: 8.6, dl: -5.3, n: 15 },
]
const source = computed(() => `${props.hash}${props.client}${props.nonce}`.replace(/[^0-9a-f]/gi, ''))
const columns = computed(() =>
  COLS.map((c, i) => {
    const src = source.value || '0'
    const from = (i * 11) % src.length
    const chars = Array.from({ length: c.n }, (_, k) => src[(from + k * 3) % src.length]!)
    return { ...c, chars }
  }),
)
</script>

<template>
  <div class="kd-pf absolute inset-0 select-none" aria-hidden="true">
    <div class="kd-pf-stage absolute">
      <img src="/img/hero/pf-board.webp" alt="" draggable="false" class="kd-pf-layer is-board" />
      <img src="/img/hero/pf-blueprint.webp" alt="" draggable="false" class="kd-pf-layer is-blueprint" />
      <img src="/img/hero/pf-laptop.webp" alt="" draggable="false" class="kd-pf-layer is-laptop" />
      <img src="/img/hero/pf-shield.webp" alt="" draggable="false" class="kd-pf-layer is-shield" />
      <img src="/img/hero/pf-check.webp" alt="" draggable="false" class="kd-pf-layer is-check" />
      <!-- the rain, over everything and barely there -->
      <div class="kd-pf-rain absolute inset-0">
        <span v-for="(c, i) in columns" :key="i" class="kd-pf-col" :style="{ left: `${c.x}%`, animationDuration: `${c.d}s`, animationDelay: `${c.dl}s` }">
          <span v-for="(ch, j) in c.chars" :key="j" class="block" :style="{ opacity: (j + 1) / c.chars.length }">{{ ch }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* the stage: 620 × 380 at the band's full height and past it a little, top and bottom, as the home chicken does */
.kd-pf-stage {
  top: -6%;
  left: 50%;
  height: 122%;
  aspect-ratio: 620 / 380;
  translate: -50% 0;
}
/* the build follows the home chicken: one mass, the hero in the middle and the props tucked behind it — the laptop big
   and low on the left like the open case, the blueprint low on the right like the side case, the chalkboard dim behind
   the upper right like the far case; the check stamped on the middle of the shield. Each layer: placed in % of the stage, moved by the pointer by its depth (--d), tilted (--r); the near ones float */
.kd-pf-layer {
  position: absolute;
  transform: translate3d(calc(var(--px, 0) * var(--d) * 14px), calc(var(--py, 0) * var(--d) * 9px), 0) rotate(var(--r, 0deg));
  transition: transform var(--dur-slow) var(--ease-out);
  will-change: transform;
}
.kd-pf-layer.is-board {
  --d: 0.2;
  --r: 6deg;
  left: 60.7%;
  top: 6.6%;
  width: 24.5%;
  filter: brightness(0.5) saturate(0.8) blur(2px);
}
.kd-pf-layer.is-blueprint {
  --d: 0.35;
  --r: -6deg;
  left: 62.7%;
  top: 35.1%;
  width: 43.1%;
  filter: brightness(0.7) blur(0.5px);
}
.kd-pf-layer.is-laptop {
  --d: 0.5;
  left: -8.4%;
  top: 17.2%;
  width: 63.2%;
  filter: brightness(0.85) drop-shadow(0 18px 26px rgb(0 0 0 / 0.5));
}
.kd-pf-layer.is-shield {
  --d: 1;
  left: 24.2%;
  top: -4.8%;
  width: 57.3%;
  filter: drop-shadow(0 0 40px rgb(18 183 106 / 0.45)) drop-shadow(0 18px 26px rgb(0 0 0 / 0.5));
  animation: kd-pf-float 5.6s var(--ease-in-out) infinite;
}
.kd-pf-layer.is-check {
  --d: 1.5;
  --r: -4deg;
  left: 33%;
  top: 12.6%;
  width: 43.1%;
  filter: drop-shadow(0 18px 24px rgb(0 0 0 / 0.55));
  animation: kd-pf-float 4.4s var(--ease-in-out) infinite -1.6s;
}
@keyframes kd-pf-float {
  50% {
    translate: 0 -12px;
  }
}

/* the rain: green monospace columns falling through the stage, the lead character brightest, the whole of it faint */
.kd-pf-rain {
  overflow: hidden;
  opacity: 0.16;
  pointer-events: none;
  mask-image: linear-gradient(180deg, transparent, #000 18%, #000 78%, transparent);
}
.kd-pf-col {
  position: absolute;
  top: 0;
  font: 700 15px/18px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: #6dffb4;
  text-shadow: 0 0 8px rgb(40 255 140 / 0.8);
  animation: kd-pf-fall linear infinite;
  will-change: transform;
}
@keyframes kd-pf-fall {
  from {
    transform: translateY(-110%);
  }
  to {
    transform: translateY(380%);
  }
}
@media (max-width: 639px) {
  /* phones: a touch smaller and lower, so the mass sits inside the band as the home chicken does (clear of the live
     strip above, inside the screen at the sides) */
  .kd-pf-stage {
    top: 2%;
    height: 112%;
  }
  .kd-pf-col {
    font-size: 11px;
    line-height: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-pf-layer,
  .kd-pf-col {
    animation: none;
  }
}
</style>
