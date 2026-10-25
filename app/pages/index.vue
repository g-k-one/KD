<script setup lang="ts">
import type { CaseSummary, CasesResponse } from '#shared/types/api'

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

// --- Under review: a bento grid (?grid=bento). Desktop only: a case with a wide picture takes a 2×1 cell, one with a
// tall picture a 1×2 cell, each showing that picture; shaped cases go first so the rows fill. Phones keep the even grid.
const route = useRoute()
const bento = computed(() => route.query.grid === 'bento')
// a tall cell needs a second row to stretch into: a one-row section (5 cases or fewer) keeps it square
const shapeOf = (c: CaseSummary, cases: CaseSummary[]) =>
  !bento.value ? undefined : c.art?.wide ? ('wide' as const) : c.art?.tall && cases.length > 5 ? ('tall' as const) : undefined
const SHAPE_CELL = { wide: 'lg:order-first lg:col-span-2', tall: 'lg:order-first lg:row-span-2' } as const

const scrollToCases = () => casesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <HomeHeroBanner @start="scrollToCases" />
    <HomeBigWins />

    <!-- Cases right after the hero and the big wins; the cases to continue and the live battles break up the grid
         further down -->
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
      <!-- sections after the first are skipped by the renderer until they come near the screen -->
      <section class="flex flex-col gap-4" :class="i > 0 && 'kd-offscreen'">
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
          :class="bento && 'lg:grid-flow-dense'"
        >
          <HomeCaseCard
            v-for="c in s.cases"
            :key="c.id"
            :item="c"
            :shape="shapeOf(c, s.cases)"
            :class="shapeOf(c, s.cases) && SHAPE_CELL[shapeOf(c, s.cases)!]"
          />
        </div>
      </section>
      <HomeContinue v-if="i === 0" :cases="allCases" />
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
