<script setup lang="ts">
import type { CasesResponse } from '#shared/types/api'

const { data } = await useFetch<CasesResponse>('/api/cases', { key: 'cases' })
const filters = useCaseFilters()

const collapsed = ref<Record<string, boolean>>({})
const casesEl = useTemplateRef<HTMLElement>('casesEl')

const sections = computed(() =>
  (data.value?.sections ?? []).map((s) => ({ ...s, cases: filters.apply(s.cases) })).filter((s) => s.cases.length),
)

// One Forge canvas for the page body: badge flames and the promo coins draw here, under the sticky header
const fxHost = useTemplateRef<HTMLElement>('fxHost')
provideForge(fxHost)

// Desktop: the filter bar sticks under the header once it would scroll away (a sentinel above it tells when)
const filtersSentinel = useTemplateRef<HTMLElement>('filtersSentinel')
const filtersStuck = ref(false)
useIntersectionObserver(filtersSentinel, ([e]) => (filtersStuck.value = !!e && !e.isIntersecting && e.boundingClientRect.top < 100), { rootMargin: '-72px 0px 0px 0px' })

const scrollToCases = () => casesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <HomeHeroBanner @start="scrollToCases" />
    <HomeStatsBand />

    <div ref="fxHost" class="relative flex flex-col gap-6 lg:gap-10">
    <HomeBigWins />

    <div ref="casesEl" class="flex scroll-mt-40 flex-col gap-4 lg:gap-10">
      <span ref="filtersSentinel" class="-mb-4 h-px lg:-mb-10" aria-hidden="true" />
      <div class="kd-filters-wrap lg:sticky lg:top-18 lg:z-20" :class="filtersStuck && 'is-stuck'">
      <HomeCaseFilters
        v-model:price="filters.price.value"
        v-model:risks="filters.risks.value"
        v-model:affordable="filters.affordable.value"
        v-model:sort="filters.sort.value"
      />
      </div>

      <section v-for="s in sections" :key="s.id" class="flex flex-col gap-4">
        <UiSectionHeader
          :title="s.title"
          collapsible
          :collapsed="collapsed[s.id]"
          @toggle="collapsed[s.id] = !collapsed[s.id]"
        />
        <div
          v-show="!collapsed[s.id]"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
        >
          <HomeCaseCard v-for="c in s.cases" :key="c.id" :item="c" />
        </div>
      </section>

      <div v-if="!sections.length" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 py-16 text-center">
        <p class="type-14-regular text-neutral-12">{{ $t('cases.empty') }}</p>
        <UiButton variant="secondary" @click="filters.reset()">{{ $t('filters.reset') }}</UiButton>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* Stuck under the header: the bar sheds its labels' air and floats over the cases */
@media (min-width: 64rem) {
  .kd-filters-wrap {
    transition:
      padding var(--dur-base) var(--ease-out),
      background-color var(--dur-base) var(--ease-out);
  }
  .kd-filters-wrap.is-stuck {
    margin-inline: -16px;
    padding: 8px 16px;
    background: rgb(12 13 16 / 0.86);
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 24px -12px rgb(0 0 0 / 0.8);
  }
  .kd-filters-wrap.is-stuck :deep(.kd-field-label) {
    display: none;
  }
}
</style>
