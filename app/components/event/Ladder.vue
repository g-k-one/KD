<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'

/*
 * The event's case ladder (docs/ux-research-v3.md #19, #34 — GGDrop, Casehug): one story told in five cases,
 * cheapest first, each named for its step. On desktop the row climbs like stairs to the final boss; on phones
 * it is a swipeable rail with the next case peeking in.
 */
defineProps<{ cases: CaseSummary[] }>()
</script>

<template>
  <div class="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:items-end lg:gap-3 lg:overflow-visible lg:px-0">
    <NuxtLink
      v-for="(c, i) in cases"
      :key="c.id"
      :to="`/case/${c.slug}`"
      class="kd-rung group flex w-40 shrink-0 snap-start flex-col items-center gap-2 rounded-4xl p-3 pt-4 lg:w-auto"
      :class="{ 'is-boss': c.event && c.event.level === c.event.of }"
      :style="{ '--step': i }"
    >
      <span class="kd-rung-level type-10-caps rounded-sm px-1.5 py-0.5">
        {{ c.event && c.event.level === c.event.of ? $t('event.boss') : $t('event.level', { n: c.event?.level ?? i + 1 }) }}
      </span>
      <img :src="c.image" :alt="c.name" class="kd-rung-art aspect-square w-full object-contain" loading="lazy" draggable="false" />
      <span class="type-16-caps truncate">{{ c.name }}</span>
      <span class="kd-rung-price flex h-9 w-full items-center justify-center rounded-lg"><UiPrice :amount="c.price" size="m" /></span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.kd-rung {
  position: relative;
  background: linear-gradient(180deg, rgb(139 92 246 / 0.14), var(--color-neutral-2) 60%);
  box-shadow: inset 0 0 0 1px rgb(139 92 246 / 0.16);
  transition:
    transform var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
/* Desktop: each step stands a little higher than the last */
@media (min-width: 64rem) {
  .kd-rung {
    margin-bottom: calc(var(--step) * 14px);
  }
}
.kd-rung-level {
  background: rgb(139 92 246 / 0.2);
  color: #c4b5fd;
}
.kd-rung-art {
  filter: drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  transition: transform var(--dur-slow) var(--ease-spring);
}
.kd-rung-price {
  background: var(--color-neutral-3);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-rung.is-boss {
  background: linear-gradient(180deg, rgb(87 227 137 / 0.18), var(--color-neutral-2) 60%);
  box-shadow:
    inset 0 0 0 1px rgb(87 227 137 / 0.35),
    0 12px 40px -16px rgb(87 227 137 / 0.6);
}
.kd-rung.is-boss .kd-rung-level {
  background: rgb(87 227 137 / 0.2);
  color: #86efac;
}
@media (hover: hover) {
  .kd-rung:hover {
    transform: translateY(-4px);
  }
  .kd-rung:hover .kd-rung-art {
    transform: scale(1.05) rotate(-2deg);
  }
  .kd-rung:hover .kd-rung-price {
    background: var(--color-brand-base);
  }
}
</style>
