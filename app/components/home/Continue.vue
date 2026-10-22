<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'

// "Continue" (#4): the cases the player opened last, one tap back into them. Small tiles on a rail, so the row
// costs little height above the full grid; hidden until there is something to continue.
const props = defineProps<{ cases: CaseSummary[] }>()
const { slugs } = useRecentCases()
const recent = computed(() => slugs.value.map((s) => props.cases.find((c) => c.slug === s)).filter((c): c is CaseSummary => !!c))
</script>

<template>
  <section v-if="recent.length" class="flex flex-col gap-3">
    <h2 class="type-16-caps lg:type-20-caps">{{ $t('home.continue') }}</h2>
    <div class="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <NuxtLink
        v-for="c in recent"
        :key="c.slug"
        :to="`/case/${c.slug}`"
        class="kd-recent kd-press flex w-56 shrink-0 snap-start items-center gap-3 rounded-3xl bg-neutral-2 p-2 pr-4"
      >
        <img :src="c.image" :alt="c.name" class="size-14 shrink-0 object-contain" loading="lazy" draggable="false" />
        <span class="flex min-w-0 flex-col gap-1">
          <span class="type-14-caps truncate">{{ c.name }}</span>
          <UiPrice :amount="c.price" size="s" tone="coin" />
        </span>
        <UiIcon name="chevron-right" :size="16" class="ml-auto shrink-0 text-neutral-10" />
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.kd-recent {
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-recent:hover {
    background: var(--color-neutral-3);
  }
}
</style>
