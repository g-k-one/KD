<script setup lang="ts">
import type { CaseDetails, CaseItem, InventoryItem, Item } from '#shared/types/api'
import { goldenChicken, KURWA_CHICKEN_ID } from '#shared/kurwadrop'

/*
 * Figma "CaseReel". x1 = one horizontal reel under the top/bottom markers,
 * x2–x5 = vertical reels side by side with markers on the left and right (desktop).
 * On phones x2–x5 become a grid of mini reels (2 or 3 per row, 2 rows max for x4/x5).
 * The reel keeps one height for x1–x5 (278 desktop, 272 phone); rows split that height.
 * Idle, a "Try free" pill sits on the stage under the case: the demo spin belongs to the reel it spins.
 * so every result keeps room for its name and Sell button.
 *
 * Motion (docs/motion.md → Reel):
 *   breath — from idle the case squashes, jumps and opens (~420ms) while the riser plays
 *   spin   — a long deceleration onto the winner. It ends one of three ways:
 *            settle — overshoots the centre by part of a card and corrects back
 *            short  — stops over the edge of the card before, hangs there, then creeps over onto the winner
 *            over   — rolls just past onto the next card, hangs, then slides back
 *            The hang is the "подкрут": markers pulse, a low tense sound, the frame tightens.
 *            Rare drops tease more often. The filler is never rigged: neighbours come from the real odds.
 *   land   — ItemArt reveal (the rarity shape pops, its echo, diamond sparks) + a soft Forge aura for rare drops + haptics.
 * A rAF loop counts cards crossing the marker to drive the tick sound.
 */
const props = defineProps<{
  data: CaseDetails
  count: number
  phase: 'idle' | 'spinning' | 'result'
  results: InventoryItem[]
  soldUids: string[]
  demo?: boolean
  /** Offer a demo spin on the idle stage ("Try free"); the case page only */
  tryFree?: boolean
  /** KURWADROP on: the Golden Chicken shows up on the reel at its real odds */
  kurwadrop?: boolean
  /** Fast open: no breath, no tease */
  fast?: boolean
}>()
const emit = defineEmits<{ sell: [uid: string]; demo: []; share: [item: InventoryItem] }>()

const sfx = useSfx()
const haptics = useHaptics()
const root = useTemplateRef<HTMLElement>('root')
// Forge: a layer behind the cards for rare results, and the shared top layer for the chicken
const fxHost = useTemplateRef<HTMLElement>('fxHost')
const fxBg = useForge(fxHost)
const fxTop = useForge()
const appBase = useRuntimeConfig().app.baseURL
const { width: rootW, height: rootH } = useElementSize(root)

// x1 runs a long strip; x2–x5 a shorter one (five tall strips of 56 cards each made multi-open lag)
/** True while a reel moves: the live feed holds its updates so nothing re-lays out mid-spin */
const reelBusy = useState('kd_reel_busy', () => false)
onBeforeUnmount(() => (reelBusy.value = false))
// Warm the decode cache with the case's items while the page is idle
onMounted(() => {
  const warm = () => props.data.items.forEach((i) => decodeImage(i.image))
  'requestIdleCallback' in window ? requestIdleCallback(warm) : setTimeout(warm, 300)
})

// Idle drift: ten of the case's items spread across the price range, doubled for a seamless loop
const driftItems = computed(() => {
  const items = [...props.data.items].sort((a, b) => b.price - a.price)
  const step = Math.max(1, Math.floor(items.length / 10))
  const pick = items.filter((_, i) => i % step === 0).slice(0, 10)
  return [...pick, ...pick]
})

// Idle: as many cases as will open. Desktop x2–x5: one case over each reel column (it shows which case
// spins where); phones (and x1): a fan, smaller the more there are, the middle one in front.
const STACK_SCALE = [1, 0.8, 0.72, 0.66, 0.6]
const stack = computed(() => {
  const n = props.count
  const columns = n > 1 && !isMobile.value
  const size = columns ? 160 : (isMobile.value ? 160 : 196) * STACK_SCALE[n - 1]!
  const step = size * 0.55
  return Array.from({ length: n }, (_, k) => {
    const rel = k - (n - 1) / 2
    const depth = Math.abs(rel)
    // two delays, as CSS variables so the breath can run on all cases at once: the float's (out of phase per case)
    // and the pop-in's (one after another, so ×1 → ×5 builds up)
    const delay = { '--float-delay': `${k * -0.45}s`, '--in-delay': `${k * 70}ms` }
    if (columns) return { key: k, style: { left: `${((k + 0.5) / n) * 100}%`, width: `${size}px`, height: `${size}px`, ...delay } }
    return {
      key: k,
      style: {
        left: `calc(50% + ${rel * step}px)`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 10 - Math.ceil(depth),
        opacity: 1 - depth * 0.12,
        rotate: `${rel * 5}deg`,
        ...delay,
      },
    }
  })
})

const STRIP = computed(() => (props.count === 1 ? 56 : 36))
const WIN = computed(() => STRIP.value - 7)
const START = 3

const horizontal = computed(() => props.count === 1)
const isMobile = useMediaQuery('(max-width: 639.98px)')
const cardW = computed(() => (isMobile.value ? 184 : 222))
// Phone grid for x2–x5, inside the same 272px as x1 (h-68; 288 pushed Open under the tab bar on an 812px phone), so switching the amount never moves the page
const MOBILE_H = 272
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
  const s = Array.from({ length: STRIP.value }, () => filler(rand, pool))
  if (keep) s[START] = keep
  if (winner) s[WIN.value] = winner
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
    fxBg.stopAll()
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
watch([rootW, rootH, grid], () => {
  if (props.phase === 'idle') nextTick(resetPositions)
  // a settled result stays on its drop when the reel's size changes (window resize, a scrollbar)
  else if (props.phase === 'result' && !reelBusy.value) nextTick(recentre)
})
function recentre() {
  tracks.value.forEach((t) => {
    const off = horizontal.value ? centre(rootW.value, cardW.value, WIN.value) : centre(cellLen.value, cardH.value, WIN.value)
    t.style.transform = horizontal.value ? `translateX(${off}px)` : `translateY(${off}px)`
  })
}

// Breath: leaving idle, the case winds up before the strip appears
const breathing = ref(false)
let breathDone: Promise<void> = Promise.resolve()
watch(
  () => props.phase,
  (p, old) => {
    // A new opening: forget the last skip. A skip pressed from here on (even during the breath) counts.
    if (p === 'spinning') skipping = false
    if (old !== 'idle' || p !== 'spinning' || props.fast || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    breathing.value = true
    sfx.riser()
    breathDone = new Promise((r) =>
      setTimeout(() => {
        breathing.value = false
        r()
      }, 420),
    )
  },
)

// Sell in one tap, whatever the drop is worth
function askSell(item: InventoryItem) {
  emit('sell', item.uid)
}

/** Multi-open: the column with the most valuable drop (it gets the Share button) */
const bestCol = computed(() => (props.results.length > 1 ? props.results.reduce((b, r, i, a) => (r.price > a[b]!.price ? i : b), 0) : -1))

// Clicking the reel while it spins jumps straight to the result (Key-Drop's fast-forward)
let skipping = false
let active: Animation[] = []
function skip() {
  skipping = true
  active.forEach((a) => a.finish())
  burst.value?.stop()
}
/** The gold 3D "KURWADROP!" over the reel (CaseKurwaBurst); mounted only while KURWADROP is on */
const burst = ref<{ play(fast?: boolean): Promise<boolean>; stop(): void; active: boolean } | null>(null)

// Gold drops shake the frame once
const shaking = ref(false)

/** Columns whose reel just stopped on the Golden Chicken (the celebration plays on them) */
const chickenHit = ref<boolean[]>([])
/** Columns where the chicken landed, kept through the respin so its banner stays over the right column */
const kurwaCols = ref<number[]>([])
const respinning = ref(false)
let spunOnce = false
const wait = (ms: number) => new Promise((r) => setTimeout(r, skipping ? 0 : ms))

/** The x1 aim: '' hidden, 'aiming' closing in over the last stretch, 'locked' snapping shut on the landing */
const aim = ref<'' | 'aiming' | 'locked'>('')
const punch = ref(false)

/** Cells currently hanging on a card edge (the tease) */
const tense = ref<boolean[]>([])

/** Where a track is right now, from its running animation (no getComputedStyle per frame) */
const posOf = new WeakMap<HTMLElement, () => number>()
function slide(t: HTMLElement, axis: string, a: number, b: number, duration: number, easing: string) {
  const anim = t.animate([{ transform: `translate${axis}(${a}px)` }, { transform: `translate${axis}(${b}px)` }], { duration, easing, fill: 'forwards' })
  posOf.set(t, () => a + (b - a) * (anim.effect?.getComputedTiming().progress ?? 1))
  active.push(anim)
  if (skipping) anim.finish()
  return animationDone(anim, duration).then(() => {
    t.style.transform = `translate${axis}(${b}px)`
    anim.cancel()
  })
}

/**
 * Animates the given columns onto `winners`. Columns not listed keep where they are.
 * `pool` restricts the filler (the KURWADROP respin shows only the expensive items).
 */
async function run(winners: Item[], fast: boolean, cols: number[], pool?: CaseItem[]) {
  active = []
  const keep = strips.value.map((s) => s[spunOnce ? WIN.value : START]!)
  strips.value = strips.value.map((s, col) => (cols.includes(col) ? stripFor(col, winners[col], keep[col], true, pool) : s))
  if (!strips.value.length) buildStrips(props.count, winners, keep)
  cols.forEach((c) => (landed.value[c] = false))
  await nextTick()
  // Every image on the strips decoded up front (capped), so nothing decodes while the reel moves
  const urls = new Set(cols.flatMap((c) => strips.value[c]?.map((it) => it.image) ?? []))
  await Promise.race([Promise.all([...urls].map(decodeImage)), new Promise((r) => setTimeout(r, 450))])

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const base = reduced ? 300 : fast ? 1600 : pool ? 3600 : 5600
  const len = horizontal.value ? rootW.value : cellLen.value
  const size = horizontal.value ? cardW.value : cardH.value
  const axis = horizontal.value ? 'X' : 'Y'
  const from = centre(len, size, START)
  const to = centre(len, size, WIN.value)

  // Tick when a card crosses the marker
  let raf = 0
  let lastIdx = START
  const first = tracks.value[cols[0]!]
  const watchTicks = () => {
    const at = first && posOf.get(first)
    if (at) {
      const pos = at()
      const idx = Math.floor((len / 2 - pos) / size)
      if (idx !== lastIdx) {
        lastIdx = idx
        sfx.tick()
      }
    }
    raf = requestAnimationFrame(watchTicks)
  }
  if (!reduced) raf = requestAnimationFrame(watchTicks)

  // Speed reads as motion blur that melts away as the reel slows; the last stretch closes a reticle in under the
  // markers (the aim) that snaps shut on the landing
  const blurMs = base * 0.55
  // x1 only: on x2–x5 a blur filter over several tall tracks re-rasterizes them every frame (the lag on multi-open)
  if (!reduced && !skipping && horizontal.value)
    tracks.value.forEach((t, c) => cols.includes(c) && active.push(t.animate([{ filter: `blur(${horizontal.value ? 5 : 4}px)` }, { filter: 'blur(0)' }], { duration: blurMs, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' })))
  // one reel only: on x2–x5 the marker centre is the middle column
  aim.value = ''
  const aimTimer = !reduced && !fast && horizontal.value ? setTimeout(() => !skipping && (aim.value = 'aiming'), base - 1500) : undefined

  await Promise.all(
    cols.map(async (col, order) => {
      const t = tracks.value[col]
      if (!t) return
      const w = winners[col]
      const tier = w ? RARITY_TIER[w.rarity] : 0
      const duration = base + order * (fast ? 120 : 260)
      // How this reel ends: rare drops tease more often; fast and reduced motion never do
      const teaseOdds = w?.id === KURWA_CHICKEN_ID ? 0.7 : tier >= 3 ? 0.6 : 0.28
      const ending = fast || reduced || skipping || Math.random() >= teaseOdds ? 'settle' : Math.random() < 0.5 ? 'short' : 'over'
      t.style.transform = `translate${axis}(${from}px)`

      if (ending === 'settle') {
        const overshoot = (Math.random() * 0.36 + 0.12) * size * (Math.random() < 0.5 ? 1 : -1)
        await slide(t, axis, from, to + overshoot, duration, 'cubic-bezier(0.08, 0.6, 0.12, 1)')
        await slide(t, axis, to + overshoot, to, reduced || skipping ? 1 : 420, 'cubic-bezier(0.65, 0, 0.35, 1)')
      } else {
        // short: the marker stops over the card before; over: just past, on the next card
        const edge = (0.53 + Math.random() * 0.08) * size * (ending === 'short' ? 1 : -1)
        await slide(t, axis, from, to + edge, duration, 'cubic-bezier(0.08, 0.6, 0.12, 1)')
        tense.value[col] = true
        sfx.tense()
        haptics.tap()
        await wait(ending === 'short' ? 520 : 440)
        // a tiny nudge the wrong way, then it gives in
        const pull = edge * 0.06
        await slide(t, axis, to + edge, to + edge + pull, skipping ? 1 : 160, 'cubic-bezier(0.45, 0, 0.55, 1)')
        tense.value[col] = false
        await slide(t, axis, to + edge + pull, to, skipping ? 1 : ending === 'short' ? 820 : 700, 'cubic-bezier(0.55, 0, 0.25, 1)')
      }
      landed.value[col] = true
      if (w && w.id !== KURWA_CHICKEN_ID) {
        sfx.reveal(tier)
        if (tier >= 4) haptics.jackpot()
        else if (tier >= 3) haptics.rare()
        else haptics.tap()
      }
    }),
  )
  cancelAnimationFrame(raf)
  clearTimeout(aimTimer)
  // set by the timer while the strip ran, which TS cannot see from here
  if ((aim.value as string) === 'aiming') {
    aim.value = 'locked'
    setTimeout(() => aim.value === 'locked' && (aim.value = ''), 320)
  }
  active = []
  tense.value = []
  spunOnce = true
  // a small punch of the frame on the stop
  punch.value = false
  requestAnimationFrame(() => (punch.value = true))
  setTimeout(() => (punch.value = false), 420)
}

/**
 * Rarity reveals (docs/motion.md → rarity steps): the landing itself is ItemArt `reveal` — the rarity shape pops
 * and its echo spreads. Forge bursts the rank reveal out of that shape (Forge's tier split over the six rarities,
 * see RANK_LEVEL: the shape alone → sparks → stars → speed lines and the star → rays and a freeze). The gold burst
 * (KD coins + burning gold feathers) belongs to KURWADROP only — the Golden Chicken, not every gold drop.
 */
async function rareFx(winners: Item[]) {
  if (grid.value) return
  // the win card gets data-win only once the parent switches to 'result' (a tick or two after spin() resolves):
  // wait for it, otherwise the effects found no card and never played
  let cards: NodeListOf<HTMLElement> | never[] = []
  for (let i = 0; i < 30 && !cards.length; i++) {
    await new Promise((r) => requestAnimationFrame(r))
    cards = root.value?.querySelectorAll<HTMLElement>('[data-win]') ?? []
  }
  cards.forEach((el, i) => {
    const w = horizontal.value ? winners[0] : winners[i]
    const tier = w ? RARITY_TIER[w.rarity] : 0
    if (!w) return
    // centred on the item picture (the rarity shape), on the layer behind the cards: it bursts from behind the skin
    rarityRank(fxBg, el.querySelector<HTMLElement>('.kd-art img') ?? el, w.rarity, 1.3)
  })
}

async function spin(winners: Item[], fast: boolean, kurwa: boolean[] = []) {
  // from the first frame to the landing: the feed holds (no layout work, and your drop does not show early)
  reelBusy.value = true
  fxBg.stopAll()
  await breathDone
  chickenHit.value = []
  kurwaCols.value = []
  respinning.value = false
  landed.value = []
  const all = winners.map((_, i) => i)
  const hits = all.filter((i) => kurwa[i])

  // Roll 1: chicken columns land on the Golden Chicken
  await run(winners.map((w, i) => (kurwa[i] ? chicken.value : w)), fast, all)

  if (hits.length) {
    // The chicken grows, screams, and the respin starts among the expensive items only
    chickenHit.value = all.map((i) => kurwa[i]!)
    kurwaCols.value = hits
    sfx.squawk()
    haptics.jackpot()
    // one burst per chicken: skip a hit element nested in another one
    nextTick(() => root.value?.querySelectorAll<HTMLElement>('.kd-chicken-hit').forEach((el) => el.parentElement?.closest('.kd-chicken-hit') || goldBurst(fxTop, el, 2, appBase)))
    shaking.value = true
    setTimeout(() => (shaking.value = false), 600)
    // the 3D label fits the same pause; without 3D (no WebGL, reduced motion) — the plain banner and the pause
    const shown = !skipping && burst.value ? burst.value.play(fast) : Promise.resolve(false)
    await Promise.all([wait(fast ? 900 : 1700), shown])
    respinning.value = true
    chickenHit.value = []
    await run(winners, fast, hits, kurwaPool.value)
    respinning.value = false
    kurwaCols.value = []
  }

  if (winners.some((w) => RARITY_TIER[w.rarity] >= 4)) {
    shaking.value = true
    setTimeout(() => (shaking.value = false), 600)
  }
  reelBusy.value = false
  rareFx(winners)
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
    :class="[shaking && 'is-shaking', punch && 'is-punch', tense.some(Boolean) && 'is-tense', (respinning || chickenHit.some(Boolean)) && 'is-kurwa', phase, horizontal ? 'is-h h-68 sm:h-[278px]' : 'is-v', grid ? 'is-grid' : !horizontal && 'h-[278px]']"
    :style="{ ...(grid ? { height: `${MOBILE_H}px` } : {}) }"
  >
    <!-- Forge layer: behind the cards, and not clipped by the frame — it reaches 128px past the top and the bottom,
         so a rank burst (rays and sparks well past the drop) is not cut off (the drop sits high in its card, ~90px
         under the top). Not past the sides: on phones that would widen the page. -->
    <div ref="fxHost" class="pointer-events-none absolute inset-x-0 -inset-y-32" />

    <!-- The aim (x1): a thin glass reticle under the markers for the last stretch, gone on the landing -->
    <svg v-if="horizontal" class="kd-aim pointer-events-none absolute top-1/2 left-1/2" :class="aim && `is-${aim}`" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="kd-aim-glass" r="0.5">
          <stop offset="0.6" stop-color="#fff" stop-opacity="0" />
          <stop offset="1" stop-color="#fff" stop-opacity="0.07" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#kd-aim-glass)" class="kd-aim-ring" />
      <path d="M38 52 A80 80 0 0 1 72 26" class="kd-aim-shine" />
      <g class="kd-aim-dash"><circle cx="100" cy="100" r="80" /></g>
      <path d="M100 2v14M100 184v14M2 100h14M184 100h14" class="kd-aim-tick" />
    </svg>

    <!-- Horizontal (x1): the strip clips itself (the frame no longer does) -->
    <div v-if="horizontal" class="absolute inset-0 overflow-hidden rounded-[20px]">
    <div :ref="(el) => (tracks = el ? [el as HTMLElement] : [])" class="kd-reel-track absolute inset-y-0 left-0 flex items-center" :class="phase === 'spinning' && 'will-change-transform'">
      <div
        v-for="(it, i) in strips[0]"
        :key="i"
        class="kd-reel-card relative flex shrink-0 flex-col items-center justify-center"
        :style="{ width: `${cardW}px` }"
        :data-win="(phase === 'result' && i === WIN) || undefined"
        :class="[Math.abs(i - WIN) <= 3 && 'is-near', phase === 'result' && i === WIN && results[0] && soldUids.includes(results[0].uid) && 'is-sold']"
      >
        <ItemArt :image="it.image" :rarity="it.rarity" :size="96" eager :reveal="phase === 'result' && i === WIN && it.id !== 'kurwa-chicken' ? RARITY_TIER[it.rarity] || 1 : 0" class="relative w-full" :class="chickenHit[0] && i === WIN && 'kd-chicken-hit'" />
      </div>
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
        class="kd-cell relative h-full overflow-hidden [contain:layout_paint]"
        :class="[grid ? 'is-framed rounded-3xl' : { 'border-l border-neutral-5': col > 0 }, tense[col] && 'is-tense']"
        :style="cellStyle(col)"
      >
        <!-- will-change only while it moves: a resting strip as a layer kept the whole 36-card texture in GPU memory -->
        <div :ref="(el) => el && (tracks[col] = el as HTMLElement)" class="absolute inset-x-0 top-0" :class="phase === 'spinning' && 'will-change-transform'">
          <div
            v-for="(it, i) in strip"
            :key="i"
            class="kd-reel-card relative flex items-center justify-center"
            :style="{ height: `${cardH}px` }"
            :data-win="(landed[col] && i === WIN) || undefined"
            :class="[Math.abs(i - WIN) <= 2 && 'is-near', landed[col] && i === WIN && results[col] && soldUids.includes(results[col]!.uid) && 'is-sold']"
          >
            <ItemArt
              :class="chickenHit[col] && i === WIN && 'kd-chicken-hit'" eager :reveal="landed[col] && i === WIN && !chickenHit[col] && it.id !== 'kurwa-chicken' ? RARITY_TIER[it.rarity] || 1 : 0" :image="it.image" :rarity="it.rarity" :size="compact ? 52 : grid && cols === 3 ? 60 : isMobile ? 72 : 88" class="relative w-full" />
          </div>
        </div>
        <Transition name="kd-kurwa">
          <div v-if="kurwaCols.includes(col) && (respinning || !burst?.active)" class="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-1">
            <span class="kd-kurwa-banner rounded-md px-2 py-0.5 text-neutral-1" :class="grid ? 'type-10-caps' : 'type-12-caps'">{{ respinning ? $t('case.kurwaRespin') : $t('case.kurwaHit') }}</span>
          </div>
        </Transition>

        <!-- Result inside its own reel -->
        <div class="pointer-events-none absolute inset-x-0 flex justify-center px-1 sm:bottom-5" :class="compact ? 'bottom-1.5' : 'bottom-3'">
          <Transition name="kd-result">
            <div v-if="landed[col] && results[col]" class="pointer-events-auto flex max-w-full min-w-0 flex-col items-center gap-1 sm:gap-2">
              <span v-if="!compact" class="type-10-caps sm:type-12-caps max-w-full truncate text-weapon">{{ results[col]!.weapon }}</span>
              <span class="type-12 sm:type-14 max-w-full truncate" :style="{ color: RARITY_COLOR[results[col]!.rarity] }">{{ results[col]!.skin }}</span>
              <div class="flex items-center gap-1.5">
              <span
                v-if="soldUids.includes(results[col]!.uid)"
                class="type-12-caps flex h-7 items-center gap-1 rounded-md border border-success bg-success-24 px-2 text-success sm:h-8"
              >
                {{ $t('wallet.sold') }}
              </span>
              <UiButton
                v-else-if="phase === 'result' && !demo"
                variant="light"
                size="s"
                class="max-sm:h-7 max-sm:px-2"
                @click="askSell(results[col]!)"
              >
                <span class="max-sm:hidden">{{ $t('wallet.sell') }}</span>
                <UiPrice :amount="results[col]!.price" size="s" tone="inverse" count-up />
              </UiButton>
              <!-- the best drop of the opening can be shared (an icon on phones), if it paid at least the case -->
              <UiButton
                v-if="phase === 'result' && !demo && col === bestCol && results[col]!.price >= data.price"
                variant="secondary"
                size="s"
                icon="share"
                :icon-only="compact || isMobile"
                :aria-label="$t('share.share')"
                class="max-sm:h-7 max-sm:w-7"
                @click="emit('share', results[col]!)"
              >
                <template v-if="!(compact || isMobile)">{{ $t('share.share') }}</template>
              </UiButton>
              </div>
            </div>
          </Transition>
        </div>

        <div v-if="grid" class="kd-markers-v pointer-events-none absolute inset-0">
          <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-a absolute" />
          <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-b absolute" />
        </div>
      </div>
    </div>

    <!-- Depth: cards away from the centre sink into the dark (a still gradient, nothing re-rasterizes while the
         strip moves). Columns drop it on the result, where the drop's name and Sell sit at the bottom. -->
    <Transition name="kd-idle">
      <div v-if="!grid && (horizontal || phase !== 'result')" class="kd-depth pointer-events-none absolute inset-0 rounded-5xl" :class="horizontal ? 'is-h' : 'is-v'" />
    </Transition>

    <!-- KURWADROP: the chicken screams, then the respin among the expensive items. One reel: centred over it;
         several: the banner sits in the column where the chicken landed (see the column loop). -->
    <!-- the gold 3D "KURWADROP!" over the top of the reel; while it plays it replaces the banner -->
    <CaseKurwaBurst v-if="kurwadrop" ref="burst" :text="$t('case.kurwaHit')" class="absolute inset-x-0 top-0 z-30 h-[60%]" />
    <Transition name="kd-kurwa">
      <div v-if="horizontal && ((chickenHit.some(Boolean) && !burst?.active) || respinning)" class="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
        <span class="kd-kurwa-banner type-16-caps rounded-lg px-3 py-1 text-neutral-1">{{ respinning ? $t('case.kurwaRespin') : $t('case.kurwaHit') }}</span>
      </div>
    </Transition>

    <!-- x1 result -->
    <div v-if="horizontal && phase === 'result' && results[0]" class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:bottom-5">
      <Transition name="kd-result" appear>
        <div class="pointer-events-auto flex min-w-0 flex-col items-center gap-1 sm:gap-2">
          <span class="type-12-caps max-w-full truncate text-weapon">{{ results[0].weapon }}</span>
          <span class="type-14 max-w-full truncate" :style="{ color: RARITY_COLOR[results[0].rarity] }">{{ results[0].skin }}</span>
          <span v-if="soldUids.includes(results[0].uid)" class="type-12-caps flex h-8 items-center gap-1.5 rounded-md border border-success bg-success-24 px-2 text-success">
            {{ $t('wallet.sold') }}
            <UiPrice :amount="results[0].price" size="s" tone="muted" />
          </span>
          <div v-else-if="!demo" class="flex gap-2">
            <UiButton variant="light" size="s" @click="askSell(results[0])">
              {{ $t('wallet.sell') }}
              <UiPrice :amount="results[0].price" size="s" tone="inverse" count-up />
            </UiButton>
            <UiButton variant="secondary" size="s" icon="upgrade" :to="`/upgrade?item=${results[0].uid}&from=${data.slug}`">{{ $t('upgrade.upgrade') }}</UiButton>
            <UiButton v-if="results[0].price >= data.price" variant="secondary" size="s" icon="share" @click="emit('share', results[0])">{{ $t('share.share') }}</UiButton>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Idle: the case sits in the centre while a few of its contents drift by, faded, behind it -->
    <Transition name="kd-idle">
      <div v-if="phase === 'idle' || breathing" class="kd-idle pointer-events-none absolute inset-0 overflow-hidden rounded-5xl" :class="breathing && 'is-breathing'">
        <div class="kd-idle-fade absolute inset-0">
          <div class="kd-drift absolute inset-y-0 left-0 flex items-center">
          <ItemArt
            v-for="(it, i) in driftItems"
            :key="i"
            :image="it.image"
            :rarity="it.rarity"
            :size="isMobile ? 80 : 88"
            class="w-44 shrink-0 sm:w-52"
          />
        </div>
        </div>
        <!-- One case per opening: x2–x5 fan out a smaller stack, the middle one in front -->
        <!-- No TransitionGroup: a new case pops in with a keyframe, a removed one just goes, the rest glide
             (a leave transition that never ended left ghost cases on the stage) -->
        <img
          v-for="c in stack"
          :key="c.key"
          :src="data.image"
          :alt="c.key === 0 ? data.name : ''"
          class="kd-reel-case absolute top-[44%] -translate-x-1/2 -translate-y-1/2 object-contain"
          :style="c.style"
        />
      </div>
    </Transition>

    <!-- Demo spin, on the stage while the case waits (free, nothing is charged) -->
    <Transition name="kd-idle">
      <!-- bottom-6: clears the bottom marker (it reaches 18px into the frame) -->
      <div v-if="tryFree && phase === 'idle' && !breathing" class="absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <UiButton variant="secondary" size="s" icon="demo" class="kd-try-stage" @click.stop="emit('demo')">{{ $t('case.tryFree') }}</UiButton>
      </div>
    </Transition>

    <div v-if="!grid" class="pointer-events-none absolute inset-0 overflow-hidden" :class="markerClass">
      <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-a absolute" />
      <img src="/img/fx/marker-top.svg" alt="" class="kd-marker-b absolute" />
    </div>
  </div>
</template>

<style scoped>
/* Only the cards that can be on screen when the reel stops (is-near) animate: dimming every card of five
   strips meant hundreds of opacity/filter transitions at once — the multi-open lag */
.kd-reel-card.is-near {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring),
    filter var(--dur-slow) var(--ease-out);
}
.kd-reel-card {
  contain: layout style;
}
/* Figma: grey frame that warms up to brand orange where the markers sit */
/* The frame warms up towards the markers (a soft gradient that anchors them), no glow around it */
.kd-reel {
  border: 4px solid transparent;
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(90deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
.kd-reel.is-v {
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
}
.kd-depth.is-h {
  background: linear-gradient(90deg, var(--color-neutral-1) 2%, transparent 30%, transparent 70%, var(--color-neutral-1) 98%);
}
.kd-depth.is-v {
  background: linear-gradient(180deg, var(--color-neutral-1) 2%, transparent 30%, transparent 70%, var(--color-neutral-1) 98%);
}
/* Glass over the stage so the case art behind stays readable */
.kd-try-stage {
  background: rgb(12 13 16 / 0.7);
  backdrop-filter: blur(6px);
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
    linear-gradient(180deg, var(--color-neutral-4) 15%, rgb(255 95 31 / 0.85) 50%, var(--color-neutral-4) 85%) border-box;
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
/* The moving strip is plain (no filter, no mask): a filtered/masked layer that size kept several full copies
   in GPU memory. The edge fade is a mask on the still parent, rasterized once at the reel's size. */
.kd-drift {
  width: max-content;
  opacity: 0.32;
  animation: kd-drift 40s linear infinite;
}
.kd-idle-fade {
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
.kd-reel.result .kd-reel-card.is-near:not([data-win]) {
  opacity: 0.18;
  filter: grayscale(0.6);
}
/* The drop floats and its glow breathes while it is yours; once sold it stops and dims */
.kd-reel-card[data-win]:not(.is-sold) > .kd-art {
  /* translate only (compositor), the glow is static: animating a drop-shadow filter stuttered */
  will-change: translate;
  animation: kd-drop-float 3.2s cubic-bezier(0.45, 0, 0.55, 1) 800ms infinite;
}
@keyframes kd-drop-float {
  50% {
    translate: 0 -6px;
  }
}
.kd-reel-card.is-sold[data-win] {
  opacity: 0.4;
  filter: grayscale(0.85);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    filter var(--dur-slow) var(--ease-out);
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
  /* static shadow (an animated drop-shadow repaints every frame); the case stays clear of the frame */
  filter: drop-shadow(0 12px 14px rgb(0 0 0 / 0.6));
  animation:
    kd-case-float 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite,
    kd-stack-in 420ms var(--ease-spring) both;
  animation-delay: var(--float-delay, 0s), var(--in-delay, 0s);
  /* the stack re-fans when the amount changes */
  transition:
    left var(--dur-slow) var(--ease-spring),
    width var(--dur-slow) var(--ease-spring),
    height var(--dur-slow) var(--ease-spring),
    rotate var(--dur-slow) var(--ease-spring),
    opacity var(--dur-base) var(--ease-out);
}
/* A case joining the stack pops in */
@keyframes kd-stack-in {
  from {
    scale: 0.6;
    opacity: 0;
  }
}
/* Centring comes from Tailwind's `translate` property, so the float only touches `transform` */
@keyframes kd-case-float {
  50% {
    transform: translateY(-8px);
  }
}
.kd-reel.spinning {
  cursor: pointer;
}
/* Breath: the case squashes, jumps and swells before it bursts open into the strip */
/* every case of the stack winds up together (no per-case delay) */
.kd-idle.is-breathing .kd-reel-case {
  animation: kd-breath 420ms var(--ease-in-out) both;
  animation-delay: 0s;
}
.kd-idle.is-breathing .kd-drift {
  opacity: 0.2;
  transition: opacity 300ms var(--ease-out);
}
@keyframes kd-breath {
  0% {
    transform: none;
  }
  25% {
    transform: scale(1.08, 0.88) translateY(8px);
  }
  60% {
    transform: scale(0.94, 1.1) translateY(-22px);
  }
  100% {
    transform: scale(1.25) translateY(-6px);
  }
}
/* Tease: while a reel hangs on a card edge the markers breathe and a soft glow gathers (no hard rim) */
/* The aim: white hairlines and a faint glass rim, under the cards. It closes in (scale and turn ease out with the
   strip) over the last 1.5 s, the dashed ring drifts the other way, and it snaps shut on the landing. */
.kd-aim {
  width: 240px;
  height: 240px;
  translate: -50% -50%;
  opacity: 0;
  fill: none;
  stroke: #fff;
}
@media (max-width: 639px) {
  .kd-aim {
    width: 200px;
    height: 200px;
  }
}
.kd-aim-ring {
  stroke-opacity: 0.22;
  stroke-width: 1;
}
.kd-aim-shine {
  stroke-opacity: 0.35;
  stroke-width: 1.5;
  stroke-linecap: round;
}
.kd-aim-dash {
  transform-origin: 100px 100px;
  stroke-opacity: 0.28;
  stroke-width: 1;
  stroke-dasharray: 2 8;
}
.kd-aim-tick {
  stroke-opacity: 0.4;
  stroke-width: 1.5;
}
.kd-aim.is-aiming {
  animation: kd-aim-in 1500ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
.kd-aim.is-aiming .kd-aim-dash {
  animation: kd-aim-drift 6s linear infinite;
}
.kd-aim.is-locked {
  animation: kd-aim-lock 300ms var(--ease-in) forwards;
}
@keyframes kd-aim-in {
  from {
    opacity: 0;
    scale: 1.35;
    rotate: -45deg;
  }
  to {
    opacity: 0.55;
    scale: 1;
    rotate: 0deg;
  }
}
@keyframes kd-aim-drift {
  to {
    rotate: -360deg;
  }
}
@keyframes kd-aim-lock {
  from {
    opacity: 0.55;
    scale: 1;
  }
  to {
    opacity: 0;
    scale: 0.88;
  }
}
.kd-reel.is-tense:not(.is-grid),
.kd-cell.is-framed.is-tense {
  box-shadow: 0 0 44px -10px rgb(255 95 31 / 0.7);
  transition: box-shadow var(--dur-slow) var(--ease-out);
}
.kd-reel.is-tense .kd-marker-a,
.kd-reel.is-tense .kd-marker-b,
.kd-cell.is-tense .kd-marker-a,
.kd-cell.is-tense .kd-marker-b {
  animation: kd-marker-tense 640ms var(--ease-in-out) infinite alternate;
}
@keyframes kd-marker-tense {
  to {
    filter: drop-shadow(0 0 10px rgb(255 151 33 / 0.85));
  }
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
/* KURWADROP: the whole frame goes gold — a thicker rim, the edge gradient and the markers */
.kd-reel.is-kurwa {
  box-shadow: 0 0 0 3px var(--color-item-gold), 0 0 56px -6px var(--color-item-gold);
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(90deg, var(--color-neutral-4) 10%, var(--color-item-gold) 50%, var(--color-neutral-4) 90%) border-box;
}
.kd-reel.is-kurwa.is-v {
  background:
    linear-gradient(var(--color-neutral-1), var(--color-neutral-1)) padding-box,
    linear-gradient(180deg, var(--color-neutral-4) 10%, var(--color-item-gold) 50%, var(--color-neutral-4) 90%) border-box;
}
/* the marker art is an orange gradient: shift it to gold and give it a gold glow */
.kd-reel.is-kurwa .kd-marker-a,
.kd-reel.is-kurwa .kd-marker-b {
  filter: hue-rotate(26deg) saturate(1.15) brightness(1.2) drop-shadow(0 0 6px rgb(228 174 57 / 0.85));
}
.kd-kurwa-banner {
  background: linear-gradient(90deg, var(--color-gold), var(--color-gold-light), var(--color-item-gold));
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

/* Markers: top/bottom for the horizontal reel, left/right for vertical reels.
   Once the reel has stopped they slide out of the way (the drop gets the stage) and glide back in
   when the next spin starts. */
.kd-marker-a,
.kd-marker-b {
  transition:
    opacity 420ms var(--ease-out),
    translate 520ms var(--ease-out),
    filter 120ms linear;
}
.kd-reel.result .kd-markers-h .kd-marker-a {
  opacity: 0;
  translate: 0 -12px;
}
.kd-reel.result .kd-markers-h .kd-marker-b {
  opacity: 0;
  translate: 0 12px;
}
.kd-reel.result .kd-markers-v .kd-marker-a {
  opacity: 0;
  translate: -12px 0;
}
.kd-reel.result .kd-markers-v .kd-marker-b {
  opacity: 0;
  translate: 12px 0;
}
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

.kd-reel.is-punch {
  animation: kd-punch 420ms var(--ease-spring);
}
@keyframes kd-punch {
  35% {
    scale: 1.012;
  }
}
</style>
