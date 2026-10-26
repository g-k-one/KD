<script setup lang="ts">
/*
 * Home banner, full width: one scene from edge to edge with no frame. The ground's light sits behind the case art and
 * fades into the page below; the words, bigger, stand on a soft half-oval plate (two arcs, like a stage seen from the
 * front). Right: the chicken bursting out of its case and a ring with three real catalog skins orbiting it — a planet
 * with its ring, seen from a little above, so the ring passes behind the chicken at the top and in front at the
 * bottom. Few things, all alive: the ring turns faster while the pointer is over the band and kicks round on a poke.
 * The ring is drawn twice (its far half under the art, its near half over it), both halves on one clock.
 */
const emit = defineEmits<{ start: [] }>()
const { onMove, onLeave, vars } = usePointerTilt()

// on the ring, by angle (0° = right, clockwise on screen); w = width in px
const ORBIT = [
  { src: '/img/items/cs2/butterfly-knife-fade.webp', a: 200, w: 132 },
  { src: '/img/items/cs2/awp-dragon-lore.webp', a: 330, w: 168 },
  { src: '/img/items/cs2/sport-gloves-pandora-s-box.webp', a: 80, w: 116 },
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
    <span class="kd-bleed-ground pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <!-- the words' plate: two soft arcs rising from the band's foot -->
    <span class="kd-plate pointer-events-none absolute -z-10" aria-hidden="true">
      <span class="kd-plate-arc is-outer" />
      <span class="kd-plate-arc is-inner" />
    </span>

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
  /* the content column, and the case art's centre in it (the board's middle, 255 px in from the column's right) */
  --col: min(1232px, 100vw);
  --art-x: calc(50% + var(--col) / 2 - 255px);
}

/* the ground: the case's warm light behind the art, the site's near-black at the screen's edges, fading into the page */
.kd-bleed-ground {
  background:
    radial-gradient(640px 400px at var(--art-x) 64%, rgb(255 110 30 / 0.42), transparent 70%),
    radial-gradient(460px 260px at var(--art-x) 100%, rgb(255 190 80 / 0.22), transparent 70%),
    radial-gradient(1300px 560px at calc(50% + 160px) 55%, #2a1209, transparent 72%);
  mask-image: linear-gradient(180deg, #000 72%, transparent);
}

/* the plate: a half-oval standing on the band's foot behind the words, its rim catching the case's light */
.kd-plate {
  bottom: 0;
  left: calc(50% - var(--col) / 2 + 390px);
  width: 1040px;
  height: 400px;
  transform: translateX(-50%);
  mask-image: linear-gradient(180deg, #000 55%, transparent);
}
.kd-plate-arc {
  position: absolute;
  inset: 0;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: radial-gradient(70% 100% at 50% 100%, rgb(255 120 40 / 0.1), rgb(255 255 255 / 0.03) 70%, rgb(255 255 255 / 0.02));
  box-shadow: inset 0 1.5px 0 rgb(255 170 90 / 0.28);
}
.kd-plate-arc.is-inner {
  inset: 22% 18% 0;
  background: rgb(255 255 255 / 0.02);
  box-shadow: inset 0 1px 0 rgb(255 170 90 / 0.14);
}

/* the ring: a flat circle laid back 64° (an ellipse to the eye), centred on the art; the far half shows its top, the
   near half its bottom */
.kd-ring {
  --r: 290px;
  left: var(--art-x);
  top: 236px;
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

/* phones and tablets: the art is a band on top, the light with it; the plate and the ring sit out */
@media (max-width: 1023px) {
  .kd-plate,
  .kd-ring {
    display: none;
  }
}
@media (max-width: 639px) {
  .kd-bleed-ground {
    background:
      radial-gradient(90% 200px at 50% 130px, rgb(255 110 30 / 0.4), transparent 72%),
      radial-gradient(140% 360px at 50% 120px, #2a1209, transparent 75%);
  }
}
</style>
