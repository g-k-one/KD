<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// Each win is a wide card: the skin on the left breaks out over the card's top edge, big and tilted, its rarity's
// light spreading from behind it across the card; on the right the place (a gold, silver or bronze medal), the
// multiplier as the headline, the price, the skin and who won it, each on its own line with air between.
// Desktop: a podium — #2, #1, #3 in one row, the winner's card taller and golden, its multiplier burning.
// Phones: a short leaderboard — #1, #2, #3 one under another, the same card at full width.
// The room above the cards is only what the skins break out by. Each card links to where the drop came from.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3).map((win, k) => ({ win, rank: k + 1 })))
// desktop: second, first, third (fewer than three: as they come); phones keep the rank order
const PODIUM = [2, 1, 3]
const isLg = useMediaQuery('(min-width: 1024px)')
// sized to their column (the picture is 1⅔ × the size, tilted): it breaks out upward, never past the card's sides
const artSize = (rank: number) => (isLg.value ? (rank === 1 ? 104 : 92) : 54)
</script>

<template>
  <section v-if="wins.length" class="flex flex-col gap-2 lg:gap-3">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <!-- the room above is what the skins break out by, no more -->
    <div class="flex flex-col gap-3 pt-3 lg:grid lg:grid-cols-3 lg:items-end lg:gap-4 lg:pt-7">
      <NuxtLink
        v-for="(p, i) in wins"
        :key="p.win.id"
        :to="sourceLink(p.win.caseSlug)"
        class="kd-win kd-press group relative isolate grid min-w-0 grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-3xl py-2.5 pr-4 pl-3 lg:grid-cols-[46%_minmax(0,1fr)] lg:gap-3 lg:py-5 lg:pr-5 lg:pl-4"
        :class="p.rank === 1 ? 'is-first' : ''"
        :style="{ '--rc': RARITY_COLOR[p.win.item.rarity], '--i': i, '--o': PODIUM.indexOf(p.rank) }"
      >
        <!-- the skin, breaking out over the card's top edge -->
        <ItemArt :image="p.win.item.image" :rarity="p.win.item.rarity" :size="artSize(p.rank)" float class="kd-win-art relative w-full self-start" />
        <div class="relative z-[2] flex min-w-0 flex-col items-start gap-1 lg:gap-1.5">
          <div class="flex items-center gap-2">
            <span class="kd-win-rank type-12-caps flex h-6 items-center gap-1 rounded-lg px-2" :class="`is-${p.rank}`">
              <UiIcon v-if="p.rank === 1" name="crown" :size="14" />#{{ p.rank }}
            </span>
            <UiPrice :amount="p.win.item.price" :size="isLg ? 'm' : 's'" />
          </div>
          <FxFire :on="p.rank === 1">
            <span class="kd-win-x relative z-[2]" :class="p.rank === 1 && 'is-first'">x{{ p.win.multiplier }}</span>
          </FxFire>
          <!-- phones: the weapon and the skin on one line; desktop: the weapon over the skin -->
          <span class="flex w-full min-w-0 max-lg:items-baseline max-lg:gap-1.5 lg:flex-col">
            <span class="type-12-caps shrink-0 truncate text-neutral-12">{{ p.win.item.weapon }}</span>
            <span class="type-14 truncate" :style="{ color: 'var(--rc)' }">{{ p.win.item.skin }}</span>
          </span>
          <span class="type-12-regular flex w-full min-w-0 items-center gap-1.5 text-neutral-11">
            <img v-if="sourceOf(p.win.caseSlug) === 'case'" :src="p.win.caseImage" alt="" class="size-5 shrink-0 object-contain" />
            <UiIcon v-else :name="SOURCE_ICON[sourceOf(p.win.caseSlug) as 'upgrade' | 'pvp']" :size="14" class="shrink-0 text-brand-light" />
            <span class="truncate">{{ p.win.nickname }} · {{ timeAgo(p.win.at) }}</span>
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
/* the card: lit from the skin — the rarity's light spreads from behind it to the left, over a lifted ground */
.kd-win {
  background:
    radial-gradient(55% 110% at 20% 45%, color-mix(in srgb, var(--rc) 34%, transparent), transparent 72%),
    linear-gradient(100deg, color-mix(in srgb, var(--rc) 14%, var(--color-neutral-3)), var(--color-neutral-3) 55%, var(--color-neutral-2));
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
/* the flat rarity shape steps back: the card's light carries the colour */
.kd-win :deep(.kd-art-star) {
  opacity: 0.25;
}
/* the light brightens on hover and keeps breathing on the winner's card (an ::after, opacity only) */
.kd-win::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(45% 90% at 20% 45%, color-mix(in srgb, var(--rc) 40%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
  pointer-events: none;
}
.kd-win.is-first {
  background:
    radial-gradient(55% 110% at 20% 45%, color-mix(in srgb, var(--color-gold) 32%, transparent), transparent 72%),
    linear-gradient(100deg, color-mix(in srgb, var(--color-gold) 18%, var(--color-neutral-3)), var(--color-neutral-3) 55%, var(--color-neutral-2));
}
.kd-win.is-first::after {
  animation: kd-glow-pulse 2.6s ease-in-out infinite;
}
@media (min-width: 64rem) {
  /* the podium: #2 · #1 · #3, the winner's card taller */
  .kd-win {
    order: var(--o);
    min-height: 168px;
  }
  .kd-win.is-first {
    min-height: 196px;
  }
}
/* the skin rises over the top edge by a third of itself */
.kd-win-art {
  margin-top: -22px;
  transform: rotate(-10deg);
  transition: transform var(--dur-slow) var(--ease-spring);
}
@media (min-width: 64rem) {
  .kd-win-art {
    margin-top: -44px;
  }
}
@media (hover: hover) {
  .kd-win:hover::after {
    opacity: 1;
  }
  .kd-win:hover .kd-win-art {
    transform: rotate(-4deg) translateY(-6px) scale(1.06);
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
  font-size: 26px;
  line-height: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 8px rgb(255 95 31 / 0.5));
}
@media (min-width: 64rem) {
  .kd-win-x {
    font-size: 36px;
    line-height: 40px;
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
