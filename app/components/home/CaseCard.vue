<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'

// Figma "CaseCard": on hover the price turns into the brand-gradient button and risk gets its label.
defineProps<{ item: CaseSummary }>()
</script>

<template>
  <NuxtLink
    :to="`/case/${item.slug}`"
    class="group relative flex flex-col items-center gap-2 rounded-5xl border border-neutral-4 bg-neutral-2 transition-colors hover:border-neutral-7 hover:bg-neutral-4"
  >
    <div class="relative aspect-square w-full overflow-hidden rounded-4xl lg:aspect-auto lg:h-58">
      <img
        :src="item.image"
        :alt="item.name"
        loading="lazy"
        class="size-full object-contain transition-transform duration-300 group-hover:scale-95"
      />
    </div>

    <div class="flex w-full flex-col items-center gap-2 px-3 pb-3 lg:gap-3 lg:px-4 lg:pb-4">
      <h3 class="type-12-caps lg:type-14-caps w-full truncate text-center">{{ item.name }}</h3>
      <div
        class="flex w-full items-center justify-center rounded-lg py-1.5 transition-colors lg:py-2 group-hover:bg-brand-gradient"
      >
        <span class="contents group-hover:hidden"><UiPrice :amount="item.price" size="l" tone="coin" /></span>
        <span class="hidden group-hover:contents"><UiPrice :amount="item.price" size="l" tone="inverse" /></span>
      </div>
      <div class="h-4 w-full content-center">
        <div class="group-hover:hidden"><UiRiskMeter :level="item.risk" /></div>
        <div class="hidden group-hover:block"><UiRiskMeter :level="item.risk" show-label /></div>
      </div>
    </div>

    <span
      v-if="item.tag"
      class="type-10-caps absolute top-3 left-3 rounded-sm bg-brand-base px-1.5 py-1 text-neutral-1 lg:top-4 lg:left-4"
    >
      {{ $t(`cases.tag.${item.tag}`) }}
    </span>
  </NuxtLink>
</template>
