<script setup lang="ts">
// Figma "HeroBanner": desktop = text left, art right (1232×324, padding 32/40/40);
// mobile variant = art on top, text and actions below.
//
// The chicken is a toy, the way interactive mascots are built: an idle loop (a slow bob), it follows the
// pointer (the art leans toward it, a glow drifts the other way for depth), and a short reaction on a tap that
// interrupts the idle and hands it back: a jolt, a squawk, a puff of feathers (Forge). A speech bubble eggs the
// player on; the fifth poke lays a golden egg — an honest one: it offers the free demo spin every case has.
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
const art = useTemplateRef<HTMLElement>('art')
const artMobile = useTemplateRef<HTMLElement>('artMobile')

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
// bumped on every poke: the jolt's key, so its keyframe restarts even mid-jolt
const jolt = ref(0)
const egg = ref(false)
function poke(e: MouseEvent) {
  if (egg.value) return
  pecks.value += 1
  jolt.value += 1
  haptics.tap()
  sfx.squawk()
  const el = (e.currentTarget as HTMLElement).querySelector('img') ?? art.value ?? artMobile.value
  fx.at('feathers:white', el, 0.55)
  if (pecks.value >= PECKS) {
    egg.value = true
    haptics.jackpot()
    fx.at('kdJackpot', el, 0.9)
  }
}
function closeEgg() {
  egg.value = false
  pecks.value = 0
}
const bubble = computed(() => `hero.poke${Math.min(pecks.value, PECKS - 1)}`)
</script>

<template>
  <section
    class="kd-hero relative isolate flex flex-col overflow-hidden rounded-4xl lg:overflow-visible p-4 sm:min-h-60 sm:flex-row sm:rounded-5xl sm:px-8 sm:py-6 lg:h-81 lg:gap-6 lg:px-10 lg:pt-8 lg:pb-10"
    style="background-image: linear-gradient(144deg, var(--color-neutral-3) 11%, #652210 75%, #922000 97%)"
    :style="{ '--px': tilt.x, '--py': tilt.y }"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <!-- a warm glow behind the chicken that drifts against the pointer: the art seems to stand in front of it -->
    <span class="kd-hero-glow pointer-events-none absolute top-1/2 right-[8%] hidden size-96 -translate-y-1/2 rounded-full sm:block" aria-hidden="true" />

    <!-- Mobile: art sits in the flow above the text -->
    <div class="relative -mx-4 -mt-4 mb-2 h-28 overflow-hidden sm:hidden">
      <button ref="artMobile" type="button" class="kd-hero-poke absolute -top-2 left-1" :aria-label="$t('hero.pokeLabel')" @click="poke">
        <span :key="jolt" class="kd-hero-jolt block" :class="jolt && 'is-on'">
          <img src="/img/brand/hero-mascot.webp" alt="" class="h-36 w-auto max-w-none" draggable="false" />
        </span>
      </button>
      <span v-if="!egg" class="kd-hero-bubble type-10-caps absolute top-3 right-4 rounded-md px-2 py-1">{{ $t(bubble) }}</span>
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

    <!-- Desktop art: bob (idle) → lean (pointer) → jolt (tap), one wrapper each so they never fight -->
    <div class="kd-hero-bob pointer-events-none absolute top-[calc(50%-3.5px)] right-0 hidden sm:block lg:right-[31px]">
      <button ref="art" type="button" class="kd-hero-poke kd-hero-lean pointer-events-auto block" :aria-label="$t('hero.pokeLabel')" @click="poke">
        <span :key="jolt" class="kd-hero-jolt block" :class="jolt && 'is-on'">
          <img
            src="/img/brand/hero-mascot.webp"
            alt=""
            fetchpriority="high"
            class="h-[min(115%,379px)] w-auto max-w-none sm:h-[276px] lg:h-[379px] lg:w-[568px] lg:object-cover"
            draggable="false"
          />
        </span>
      </button>
      <span v-if="!egg" class="kd-hero-bubble type-12-caps absolute top-6 right-[38%] rounded-lg px-2.5 py-1.5">{{ $t(bubble) }}</span>
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
/* idle: a slow bob, so the chicken never stands dead still */
.kd-hero-bob {
  translate: 0 -50%;
  animation: kd-hero-bob 3.2s var(--ease-in-out) infinite;
}
@keyframes kd-hero-bob {
  50% {
    translate: 0 calc(-50% - 6px);
  }
}
/* follows the pointer: leans toward it */
.kd-hero-lean {
  transform: translate(calc(var(--px, 0) * 14px), calc(var(--py, 0) * 10px)) rotate(calc(var(--px, 0) * 2.5deg));
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-hero-glow {
  background: radial-gradient(closest-side, rgb(255 120 40 / 0.45), transparent);
  transform: translate(calc(var(--px, 0) * -30px), calc(var(--py, 0) * -20px));
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-hero-poke {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* the tap: a squash, a kick back and a settle */
.kd-hero-jolt.is-on {
  animation: kd-hero-jolt 0.46s var(--ease-out);
  transform-origin: 60% 80%;
}
@keyframes kd-hero-jolt {
  20% {
    transform: scale(1.06, 0.92) rotate(-4deg);
  }
  45% {
    transform: scale(0.96, 1.06) rotate(3deg) translateY(-8px);
  }
  70% {
    transform: scale(1.02, 0.98) rotate(-1deg);
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
  .kd-hero-bubble {
    animation: none;
  }
}
</style>
