<script setup lang="ts">
import type { BigWinsResponse } from '#shared/types/api'

// "Big wins today" (player audit D1): the day's best multipliers, so the home page has heat.
// Each card links to the case it came from. Desktop: 3 in a row; phones: a swipeable strip.
const { data } = useFetch<BigWinsResponse>('/api/wins/today', { key: 'wins-today', lazy: true, server: false })
const wins = computed(() => (data.value?.wins ?? []).slice(0, 3))
const isLg = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <section v-if="wins.length" class="flex flex-col gap-3 lg:gap-4">
    <div class="flex items-center gap-2">
      <UiIcon name="fire" :size="20" class="text-brand-light" />
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('wins.title') }}</h2>
      <span class="type-12 ml-auto text-neutral-11">{{ $t('wins.window') }}</span>
    </div>
    <div class="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
      <NuxtLink
        v-for="(w, i) in wins"
        :key="w.id"
        :to="sourceLink(w.caseSlug)"
        class="kd-win kd-press group relative flex w-[78%] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-3xl border p-3 sm:w-[48%] lg:w-auto lg:gap-4 lg:p-4"
        :style="{ '--rc': RARITY_COLOR[w.item.rarity], '--i': i }"
      >
        <ItemArt :image="w.item.image" :rarity="w.item.rarity" :size="isLg ? 72 : 60" class="w-22 shrink-0 lg:w-26" />
        <div class="relative z-[2] flex min-w-0 flex-1 flex-col gap-1">
          <!-- x and the price share a row; the day's best multiplier burns, the other two stay calm -->
          <div class="flex items-center justify-between gap-2">
            <FxFire :on="i === 0" class="min-w-0">
              <span class="kd-win-x relative z-[2]">x{{ w.multiplier }}</span>
            </FxFire>
            <UiPrice :amount="w.item.price" size="m" tone="coin" class="shrink-0" />
          </div>
          <span class="type-14 truncate" :style="{ color: 'var(--rc)' }">{{ w.item.weapon }} | {{ w.item.skin }}</span>
          <span class="type-12-regular flex min-w-0 items-center gap-1.5 text-neutral-11">
            <span class="grid size-5 shrink-0 place-items-center">
              <img v-if="sourceOf(w.caseSlug) === 'case'" :src="w.caseImage" alt="" class="size-5 object-contain" />
              <UiIcon v-else :name="SOURCE_ICON[sourceOf(w.caseSlug) as 'upgrade' | 'pvp']" :size="16" class="text-brand-light" />
            </span>
            <span class="truncate">{{ w.caseName }} · {{ w.nickname }} · {{ timeAgo(w.at) }}</span>
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>


<style scoped>
.kd-win {
  background: linear-gradient(110deg, color-mix(in srgb, var(--rc) 16%, var(--color-neutral-2)), var(--color-neutral-2) 55%);
  border-color: var(--color-neutral-4);
  animation: kd-win-in var(--dur-slow) var(--ease-out) backwards;
  animation-delay: calc(var(--i) * 70ms);
}
@media (hover: hover) {
  .kd-win:hover {
    border-color: color-mix(in srgb, var(--rc) 55%, var(--color-neutral-7));
  }
}
.kd-win-x {
  font-size: 28px;
  line-height: 32px;
  font-weight: 800;
  letter-spacing: -0.01em;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 8px rgb(255 95 31 / 0.5));
}
@keyframes kd-win-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
