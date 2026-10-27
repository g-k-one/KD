<script setup lang="ts">
/*
 * The Provably Fair banner's art: the glass case, and over it a big magnifying glass that follows the pointer anywhere
 * on the band (left alone, or on a phone, it drifts slowly over the case). Through the glass the case shows what it is
 * made of: the player's own seeds — the server seed's hash, the client seed, the nonce — and the formula that turns them
 * into the roll. A tap scrambles the code and lets it settle back into the same values, with ticks and a tap of the phone.
 * Transform only: the lens moves by translate and the code inside moves the other way, so it stays put on the case; the
 * handle swings a little with the lens's speed. Reduced motion: the lens rests over the case.
 */
const props = defineProps<{ hash: string; client: string; nonce: number }>()
const { t } = useI18n()
const sfx = useSfx()
const haptics = useHaptics()

const box = useTemplateRef<HTMLElement>('box')
const lens = useTemplateRef<HTMLElement>('lens')
const code = useTemplateRef<HTMLElement>('code')
const frame = useTemplateRef<HTMLElement>('frame')
const size = ref({ w: 620, h: 360 })

// the code: what the roll is made of, in the order the check reads it
const lines = computed(() => {
  const h = props.hash.padEnd(64, '0')
  return [
    '// your roll, from',
    `sha256(server) =`,
    `  ${h.slice(0, 16)}`,
    `  ${h.slice(16, 32)}`,
    `  ${h.slice(32, 48)}`,
    `  ${h.slice(48, 64)}`,
    `client = ${props.client}`,
    `nonce  = ${props.nonce}`,
    'hmac_sha256(server,',
    '  client:nonce)',
    '→ ticket 1…1 000 000',
  ]
})
// the hash again and again behind it, dim, so the glass shows code wherever it goes
const rain = computed(() => Array.from({ length: 22 }, (_, i) => (props.hash + props.hash).slice((i * 7) % 64, ((i * 7) % 64) + 40)))

// a tap: every character runs through random hex and settles back left to right
const shown = ref<string[]>([])
watch(lines, (v) => (shown.value = [...v]), { immediate: true })
const HEX = '0123456789abcdef'
let scrambling = 0
function scramble() {
  if (scrambling) return
  haptics.tap()
  const target = lines.value
  let step = 0
  const STEPS = 14
  scrambling = window.setInterval(() => {
    step++
    const k = step / STEPS
    shown.value = target.map((l) => [...l].map((c, i) => (c === ' ' || i / l.length < k ? c : HEX[Math.floor(Math.random() * 16)])).join(''))
    if (step % 3 === 0) sfx.tick()
    if (step >= STEPS) {
      clearInterval(scrambling)
      scrambling = 0
      shown.value = [...target]
      haptics.tap()
    }
  }, 45)
}

// the lens's place in the box: it eases toward the target, the pointer's or its own drift's
let x = 0
let y = 0
let tx = 0
let ty = 0
let lastMove = -1e9
let raf = 0
let seen = false
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const radius = () => (lens.value?.offsetWidth ?? 200) / 2

function aim(clientX: number, clientY: number) {
  const r = box.value!.getBoundingClientRect()
  const rr = radius()
  // it keeps to the case's side: a pointer over the words leaves it at the case's left edge, clear of them
  tx = Math.min(r.width - rr * 0.5, Math.max(r.width * 0.4, rr * 0.5, clientX - r.left))
  ty = Math.min(r.height - rr * 0.3, Math.max(rr * 0.6, clientY - r.top))
  lastMove = performance.now()
}
function onWindowMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !box.value) return
  const band = box.value.closest('section')?.getBoundingClientRect()
  if (!band || e.clientX < band.left || e.clientX > band.right || e.clientY < band.top || e.clientY > band.bottom) return
  aim(e.clientX, e.clientY)
}
// a finger moves it where it touched, then it drifts again
function onTouch(e: PointerEvent) {
  if (e.pointerType !== 'mouse') aim(e.clientX, e.clientY)
}

function place(now: number) {
  const { w, h } = size.value
  // left alone: a slow figure of eight over the case
  if (now - lastMove > 2200) {
    const s = now / 1000
    tx = w * 0.58 + w * 0.12 * Math.sin(s * 0.42)
    ty = h * 0.5 + h * 0.16 * Math.sin(s * 0.84 + 1)
  }
  const px = x
  x += (tx - x) * 0.12
  y += (ty - y) * 0.12
  const rr = radius()
  if (lens.value) lens.value.style.transform = `translate3d(${x - rr}px, ${y - rr}px, 0)`
  if (code.value) code.value.style.transform = `translate3d(${rr - x}px, ${rr - y}px, 0)`
  // the handle swings against the motion, a few degrees at most
  if (frame.value) frame.value.style.transform = `rotate(${Math.max(-9, Math.min(9, (x - px) * -0.9))}deg)`
}
function loop(now: number) {
  raf = requestAnimationFrame(loop)
  place(now)
}

let ro: ResizeObserver | null = null
let io: IntersectionObserver | null = null
onMounted(() => {
  const fit = () => {
    if (box.value) size.value = { w: box.value.clientWidth, h: box.value.clientHeight }
  }
  fit()
  ro = new ResizeObserver(fit)
  ro.observe(box.value!)
  x = tx = size.value.w * 0.58
  y = ty = size.value.h * 0.5
  place(0)
  addEventListener('pointermove', onWindowMove, { passive: true })
  // the drift runs only while the band is on screen
  io = new IntersectionObserver(([en]) => {
    seen = !!en?.isIntersecting
    cancelAnimationFrame(raf)
    if (seen && !reduced.value) raf = requestAnimationFrame(loop)
  })
  io.observe(box.value!)
})
watch(reduced, (r) => {
  cancelAnimationFrame(raf)
  if (r) {
    tx = x = size.value.w * 0.58
    ty = y = size.value.h * 0.5
    place(0)
  } else if (seen) raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(scrambling)
  removeEventListener('pointermove', onWindowMove)
  ro?.disconnect()
  io?.disconnect()
})
</script>

<template>
  <div
    ref="box"
    class="kd-lens-box absolute inset-0 cursor-pointer select-none"
    role="button"
    tabindex="0"
    :aria-label="t('fair.lensLabel')"
    @pointerdown="onTouch"
    @click="scramble"
    @keydown.enter.prevent="scramble"
    @keydown.space.prevent="scramble"
  >
    <!-- the glass case, softly bobbing in its own green light -->
    <span class="kd-lens-light pointer-events-none absolute" aria-hidden="true" />
    <img src="/img/hero/pf-case.webp" alt="" draggable="false" class="kd-lens-case pointer-events-none absolute" />

    <!-- the magnifying glass: the glass shows the code, the frame (ring and handle) sits over it -->
    <span ref="lens" class="kd-lens pointer-events-none absolute top-0 left-0 block" aria-hidden="true">
      <span class="kd-lens-glass absolute inset-0 block overflow-hidden rounded-full">
        <span ref="code" class="kd-lens-code absolute top-0 left-0 block" :style="{ width: `${size.w}px`, height: `${size.h}px` }">
          <img src="/img/hero/pf-case.webp" alt="" draggable="false" class="kd-lens-case is-xray absolute" />
          <span class="kd-lens-rain absolute inset-0 block">
            <span v-for="(r, i) in rain" :key="i" class="block">{{ r }}</span>
          </span>
          <span class="kd-lens-lines absolute block">
            <span v-for="(l, i) in shown" :key="i" class="block whitespace-pre" :class="i === 0 ? 'is-note' : i === lines.length - 1 ? 'is-out' : ''">{{ l }}</span>
          </span>
        </span>
        <span class="kd-lens-glare absolute inset-0 block rounded-full" />
      </span>
      <span ref="frame" class="kd-lens-frame absolute inset-0 block">
        <span class="kd-lens-arm absolute inset-0 block"><span class="kd-lens-handle absolute block" /></span>
        <span class="kd-lens-ring absolute block rounded-full" />
      </span>
    </span>
  </div>
</template>

<style scoped>
/* the case and the light it stands in; the x-ray copy inside the lens takes the very same box */
.kd-lens-case {
  left: 28%;
  top: 10%;
  width: 58%;
  animation: kd-lens-bob 5.2s var(--ease-in-out) infinite;
  filter: drop-shadow(0 18px 30px rgb(0 0 0 / 0.55));
}
.kd-lens-case.is-xray {
  filter: grayscale(1) brightness(1.4) contrast(1.4) sepia(1) hue-rotate(85deg) saturate(2.5);
  opacity: 0.32;
}
@keyframes kd-lens-bob {
  50% {
    transform: translateY(-8px);
  }
}
.kd-lens-light {
  left: 18%;
  right: 0;
  top: 6%;
  bottom: 0;
  background: radial-gradient(closest-side, rgb(40 220 120 / 0.42), rgb(18 183 106 / 0.12) 60%, transparent);
}

/* the lens: the glass 224 px across on desktop, 132 on phones; the ring around it 14 (9) */
.kd-lens {
  --g: 224px;
  --ring: 14px;
  width: var(--g);
  height: var(--g);
  will-change: transform;
  z-index: 2;
}
.kd-lens-glass {
  background: radial-gradient(circle at 38% 32%, rgb(30 120 80 / 0.55), rgb(3 22 14 / 0.94) 72%);
  box-shadow: inset 0 0 24px rgb(0 0 0 / 0.8);
}
.kd-lens-rain {
  padding: 4px 10px;
  font: 600 12px/18px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  letter-spacing: 0.08em;
  color: rgb(70 255 160 / 0.2);
  overflow: hidden;
}
/* the code itself sits in the middle of the case, big and lit, magnified */
.kd-lens-lines {
  left: 57%;
  top: 52%;
  translate: -50% -50%;
  font: 700 18px/25px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: #6dffb4;
  text-shadow:
    0 0 10px rgb(40 255 140 / 0.55),
    0 1px 0 rgb(0 0 0 / 0.6);
}
.kd-lens-lines .is-note {
  color: rgb(140 255 200 / 0.55);
}
.kd-lens-lines .is-out {
  color: #ffd36b;
  text-shadow: 0 0 10px rgb(255 190 60 / 0.6);
}
/* light on the glass: a bright arc top left, a soft sheen */
.kd-lens-glare {
  background:
    radial-gradient(circle at 30% 24%, rgb(255 255 255 / 0.22), transparent 26%),
    radial-gradient(circle at 50% 50%, transparent 62%, rgb(0 0 0 / 0.45) 100%);
}
.kd-lens-glare::after {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 9999px;
  border: 3px solid transparent;
  border-top-color: rgb(255 255 255 / 0.45);
  border-left-color: rgb(255 255 255 / 0.2);
  rotate: -18deg;
}
/* the frame swings around the glass's centre */
.kd-lens-frame {
  transform-origin: 50% 50%;
}
/* the ring: gold to orange metal, a dark bevel inside, a drop shadow under it */
.kd-lens-ring {
  inset: calc(var(--ring) * -1);
  background: conic-gradient(from 200deg, #fff1b8, #ffc23d 14%, #e0731a 32%, #8a3a0c 46%, #f29a2b 62%, #ffe08a 80%, #fff1b8);
  mask: radial-gradient(closest-side, transparent calc(100% - var(--ring)), #000 calc(100% - var(--ring) + 1px));
  filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.55));
}
.kd-lens-ring::after {
  content: '';
  position: absolute;
  inset: calc(var(--ring) - 3px);
  border-radius: 9999px;
  box-shadow:
    0 0 0 3px rgb(60 24 6 / 0.85),
    inset 0 0 0 1px rgb(255 230 160 / 0.35);
}
/* the handle: out from the ring at the bottom right (the arm is the lens's square turned 45°, the handle hangs from its
   bottom edge), black with orange grip bands and a gold collar */
.kd-lens-arm {
  rotate: -45deg;
}
.kd-lens-handle {
  left: 50%;
  top: calc(100% + var(--ring) - 2px);
  width: calc(var(--g) * 0.17);
  height: calc(var(--g) * 0.6);
  border-radius: calc(var(--g) * 0.085) calc(var(--g) * 0.085) 9999px 9999px;
  translate: -50% 0;
  /* a round black grip lit from the left, two orange bands near the collar */
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.22), transparent 30%, transparent 62%, rgb(0 0 0 / 0.55)),
    linear-gradient(180deg, transparent 18%, #ef7a1e 18% 24%, transparent 24% 32%, #ef7a1e 32% 38%, transparent 38%),
    #18181d;
  box-shadow: 0 14px 24px rgb(0 0 0 / 0.55);
}
/* the gold collar where the handle meets the ring */
.kd-lens-handle::before {
  content: '';
  position: absolute;
  left: -12%;
  right: -12%;
  top: -4%;
  height: 13%;
  border-radius: 6px;
  background: linear-gradient(90deg, #fff1b8, #f2a42c 40%, #9a4a0e);
}

@media (max-width: 639px) {
  .kd-lens {
    --g: 132px;
    --ring: 9px;
  }
  .kd-lens-lines {
    font-size: 11px;
    line-height: 15px;
  }
  .kd-lens-rain {
    font-size: 9px;
    line-height: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-lens-case {
    animation: none;
  }
}
</style>
