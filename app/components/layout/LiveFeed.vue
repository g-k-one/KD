<script setup lang="ts">
import type { FeedDrop } from '#shared/types/api'

const { feed } = useLiveFeed()
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
        <UiIcon :name="m === 'live' ? 'live' : 'trophy'" :size="18" :class="m === 'live' && 'text-success'" />
        <span class="hidden sm:inline">{{ $t(`feed.${m}`) }}</span>
      </button>
    </div>

    <!-- Pinned highlight -->
    <div
      v-if="feed.highlight"
      class="relative hidden h-18 w-62.5 shrink-0 items-center gap-2.5 overflow-hidden rounded-xl pr-3 pl-2 md:flex"
      :style="{ background: `linear-gradient(23deg, ${RARITY_COLOR[feed.highlight.rarity]} 42%, var(--color-neutral-4) 82%)` }"
    >
      <img :src="feed.highlight.image" alt="" class="size-18 shrink-0 object-contain" />
      <div class="flex min-w-0 flex-col gap-1">
        <span class="type-10-caps text-brand-light">🔥 {{ $t('feed.highlight') }}</span>
        <span class="type-12 truncate">{{ feed.highlight.itemName }} | {{ feed.highlight.skinName }}</span>
        <UiPrice :amount="feed.highlight.price" tone="coin" />
      </div>
    </div>

    <!-- Drops strip -->
    <div class="scrollbar-none flex min-w-0 flex-1 gap-0.5 overflow-x-auto mask-r-from-90%">
      <TransitionGroup
        enter-from-class="opacity-0 -translate-x-4"
        enter-active-class="transition duration-300"
        move-class="transition-transform duration-300"
      >
        <NuxtLink
          v-for="d in drops"
          :key="d.id"
          :to="`/case/${d.caseSlug}`"
          class="group relative h-13 w-16 shrink-0 overflow-hidden rounded-lg lg:h-18 lg:w-22"
          :style="{ background: rarityGlow(d.rarity, 44) }"
          :title="$t('feed.dropBy', { item: `${d.itemName} | ${d.skinName}`, user: d.userNickname })"
        >
          <img :src="d.image" alt="" class="absolute inset-0 m-auto size-12 object-contain transition-transform group-hover:scale-110 lg:size-18" />
        </NuxtLink>
      </TransitionGroup>
    </div>
  </section>
</template>
