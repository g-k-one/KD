<script setup lang="ts">
import type { CaseSummary } from '#shared/types/api'

// "Continue" (#4): the cases the player opened last, one tap back into them. Small tiles on a rail, so the row
// costs little height above the full grid; on desktop the title stands on the rail's line as a block as tall as the
// tiles, so one or two tiles don't leave a whole row of air. The rail fades out at a side with more tiles behind it.
// Hidden until there is something to continue.
const props = defineProps<{ cases: CaseSummary[] }>()
const { slugs } = useRecentCases()
const recent = computed(() => slugs.value.map((s) => props.cases.find((c) => c.slug === s)).filter((c): c is CaseSummary => !!c))
const rail = useTemplateRef('rail')
const { arrivedState } = useScroll(rail)
// the fades show only on a side the rail can still scroll to
const more = ref({ left: false, right: false })
function measure() {
  const el = rail.value
  const over = !!el && el.scrollWidth > el.clientWidth + 1
  more.value = { left: over && !arrivedState.left, right: over && !arrivedState.right }
}
watch(() => [arrivedState.left, arrivedState.right, recent.value.length], () => nextTick(measure))
useResizeObserver(rail, measure)
</script>

<template>
  <section v-if="recent.length" class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
    <div class="flex shrink-0 items-center gap-3">
      <span class="hidden size-18 shrink-0 place-items-center rounded-3xl bg-neutral-2 text-brand-light lg:grid"><UiIcon name="history" :size="28" /></span>
      <span class="flex flex-col gap-1">
        <h2 class="type-16-caps lg:type-20-caps">{{ $t('home.continue') }}</h2>
        <span class="type-12-regular hidden text-neutral-11 lg:block">{{ $t('home.continueHint') }}</span>
      </span>
    </div>
    <div
      ref="rail"
      class="kd-rail scrollbar-none -mx-4 flex min-w-0 snap-x scroll-px-4 gap-2 overflow-x-auto px-4 lg:mx-0 lg:scroll-px-0 lg:px-0"
      :class="{ 'is-more-left': more.left, 'is-more-right': more.right }"
    >
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
/* a soft edge where more tiles hide, a hard one where the rail ends */
.kd-rail {
  --fade-l: 0px;
  --fade-r: 0px;
  mask-image: linear-gradient(90deg, transparent, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent);
}
.kd-rail.is-more-left {
  --fade-l: 48px;
}
.kd-rail.is-more-right {
  --fade-r: 64px;
}
.kd-recent {
  transition: background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-recent:hover {
    background: var(--color-neutral-3);
  }
}
</style>
