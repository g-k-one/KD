<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// A podium of the top three — #2, #1, #3 — in one row at every width (no strip to swipe, nothing cut off).
// Each card is a lit plate: the skin floats inside it, big and tilted, in a pool of its rarity's light that is the
// card's own ground (no glow cut by an edge, nothing half in, half out); a medal says the place — gold, silver,
// bronze; the multiplier is the headline, the price white under it. The winner's plate stands taller, crowned,
// its light breathing and its multiplier burning. Each card links to where the drop came from.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3))
// podium order: second, first, third (fewer than three: as they come)
const podium = computed(() => {
  const w = wins.value.map((win, k) => ({ win, rank: k + 1 }))
  return w.length === 3 ? [w[1]!, w[0]!, w[2]!] : w
})
const isLg = useMediaQuery('(min-width: 1024px)')
// the skin's size: the winner's is the biggest, and on a phone they shrink with the column
const artSize = (rank: number) => (rank === 1 ? (isLg.value ? 140 : 72) : isLg.value ? 112 : 60)
</script>

<template>
  <section v-if="wins.length" class="flex flex-col gap-3 lg:gap-4">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <!-- a podium: the cards stand on one line, the winner's is taller -->
    <div class="grid grid-cols-3 items-end gap-2 lg:gap-4">
      <NuxtLink
        v-for="(p, i) in podium"
        :key="p.win.id"
        :to="sourceLink(p.win.caseSlug)"
        class="kd-win kd-press group relative isolate flex min-w-0 flex-col items-center rounded-3xl px-2 pt-7 pb-3 lg:px-4 lg:pt-9 lg:pb-4"
        :class="p.rank === 1 ? 'is-first' : ''"
        :style="{ '--rc': RARITY_COLOR[p.win.item.rarity], '--i': i, '--art': `${artSize(p.rank)}px` }"
      >
        <!-- the skin, floating in its light -->
        <ItemArt
          :image="p.win.item.image"
          :rarity="p.win.item.rarity"
          :size="artSize(p.rank)"
          float
          class="kd-win-art relative w-full"
        />
        <span class="kd-win-rank type-12-caps absolute top-2 left-2 z-[2] flex h-6 items-center gap-1 rounded-lg px-2 lg:top-3 lg:left-3" :class="`is-${p.rank}`">
          <UiIcon v-if="p.rank === 1" name="crown" :size="14" />#{{ p.rank }}
        </span>
        <div class="relative z-[2] flex w-full min-w-0 flex-col items-center gap-0.5 lg:gap-1">
          <FxFire :on="p.rank === 1">
            <span class="kd-win-x relative z-[2]" :class="p.rank === 1 && 'is-first'">x{{ p.win.multiplier }}</span>
          </FxFire>
          <UiPrice :amount="p.win.item.price" :size="isLg ? 'm' : 's'" />
          <span class="type-12 lg:type-14 w-full truncate text-center" :style="{ color: 'var(--rc)' }">
            <span class="max-lg:hidden">{{ p.win.item.weapon }} | </span>{{ p.win.item.skin }}
          </span>
          <span class="type-12-regular flex w-full min-w-0 items-center justify-center gap-1 text-neutral-11">
            <img v-if="sourceOf(p.win.caseSlug) === 'case'" :src="p.win.caseImage" alt="" class="size-4 shrink-0 object-contain lg:size-5" />
            <UiIcon v-else :name="SOURCE_ICON[sourceOf(p.win.caseSlug) as 'upgrade' | 'pvp']" :size="14" class="shrink-0 text-brand-light" />
            <span class="truncate">{{ p.win.nickname }}<span class="max-lg:hidden"> · {{ p.win.caseName }}</span> · {{ timeAgo(p.win.at) }}</span>
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
/* the plate: its ground is the skin's light — a pool of the rarity colour where the skin floats, fading to the
   site's near-black at the foot, where the text sits */
.kd-win {
  background:
    radial-gradient(75% 55% at 50% 32%, color-mix(in srgb, var(--rc) 34%, transparent), transparent 72%),
    linear-gradient(180deg, color-mix(in srgb, var(--rc) 10%, var(--color-neutral-3)), var(--color-neutral-2) 70%);
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
/* the light brightens on hover, and keeps breathing on the winner's plate (an ::after, opacity only) */
.kd-win::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(60% 45% at 50% 32%, color-mix(in srgb, var(--rc) 40%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
  pointer-events: none;
}
.kd-win.is-first {
  padding-top: 44px;
  background:
    radial-gradient(75% 55% at 50% 32%, color-mix(in srgb, var(--color-gold) 30%, transparent), transparent 72%),
    radial-gradient(60% 45% at 50% 32%, color-mix(in srgb, var(--rc) 26%, transparent), transparent 72%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 14%, var(--color-neutral-3)), var(--color-neutral-2) 70%);
}
.kd-win.is-first::after {
  animation: kd-glow-pulse 2.6s ease-in-out infinite;
}
@media (min-width: 64rem) {
  .kd-win.is-first {
    padding-top: 64px;
  }
}
/* the card's own light replaces the art's glow, which a plate's edge would cut */
.kd-win :deep(.kd-art-glow) {
  display: none;
}
/* and the flat rarity shape steps back: the light carries the colour */
.kd-win :deep(.kd-art-star) {
  opacity: 0.22;
}
.kd-win-art {
  transform: rotate(-8deg);
  transition: transform var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  .kd-win:hover::after {
    opacity: 1;
  }
  .kd-win:hover .kd-win-art {
    transform: rotate(-3deg) translateY(-6px) scale(1.06);
  }
}
/* medals: gold, silver, bronze */
.kd-win-rank {
  color: #2a1d08;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.55),
    0 4px 10px rgb(0 0 0 / 0.35);
}
.kd-win-rank.is-1 {
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
}
.kd-win-rank.is-2 {
  color: #1d2230;
  background: linear-gradient(180deg, #f4f7fb, #b9c2d0 55%, #7f8899);
}
.kd-win-rank.is-3 {
  color: #2b1406;
  background: linear-gradient(180deg, #ffc89a, #d9844a 55%, #8f4a22);
}
.kd-win-x {
  font-size: 22px;
  line-height: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 8px rgb(255 95 31 / 0.5));
}
.kd-win-x.is-first {
  font-size: 28px;
  line-height: 32px;
}
@media (min-width: 64rem) {
  .kd-win-x {
    font-size: 32px;
    line-height: 36px;
  }
  .kd-win-x.is-first {
    font-size: 44px;
    line-height: 48px;
  }
}
@keyframes kd-win-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
