<script setup lang="ts">
import type { CaseDetails, CaseItem, InventoryItem, Item } from '#shared/types/api'
import { goldenChicken, KURWA_CHICKEN_ID } from '#shared/kurwadrop'

/*
 * Figma "CaseReel". x1 = one horizontal reel under the top/bottom markers,
 * x2–x5 = vertical reels side by side with markers on the left and right (desktop).
 * On phones x2–x5 become a grid of mini reels (2 or 3 per row, 2 rows max for x4/x5).
 * The reel keeps one height for x1–x5 (278 desktop, 320 phone); rows split that height.
 * so every result keeps room for its name and Sell button.
 *
 * Motion: a long deceleration that overshoots the centre by a random part of a card,
 * then a short correction back onto the winner — the "almost landed on the next one" beat.
 * A rAF loop counts cards crossing the marker to drive the tick sound.
 */
const props = defineProps<{
  data: CaseDetails
  count: number
  phase: 'idle' | 'spinning' | 'result'
  results: InventoryItem[]
  soldUids: string[]
  demo?: boolean
  /** KURWADROP on: the Golden Chicken shows up on the reel at its real odds */
  kurwadrop?: boolean
}>()
const emit = defineEmits<{ sell: [uid: string] }>()

const sfx = useSfx()
const root = useTemplateRef<HTMLElement>('root')
const { width: rootW, height: rootH } = useElementSize(root)

const STRIP = 56
const WIN = STRIP - 7
const START = 3

const horizontal = computed(() => props.count === 1)
const isMobile = useMediaQuery('(max-width: 639.98px)')
const cardW = computed(() => (isMobile.value ? 184 : 222))
// Phone grid for x2–x5, inside the same 320px as x1
const MOBILE_H = 320
const GRID_GAP = 8
const grid = computed(() => !horizontal.value && isMobile.value)
const cols = computed(() => (props.count === 2 || props.count === 4 ? 2 : 3))
const rows = computed(() => Math.ceil(props.count / cols.value))
const rowH = computed(() => (MOBILE_H - (rows.value - 1) * GRID_GAP) / rows.value)
const compact = computed(() => grid.value && rows.value > 1)
const cardH = computed(() => (compact.value ? 76 : isMobile.value ? 150 : 200))
/** Length of one vertical reel window: a grid cell on phones (minus its 2px frame), the whole reel on desktop. */
const cellLen = computed(() => (grid.value ? rowH.value - 4 : rootH.value))
/** Centres an incomplete last row (x5 → 3 + 2) on a doubled column track. */
function cellStyle(i: number) {
  if (!grid.value) return {}
  const c = cols.value
  const lastRowStart = (rows.value - 1) * c
  const inLast = props.count - lastRowStart
  const start = i >= lastRowStart && inLast < c ? (i - lastRowStart) * 2 + (c - inLast) + 1 : (i % c) * 2 + 1
  return { gridColumn: `${start} / span 2` }
}

// Filler follows the case's real odds; the winning item itself comes from the server roll.
const chicken = computed(() => goldenChicken(props.data.kurwadrop.chickenTickets))
const fillerPool = computed<CaseItem[]>(() => (props.kurwadrop ? [chicken.value, ...props.data.items] : props.data.items))
const kurwaPool = computed(() => props.data.items.filter((i) => props.data.kurwadrop.poolIds.includes(i.id)))
const filler = (rand?: () => number, pool: CaseItem[] = fillerPool.value): Item => pickByTickets(pool, rand)

const strips = ref<Item[][]>([])
const tracks = ref<HTMLElement[]>([])
const landed = ref<boolean[]>([])
// SSR and first client render use a deterministic strip (no hydration mismatch); spins randomize.
function stripFor(col: number, winner?: Item, keep?: Item, random = true, pool?: CaseItem[]) {
  const rand = random ? undefined : seeded(col + 1)
  const s = Array.from({ length: STRIP }, () => filler(rand, pool))
  if (keep) s[START] = keep
  if (winner) s[WIN] = winner
  return s
}
function buildStrips(n: number, winners?: Item[], keep?: Item[], random = true) {
  strips.value = Array.from({ length: n }, (_, col) => stripFor(col, winners?.[col], keep?.[col], random))
}
buildStrips(props.count, undefined, undefined, false)
watch(
  () => props.count,
  (n) => {
    tracks.value = []
    landed.value = []
    spunOnce = false
    buildStrips(n)
    nextTick(resetPositions)
  },
)

const centre = (len: number, size: number, i: number) => len / 2 - (i * size + size / 2)

function resetPositions() {
  tracks.value.forEach((t) => {
    t.getAnimations().forEach((a) => a.cancel())
    const off = horizontal.value ? centre(rootW.value, cardW.value, START) : centre(cellLen.value, cardH.value, START)
    t.style.transform = horizontal.value ? `translateX(${off}px)` : `translateY(${off}px)`
  })
}
onMounted(() => nextTick(resetPositions))
watch([rootW, rootH, grid], () => props.phase !== 'spinning' && props.phase !== 'result' && nextTick(resetPositions))

// Clicking the reel while it spins jumps straight to the result (Key-Drop's fast-forward)
let skipping = false
let active: Animation[] = []
function skip() {
  skipping = true
  active.forEach((a) => a.finish())
}

// Gold drops shake the frame once
const shaking = ref(false)

/** Columns whose reel just stopped on the Golden Chicken (the celebration plays on them) */
const chickenHit = ref<boolean[]>([])
const respinning = ref(false)
let spunOnce = false
const wait = (ms: number) => new Promise((r) => setTimeout(r, skipping ? 0 : ms))

/**
 * Animates the given columns onto `winners`. Columns not listed keep where they are.
 * `pool` restricts the filler (the KURWADROP respin shows only the expensive items).
 */
async function run(winners: Item[], fast: boolean, cols: number[], pool?: CaseItem[]) {
  active = []
  const keep = strips.value.map((s) => s[spunOnce ? WIN : START]!)
  strips.value = strips.value.map((s, col) => (cols.includes(col) ? stripFor(col, winners[col], keep[col], true, pool) : s))
  if (!strips.value.length) buildStrips(props.count, winners, keep)
  cols.forEach((c) => (landed.value[c] = false))
  await nextTick()

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const base = reduced ? 300 : fast ? 1600 : pool ? 3600 : 5600
  const len = horizontal.value ? rootW.value : cellLen.value
  const size = horizontal.value ? cardW.value : cardH.value
  const axis = horizontal.value ? 'X' : 'Y'
  const from = centre(len, size, START)
  const to = centre(len, size, WIN)

  // Tick when a card crosses the marker
  let raf = 0
  let lastIdx = START
  const first = tracks.value[cols[0]!]
  const watchTicks = () => {
    if (first) {
      const m = new DOMMatrixReadOnly(getComputedStyle(first).transform)
      const pos = horizontal.value ? m.m41 : m.m42
      const idx = Math.floor((len / 2 - pos) / size)
      if (idx !== lastIdx) {
        lastIdx = idx
        sfx.tick()
      }
    }
    raf = requestAnimationFrame(watchTicks)
  }
  if (!reduced) raf = requestAnimationFrame(watchTicks)

  await Promise.all(
    cols.map(async (col, order) => {
      const t = tracks.value[col]
      if (!t) return
      const overshoot = (Math.random() * 0.36 + 0.12) * size * (Math.random() < 0.5 ? 1 : -1)
      const duration = base + order * (fast ? 120 : 260)
      t.style.transform = `translate${axis}(${from}px)`
      const main = t.animate([{ transform: `translate${axis}(${from}px)` }, { transform: `translate${axis}(${to + overshoot}px)` }], {
        duration,
        easing: 'cubic-bezier(0.08, 0.6, 0.12, 1)',
        fill: 'forwards',
      })
      active.push(main)
      if (skipping) main.finish()
      await animationDone(main, duration)
      const settleMs = reduced || skipping ? 1 : 420
      const settle = t.animate([{ transform: `translate${axis}(${to + overshoot}px)` }, { transform: `translate${axis}(${to}px)` }], {
        duration: settleMs,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        fill: 'forwards',
      })
      await animationDone(settle, settleMs)
      t.style.transform = `translate${axis}(${to}px)`
      main.cancel()
      settle.cancel()
      landed.value[col] = true
      const w = winners[col]
      if (w && w.id !== KURWA_CHICKEN_ID) sfx.reveal(RARITY_TIER[w.rarity])
    }),
  )
  cancelAnimationFrame(raf)
  active = []
  spunOnce = true
}

async function spin(winners: Item[], fast: boolean, kurwa: boolean[] = []) {
  skipping = false
  chickenHit.value = []
  respinning.value = false
  landed.value = []
  const all = winners.map((_, i) => i)
  const hits = all.filter((i) => kurwa[i])

  // Roll 1: chicken columns land on the Golden Chicken
  await run(winners.map((w, i) => (kurwa[i] ? chicken.value : w)), fast, all)

  if (hits.length) {
    // The chicken grows, screams, and the respin starts among the expensive items only
    chickenHit.value = all.map((i) => kurwa[i]!)
    sfx.squawk()
    shaking.value = true
    setTimeout(() => (shaking.value = false), 600)
    await wait(fast ? 900 : 1700)
    respinning.value = true
    chickenHit.value = []
    await run(winners, fast, hits, kurwaPool.value)
    respinning.value = false
  }

  if (winners.some((w) => RARITY_TIER[w.rarity] >= 4)) {
    shaking.value = true
    setTimeout(() => (shaking.value = false), 600)
  }
}

defineExpose({ spin, skip })

const markerClass = computed(() => (horizontal.value ? 'kd-markers-h' : 'kd-markers-v'))
</script>

<template>
  <div
    ref="root"
    class="kd-reel relative rounded-5xl"
    :title="phase === 'spinning' ? $t('case.skipHint') : undefined"
    @click="phase === 'spinning' && skip()"
    :class="[shaking && 'is-shaking', (respinning || chickenHit.some(Boolean)) && 'is-kurwa', phase, horizontal ? 'is-h h-80 overflow-hidden sm:h-[278px]' : 'is-v', grid ? 'is-grid' : !horizontal && 'h-[278px] overflow-hidden']"
    :style="grid ? { height: `${MOBILE_H}px` } : undefined"
  >
    <!-- Horizontal (x1) -->
    <div v-if="horizontal" :ref="(el) => (tracks = el ? [el as HTMLElement] : [])" class="kd-reel-track absolute inset-y-0 left-0 flex items-center will-change-transform">
      <div
        v-for="(it, i) in strips[0]"
        :key="i"
        class="kd-reel-card relative flex shrink-0 flex-col items-center justify-center"
        :style="{ width: `${cardW}px` }"
        :data-win="(phase === 'result' && i === WIN) || undefined"
      >
        <FxBurst v-if="phase === 'result' && i === WIN" :tier="RARITY_TIER[it.rarity]" :color="RARITY_COLOR[it.rarity]" :size="isMobile ? 170 : 190" />
        <FxBurst v-if="chickenHit[0] && i === WIN" :tier="4" color="var(--color-item-gold)" :size="isMobile ? 200 : 230" />
        <ItemArt :image="it.image" :rarity="it.rarity" :size="isMobile ? 112 : 96" class="relative w-full" :class="chickenHit[0] && i === WIN && 'kd-chicken-hit'" />
      </div>
    </div>

    <!-- Vertical (x2–x5): one column per reel on desktop, a grid of framed mini reels on phones -->
    <div
      v-else
      class="kd-reel-track grid h-full"
      :class="grid && 'gap-2'"
      :style="{
        gridTemplateColumns: grid ? `repeat(${cols * 2}, minmax(0, 1fr))` : `repeat(${count}, minmax(0, 1fr))`,
        gridTemplateRows: grid ? `repeat(${rows}, minmax(0, 1fr))` : undefined,
      }"
    >
      <div
        v-for="(strip, col) in strips"
        :key="`${count}-${col}`"
        class="kd-cell relative h-full overflow-hidden"
        :class="grid ? 'is-framed rounded-3xl' : { 'border-l border-neutral-5': col > 0 }"
        :style="cellStyle(col)"
      >
        <div :ref="(el) => el && (tracks[col] = el as HTMLElement)" class="absolute inset-x-0 top-0 will-change-transform">
          <div
            v-for="(it, i) in strip"
            :key="i"
            class="kd-reel-card relative flex items-center justify-center"
            :style="{ height: `${cardH}px` }"
            :data-win="(landed[col] && i === WIN) || undefined"
          >
            <FxBurst v-if="landed[col] && i === WIN && !chickenHit[col] && it.id !== 'kurwa-chicken'" :tier="RARITY_TIER[it.rarity]" :color="RARITY_COLOR[it.rarity]" :size="compact ? 90 : 150" />
            <FxBurst v-if="chickenHit[col] && i === WIN" :tier="4" color="var(--color-item-gold)" :size="compact ? 110 : 180" />
            <ItemArt
              :class="chickenHit[col] && i === WIN && 'kd-chicken-hit'" :image="it.image" :rarity="it.rarity" :size="compact ? 52 : grid && cols === 3 ? 60 : isMobile ? 72 : 88" class="relative w-full" />
          </div>
        </div>

        <!-- Result inside its own reel -->
        <div class="pointer-events-none absolute inset-x-0 flex justify-center px-1 sm:bottom-5" :class="compact ? 'bottom-1.5' : 'bottom-3'">
          <Transition name="kd-result">
            <div v-if="landed[col] && results[col]" class="pointer-events-auto flex max-w-full min-w-0 flex-col items-center gap-1 sm:gap-2">
              <span v-if="!compact" class="type-10-caps sm:type-12-caps max-w-full truncate text-neutral-11">{{ results[col]!.weapon }}</span>
              <span class="type-12 sm:type-14 max-w-full truncate" :style="{ color: RARITY_COLOR[results[col]!.rarity] }">{{ results[col]!.skin }}</span>
              <span
                v-if="soldUids.includes(results[col]!.uid)"
                class="type-12-caps flex h-7 items-center gap-1 rounded-md border border-success bg-success-24 px-2 text-success sm:h-8"
              >
                {{ $t('wallet.sold') }}
              </span>
              <UiButton v-else-if="phase === 'result' && !demo" variant="light" size="s" class="max-sm:h-7 max-sm:px-2" @click="emit('sell', results[col]!.uid)">
                <span class="max-sm:hidden">{{ $t('wallet.sell') }}</span>
                <UiPrice :amount="results[col]!.price" size="s" tone="inverse" />
              </UiButton>
            </div>
          </Transition>
        </div>

        <div v-if="grid" class="kd-markers-v pointer-events-none absolute inset-0">
          <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-a absolute" />
          <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-b absolute" />
        </div>
      </div>
    </div>

    <!-- KURWADROP: the chicken screams, then the respin among the expensive items -->
    <Transition name="kd-kurwa">
      <div v-if="chickenHit.some(Boolean) || respinning" class="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
        <span class="kd-kurwa-banner type-16-caps rounded-lg px-3 py-1 text-neutral-1">{{ respinning ? $t('case.kurwaRespin') : $t('case.kurwaHit') }}</span>
      </div>
    </Transition>

    <!-- x1 result -->
    <div v-if="horizontal && phase === 'result' && results[0]" class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:bottom-5">
      <Transition name="kd-result" appear>
        <div class="pointer-events-auto flex min-w-0 flex-col items-center gap-1 sm:gap-2">
          <span class="type-12-caps max-w-full truncate text-neutral-11">{{ results[0].weapon }}</span>
          <span class="type-14 max-w-full truncate" :style="{ color: RARITY_COLOR[results[0].rarity] }">{{ results[0].skin }}</span>
          <span v-if="soldUids.includes(results[0].uid)" class="type-12-caps flex h-8 items-center gap-1.5 rounded-md border border-success bg-success-24 px-2 text-success">
            {{ $t('wallet.sold') }}
            <UiPrice :amount="results[0].price" size="s" tone="muted" />
          </span>
          <div v-else-if="!demo" class="flex gap-2">
            <UiButton variant="light" size="s" @click="emit('sell', results[0].uid)">
              {{ $t('wallet.sell') }}
              <UiPrice :amount="results[0].price" size="s" tone="inverse" />
            </UiButton>
            <UiButton variant="secondary" size="s" icon="upgrade" :to="`/upgrade?item=${results[0].uid}`">{{ $t('upgrade.upgrade') }}</UiButton>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Idle: the case sits in the centre while its contents drift by, blurred, behind it -->
    <Transition name="kd-idle">
      <div v-if="phase === 'idle'" class="kd-idle pointer-events-none absolute inset-0 overflow-hidden rounded-5xl">
        <div class="kd-drift absolute inset-y-0 left-0 flex items-center">
          <ItemArt
            v-for="(it, i) in [...data.items, ...data.items]"
            :key="i"
            :image="it.image"
            :rarity="it.rarity"
            :size="isMobile ? 80 : 88"
            class="w-44 shrink-0 sm:w-52"
          />
        </div>
        <img
          :src="data.image"
          :alt="data.name"
          class="kd-reel-case absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 object-contain sm:size-[230px]"
        />
      </div>
    </Transition>

    <div v-if="!grid" class="pointer-events-none absolute inset-0" :class="markerClass">
      <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-a absolute" />
      <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-b absolute" />
    </div>
  </div>
</template>

<style scoped>
.kd-reel-card {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring),
    filter var(--dur-slow) var(--ease-out);
}
/* Figma: grey frame that warms up to brand orange where the markers sit */
.kd-reel {
  border: 4px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(90deg, var(--color-neutral-7) 22%, var(--color-brand-base) 50%, var(--color-neutral-7) 78%) border-box;
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
.kd-reel.is-v {
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-7) 22%, var(--color-brand-base) 50%, var(--color-neutral-7) 78%) border-box;
}
.kd-reel.spinning {
  box-shadow: 0 0 32px -8px rgb(255 95 31 / 0.45);
}
/* Phone grid: the outer frame steps aside and every mini reel gets its own */
.kd-reel.is-grid {
  border: 0;
  background: none;
  box-shadow: none;
}
.kd-cell.is-framed {
  border: 2px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-7) 22%, var(--color-brand-base) 50%, var(--color-neutral-7) 78%) border-box;
}
.kd-reel.is-grid.spinning .kd-cell {
  box-shadow: 0 0 24px -8px rgb(255 95 31 / 0.45);
}
/* While idle on phones one big frame covers the grid, so the case still reads as one object */
.kd-reel.is-grid .kd-idle {
  border: 4px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-7) 22%, var(--color-brand-base) 50%, var(--color-neutral-7) 78%) border-box;
}
.kd-reel-track {
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-reel.idle .kd-reel-track {
  opacity: 0;
}
.kd-drift {
  width: max-content;
  filter: blur(4px) saturate(0.9);
  opacity: 0.55;
  animation: kd-drift 70s linear infinite;
  mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
}
@keyframes kd-drift {
  to {
    transform: translateX(-50%);
  }
}
.kd-idle-enter-active {
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-idle-leave-active {
  transition: opacity var(--dur-base) var(--ease-in);
}
.kd-idle-enter-from,
.kd-idle-leave-to {
  opacity: 0;
}
.kd-idle-leave-active .kd-reel-case {
  transition: transform var(--dur-base) var(--ease-in);
  transform: scale(1.2);
}
.kd-reel.spinning .kd-reel-card {
  opacity: 0.85;
}
.kd-reel.result .kd-reel-card:not([data-win]) {
  opacity: 0.18;
  filter: grayscale(0.6);
}
.kd-reel-card[data-win] {
  opacity: 1;
  transform: scale(1.18) translateY(-18px);
  z-index: 1;
  animation: kd-win-flash 700ms var(--ease-out);
}
/* The drop flares bright for a beat as it lands */
@keyframes kd-win-flash {
  0% {
    filter: brightness(2.2) saturate(1.4);
  }
  100% {
    filter: none;
  }
}
/* Rare wins get a ring of light that breathes once. */
.kd-reel-card[data-win]::after {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgb(255 255 255 / 0.12), transparent 65%);
  animation: kd-win-pulse 1.4s var(--ease-out) both;
  pointer-events: none;
}
@keyframes kd-win-pulse {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
}

/* Skin.club "rouletteDropFloat": the case levitates and its shadow grows softer as it rises */
.kd-reel-case {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.75));
  animation: kd-case-float 3.6s ease-in-out infinite;
}
/* Centring comes from Tailwind's `translate` property, so the float only touches `transform` */
@keyframes kd-case-float {
  50% {
    transform: translateY(-14px);
    filter: drop-shadow(0 22px 18px rgb(0 0 0 / 0.45));
  }
}
.kd-reel.spinning {
  cursor: pointer;
}
/* KURWADROP */
.kd-chicken-hit {
  z-index: 2;
  animation: kd-chicken 1.6s var(--ease-spring) both;
}
@keyframes kd-chicken {
  0% {
    transform: scale(1);
  }
  18% {
    transform: scale(1.9) rotate(-8deg);
  }
  28% {
    transform: scale(1.75) rotate(8deg);
  }
  38% {
    transform: scale(1.85) rotate(-6deg);
  }
  48% {
    transform: scale(1.8) rotate(5deg);
  }
  60%,
  85% {
    transform: scale(1.8) rotate(0);
  }
  100% {
    transform: scale(1.5);
  }
}
.kd-reel.is-kurwa {
  box-shadow: 0 0 0 2px var(--color-item-gold), 0 0 48px -8px var(--color-item-gold);
}
.kd-kurwa-banner {
  background: linear-gradient(90deg, #f5c649, #fff3c4, #e4ae39);
  box-shadow: 0 6px 24px rgb(228 174 57 / 0.55);
}
.kd-kurwa-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-kurwa-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
}
.kd-kurwa-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.8);
}
.kd-kurwa-leave-to {
  opacity: 0;
}
.kd-reel.is-shaking {
  animation: kd-shake 520ms var(--ease-out);
}
@keyframes kd-shake {
  15%,
  55% {
    translate: -5px 2px;
  }
  35%,
  75% {
    translate: 5px -2px;
  }
}

.kd-result-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-result-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

/* Markers: top/bottom for the horizontal reel, left/right for vertical reels */
.kd-markers-h .kd-marker-a,
.kd-markers-h .kd-marker-b {
  left: 50%;
  width: 28px;
  height: 22px;
}
.kd-markers-h .kd-marker-a {
  top: -4px;
  transform: translateX(-50%);
}
.kd-markers-h .kd-marker-b {
  bottom: -4px;
  transform: translateX(-50%) rotate(180deg);
}
.kd-markers-v .kd-marker-a,
.kd-markers-v .kd-marker-b {
  top: 50%;
  width: 22px;
  height: 18px;
}
.kd-markers-v .kd-marker-a {
  left: -6px;
  transform: translateY(-50%) rotate(-90deg);
}
.kd-markers-v .kd-marker-b {
  right: -6px;
  transform: translateY(-50%) rotate(90deg);
}
.is-grid .kd-markers-v .kd-marker-a,
.is-grid .kd-markers-v .kd-marker-b {
  width: 16px;
  height: 12px;
}
.kd-reel.spinning .kd-marker-a,
.kd-reel.spinning .kd-marker-b {
  filter: drop-shadow(0 0 8px rgb(255 125 32 / 0.8));
}
</style>
