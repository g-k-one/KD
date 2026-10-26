<script setup lang="ts">
/*
 * Home banner, full width: one scene from edge to edge with no frame. The light pours from the top as a wide warm arc
 * and dissolves into the page (the imigo final call's glow, turned upside down); the words line up with the page's
 * column. Right, big: the chicken bursting out of its case and a ring with three real catalog skins orbiting it — a planet
 * with its ring, seen from a little above, so the ring passes behind the chicken at the top and in front at the
 * bottom. Few things, all alive: the ring turns faster while the pointer is over the band and kicks round on a poke.
 * The ring is drawn twice (its far half under the art, its near half over it), both halves on one clock.
 */
const emit = defineEmits<{ start: [] }>()
const { onMove, onLeave, vars } = usePointerTilt()

// on the ring, by angle (0° = right, clockwise on screen); w = width in px
const ORBIT = [
  { src: '/img/items/cs2/butterfly-knife-fade.webp', a: 200, w: 168 },
  { src: '/img/items/cs2/awp-dragon-lore.webp', a: 330, w: 200 },
  { src: '/img/items/cs2/sport-gloves-pandora-s-box.webp', a: 80, w: 150 },
]

// one clock for both halves: the same animations on the far and near ring, started together, sped up together
const band = useTemplateRef<HTMLElement>('band')
const TURN = 36000
let anims: Animation[] = []
let rate = 1
let target = 1
let raf = 0
function setRate(r: number) {
  rate = r
  for (const a of anims) a.playbackRate = r
}
function ease() {
  const next = rate + (target - rate) * 0.08
  setRate(Math.abs(target - next) < 0.01 ? target : next)
  raf = rate === target ? 0 : requestAnimationFrame(ease)
}
function speed(r: number) {
  target = r
  if (!raf) raf = requestAnimationFrame(ease)
}
onMounted(() => {
  if (!band.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const opts = { duration: TURN, iterations: Infinity }
  const start = document.timeline.currentTime
  anims = [
    ...[...band.value.querySelectorAll<HTMLElement>('.kd-ring-spin')].map((el) => el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], opts)),
    // each skin turns back as the ring turns, so it stays upright, and leans out of the ring's plane to face us
    ...[...band.value.querySelectorAll<HTMLElement>('.kd-ring-face')].map((el) =>
      el.animate([{ transform: 'rotate(0deg) rotateX(-64deg)' }, { transform: 'rotate(-360deg) rotateX(-64deg)' }], opts),
    ),
  ]
  for (const a of anims) a.startTime = start
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  for (const a of anims) a.cancel()
})

function enter(e: PointerEvent) {
  onMove(e)
  if (e.pointerType === 'mouse') speed(2.2)
}
function leave() {
  onLeave()
  speed(1)
}
// a poke at the chicken flings the ring round, then it settles back
function kick() {
  setRate(16)
  speed(target)
}

// the clock runs only while the band is on screen
const onScreen = useElementVisibility(band)
watch(onScreen, (v) => anims.forEach((a) => (v ? a.play() : a.pause())))
</script>

<template>
  <section ref="band" class="kd-bleed relative isolate pt-4 pb-6 lg:pt-10 lg:pb-12" :style="vars" @pointermove="enter" @pointerleave="leave">
    <!-- the light: an arc of warm colour hanging from the top, brightest in the middle, gone before the page -->
    <span class="kd-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <!-- the ring's far half, under the art -->
    <div class="kd-ring is-far pointer-events-none absolute -z-[5]" aria-hidden="true">
      <div class="kd-ring-plane">
        <div class="kd-ring-spin">
          <span class="kd-ring-line" />
          <span v-for="o in ORBIT" :key="o.src" class="kd-ring-slot" :style="{ '--a': `${o.a}deg` }">
            <img :src="o.src" alt="" class="kd-ring-face" :style="{ width: `${o.w}px` }" draggable="false" />
          </span>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-content">
      <HomeHeroBanner bare @start="emit('start')" @poke="kick" />
    </div>

    <!-- the ring's near half, over the art -->
    <div class="kd-ring is-near pointer-events-none absolute z-20" aria-hidden="true">
      <div class="kd-ring-plane">
        <div class="kd-ring-spin">
          <span class="kd-ring-line" />
          <span v-for="o in ORBIT" :key="o.src" class="kd-ring-slot" :style="{ '--a': `${o.a}deg` }">
            <img :src="o.src" alt="" class="kd-ring-face" :style="{ width: `${o.w}px` }" draggable="false" />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kd-bleed {
  /* the content column, and the case art's centre in it (the board's middle, 240 px in from the column's right) */
  --col: min(1232px, 100vw);
  --art-x: calc(50% + var(--col) / 2 - 240px);
}

/* the light: brand red → orange → gold → orange → wine across the band, a white-hot middle, masked to an arc that hangs
   from the top and fades out on an eased curve (no edge anywhere) */
.kd-glow {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(255 240 210 / 0.22), transparent 70%),
    linear-gradient(100deg, #5e1307, #e5401a 26%, #ff8a1f 48%, #ffc04a 58%, #ff6a1a 74%, #6e1236);
  opacity: 0.62;
  mask-image: radial-gradient(
    ellipse 80% 100% at 50% 0%,
    #000 0%,
    rgb(0 0 0 / 1) 20%,
    rgb(0 0 0 / 0.966) 28%,
    rgb(0 0 0 / 0.869) 36%,
    rgb(0 0 0 / 0.724) 44%,
    rgb(0 0 0 / 0.552) 52%,
    rgb(0 0 0 / 0.379) 60%,
    rgb(0 0 0 / 0.226) 68%,
    rgb(0 0 0 / 0.11) 76%,
    rgb(0 0 0 / 0.037) 84%,
    rgb(0 0 0 / 0.006) 92%,
    rgb(0 0 0 / 0) 100%
  );
}

/* the ring: a flat circle laid back 64° (an ellipse to the eye), centred on the art; the far half shows its top, the
   near half its bottom */
.kd-ring {
  --r: 340px;
  left: var(--art-x);
  top: 242px;
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  margin: calc(var(--r) * -1) 0 0 calc(var(--r) * -1);
  perspective: 1400px;
  transform: translate3d(calc(var(--px, 0) * -10px), calc(var(--py, 0) * -6px), 0);
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-ring.is-far {
  clip-path: inset(-200px -200px 50% -200px);
}
.kd-ring.is-near {
  clip-path: inset(50% -200px -200px -200px);
}
.kd-ring-plane {
  position: absolute;
  inset: 0;
  transform: rotateX(64deg);
  transform-style: preserve-3d;
}
.kd-ring-spin {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.kd-ring-line {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgb(255 160 80 / 0.38);
  box-shadow:
    0 0 24px rgb(255 120 40 / 0.25),
    inset 0 0 24px rgb(255 120 40 / 0.18);
}
/* a slot sits on the circle at its angle; the skin in it turns back and stands up (the animations in the script) */
.kd-ring-slot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform: rotate(var(--a)) translateX(var(--r)) rotate(calc(var(--a) * -1));
  transform-style: preserve-3d;
}
.kd-ring-face {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  translate: -50% -50%;
  transform: rotateX(-64deg);
  filter: drop-shadow(0 8px 12px rgb(0 0 0 / 0.5));
}

/* the nearer the column's right edge is to the screen's, the tighter the ring */
@media (max-width: 1799px) {
  .kd-ring {
    --r: 290px;
  }
}
@media (max-width: 1599px) {
  .kd-ring {
    --r: 240px;
  }
}
/* small laptops: no room for the ring beside the column's edge */
@media (max-width: 1279px) {
  .kd-ring {
    display: none;
  }
}
/* phones: a narrow screen needs a wider arc to reach its sides */
@media (max-width: 639px) {
  .kd-glow {
    mask-size: 190% 100%;
    mask-position: 50% 0;
    mask-repeat: no-repeat;
  }
}
</style>
