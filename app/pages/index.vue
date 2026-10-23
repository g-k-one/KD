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

// Sections with a clock (the weekly picks) count down on their header
const clock = useClock(1000)
const allCases = computed(() => (data.value?.sections ?? []).flatMap((s) => s.cases))

const scrollToCases = () => casesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <HomeHeroBanner @start="scrollToCases" />
    <HomeContinue :cases="allCases" />

    <!-- Cases come right after the hero (and the cases to continue): big wins and live battles break up the grid
         further down instead of pushing it off the first screen -->
    <div ref="fxHost" class="relative flex flex-col gap-6 lg:gap-10">

    <div ref="casesEl" class="flex scroll-mt-40 flex-col gap-4 lg:gap-10">
      <span ref="filtersSentinel" class="-mb-4 h-px lg:-mb-10" aria-hidden="true" />
      <div class="kd-filters-wrap lg:sticky lg:top-18 lg:z-20" :class="filtersStuck && 'is-stuck'">
      <HomeCaseFilters
        v-model:price="filters.price.value"
        v-model:risks="filters.risks.value"
        v-model:affordable="filters.affordable.value"
        v-model:sort="filters.sort.value"
        v-model:query="filters.query.value"
      />
      </div>

      <template v-for="(s, i) in sections" :key="s.id">
      <section class="flex flex-col gap-4">
        <UiSectionHeader
          :title="s.title"
          collapsible
          :collapsed="collapsed[s.id]"
          @toggle="collapsed[s.id] = !collapsed[s.id]"
        >
          <!-- the weekly picks say when they change -->
          <template v-if="s.endsAt" #actions>
            <span class="type-12-caps flex shrink-0 items-center gap-1.5 text-neutral-11">
              <UiIcon name="refresh" :size="14" /><span class="max-sm:hidden">{{ $t('home.newPicks') }}</span><span class="tabular-nums text-neutral-13">{{ countdownLong(s.endsAt, clock) }}</span>
            </span>
          </template>
        </UiSectionHeader>
        <div
          v-show="!collapsed[s.id]"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
        >
          <HomeCaseCard v-for="c in s.cases" :key="c.id" :item="c" />
        </div>
      </section>
      <HomeBigWins v-if="i === 0" />
      <HomeLiveBattles v-if="i === Math.min(2, sections.length - 1)" />
      </template>

      <UiEmptyState v-if="!sections.length" :text="$t('cases.empty')">
        <UiButton variant="secondary" @click="filters.reset()">{{ $t('filters.reset') }}</UiButton>
      </UiEmptyState>
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
