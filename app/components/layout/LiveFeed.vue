<script setup lang="ts">
import type { FeedDrop } from '#shared/types/api'

const { feed } = useLiveFeed()
const isLg = useMediaQuery('(min-width: 1024px)')
const mode = ref<'live' | 'top'>('live')

const drops = computed<FeedDrop[]>(() => {
  const list = feed.value.drops
  return mode.value === 'top' ? [...list].sort((a, b) => b.price - a.price) : list
})
</script>

<template>
  <section class="flex h-16 items-center gap-2 border-b border-neutral-4 bg-neutral-2 px-2 py-1.5 lg:h-22 lg:py-2 lg:pr-6" aria-label="Live drops">
    <!-- Live / Top switch -->
    <div class="flex h-full shrink-0 flex-col">
      <button
        v-for="m in (['live', 'top'] as const)"
        :key="m"
        type="button"
        class="type-12-caps lg:type-14-caps flex flex-1 items-center gap-1.5 rounded-lg px-2 transition-colors"
        :class="mode === m ? 'bg-success-24 text-neutral-15' : 'text-neutral-11 hover:text-neutral-13'"
        :aria-pressed="mode === m"
        @click="mode = m"
      >
        <UiIcon :name="m === 'live' ? 'live' : 'trophy'" :size="isLg ? 20 : 18" :class="m === 'live' && 'text-success'" />
        <span class="hidden sm:inline">{{ $t(`feed.${m}`) }}</span>
      </button>
    </div>

    <!-- Pinned highlight: same item language as cases and upgrades, a muted rarity wash on the left -->
    <div
      v-if="feed.highlight"
      class="relative hidden h-18 w-62.5 shrink-0 items-center gap-2.5 overflow-hidden rounded-xl pr-3 pl-1 md:flex"
      :style="{ background: `linear-gradient(90deg, color-mix(in srgb, ${RARITY_COLOR[feed.highlight.rarity]} 22%, var(--color-neutral-4)), var(--color-neutral-4) 75%)` }"
    >
      <ItemArt :image="feed.highlight.image" :rarity="feed.highlight.rarity" :size="44" class="w-18 shrink-0" />
      <div class="relative flex min-w-0 flex-col gap-1">
        <span class="type-10-caps text-brand-light">🔥 {{ $t('feed.highlight') }}</span>
        <span class="type-12 truncate">{{ feed.highlight.itemName }} | {{ feed.highlight.skinName }}</span>
        <UiPrice :amount="feed.highlight.price" tone="coin" />
      </div>
    </div>

    <!-- Drops strip -->
    <div class="scrollbar-none flex min-w-0 flex-1 gap-0.5 overflow-x-auto mask-r-from-90% lg:mask-none">
      <TransitionGroup
        enter-from-class="opacity-0 -translate-x-4"
        enter-active-class="transition duration-300"
        move-class="transition-transform duration-300"
      >
        <NuxtLink
          v-for="d in drops"
          :key="d.id"
          :to="`/case/${d.caseSlug}`"
          class="group relative h-13 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-4 lg:h-18 lg:w-22"
          :title="$t('feed.dropBy', { item: `${d.itemName} | ${d.skinName}`, user: d.userNickname })"
        >
          <ItemArt :image="d.image" :rarity="d.rarity" :size="isLg ? 44 : 32" class="absolute inset-0 m-auto w-full" />
          <span class="absolute inset-x-2 bottom-0 h-0.5 rounded-full opacity-70" :style="{ background: RARITY_COLOR[d.rarity] }" />
        </NuxtLink>
      </TransitionGroup>
    </div>
  </section>
</template>
