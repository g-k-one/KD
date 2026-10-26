<script setup lang="ts">
// The banner art as a stage in depth (home hero, the Provably Fair hero): a 600×400 board, scaled per breakpoint by
// the parent's slot, layers drawn back to front. Interactive the way mascots are built:
//   idle    — the mascot bobs, the loot floats, the rays turn
//   pointer — every layer moves by its depth (--d; near ones more), from the --px / --py the banner sets (usePointerTilt)
//   poke    — a short reaction that interrupts and hands back: the mascot jolts and squawks, feathers puff (Forge),
//             the loot kicks outward; the banner gets `poke` with the count and decides what else happens (an egg…)
// Loot is a picture (a skin, a coin) or a label (a chip of text: the PF hero floats the player's own seeds).
export interface StageLayer {
  src: string
  x: number
  y: number
  w: number
  /** depth: how far the pointer moves it */
  d: number
}
export interface StageLoot {
  src?: string
  label?: string
  x: number
  y: number
  w?: number
  /** tilt, degrees */
  r: number
  d: number
  /** which way a poke kicks it, px */
  bx: number
  by: number
  /** left out on phones (a label there is drawn twice as big and needs the room) */
  wideOnly?: boolean
}
const props = withDefaults(
  defineProps<{
    /** drawn behind the mascot (the case's back) */
    back?: StageLayer[]
    mascot: StageLayer
    /** drawn over the mascot (the case's front wall) */
    front?: StageLayer[]
    loot?: StageLoot[]
    /** the rays' centre on the board and their colour */
    rays?: { x: number; y: number; color: string }
    /** the speech bubble's words and place; none when empty */
    bubble?: string
    bubbleAt?: { x: number; y: number }
    pokeLabel: string
  }>(),
  { back: () => [], front: () => [], loot: () => [], bubbleAt: () => ({ x: 420, y: 2 }) },
)
const emit = defineEmits<{ poke: [count: number] }>()

const sfx = useSfx()
const haptics = useHaptics()
const fx = useForge()
const mascotEl = useTemplateRef<HTMLElement>('mascotEl')
// bumped on every poke: the key of the jolt and the loot's kick, so their keyframes restart even mid-way
const jolt = ref(0)
function poke() {
  jolt.value += 1
  haptics.tap()
  sfx.squawk()
  fx.at('feathers:white', mascotEl.value, 0.7)
  emit('poke', jolt.value)
}
/** a gold burst on the mascot, for the banner's big moment */
function burst() {
  haptics.jackpot()
  fx.at('kdJackpot', mascotEl.value, 1)
}
defineExpose({ burst })
// Desktop: the board scales with its slot's height (it was drawn for a 324 px banner at 0.84), so a banner that is
// shorter (one line of title) keeps the art inside it instead of pushing it up into the live strip
const board = useTemplateRef<HTMLElement>('board')
const slotH = ref(0)
useResizeObserver(() => board.value?.parentElement, ([e]) => (slotH.value = e!.contentRect.height))
const k = computed(() => (slotH.value ? Math.min(0.84, (slotH.value / 324) * 0.84) : 0.84))
const at = (l: { x: number; y: number; d: number; w?: number }) => ({ left: `${l.x}px`, top: `${l.y}px`, width: l.w ? `${l.w}px` : undefined, '--d': l.d })
</script>

<template>
  <div ref="board" class="kd-stage absolute" :style="{ '--k': k }">
    <span v-if="rays" class="kd-stage-rays kd-depth absolute" :style="{ ...at({ x: rays.x - 260, y: rays.y - 260, d: -0.4 }), '--ray': rays.color }" aria-hidden="true" />
    <img v-for="(l, i) in back" :key="`b${i}`" :src="l.src" alt="" draggable="false" class="kd-depth pointer-events-none absolute" :style="at(l)" />
    <!-- the mascot: bob (idle) → depth (pointer) → jolt (tap), one wrapper each so they never fight -->
    <button ref="mascotEl" type="button" class="kd-stage-poke kd-depth absolute" :style="at(mascot)" :aria-label="pokeLabel" @click="poke">
      <span class="kd-stage-bob block">
        <span :key="jolt" class="kd-stage-jolt block" :class="jolt > 0 && 'is-on'">
          <img :src="mascot.src" alt="" draggable="false" fetchpriority="high" class="block w-full" />
        </span>
      </span>
    </button>
    <img v-for="(l, i) in front" :key="`f${i}`" :src="l.src" alt="" draggable="false" class="kd-depth pointer-events-none absolute" :style="at(l)" />
    <!-- the loot: floats on its own, the pointer moves it by depth, a poke kicks it outward -->
    <span v-for="(it, i) in loot" :key="`l${i}`" class="kd-depth pointer-events-none absolute" :class="it.wideOnly && 'max-sm:hidden'" :style="at(it)">
      <span :key="jolt" class="kd-stage-kick block" :class="jolt > 0 && 'is-on'" :style="{ '--bx': `${it.bx}px`, '--by': `${it.by}px` }">
        <img v-if="it.src" :src="it.src" alt="" draggable="false" class="kd-stage-float block w-full" :style="{ '--r': `${it.r}deg`, animationDelay: `${i * -0.7}s` }" />
        <span
          v-else
          class="kd-stage-float kd-stage-chip type-14 block rounded-lg px-3 py-2 whitespace-nowrap tabular-nums"
          :style="{ '--r': `${it.r}deg`, animationDelay: `${i * -0.7}s`, transformOrigin: it.x > 300 ? '100% 50%' : '0 50%' }"
        >{{ it.label }}</span>
      </span>
    </span>
    <span v-if="bubble" class="kd-stage-bubble type-12-caps absolute rounded-lg px-2.5 py-1.5" :style="{ left: `${bubbleAt.x}px`, top: `${bubbleAt.y}px` }">{{ bubble }}</span>
  </div>
</template>

<style scoped>
/* the board: 600×400 design pixels; its bottom sits on the slot's bottom */
.kd-stage {
  width: 600px;
  height: 400px;
  left: 50%;
  /* phones: the board fits a 176 px band whole (400 × 0.44) */
  bottom: 0;
  transform-origin: 50% 100%;
  transform: translateX(-50%) scale(0.44);
}
@media (min-width: 40rem) {
  .kd-stage {
    bottom: -10px;
    transform: translateX(-50%) scale(0.72);
  }
}
@media (min-width: 64rem) {
  .kd-stage {
    bottom: -2px;
    transform: translateX(-50%) scale(var(--k, 0.84));
  }
}

/* every layer moves with the pointer by its depth (--d): near ones more, the rays a little the other way */
.kd-depth {
  transform: translate(calc(var(--px, 0) * var(--d) * 16px), calc(var(--py, 0) * var(--d) * 10px));
  transition: transform var(--dur-slow) var(--ease-out);
}

/* light pouring out: soft fans turning slowly (one layer, transform only) */
.kd-stage-rays {
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, var(--ray) 0deg 8deg, transparent 8deg 22deg);
  mask-image: radial-gradient(closest-side, #000 20%, transparent 70%);
  animation: kd-stage-rays 26s linear infinite;
}
@keyframes kd-stage-rays {
  to {
    rotate: 360deg;
  }
}

.kd-stage-poke {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
/* idle: the mascot rides up and down */
.kd-stage-bob {
  animation: kd-stage-bob 2.6s var(--ease-in-out) infinite;
}
@keyframes kd-stage-bob {
  50% {
    transform: translateY(-14px) rotate(-2deg);
  }
}
/* the tap: a squash, a kick up and a settle */
.kd-stage-jolt.is-on {
  animation: kd-stage-jolt 0.5s var(--ease-out);
  transform-origin: 50% 85%;
}
@keyframes kd-stage-jolt {
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
.kd-stage-float {
  rotate: var(--r);
  animation: kd-stage-float 3.4s var(--ease-in-out) infinite;
}
img.kd-stage-float {
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.45));
}
@keyframes kd-stage-float {
  50% {
    transform: translateY(-10px) rotate(4deg);
  }
}
/* a label floating like loot: a glassy code chip. Phones draw the board at 0.44, so a chip doubles (`scale`, apart
   from the float's transform) to stay readable, growing away from the board's nearer edge */
@media (max-width: 39.999rem) {
  .kd-stage-chip {
    scale: 2;
  }
}
.kd-stage-chip {
  color: var(--color-neutral-14);
  background: rgb(12 13 16 / 0.72);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.12),
    0 8px 20px rgb(0 0 0 / 0.4);
  font-family: var(--font-mono, ui-monospace, monospace);
}
/* a poke kicks the loot out and lets it drift back */
.kd-stage-kick.is-on {
  animation: kd-stage-kick 0.7s var(--ease-out);
}
@keyframes kd-stage-kick {
  30% {
    transform: translate(var(--bx), var(--by)) scale(1.08);
  }
}

.kd-stage-bubble {
  z-index: 2;
  color: var(--color-neutral-1);
  background: var(--color-neutral-15);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.35);
  animation: kd-stage-nudge 1.6s var(--ease-out) infinite;
  pointer-events: none;
}
/* the bubble's tail */
.kd-stage-bubble::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 14px;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: rotate(45deg);
}
@keyframes kd-stage-nudge {
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
@media (prefers-reduced-motion: reduce) {
  .kd-stage-bob,
  .kd-stage-float,
  .kd-stage-rays,
  .kd-stage-bubble {
    animation: none;
  }
}
</style>
