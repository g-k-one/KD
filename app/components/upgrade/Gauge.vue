<script setup lang="ts">
/*
 * Figma "UpgradeGauge" (Section 3, node 772:30685), built from its layers:
 *   dial.svg  — ticks, track ring and the 0 / 50 / 100 labels
 *   arc-1..3  — vertical green→pink gradient + colour-dodge rim + darkening centre, masked to the chance
 *   core.svg  — inner disc with the readout
 *   pointer   — white arrow at the bottom; the whole layer turns around the centre
 *
 * 0 sits at the bottom, 100 at the top. The pointer's distance from the bottom (0–180°) maps to the
 * roll (0–100), so it lands inside the arc exactly when roll < chance.
 *
 * Spin, built for suspense:
 *   1. wind-up  — the pointer pulls back a little while the arc charges
 *   2. turns    — fast laps with ticks
 *   3. crawl    — the last stretch slows to a creep; near the edge of the chance it crawls longer,
 *                 with a heartbeat. The core shows the live value under the pointer, green inside
 *                 the chance and red outside, so every pass through the zone is felt.
 * Clicking the dial skips straight to the result.
 */
const props = defineProps<{ chance: number; state: 'idle' | 'spinning' | 'win' | 'lose' }>()
const { t } = useI18n()
const sfx = useSfx()

const pointer = useTemplateRef<HTMLElement>('pointer')
let angle = 0

const pct = computed(() => props.chance / 100)
const pctShown = useTransition(pct, { duration: 500, transition: [0.22, 1, 0.36, 1] })
const tier = computed(() => (pct.value >= 60 ? 'high' : pct.value >= 30 ? 'medium' : 'low'))

// Live readout while spinning
const live = ref<number | null>(null)
const phase = ref<'idle' | 'charge' | 'turns' | 'crawl'>('idle')
const inside = computed(() => live.value != null && live.value < pct.value)
/** After a spin the core keeps the rolled value until the next change */
const rolled = ref<number | null>(null)
watch(
  () => props.chance,
  () => props.state === 'idle' && (rolled.value = null),
)

const label = computed(() => {
  if (props.state === 'win') return t('upgrade.win')
  if (props.state === 'lose') return t('upgrade.lose')
  if (props.state === 'spinning') return t('upgrade.rolling')
  return t(`upgrade.${tier.value}Chance`)
})

const valueAt = (deg: number) => {
  const d = ((deg % 360) + 360) % 360
  return (Math.min(d, 360 - d) / 180) * 100
}
const currentDeg = (el: HTMLElement) => {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  return (Math.atan2(m.b, m.a) * 180) / Math.PI
}

let active: Animation | null = null
let skipping = false
function skip() {
  skipping = true
  active?.finish()
}

async function step(el: HTMLElement, from: number, to: number, duration: number, easing: string) {
  const anim = el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], {
    duration: skipping ? 1 : duration,
    easing,
    fill: 'forwards',
  })
  active = anim
  await animationDone(anim, skipping ? 1 : duration)
  el.style.transform = `rotate(${to}deg)`
  anim.cancel()
  active = null
}

async function spin(roll: number, fast: boolean) {
  const el = pointer.value
  if (!el) return
  skipping = false
  rolled.value = null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Final angle: either side of the bottom, chosen at random
  const half = (roll / 100) * 180
  const target = Math.random() < 0.5 ? half : 360 - half
  const from = ((angle % 360) + 360) % 360
  const turns = reduced ? 0 : fast ? 2 : 4
  let to = target + 360 * turns
  while (to < from + 200) to += 360

  // Close calls crawl longer: within 8 points of the edge either way
  const edge = Math.abs(roll - pct.value) < 8
  const crawlDeg = reduced ? 0 : edge ? 70 : 40
  const crawlMs = fast ? (edge ? 900 : 500) : edge ? 2600 : 1500

  // Live value + ticks + heartbeat
  let raf = 0
  let lastTick = 0
  let lastBeat = 0
  const watchPointer = (now: number) => {
    const v = valueAt(currentDeg(el))
    const bucket = Math.floor(v / 3.3)
    if (live.value != null && bucket !== Math.floor(live.value / 3.3) && now - lastTick > 30) {
      lastTick = now
      sfx.tick()
    }
    live.value = v
    if (phase.value === 'crawl' && edge && now - lastBeat > 520) {
      lastBeat = now
      sfx.heart()
    }
    raf = requestAnimationFrame(watchPointer)
  }
  raf = requestAnimationFrame(watchPointer)

  if (!reduced) {
    phase.value = 'charge'
    await step(el, from, from - 16, fast ? 220 : 480, 'cubic-bezier(0.45, 0, 0.55, 1)')
  }
  phase.value = 'turns'
  await step(el, reduced ? from : from - 16, to - crawlDeg, reduced ? 200 : fast ? 1300 : 3200, 'cubic-bezier(0.32, 0, 0.18, 1)')
  if (crawlDeg) {
    phase.value = 'crawl'
    await step(el, to - crawlDeg, to, crawlMs, 'cubic-bezier(0.1, 0.55, 0.15, 1)')
  }

  cancelAnimationFrame(raf)
  angle = to % 360
  live.value = null
  rolled.value = roll
  phase.value = 'idle'
}

function reset() {
  angle = 0
  rolled.value = null
  if (pointer.value) pointer.value.style.transform = 'rotate(0deg)'
}

defineExpose({ spin, reset, skip })

const readout = computed(() => {
  if (live.value != null) return live.value.toFixed(2)
  if (rolled.value != null && (props.state === 'win' || props.state === 'lose')) return rolled.value.toFixed(2)
  return `${pctShown.value.toFixed(1)}%`
})
</script>

<template>
  <div
    class="kd-gauge relative aspect-square w-full max-w-72 select-none lg:max-w-90"
    :class="[`is-${state}`, `tier-${tier}`, `ph-${phase}`, inside && 'is-inside', live != null && !inside && 'is-outside']"
    :title="state === 'spinning' ? t('case.skipHint') : undefined"
    :style="{ '--chance': pct / 100 }"
    @click="state === 'spinning' && skip()"
  >
    <!-- Ticks, track and labels -->
    <div class="pointer-events-none absolute inset-[-0.42%_-1.15%_-0.59%_-1.49%]">
      <img src="/img/gauge/dial.svg" alt="" class="block size-full max-w-none" draggable="false" />
    </div>

    <!-- Chance arc: three Figma layers, masked to the chance -->
    <div class="kd-gauge-arc absolute inset-[6.1%] rounded-full">
      <img src="/img/gauge/arc-1.svg" alt="" class="absolute inset-0 size-full" draggable="false" />
      <img src="/img/gauge/arc-2-dodge.svg" alt="" class="kd-dodge absolute inset-0 size-full" draggable="false" />
      <img src="/img/gauge/arc-3.svg" alt="" class="kd-darker absolute inset-0 size-full" draggable="false" />
    </div>

    <!-- Core with the readout -->
    <img src="/img/gauge/core.svg" alt="" class="pointer-events-none absolute inset-[17.5%] size-[65%]" draggable="false" />
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center uppercase">
      <span class="kd-gauge-value text-[clamp(28px,11vw,48px)] leading-[1.08] font-extrabold tracking-[-0.01em] tabular-nums">
        {{ readout }}
      </span>
      <Transition name="kd-label" mode="out-in">
        <span :key="label" class="type-12-caps sm:type-16-caps text-neutral-15 sm:font-bold">{{ label }}</span>
      </Transition>
    </div>

    <!-- Pointer layer turns around the centre; rotate(0) = bottom -->
    <img ref="pointer" src="/img/gauge/pointer.svg" alt="" class="kd-gauge-pointer pointer-events-none absolute inset-0 size-full" draggable="false" />
  </div>
</template>

<style scoped>
.kd-gauge {
  transition: --chance 700ms var(--ease-out);
}
.kd-gauge.is-spinning {
  cursor: pointer;
}
.kd-gauge-arc {
  isolation: isolate;
  mask: conic-gradient(
    from 180deg,
    #000 0deg calc(var(--chance) * 180deg),
    transparent calc(var(--chance) * 180deg) calc(360deg - var(--chance) * 180deg),
    #000 calc(360deg - var(--chance) * 180deg)
  );
  transition: filter var(--dur-slow) var(--ease-out);
}
.kd-dodge {
  mix-blend-mode: color-dodge;
}
.kd-darker {
  mix-blend-mode: multiply;
}
@supports (mix-blend-mode: plus-darker) {
  .kd-darker {
    mix-blend-mode: plus-darker;
  }
}
.kd-gauge-pointer {
  transform-origin: 50% 50%;
}

.kd-gauge-value {
  transition: color var(--dur-fast) var(--ease-out);
}
.tier-high .kd-gauge-value {
  color: var(--color-success);
}
.tier-medium .kd-gauge-value {
  color: var(--color-coin);
}
.tier-low .kd-gauge-value {
  color: var(--color-danger);
}
/* While spinning the value is the pointer's: green inside the chance, red outside */
.is-inside .kd-gauge-value {
  color: var(--color-success);
}
.is-outside .kd-gauge-value {
  color: var(--color-danger);
}

/* Wind-up: the arc charges */
.ph-charge .kd-gauge-arc {
  animation: kd-charge 480ms var(--ease-in-out) both;
}
@keyframes kd-charge {
  60% {
    filter: brightness(1.5) drop-shadow(0 0 18px rgb(255 125 32 / 0.7));
  }
}
/* The arc lights up every time the pointer passes through it */
.is-inside .kd-gauge-arc {
  filter: brightness(1.35) drop-shadow(0 0 16px rgb(18 183 106 / 0.6));
}
/* The crawl: the whole dial leans in */
.kd-gauge.ph-crawl {
  animation: kd-lean 1.4s var(--ease-in-out) infinite;
}
@keyframes kd-lean {
  50% {
    scale: 1.025;
  }
}

/* Result */
.is-win .kd-gauge-arc {
  filter: brightness(1.25) drop-shadow(0 0 24px rgb(18 183 106 / 0.85));
}
.is-win .kd-gauge-value {
  color: var(--color-success);
}
.is-lose .kd-gauge-arc {
  filter: grayscale(0.85) brightness(0.6);
}
.is-lose .kd-gauge-value {
  color: var(--color-danger);
}
.is-win .kd-gauge-value,
.is-lose .kd-gauge-value {
  animation: kd-value-pop 600ms var(--ease-spring);
}
@keyframes kd-value-pop {
  40% {
    transform: scale(1.14);
  }
}
.is-lose .kd-gauge-pointer {
  animation: kd-pointer-shake 420ms var(--ease-out);
}
@keyframes kd-pointer-shake {
  25%,
  75% {
    translate: -3px 0;
  }
  50% {
    translate: 3px 0;
  }
}

.kd-label-enter-active,
.kd-label-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}
.kd-label-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.kd-label-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
