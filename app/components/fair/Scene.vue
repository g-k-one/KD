<script setup lang="ts">
/*
 * The Provably Fair banner's art: a glass-green shield with a white check in front, a laptop on the left whose screen
 * types out the player's own check (their seeds, the formula, the ticket) line by line, each character fading in, and
 * behind them a chalkboard and a blueprint. Each layer moves with the pointer by its depth (--px / --py from the band,
 * BannerBleed), the shield and the check float out of step. The screen is a flat box put onto the laptop's screen
 * with a matrix3d (a homography from its corners to the screen's four corners in the picture), so the code sits on the
 * glass in its perspective. Transform and opacity only; reduced motion shows the code at once and nothing floats.
 */
const props = defineProps<{ hash: string; client: string; nonce: number }>()

// the screen's four corners in the laptop picture, as a share of its width and height: TL, TR, BR, BL
const QUAD = [
  [0.0508, 0.2151],
  [0.556, 0.0633],
  [0.6559, 0.4732],
  [0.1459, 0.7097],
] as const
// the flat box the code is laid out in before it is put on the screen
const BOX = { w: 360, h: 260 }

const laptop = useTemplateRef<HTMLElement>('laptop')
const matrix = ref('')
/** The 3×3 homography taking the box's corners to the quad's, as a CSS matrix3d (the standard square-to-quad maths) */
function fit() {
  const el = laptop.value
  if (!el) return
  const W = el.offsetWidth
  const H = el.offsetHeight
  const [x0, y0, x1, y1, x2, y2, x3, y3] = QUAD.flatMap(([x, y]) => [x * W, y * H]) as [number, number, number, number, number, number, number, number]
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const h = (dx1 * dy3 - dx3 * dy1) / den
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + h * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + h * y3
  // unit square → quad, then the box scaled to the unit square
  const m = [a / BOX.w, d / BOX.w, 0, g / BOX.w, b / BOX.h, e / BOX.h, 0, h / BOX.h, 0, 0, 1, 0, x0, y0, 0, 1]
  matrix.value = `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`
}

// the code the screen types: the player's own check, as it really runs
const lines = computed(() => [
  { t: '// your next roll', c: 'is-note' },
  { t: `server = sha256(••••)`, c: '' },
  { t: `  = ${props.hash.slice(0, 16)}…`, c: 'is-dim' },
  { t: `client = "${props.client}"`, c: '' },
  { t: `nonce  = ${props.nonce}`, c: '' },
  { t: 'hash = hmac(server,', c: '' },
  { t: '  client + ":" + nonce)', c: '' },
  { t: 'ticket = hash % 1e6 + 1', c: 'is-out' },
  { t: 'verify(ticket) ✓', c: 'is-ok' },
])
// how many characters are out: they appear one by one, then the screen holds the whole check, then starts again
const shown = ref(0)
const total = computed(() => lines.value.reduce((a, l) => a + l.t.length, 0))
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
let timer: ReturnType<typeof setTimeout> | undefined
function step() {
  if (shown.value < total.value) {
    shown.value++
    timer = setTimeout(step, 28 + Math.random() * 40)
  } else {
    timer = setTimeout(() => ((shown.value = 0), step()), 5200)
  }
}
/** each line's characters: the ones out so far, the newest still fading in */
const typed = computed(() => {
  let left = reduced.value ? Infinity : shown.value
  return lines.value.map((l) => {
    const n = Math.max(0, Math.min(l.t.length, left))
    left -= l.t.length
    return { ...l, chars: [...l.t.slice(0, n)], caret: n > 0 && n < l.t.length }
  })
})
const caretLine = computed(() => {
  const i = typed.value.findIndex((l) => l.chars.length < l.t.length)
  return i < 0 ? typed.value.length - 1 : i
})

let ro: ResizeObserver | null = null
onMounted(() => {
  fit()
  ro = new ResizeObserver(fit)
  if (laptop.value) ro.observe(laptop.value)
  step()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  clearTimeout(timer)
})
</script>

<template>
  <div class="kd-pf absolute inset-0 select-none" aria-hidden="true">
    <div class="kd-pf-stage absolute">
      <img src="/img/hero/pf-board.webp" alt="" draggable="false" class="kd-pf-layer is-board" />
      <img src="/img/hero/pf-blueprint.webp" alt="" draggable="false" class="kd-pf-layer is-blueprint" />
      <div ref="laptop" class="kd-pf-layer is-laptop">
        <img src="/img/hero/pf-laptop.webp" alt="" draggable="false" class="block w-full" />
        <!-- the code on the glass: laid out flat in BOX, put onto the screen's corners -->
        <div class="kd-pf-screen absolute top-0 left-0" :style="{ width: `${BOX.w}px`, height: `${BOX.h}px`, transform: matrix }">
          <div v-for="(l, i) in typed" :key="i" class="kd-pf-line whitespace-pre" :class="l.c">
            <span v-for="(ch, j) in l.chars" :key="j" class="kd-pf-ch">{{ ch }}</span><span v-if="i === caretLine" class="kd-pf-caret" />
          </div>
        </div>
      </div>
      <img src="/img/hero/pf-shield.webp" alt="" draggable="false" class="kd-pf-layer is-shield" />
      <img src="/img/hero/pf-check.webp" alt="" draggable="false" class="kd-pf-layer is-check" />
    </div>
  </div>
</template>

<style scoped>
/* the scene is drawn on a 620 × 380 stage, scaled to the band's height and centred in it */
.kd-pf-stage {
  top: 0;
  left: 50%;
  height: 100%;
  aspect-ratio: 620 / 380;
  translate: -50% 0;
}
/* each layer: placed in % of the stage, moved by the pointer by its depth (--d), tilted (--r); the near ones float */
.kd-pf-layer {
  position: absolute;
  transform: translate3d(calc(var(--px, 0) * var(--d) * 12px), calc(var(--py, 0) * var(--d) * 8px), 0) rotate(var(--r, 0deg));
  transition: transform var(--dur-slow) var(--ease-out);
  will-change: transform;
}
.kd-pf-layer.is-board {
  --d: 0.25;
  --r: 6deg;
  right: 6%;
  top: 4%;
  width: 22%;
  filter: brightness(0.6) saturate(0.85) blur(1.5px);
}
.kd-pf-layer.is-blueprint {
  --d: 0.4;
  --r: -4deg;
  right: -2%;
  top: 40%;
  width: 34%;
  filter: brightness(0.82);
}
.kd-pf-layer.is-laptop {
  --d: 0.6;
  left: -4%;
  top: 10%;
  width: 60%;
  filter: drop-shadow(0 18px 26px rgb(0 0 0 / 0.5));
}
.kd-pf-layer.is-shield {
  --d: 1;
  left: 31%;
  top: 6%;
  width: 40%;
  filter: drop-shadow(0 20px 36px rgb(18 183 106 / 0.35)) drop-shadow(0 14px 22px rgb(0 0 0 / 0.5));
  animation: kd-pf-float 5.6s var(--ease-in-out) infinite;
}
.kd-pf-layer.is-check {
  --d: 1.4;
  --r: -4deg;
  left: 36%;
  top: 30%;
  width: 36%;
  filter: drop-shadow(0 16px 22px rgb(0 0 0 / 0.5));
  animation: kd-pf-float 4.4s var(--ease-in-out) infinite -1.6s;
}
@keyframes kd-pf-float {
  50% {
    translate: 0 -10px;
  }
}

/* the code on the glass: cyan, glowing a little, each character fading in as it is typed */
.kd-pf-screen {
  transform-origin: 0 0;
  padding: 26px 28px;
  font: 600 17px/25px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: #3ef0ff;
  text-shadow: 0 0 10px rgb(62 240 255 / 0.55);
  pointer-events: none;
}
.kd-pf-line.is-note {
  color: rgb(140 210 230 / 0.55);
  text-shadow: none;
}
.kd-pf-line.is-dim {
  color: rgb(62 240 255 / 0.55);
}
.kd-pf-line.is-out {
  color: #ffd36b;
  text-shadow: 0 0 10px rgb(255 190 60 / 0.55);
}
.kd-pf-line.is-ok {
  color: #4dffa0;
  text-shadow: 0 0 12px rgb(40 255 140 / 0.6);
}
.kd-pf-ch {
  animation: kd-pf-in 260ms var(--ease-out) both;
}
@keyframes kd-pf-in {
  from {
    opacity: 0;
  }
}
.kd-pf-caret {
  display: inline-block;
  width: 0.55em;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.12em;
  background: currentColor;
  animation: kd-pf-blink 900ms steps(1) infinite;
}
@keyframes kd-pf-blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-pf-layer,
  .kd-pf-ch,
  .kd-pf-caret {
    animation: none;
  }
}
</style>
