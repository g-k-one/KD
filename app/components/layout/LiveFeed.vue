<script setup lang="ts">
import type { FeedDrop } from '#shared/types/api'

/*
 * Live drops strip under the header.
 *   Live — newest first. Top — the biggest multipliers (drop price / what was paid), not the priciest skins.
 *   Highlight — the best multiplier right now, burning (Forge) with its "x".
 *   Hover (desktop) — the strip freezes; a card shows who, which case, for how much; click opens the case. The
 *   highlight shows the same card.
 *   Phones — sticks under the header, slides away while scrolling down and comes back on the way up.
 */
const { feed, loading, visible } = useLiveFeed()
const isLg = useMediaQuery('(min-width: 1024px)')
const mode = ref<'live' | 'top'>('live')

const mult = (d: FeedDrop) => d.price / Math.max(1, d.casePrice)
const xLabel = (d: FeedDrop) => {
  const m = mult(d)
  return m >= 10 ? `x${Math.floor(m)}` : `x${m.toFixed(1)}`
}
const drops = computed<FeedDrop[]>(() => {
  const list = feed.value.drops
  return mode.value === 'top' ? [...list].sort((a, b) => mult(b) - mult(a)) : list
})
// Hovering the strip freezes it: what is under the cursor stays put, new drops wait and flow in after
const paused = ref(false)
const frozen = ref<FeedDrop[]>([])
function pause() {
  if (!isLg.value) return
  frozen.value = drops.value
  paused.value = true
}
function resume() {
  paused.value = false
  hover.value = null
}
const shown = computed(() => (paused.value ? frozen.value : drops.value))
const waiting = computed(() => (paused.value ? drops.value.filter((d) => !frozen.value.some((f) => f.id === d.id)).length : 0))

const linkOf = (d: FeedDrop) => sourceLink(d.caseSlug)

// Flames for the highlight live on the strip's own Forge layer (desktop). Phones keep to two WebGL canvases on the home
// page (the banner's hen and the page's own layer), so there the "x" glows in CSS instead of burning
const root = useTemplateRef<HTMLElement>('root')
// Off screen (scrolled past on a phone) the feed stops polling, so nothing redraws for nobody
const rootVisible = useElementVisibility(root)
let counted = true
watch(rootVisible, (v) => {
  if (v === counted) return
  counted = v
  visible(v)
})
onBeforeUnmount(() => counted || visible(true))

// New drops arrive at the front: the old tiles jump right in the DOM, so the whole track starts shifted back by the
// newcomers' width and slides to 0 — one transform on one element, instead of measuring and moving every tile
const track = useTemplateRef<HTMLElement>('track')
const STEP = { phone: 64 + 2, desk: 96 + 2 } // a tile and the 2 px gap
watch(
  () => shown.value.map((d) => d.id),
  (ids, old) => {
    const el = track.value
    if (!el || !old?.length || mode.value === 'top' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const k = ids.indexOf(old[0]!)
    if (k <= 0) return
    el.style.transition = 'none'
    el.style.transform = `translate3d(${-k * (isLg.value ? STEP.desk : STEP.phone)}px, 0, 0)`
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = 'transform 300ms var(--ease-out)'
        el.style.transform = ''
      }),
    )
  },
  { flush: 'post' },
)
provideForge(root)

// Hover card
const hover = ref<{ d: FeedDrop; x: number; y: number } | null>(null)
function place(d: FeedDrop, el: HTMLElement) {
  const r = el.getBoundingClientRect()
  hover.value = { d, x: Math.min(window.innerWidth - 160, Math.max(160, r.left + r.width / 2)), y: r.bottom + 8 }
}
function show(d: FeedDrop, e: MouseEvent) {
  if (!isLg.value) return
  place(d, e.currentTarget as HTMLElement)
}
// Touch: the first tap on a tile shows its card, a second tap on the same tile opens where it dropped; a tap anywhere
// else or a scroll puts the card away
function onTap(d: FeedDrop, e: MouseEvent) {
  if (isLg.value || hover.value?.d.id === d.id) return
  e.preventDefault()
  place(d, e.currentTarget as HTMLElement)
}
if (import.meta.client) {
  useEventListener(document, 'pointerdown', (e) => {
    if (isLg.value || !hover.value) return
    if (!(e.target as HTMLElement).closest?.('.kd-feed-tile, .kd-feed-hl')) hover.value = null
  })
  useEventListener(window, 'scroll', () => !isLg.value && (hover.value = null), { passive: true })
}

</script>

<template>
  <section
    ref="root"
    class="kd-feed relative flex h-16 items-center gap-2 border-b border-neutral-4 bg-neutral-2 px-2 py-1.5 lg:h-22 lg:py-2 lg:pr-0"
    :aria-label="$t('feed.aria')"
  >
    <!-- Live / Best switch: a segment with a sliding thumb -->
    <div class="kd-seg relative grid h-full shrink-0 grid-rows-2 rounded-xl bg-neutral-3 p-1" :class="`is-${mode}`" role="radiogroup">
      <span class="kd-seg-thumb absolute inset-x-1 top-1 rounded-lg" aria-hidden="true" />
      <button
        v-for="m in (['live', 'top'] as const)"
        :key="m"
        type="button"
        role="radio"
        :aria-checked="mode === m"
        class="kd-press kd-hit type-10-caps sm:type-12-caps relative z-[1] flex min-w-9 items-center justify-center gap-1 px-2 sm:justify-start transition-colors sm:gap-1.5 sm:px-2.5 lg:px-3"
        :class="[mode === m ? 'text-neutral-15' : 'text-neutral-11 hover:text-neutral-13', m === 'live' ? '[--hit:-10px_-4px_0]' : '[--hit:0_-4px_-10px]']"
        :title="m === 'top' ? $t('feed.topHint') : undefined"
        @click="mode = m"
      >
        <span v-if="m === 'live'" class="grid size-3 place-items-center"><span class="kd-live-dot size-2.5 rounded-full bg-success" /></span>
        <!-- the best multipliers: a crown, pulsing like the live dot -->
        <span v-else class="kd-best-crown relative grid size-3 place-items-center text-coin"><UiIcon name="crown-fill" :size="12" /></span>
        <!-- phones: the icons alone, one size (the words stay for screen readers) -->
        <span class="max-sm:sr-only">{{ m === 'live' ? $t('feed.live') : $t('feed.best') }}</span>
      </button>
    </div>

    <!-- Pinned highlight: the best multiplier, on fire. Desktop: the name runs to the card's edge, price and
         the burning "x" share the bottom row. Phones: a compact chip — art, the "x" and the price. -->
    <NuxtLink
      v-if="feed.highlight"
      :to="linkOf(feed.highlight)"
      class="kd-press relative flex h-13 w-30 shrink-0 items-center gap-1 overflow-hidden rounded-xl pr-2 pl-0.5 lg:h-18 lg:w-62.5 lg:gap-2.5 lg:pr-3 lg:pl-1"
      :style="{ background: `linear-gradient(90deg, color-mix(in srgb, ${RARITY_COLOR[feed.highlight.rarity]} 22%, var(--color-neutral-4)), var(--color-neutral-4) 75%)` }"
      @mouseenter="show(feed.highlight, $event)"
      @mouseleave="hover = null"
    >
      <ItemArt :image="feed.highlight.image" :rarity="feed.highlight.rarity" :size="isLg ? 56 : 44" class="w-12 shrink-0 lg:w-20" />
      <!-- its source, as on the tiles: the same 16 px box 5 px from the card's bottom left corner (a tile's 1 px border + 4) -->
      <span v-if="sourceOf(feed.highlight.caseSlug) !== 'case'" class="kd-feed-src absolute bottom-[5px] left-[5px] z-[2] grid h-4 place-items-center text-white/50" :title="$t(`nav.${sourceOf(feed.highlight.caseSlug)}`)">
        <UiIcon :name="`src-${sourceOf(feed.highlight.caseSlug)}`" :size="isLg ? 14 : 12" />
      </span>
      <div class="relative z-[2] flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span class="type-10-caps flex items-center gap-1 text-brand-light max-lg:hidden"><UiIcon name="fire" :size="12" />{{ $t('feed.highlight') }}</span>
        <span class="type-12 truncate max-lg:hidden">{{ feed.highlight.itemName }} | {{ feed.highlight.skinName }}</span>
        <span class="flex items-end justify-between gap-1 max-lg:flex-col-reverse max-lg:items-start">
          <UiPrice :amount="feed.highlight.price" tone="coin" size="s" compact class="lg:hidden" />
          <UiPrice :amount="feed.highlight.price" tone="coin" class="max-lg:hidden" />
          <FxFire class="shrink-0" :on="isLg">
            <span v-if="!isLg" class="kd-feed-glow pointer-events-none absolute z-[1]" aria-hidden="true" />
            <span class="kd-feed-x relative z-[2]">{{ xLabel(feed.highlight) }}</span>
          </FxFire>
        </span>
      </div>
    </NuxtLink>

    <!-- the first drops on their way: the highlight's card and a row of tiles in their sizes -->
    <template v-if="loading">
      <span class="kd-skeleton h-13 w-30 shrink-0 rounded-xl lg:h-18 lg:w-62.5" aria-hidden="true" />
      <div class="flex min-w-0 flex-1 gap-0.5 overflow-hidden mask-r-from-90% lg:mask-none" aria-hidden="true">
        <span v-for="n in 16" :key="n" class="kd-skeleton h-13 w-16 shrink-0 rounded-lg lg:h-18 lg:w-24" />
      </div>
    </template>

    <!-- Drops strip. Desktop: it runs off the window's edge, so no tile stops short of it, cut in mid-air -->
    <div v-else class="scrollbar-none relative flex min-w-0 flex-1 gap-0.5 overflow-x-auto rounded-lg mask-r-from-90% lg:rounded-r-none lg:mask-none" @mouseenter="pause" @mouseleave="resume">
      <div ref="track" class="flex gap-0.5">
        <NuxtLink
          v-for="d in shown"
          :key="d.id"
          :to="linkOf(d)"
          class="kd-feed-tile kd-press group relative grid h-13 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border lg:h-18 lg:w-24"
          :aria-label="$t('feed.dropBy', { item: `${d.itemName} | ${d.skinName}`, user: d.userNickname })"
          @mouseenter="show(d, $event)"
          @mouseleave="hover = null"
          @click.capture="onTap(d, $event)"
        >
          <ItemArt :image="d.image" :rarity="d.rarity" :size="isLg ? 56 : 40" class="w-full" />
          <!-- along the bottom, 5 px in (the tile's 1 px border + 4) on one line: the source on the left, Top's × on the right -->
          <span class="absolute inset-x-1 bottom-1 z-[2] flex items-center justify-between">
          <!-- not a case drop: a solid mark for the source (upgrade, PvP; src-*.svg, drawn for it) in the bottom left corner, white at half strength
               over the skin, no plate, no shadow; 5 px from the tile's edge (its 1 px border + 4) on both sides -->
            <span class="kd-feed-src grid h-4 place-items-center text-white/50" :title="sourceOf(d.caseSlug) !== 'case' ? $t(`nav.${sourceOf(d.caseSlug)}`) : undefined">
              <UiIcon v-if="sourceOf(d.caseSlug) !== 'case'" :name="`src-${sourceOf(d.caseSlug)}`" :size="isLg ? 14 : 12" />
            </span>
            <span v-if="mode === 'top'" class="type-10-caps flex h-4 items-center rounded-xs bg-neutral-1/80 px-1 text-coin">{{ xLabel(d) }}</span>
          </span>
        </NuxtLink>
      </div>
    </div>
    <Transition name="kd-paused">
      <span v-if="paused" class="type-10-caps pointer-events-none absolute top-1 right-6 z-10 flex items-center gap-1 rounded-sm bg-neutral-1/90 px-1.5 py-0.5 text-neutral-12">
        <span class="kd-pause-bars" />
        {{ waiting ? $t('feed.pausedNew', { n: waiting }) : $t('feed.paused') }}
      </span>
    </Transition>

    <Teleport to="body">
      <Transition name="kd-hovercard">
        <div
          v-if="hover"
          class="kd-hovercard pointer-events-none fixed z-[70] flex w-76 -translate-x-1/2 flex-col gap-3 rounded-2xl bg-neutral-3 p-3"
          :style="{ left: `${hover.x}px`, top: `${hover.y}px` }"
        >
          <!-- the drop, read like an item card: the skin on its rarity light, weapon over skin, its price; on the right
               where it came from — the case's picture and what it cost (an upgrade: its sign and the stake) -->
          <div class="flex items-center gap-3">
            <span class="grid h-16 w-20 shrink-0 place-items-center rounded-lg bg-neutral-4">
              <ItemArt :image="hover.d.image" :rarity="hover.d.rarity" :size="56" class="w-full" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="kd-hover-weapon type-12-caps truncate">{{ hover.d.itemName }}</span>
              <span class="type-14 truncate" :style="{ color: RARITY_COLOR[hover.d.rarity] }">{{ hover.d.skinName }}</span>
              <UiPrice :amount="hover.d.price" tone="coin" />
            </span>
            <span class="flex w-16 shrink-0 flex-col items-center gap-1">
              <img v-if="hover.d.caseImage" :src="hover.d.caseImage" alt="" class="size-12 object-contain" />
              <img v-else :src="SOURCE_ART[sourceOf(hover.d.caseSlug) as 'upgrade' | 'pvp']" alt="" class="size-12 object-contain" />
              <UiPrice :amount="hover.d.casePrice" size="xs" tone="muted" />
            </span>
          </div>
          <!-- who, when and where from, quiet, under a hairline -->
          <div class="flex items-center gap-2 border-t border-neutral-4 pt-3">
            <img :src="hover.d.userAvatar" alt="" class="size-5 shrink-0 rounded-full object-cover" />
            <span class="type-12 min-w-0 truncate">{{ hover.d.userNickname }}</span>
            <span class="type-12-regular shrink-0 text-neutral-11">{{ timeAgo(hover.d.createdAt) }}</span>
            <span class="type-12-regular ml-auto min-w-0 truncate text-neutral-12">{{ hover.d.caseName }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* Same surface as the case and upgrade item cards: neutral tile, rarity shown only by the glow and star */
.kd-feed-tile {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
  animation: kd-feed-in 300ms var(--ease-out) backwards;
}
/* a tile fades in where it lands (the track's slide brings it in from the left) */
@keyframes kd-feed-in {
  from {
    opacity: 0;
  }
}
@media (hover: hover) {
  .kd-feed-tile:hover {
    background: var(--color-neutral-4);
    border-color: var(--color-neutral-6);
  }
}
.kd-feed-x {
  font-size: 18px;
  line-height: 20px;
  font-weight: 800;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
}
.kd-seg-thumb {
  height: calc(50% - 4px);
  background: var(--color-neutral-6);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset;
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-seg.is-top .kd-seg-thumb {
  transform: translateY(100%);
}
.kd-live-dot {
  position: relative;
}
.kd-live-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgb(var(--success-rgb) / 0.6);
  animation: kd-live-ping 1.6s ease-out infinite;
}
.kd-best-crown::after {
  content: '';
  position: absolute;
  inset: 2px;
  z-index: -1;
  border-radius: 50%;
  background: rgb(var(--coin-rgb) / 0.6);
  animation: kd-live-ping 1.6s ease-out infinite;
}
@keyframes kd-live-ping {
  70%,
  100% {
    scale: 3;
    opacity: 0;
  }
}
.kd-pause-bars {
  width: 6px;
  height: 7px;
  border-inline: 2px solid currentColor;
}
.kd-paused-enter-active,
.kd-paused-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}
.kd-paused-enter-from,
.kd-paused-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
.kd-hovercard {
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
}
.kd-hover-weapon {
  color: var(--color-weapon);
}
.kd-hovercard-enter-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-hovercard-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
}
.kd-hovercard-enter-from {
  opacity: 0;
  transform: translate(-50%, -4px);
}
.kd-hovercard-leave-to {
  opacity: 0;
}
/* phones: the highlight's "x" glows warm and breathes (transform and opacity only) instead of a WebGL flame */
.kd-feed-glow {
  inset: -10px -16px;
  border-radius: 9999px;
  background: radial-gradient(closest-side, rgb(255 150 40 / 0.6), rgb(249 83 17 / 0.22) 62%, transparent);
  animation: kd-feed-glow 1.4s ease-in-out infinite alternate;
}
@keyframes kd-feed-glow {
  from {
    opacity: 0.55;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1.08);
  }
}
</style>
