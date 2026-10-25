<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// A podium of the top three — #2, #1, #3 — in one row at every width (no strip to swipe, nothing cut off).
// The skins break out of their cards: big, tilted, floating over the top edge with their rarity glow whole;
// the winner's card stands taller, crowned, its multiplier burning. Each card links to where the drop came from.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3))
// podium order: second, first, third (fewer than three: as they come)
const podium = computed(() => {
  const w = wins.value.map((win, k) => ({ win, rank: k + 1 }))
  return w.length === 3 ? [w[1]!, w[0]!, w[2]!] : w
})
const isLg = useMediaQuery('(min-width: 1024px)')
// the skin's size: the winner's is the biggest, and on a phone they shrink with the column
const artSize = (rank: number) => (rank === 1 ? (isLg.value ? 150 : 76) : isLg.value ? 118 : 62)
</script>

<template>
  <section v-if="wins.length" class="flex flex-col gap-3 lg:gap-4">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <!-- room above the cards for the skins that break out of them -->
    <div class="grid grid-cols-3 items-end gap-2 pt-8 lg:gap-4 lg:pt-12">
      <NuxtLink
        v-for="(p, i) in podium"
        :key="p.win.id"
        :to="sourceLink(p.win.caseSlug)"
        class="kd-win kd-press group relative flex min-w-0 flex-col items-center rounded-3xl px-2 pb-3 lg:px-4 lg:pb-4"
        :class="p.rank === 1 ? 'is-first' : ''"
        :style="{ '--rc': RARITY_COLOR[p.win.item.rarity], '--i': i, '--art': `${artSize(p.rank)}px` }"
      >
        <!-- the skin: half of it above the card's top edge -->
        <ItemArt
          :image="p.win.item.image"
          :rarity="p.win.item.rarity"
          :size="artSize(p.rank)"
          float
          class="kd-win-art relative w-full"
        />
        <span class="kd-win-rank type-10-caps absolute top-2 left-2 flex h-5 items-center gap-0.5 rounded-sm px-1.5 lg:top-3 lg:left-3" :class="`is-${p.rank}`">
          <UiIcon v-if="p.rank === 1" name="crown" :size="12" />#{{ p.rank }}
        </span>
        <div class="relative z-[2] flex w-full min-w-0 flex-col items-center gap-0.5 lg:gap-1">
          <FxFire :on="p.rank === 1">
            <span class="kd-win-x relative z-[2]" :class="p.rank === 1 && 'is-first'">x{{ p.win.multiplier }}</span>
          </FxFire>
          <UiPrice :amount="p.win.item.price" :size="isLg ? 'm' : 's'" tone="coin" />
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
.kd-win {
  /* the card's top is the skin's middle: half the art above, half inside */
  margin-top: calc(var(--art) * 0.5);
  background: linear-gradient(180deg, color-mix(in srgb, var(--rc) 12%, var(--color-neutral-2)), var(--color-neutral-2) 60%);
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
/* the winner's card: a warmer, golden ground (no rim: the cards are flat, like the banners) */
.kd-win.is-first {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 20%, var(--color-neutral-2)), var(--color-neutral-2) 65%);
}
.kd-win-art {
  margin-top: calc(var(--art) * -0.5);
  transform: rotate(-8deg);
  transition: transform var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  .kd-win:hover .kd-win-art {
    transform: rotate(-3deg) translateY(-6px) scale(1.06);
  }
}
.kd-win-rank {
  z-index: 2;
  color: var(--color-neutral-13);
  background: rgb(12 13 16 / 0.72);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
}
.kd-win-rank.is-1 {
  color: #3a2400;
  background: linear-gradient(180deg, #ffe58a, #f5b82e 55%, var(--color-gold-dark));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5);
}
.kd-win-x {
  font-size: 20px;
  line-height: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 8px rgb(255 95 31 / 0.5));
}
.kd-win-x.is-first {
  font-size: 26px;
  line-height: 30px;
}
@media (min-width: 64rem) {
  .kd-win-x {
    font-size: 28px;
    line-height: 32px;
  }
  .kd-win-x.is-first {
    font-size: 40px;
    line-height: 44px;
  }
}
@keyframes kd-win-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
