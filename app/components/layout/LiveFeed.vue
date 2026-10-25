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
const { feed } = useLiveFeed()
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

// Flames for the highlight live on the strip's own Forge layer
const root = useTemplateRef<HTMLElement>('root')
provideForge(root)

// Hover card
const hover = ref<{ d: FeedDrop; x: number; y: number } | null>(null)
function show(d: FeedDrop, e: MouseEvent) {
  if (!isLg.value) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  hover.value = { d, x: Math.min(window.innerWidth - 136, Math.max(136, r.left + r.width / 2)), y: r.bottom + 8 }
}

// Phones: hide while scrolling down
const { y, directions } = useScroll(import.meta.client ? window : null)
const tucked = ref(false)
watch(y, (v) => {
  if (isLg.value || v < 120) return (tucked.value = false)
  if (directions.bottom) tucked.value = true
  else if (directions.top) tucked.value = false
})
</script>

<template>
  <section
    ref="root"
    class="kd-feed relative flex h-16 items-center gap-2 border-b border-neutral-4 bg-neutral-2 px-2 py-1.5 max-lg:sticky max-lg:top-15 max-lg:z-20 lg:h-22 lg:py-2 lg:pr-6"
    :class="tucked && 'is-tucked'"
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
        class="kd-press type-10-caps sm:type-12-caps relative z-[1] flex min-w-9 items-center justify-start gap-1 px-2 transition-colors sm:gap-1.5 sm:px-2.5 lg:px-3"
        :class="mode === m ? 'text-neutral-15' : 'text-neutral-11 hover:text-neutral-13'"
        :title="m === 'top' ? $t('feed.topHint') : undefined"
        @click="mode = m"
      >
        <span v-if="m === 'live'" class="kd-live-dot size-2 rounded-full bg-success" />
        <!-- the best multipliers: the trophy, as on the case page's top drops -->
        <UiIcon v-else name="trophy-fill" :size="12" class="text-coin" />
        <!-- the words stay on phones too: a dot and a cross alone don't say what they switch -->
        <span>{{ m === 'live' ? $t('feed.live') : $t('feed.best') }}</span>
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
      <div class="relative z-[2] flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span class="type-10-caps flex items-center gap-1 text-brand-light max-lg:hidden"><UiIcon name="fire" :size="12" />{{ $t('feed.highlight') }}</span>
        <span class="type-12 truncate max-lg:hidden">{{ feed.highlight.itemName }} | {{ feed.highlight.skinName }}</span>
        <span class="flex items-end justify-between gap-1 max-lg:flex-col-reverse max-lg:items-start">
          <UiPrice :amount="feed.highlight.price" tone="coin" size="s" compact class="lg:hidden" />
          <UiPrice :amount="feed.highlight.price" tone="coin" class="max-lg:hidden" />
          <FxFire class="shrink-0">
            <span class="kd-feed-x relative z-[2]">{{ xLabel(feed.highlight) }}</span>
          </FxFire>
        </span>
      </div>
    </NuxtLink>

    <!-- Drops strip -->
    <div class="scrollbar-none relative flex min-w-0 flex-1 gap-0.5 overflow-x-auto mask-r-from-90% lg:mask-none" @mouseenter="pause" @mouseleave="resume">
      <TransitionGroup
        enter-from-class="opacity-0 -translate-x-4"
        enter-active-class="transition duration-300"
        move-class="transition-transform duration-300"
      >
        <NuxtLink
          v-for="d in shown"
          :key="d.id"
          :to="linkOf(d)"
          class="kd-feed-tile kd-press group relative grid h-13 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border lg:h-18 lg:w-24"
          :aria-label="$t('feed.dropBy', { item: `${d.itemName} | ${d.skinName}`, user: d.userNickname })"
          @mouseenter="show(d, $event)"
          @mouseleave="hover = null"
        >
          <!-- not a case drop: the source's icon in orange, no plate, under the skin and its rarity light -->
          <span v-if="sourceOf(d.caseSlug) !== 'case'" class="kd-feed-src absolute top-1.5 left-1.5" :class="`is-${sourceOf(d.caseSlug)}`" :title="$t(`nav.${sourceOf(d.caseSlug)}`)">
            <UiIcon :name="SOURCE_ICON[sourceOf(d.caseSlug) as 'upgrade' | 'pvp']" :size="16" />
          </span>
          <ItemArt :image="d.image" :rarity="d.rarity" :size="isLg ? 56 : 40" class="w-full" />
          <span v-if="mode === 'top'" class="type-10-caps absolute top-1 right-1 rounded-xs bg-neutral-1/80 px-1 text-coin">{{ xLabel(d) }}</span>
        </NuxtLink>
      </TransitionGroup>
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
          class="kd-hovercard pointer-events-none fixed z-[70] flex w-68 -translate-x-1/2 flex-col gap-2 rounded-2xl border border-neutral-5 bg-neutral-3 p-3"
          :style="{ left: `${hover.x}px`, top: `${hover.y}px` }"
        >
          <div class="flex items-center gap-2">
            <img :src="hover.d.userAvatar" alt="" class="size-6 rounded-full object-cover" />
            <span class="type-12 min-w-0 flex-1 truncate">{{ hover.d.userNickname }}</span>
            <span class="type-12 text-neutral-11">{{ timeAgo(hover.d.createdAt) }}</span>
          </div>
          <span class="type-14 truncate" :style="{ color: RARITY_COLOR[hover.d.rarity] }">{{ hover.d.itemName }} | {{ hover.d.skinName }}</span>
          <div class="flex items-center justify-between gap-2">
            <span class="type-12-regular flex min-w-0 items-center gap-1 truncate text-neutral-12">
              <UiIcon v-if="sourceOf(hover.d.caseSlug) !== 'case'" :name="SOURCE_ICON[sourceOf(hover.d.caseSlug) as 'upgrade' | 'pvp']" :size="12" class="shrink-0 text-brand-light" />
              {{ hover.d.caseName }} · <UiPrice :amount="hover.d.casePrice" size="s" tone="muted" />
            </span>
            <span class="type-12-caps shrink-0 text-coin">{{ xLabel(hover.d) }}</span>
          </div>
          <UiPrice :amount="hover.d.price" size="l" tone="coin" />
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
}
@media (hover: hover) {
  .kd-feed-tile:hover {
    background: var(--color-neutral-4);
    border-color: var(--color-neutral-6);
  }
}
.kd-feed {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-feed.is-tucked {
  transform: translateY(-100%);
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
  background: rgb(18 183 106 / 0.6);
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
.kd-feed-src {
  color: var(--color-brand-light);
  /* a dark edge lifts the icon off the skin under it */
  filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.85));
}
.kd-hovercard {
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
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
</style>
