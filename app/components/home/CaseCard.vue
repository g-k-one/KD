<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'

// Figma "CaseCard" states: Default → Hover (surface lifts to neutral-4, art settles 232→220,
// price becomes the brand-gradient button, risk reveals its label) → Active (80% opacity).
defineProps<{ item: CaseSummary }>()
const { onPointerMove } = useSpotlight()

const RISK_TEXT = { low: 'text-success', medium: 'text-coin', high: 'text-brand-light', extreme: 'text-danger' } as const
</script>

<template>
  <NuxtLink
    :to="`/case/${item.slug}`"
    class="kd-case-card kd-spotlight group relative flex flex-col items-center gap-2 rounded-5xl border"
    @pointermove="onPointerMove"
  >
    <div class="kd-case-art-box relative aspect-square w-full lg:aspect-auto lg:h-55">
      <img
        :src="item.image"
        :alt="item.name"
        loading="lazy"
        draggable="false"
        class="kd-case-art size-full object-contain"
      />
    </div>

    <div class="flex w-full flex-col items-center gap-2 px-3 pb-3 lg:gap-3 lg:px-4 lg:pb-[14px]">
      <h3 class="type-12-caps lg:type-14-caps w-full truncate text-center">{{ item.name }}</h3>

      <div class="kd-case-price relative flex w-full items-center justify-center rounded-lg py-1.5 lg:py-2">
        <span class="kd-case-price-fill bg-brand-gradient absolute inset-0 rounded-lg shadow-inner-primary" />
        <span class="relative grid">
          <UiPrice :amount="item.price" size="l" tone="coin" class="kd-case-price-a col-start-1 row-start-1" />
          <UiPrice :amount="item.price" size="l" tone="inverse" class="kd-case-price-b col-start-1 row-start-1" />
        </span>
      </div>

      <div class="flex h-4 w-full items-center">
        <span class="kd-case-risk-label type-10-caps overflow-hidden text-neutral-11">{{ $t('risk.label') }}</span>
        <UiRiskMeter :level="item.risk" class="flex-1" />
        <span class="kd-case-risk-label type-12 overflow-hidden text-right" :class="RISK_TEXT[item.risk]">
          {{ $t(`risk.${item.risk}`) }}
        </span>
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

<style scoped>
.kd-case-card {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.kd-case-art {
  transition: transform var(--dur-base) var(--ease-out);
}
/* Figma: art 232 by default, 220 on hover. The box stays 220 and only the image scales,
   so the card never changes height. */
@media (min-width: 64rem) {
  .kd-case-art {
    transform: scale(1.055);
  }
}
.kd-case-price-fill {
  opacity: 0;
  transform: scale(0.94);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-case-price-a,
.kd-case-price-b {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-case-price-b {
  opacity: 0;
  transform: translateY(4px);
}
.kd-case-risk-label {
  max-width: 0;
  opacity: 0;
  white-space: nowrap;
  transition:
    max-width var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out),
    margin var(--dur-slow) var(--ease-out);
}

@media (hover: hover) {
  .kd-case-card:hover {
    background: var(--color-neutral-4);
    border-color: var(--color-neutral-7);
  }
  .kd-case-card:hover .kd-case-art {
    transform: none;
  }
  .kd-case-card:hover .kd-case-price-fill {
    opacity: 1;
    transform: scale(1);
  }
  .kd-case-card:hover .kd-case-price-a {
    opacity: 0;
    transform: translateY(-4px);
  }
  .kd-case-card:hover .kd-case-price-b {
    opacity: 1;
    transform: none;
  }
  .kd-case-card:hover .kd-case-risk-label {
    max-width: 80px;
    opacity: 1;
  }
  .kd-case-card:hover .kd-case-risk-label:first-child {
    margin-right: 8px;
  }
  .kd-case-card:hover .kd-case-risk-label:last-child {
    margin-left: 8px;
  }
}
.kd-case-card:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition-duration: var(--dur-press);
}
</style>
