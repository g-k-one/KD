<script setup lang="ts">
// Figma "HeroBanner": desktop = text left, art right (1232×324, padding 32/40/40);
// mobile variant = art on top, text and actions below.
//
// The art is a stage in depth, drawn on a fixed 600×400 board and scaled per breakpoint: rays of light turn behind
// an open case; the chicken (drawn after the logo) bursts out of it — the case's back, then the chicken, then the
// case's front wall, so it comes from inside; real skins from the catalog and KD coins fly around it.
// Interactive the way mascots are built: an idle loop (the chicken bobs, the loot floats), the pointer moves every
// layer by its depth (near ones more), and a tap is a short reaction that interrupts and hands back: the chicken
// jolts and squawks, feathers puff (Forge), the loot kicks outward. A speech bubble eggs the player on; the fifth
// poke lays a golden egg — an honest one: it offers the free demo spin every case has.
const session = useSessionStore()
const ui = useUiStore()
const emit = defineEmits<{ start: [] }>()

function start() {
  if (!session.user) ui.openSignIn()
  else emit('start')
}

const sfx = useSfx()
const haptics = useHaptics()
const fx = useForge()
const chicken = useTemplateRef<HTMLElement>('chicken')

// The loot around the chicken: where it hangs on the board, its size, tilt, depth (how far the pointer moves it)
// and which way a poke kicks it. Real catalog skins, so the hero shows what the site pays out.
const LOOT = [
  { src: '/img/items/cs2/butterfly-knife-fade.webp', x: 70, y: 70, w: 150, r: -24, d: 1.4, bx: -28, by: -18 },
  { src: '/img/items/cs2/awp-dragon-lore.webp', x: 400, y: 26, w: 210, r: 16, d: 1.1, bx: 26, by: -22 },
  { src: '/img/items/cs2/sport-gloves-pandora-s-box.webp', x: 40, y: 230, w: 140, r: -10, d: 1.6, bx: -32, by: 10 },
  { src: '/img/items/cs2/ak-47-wild-lotus.webp', x: 440, y: 190, w: 180, r: -12, d: 1.3, bx: 30, by: 8 },
  { src: '/img/items/cs2/m4a4-howl.webp', x: 190, y: 0, w: 150, r: 8, d: 0.8, bx: -10, by: -30 },
]
const COINS = [
  { x: 170, y: 150, w: 44, d: 1.8, bx: -20, by: -14 },
  { x: 520, y: 120, w: 36, d: 2, bx: 22, by: -10 },
  { x: 140, y: 330, w: 52, d: 2.2, bx: -24, by: 12 },
  { x: 560, y: 320, w: 40, d: 1.7, bx: 22, by: 14 },
]

// pointer → -1…1 on both axes (mouse only: a finger has no hover to follow)
const tilt = ref({ x: 0, y: 0 })
function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.value = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 }
}
const onLeave = () => (tilt.value = { x: 0, y: 0 })

const PECKS = 5
const pecks = ref(0)
// bumped on every poke: the key of the jolt and the loot's kick, so their keyframes restart even mid-way
const jolt = ref(0)
const egg = ref(false)
function poke() {
  if (egg.value) return
  pecks.value += 1
  jolt.value += 1
  haptics.tap()
  sfx.squawk()
  fx.at('feathers:white', chicken.value, 0.7)
  if (pecks.value >= PECKS) {
    egg.value = true
    haptics.jackpot()
    fx.at('kdJackpot', chicken.value, 1)
  }
}
function closeEgg() {
  egg.value = false
  pecks.value = 0
}
const bubble = computed(() => `hero.poke${Math.min(pecks.value, PECKS - 1)}`)
// a layer's place on the board, moved by the pointer by its depth
const layer = (x: number, y: number, d: number) => ({ left: `${x}px`, top: `${y}px`, '--d': d })
</script>

<template>
  <section
    class="kd-hero relative isolate flex flex-col overflow-hidden rounded-4xl lg:overflow-visible p-4 sm:min-h-60 sm:flex-row sm:rounded-5xl sm:px-8 sm:py-6 lg:h-81 lg:gap-6 lg:px-10 lg:pt-8 lg:pb-10"
    :style="{ '--px': tilt.x, '--py': tilt.y }"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <!-- the ground: the site's near-black, lit from the open case on the right -->
    <span class="kd-hero-ground pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" aria-hidden="true" />

    <!-- The stage. Phones: a band above the text; wider: the right side, rising over the banner's top -->
    <div class="kd-hero-slot relative -mx-4 -mt-4 mb-2 h-44 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[52%] lg:w-[620px]">
      <div class="kd-hero-stage absolute">
        <span class="kd-hero-rays kd-depth absolute" :style="layer(110, -80, -0.4)" aria-hidden="true" />
        <img src="/img/hero/case-back.webp" alt="" draggable="false" class="kd-depth absolute" :style="{ ...layer(200, 76, 0.3), width: '330px' }" />
        <!-- the chicken: bob (idle) → lean (pointer) → jolt (tap), one wrapper each so they never fight -->
        <button
          ref="chicken"
          type="button"
          class="kd-hero-poke kd-depth absolute"
          :style="{ ...layer(212, -6, 0.6), width: '300px' }"
          :aria-label="$t('hero.pokeLabel')"
          @click="poke"
        >
          <span class="kd-hero-bob block">
            <span :key="jolt" class="kd-hero-jolt block" :class="jolt > 0 && 'is-on'">
              <img src="/img/hero/chicken.webp" alt="" draggable="false" fetchpriority="high" class="block w-full" />
            </span>
          </span>
        </button>
        <img src="/img/hero/case-front.webp" alt="" draggable="false" class="kd-depth pointer-events-none absolute" :style="{ ...layer(200, 76, 0.3), width: '330px' }" />
        <!-- the loot: floats on its own, the pointer moves it by depth, a poke kicks it outward -->
        <span
          v-for="(it, i) in LOOT"
          :key="`l${i}`"
          class="kd-depth pointer-events-none absolute"
          :style="{ ...layer(it.x, it.y, it.d), width: `${it.w}px` }"
        >
          <span :key="jolt" class="kd-hero-kick block" :class="jolt > 0 && 'is-on'" :style="{ '--bx': `${it.bx}px`, '--by': `${it.by}px` }">
            <img :src="it.src" alt="" draggable="false" class="kd-hero-float block w-full" :style="{ '--r': `${it.r}deg`, animationDelay: `${i * -0.7}s` }" />
          </span>
        </span>
        <span
          v-for="(c, i) in COINS"
          :key="`c${i}`"
          class="kd-depth pointer-events-none absolute"
          :style="{ ...layer(c.x, c.y, c.d), width: `${c.w}px` }"
        >
          <span :key="jolt" class="kd-hero-kick block" :class="jolt > 0 && 'is-on'" :style="{ '--bx': `${c.bx}px`, '--by': `${c.by}px` }">
            <img src="/img/coins/coin.webp" alt="" draggable="false" class="kd-hero-float block w-full" :style="{ '--r': `${i * 23 - 30}deg`, animationDelay: `${i * -0.9}s` }" />
          </span>
        </span>
        <span v-if="!egg" class="kd-hero-bubble type-12-caps absolute rounded-lg px-2.5 py-1.5" :style="{ left: '420px', top: '2px' }">{{ $t(bubble) }}</span>
      </div>
    </div>

    <div class="relative z-10 flex flex-col justify-between gap-4 sm:max-w-[58%] sm:gap-6 lg:h-full lg:w-[709px] lg:max-w-none">
      <div class="flex flex-col gap-1 sm:gap-2">
        <p class="type-12-caps lg:type-16-caps text-brand-light">{{ $t('hero.eyebrow') }}</p>
        <h1 class="text-xl leading-6 font-extrabold uppercase sm:text-[32px] sm:leading-9 lg:type-48-caps">
          {{ $t('hero.title') }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton size="l" class="max-sm:h-10 max-sm:px-4" @click="start">{{ $t('hero.cta') }}</UiButton>
        <UiButton variant="ghost" size="l" icon="info" to="/fairness" class="max-sm:h-10 max-sm:px-3">{{ $t('hero.howItWorks') }}</UiButton>
      </div>
    </div>

    <!-- the fifth poke: a golden egg, and the free demo spin it stands for -->
    <Transition name="kd-egg">
      <div v-if="egg" class="kd-hero-egg absolute top-3 right-3 z-20 flex max-w-[290px] items-center gap-3 rounded-2xl p-3 sm:top-auto sm:right-6 sm:bottom-6 lg:right-10 lg:bottom-10">
        <span class="kd-hero-egg-icon grid size-11 shrink-0 place-items-center rounded-xl"><UiIcon name="egg" :size="24" /></span>
        <div class="flex min-w-0 flex-col gap-1">
          <span class="type-14-caps text-gold-light">{{ $t('hero.eggTitle') }}</span>
          <span class="type-12-regular text-neutral-13">{{ $t('hero.eggText') }}</span>
          <UiButton variant="gold" size="s" icon="demo" to="/case/kurwa-classic?demo=1" class="mt-1 self-start">{{ $t('hero.eggCta') }}</UiButton>
        </div>
        <button type="button" class="kd-hit absolute top-2 right-2 text-neutral-11 hover:text-neutral-15" :aria-label="$t('hero.eggClose')" @click="closeEgg">
          <UiIcon name="close" :size="16" />
        </button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
/* the ground: near-black, a warm pool of light where the case opens, a vignette */
.kd-hero-ground {
  background:
    radial-gradient(60% 90% at 78% 70%, rgb(255 110 30 / 0.42), transparent 70%),
    radial-gradient(40% 60% at 70% 100%, rgb(255 190 80 / 0.25), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #2a1209 100%);
  box-shadow: inset 0 0 0 1px rgb(255 120 40 / 0.14);
}

/* the board: 600×400 design pixels, scaled to the slot; its bottom sits on the banner's bottom */
.kd-hero-stage {
  width: 600px;
  height: 400px;
  left: 50%;
  /* phones: the board fits the 176 px band whole (400 × 0.44) */
  bottom: 0;
  transform-origin: 50% 100%;
  transform: translateX(-50%) scale(0.44);
}
@media (min-width: 40rem) {
  .kd-hero-stage {
    bottom: -10px;
    transform: translateX(-50%) scale(0.72);
  }
}
@media (min-width: 64rem) {
  .kd-hero-stage {
    bottom: -2px;
    transform: translateX(-50%) scale(0.84);
  }
}

/* every layer moves with the pointer by its depth (--d): near ones more, the rays a little the other way */
.kd-depth {
  transform: translate(calc(var(--px, 0) * var(--d) * 16px), calc(var(--py, 0) * var(--d) * 10px));
  transition: transform var(--dur-slow) var(--ease-out);
}

/* light pouring out of the case: two soft fans turning slowly (one layer, transform only) */
.kd-hero-rays {
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgb(255 200 90 / 0.16) 0deg 8deg, transparent 8deg 22deg);
  mask-image: radial-gradient(closest-side, #000 20%, transparent 70%);
  animation: kd-hero-rays 26s linear infinite;
}
@keyframes kd-hero-rays {
  to {
    rotate: 360deg;
  }
}

.kd-hero-poke {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* idle: the chicken rides up and down out of the case */
.kd-hero-bob {
  animation: kd-hero-bob 2.6s var(--ease-in-out) infinite;
}
@keyframes kd-hero-bob {
  50% {
    transform: translateY(-14px) rotate(-2deg);
  }
}
/* the tap: a squash, a kick up and a settle */
.kd-hero-jolt.is-on {
  animation: kd-hero-jolt 0.5s var(--ease-out);
  transform-origin: 50% 85%;
}
@keyframes kd-hero-jolt {
  20% {
    transform: scale(1.08, 0.9) rotate(-5deg);
  }
  45% {
    transform: scale(0.95, 1.08) rotate(4deg) translateY(-22px);
  }
  72% {
    transform: scale(1.02, 0.98) rotate(-1deg);
  }
}
/* the loot floats, each on its own beat */
.kd-hero-float {
  rotate: var(--r);
  animation: kd-hero-float 3.4s var(--ease-in-out) infinite;
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.45));
}
@keyframes kd-hero-float {
  50% {
    transform: translateY(-10px) rotate(4deg);
  }
}
/* a poke kicks the loot out and lets it drift back */
.kd-hero-kick.is-on {
  animation: kd-hero-kick 0.7s var(--ease-out);
}
@keyframes kd-hero-kick {
  30% {
    transform: translate(var(--bx), var(--by)) scale(1.08);
  }
}

.kd-hero-bubble {
  z-index: 2;
  color: var(--color-neutral-1);
  background: var(--color-neutral-15);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.35);
  animation: kd-hero-nudge 1.6s var(--ease-out) infinite;
  pointer-events: none;
}
/* the bubble's tail */
.kd-hero-bubble::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 14px;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: rotate(45deg);
}
@keyframes kd-hero-nudge {
  0%,
  70%,
  100% {
    transform: none;
  }
  80% {
    transform: translateY(-3px) rotate(-3deg);
  }
  90% {
    transform: translateY(0) rotate(2deg);
  }
}
.kd-hero-egg {
  background: rgb(12 13 16 / 0.9);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent),
    0 12px 32px rgb(0 0 0 / 0.5);
  backdrop-filter: blur(8px);
}
.kd-hero-egg-icon {
  color: #3a2400;
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5);
}
.kd-egg-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-egg-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-egg-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.92);
}
.kd-egg-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .kd-hero-bob,
  .kd-hero-float,
  .kd-hero-rays,
  .kd-hero-bubble {
    animation: none;
  }
}
</style>
