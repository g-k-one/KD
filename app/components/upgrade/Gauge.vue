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
 * Spin, built for suspense — one continuous curve, no speed jumps between phases:
 *   1. wind-up  — the pointer pulls back a little while the arc charges
 *   2. turns    — fast laps with ticks
 *   3. crawl    — the long tail of the same curve; near the edge of the chance it lasts longer and
 *                 carries a heartbeat (sound only — the dial itself stays calm, no strobing or pulsing).
 * Landing (docs/motion.md → Upgrade): won — the arc flares once and settles bright, the number pops;
 * lost — the arc drains to grey and the number gives one short shake. The pointer never jumps.
 * The core shows the chance; after the roll, the verdict in words ("Won!" / "Missed") and under it the numbers
 * that explain it ("Rolled 94.92" / "wins if the roll is under 60.37"); before a roll the same small line
 * explains the ring: it is a 0–100 roll that wins under the chance.
 * Clicking the dial skips straight to the result.
 *
 * KURWADROP on the dial (presentation only, like the case reel — no extra chance, no surcharge): the lowest
 * tenth of the chance arc, right by the 0, is gold. A win that lands in it brings the Golden Chicken up
 * from under the dial with the KD-coin jackpot.
 */
const props = defineProps<{ chance: number; state: 'idle' | 'spinning' | 'win' | 'lose'; nonce?: number | null }>()
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
  if (props.state === 'win' || props.state === 'lose') return t('upgrade.rolledLine', { roll: rolled.value?.toFixed(2) ?? '—' })
  if (props.state === 'spinning') return t('upgrade.rolling')
  if (!pct.value) return t('upgrade.chance')
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

  // One continuous motion: a short wind-up back, then the turns and the long creep in a single curve
  // that starts and ends at rest — no speed jumps between phases. Close calls get a longer tail.
  const wind = reduced ? 0 : 8
  const total = reduced ? 200 : (fast ? 1500 : 4200) + (fast ? 0 : edge ? 1500 : 500)
  const windMs = reduced ? 0 : fast ? 200 : 450
  phase.value = reduced ? 'turns' : 'charge'
  const anim = el.animate(
    [
      { transform: `rotate(${from}deg)`, easing: EASE_SINE },
      { transform: `rotate(${from - wind}deg)`, offset: windMs / total, easing: edge ? 'cubic-bezier(0.3, 0, 0.04, 1)' : 'cubic-bezier(0.3, 0, 0.1, 1)' },
      { transform: `rotate(${to}deg)` },
    ],
    { duration: skipping ? 1 : total, fill: 'forwards' },
  )
  active = anim
  // Phases by time: wind-up, turns, and the crawl (last ~40% of the curve, where the heartbeat plays)
  const phaseTimer = setInterval(() => {
    const ms = Number(anim.currentTime ?? 0)
    phase.value = ms < windMs ? 'charge' : ms < total * 0.6 ? 'turns' : 'crawl'
  }, 60)
  await animationDone(anim, skipping ? 1 : total)
  clearInterval(phaseTimer)
  el.style.transform = `rotate(${to}deg)`
  anim.cancel()
  active = null

  cancelAnimationFrame(raf)
  angle = to % 360
  live.value = null
  rolled.value = roll
  phase.value = 'idle'
}

function reset() {
  rolled.value = null
  const el = pointer.value
  if (!el) return
  // Glide back to zero the short way round instead of snapping
  const from = ((angle % 360) + 360) % 360
  const back = from > 180 ? 360 : 0
  el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${back}deg)` }], { duration: 500, easing: EASE_OUT })
  el.style.transform = 'rotate(0deg)'
  angle = 0
}

defineExpose({ spin, reset, skip })

// The core shows the chance; after the roll it shows the rolled number with a plain verdict under it
// ("Roll under 54.60 · won"), so the number never needs explaining. The live value only tints the dial.
const showRoll = computed(() => rolled.value != null && (props.state === 'win' || props.state === 'lose'))
/** Close calls: within 3 points of the edge either way */
const chickenMood = computed(() => {
  if (rolled.value == null || !showRoll.value) return null
  const d = Math.abs(rolled.value - pct.value)
  if (d >= 3) return null
  return props.state === 'win' ? ('nearWin' as const) : ('nearLose' as const)
})
watch(chickenMood, (m) => m && sfx.squawk())
// After the roll the big line is the verdict in words, the small line explains it with the numbers
const readout = computed(() =>
  showRoll.value ? (props.state === 'win' ? t('upgrade.verdictWin') : t('upgrade.verdictLose')) : pct.value ? `${pctShown.value.toFixed(1)}%` : '—',
)
</script>

<template>
  <div
    class="kd-gauge @container relative aspect-square w-full max-w-72 select-none lg:max-w-80"
    :class="[`is-${state}`, `tier-${tier}`, `ph-${phase}`, inside && 'is-inside', live != null && !inside && 'is-outside', !pct && 'is-empty']"
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
      <span class="kd-gauge-value text-[clamp(22px,18cqw,48px)] leading-[1.08] font-extrabold tracking-[-0.01em] tabular-nums">
        {{ readout }}
      </span>
      <UiTextSwap v-if="!showRoll" :text="label" class="type-12-caps sm:type-16-caps max-w-[62%] text-neutral-15 sm:font-bold" />
      <!-- after a roll: the verdict above, one tap under it to check the roll in the verifier -->
      <UiButton v-if="showRoll && nonce" variant="fair-soft" size="s" icon="shield-check" class="kd-verify mt-1 px-3" @click.stop="navigateTo(`/fairness?verify=${nonce}`)">{{ $t('upgrade.verifyRoll') }}</UiButton>
    </div>

    <!-- the meme chicken peeks out on close calls: won by a hair, missed by a hair -->
    <UpgradeChicken :mood="chickenMood" :margin="rolled != null ? Math.abs(rolled - pct) : undefined" />

    <!-- Pointer layer turns around the centre; rotate(0) = bottom -->
    <img ref="pointer" src="/img/gauge/pointer.svg" alt="" class="kd-gauge-pointer pointer-events-none absolute inset-0 size-full" draggable="false" />
  </div>
</template>

<style scoped>
.kd-verify {
  pointer-events: auto;
}
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
/* Nothing staked yet: a neutral dash, not an alarming red */
.is-empty .kd-gauge-value {
  color: var(--color-neutral-10);
}
/* While spinning the number stays calm and white — no red/green flicker as the pointer passes */
.is-spinning .kd-gauge-value {
  color: var(--color-neutral-15);
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
/* Result. Won: one short flare, then the arc just stays a little brighter — no halo around the wheel */
.is-win .kd-gauge-arc {
  filter: brightness(1.15);
  animation: kd-arc-flare 600ms var(--ease-out);
}
@keyframes kd-arc-flare {
  25% {
    filter: brightness(1.5);
  }
}
.is-win .kd-gauge-value {
  color: var(--color-success);
  animation: kd-value-pop 600ms var(--ease-spring);
}
@keyframes kd-value-pop {
  40% {
    transform: scale(1.16);
  }
}
/* Lost: one light beat — the arc's colour drains in the same 500 ms as the target card's (no shake, no particles) */
.kd-gauge-arc {
  transition: filter 500ms var(--ease-out);
}
.is-lose .kd-gauge-arc {
  filter: grayscale(1) brightness(0.5);
}
.is-lose .kd-gauge-value {
  color: var(--color-danger);
}
/* Lost, around the dial: two thin red rings ripple out from its rim and fade, and a soft red light breathes out
   once behind it (transform and opacity only) */
.kd-gauge::before,
.kd-gauge::after {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
}
.kd-gauge.is-lose::before {
  box-shadow: 0 0 0 2px rgb(var(--danger-rgb) / 0.7);
  animation: kd-lose-ring 900ms var(--ease-out) 80ms both;
}
.kd-gauge.is-lose::after {
  z-index: -1;
  background: radial-gradient(closest-side, transparent 72%, rgb(var(--danger-rgb) / 0.28) 86%, transparent);
  animation: kd-lose-glow 1400ms var(--ease-out) both;
}
@keyframes kd-lose-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.98);
  }
  100% {
    opacity: 0;
    transform: scale(1.16);
  }
}
@keyframes kd-lose-glow {
  0% {
    opacity: 0;
    transform: scale(0.94);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.08);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-gauge.is-lose::before,
  .kd-gauge.is-lose::after {
    animation: none;
  }
}
</style>
