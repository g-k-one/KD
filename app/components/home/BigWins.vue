<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// A podium of the top three — #2, #1, #3 — in one row at every width (no strip to swipe, nothing cut off):
// the winner stands taller, crowned, its multiplier burning; each skin stands on a pedestal of its rarity's light.
// Each card links to where the drop came from.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3))
// podium order: second, first, third (fewer than three: as they come)
const podium = computed(() => {
  const w = wins.value.map((win, k) => ({ win, rank: k + 1 }))
  return w.length === 3 ? [w[1]!, w[0]!, w[2]!] : w
})
const isLg = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <section v-if="wins.length" class="flex flex-col gap-3 lg:gap-4">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <div class="grid grid-cols-3 items-end gap-2 lg:gap-4">
      <NuxtLink
        v-for="(p, i) in podium"
        :key="p.win.id"
        :to="sourceLink(p.win.caseSlug)"
        class="kd-win kd-press group relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-3xl border px-2 pt-3 pb-3 lg:gap-2 lg:px-4 lg:pb-4"
        :class="p.rank === 1 ? 'is-first pt-4 lg:pt-6' : 'lg:pt-4'"
        :style="{ '--rc': RARITY_COLOR[p.win.item.rarity], '--i': i }"
      >
        <!-- the place: a crown for the day's best, a number for the rest -->
        <span class="kd-win-rank type-10-caps absolute top-2 left-2 flex h-5 items-center gap-0.5 rounded-sm px-1.5 lg:top-3 lg:left-3" :class="`is-${p.rank}`">
          <UiIcon v-if="p.rank === 1" name="crown" :size="12" />#{{ p.rank }}
        </span>
        <!-- the skin on its pedestal of rarity light -->
        <span class="relative w-full">
          <span class="kd-win-pedestal pointer-events-none absolute inset-x-0 bottom-0 h-1/2" aria-hidden="true" />
          <ItemArt
            :image="p.win.item.image"
            :rarity="p.win.item.rarity"
            :size="p.rank === 1 ? (isLg ? 132 : 76) : isLg ? 104 : 64"
            class="kd-win-art relative w-full"
          />
        </span>
        <FxFire :on="p.rank === 1" class="relative z-[2]">
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
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.kd-win {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
/* the winner's card: a gold rim and a warmer ground */
.kd-win.is-first {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 14%, var(--color-neutral-2)), var(--color-neutral-2) 70%);
  border-color: color-mix(in srgb, var(--color-gold) 45%, var(--color-neutral-4));
}
@media (hover: hover) {
  .kd-win:hover {
    border-color: color-mix(in srgb, var(--rc) 55%, var(--color-neutral-7));
  }
  .kd-win:hover .kd-win-art {
    transform: translateY(-4px) scale(1.04);
  }
}
.kd-win-art {
  transition: transform var(--dur-slow) var(--ease-spring);
}
/* a pool of the rarity's light under the skin, like a spotlight on a podium step */
.kd-win-pedestal {
  background: radial-gradient(50% 60% at 50% 100%, color-mix(in srgb, var(--rc) 55%, transparent), transparent 70%);
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
