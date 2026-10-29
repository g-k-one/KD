<script setup lang="ts">
import type { CaseSection, CaseSummary, CasesResponse, HomeLayout } from '#shared/types/api'

// The page shows at once on a tap from elsewhere: card skeletons hold the grid until the catalog comes in (the first
// load, rendered on the server, comes complete)
const req = useFetch<CasesResponse>('/api/cases', { key: 'cases', lazy: true })
if (import.meta.server) await req
const { data } = req
const filters = useCaseFilters()

const collapsed = ref<Record<string, boolean>>({})
const casesEl = useTemplateRef<HTMLElement>('casesEl')

const sections = computed(() =>
  (data.value?.sections ?? []).map((s) => ({ ...s, cases: filters.apply(s.cases) })).filter((s) => s.cases.length),
)

// One Forge canvas for the page body: the big wins' flames, badge flames and the promo coins draw here, under the
// sticky header
const fxHost = useTemplateRef<HTMLElement>('fxHost')
provideForge(fxHost)

// Desktop: the filter bar sticks under the header once it would scroll away (a sentinel above it tells when)
const filtersSentinel = useTemplateRef<HTMLElement>('filtersSentinel')
const filtersStuck = ref(false)
useIntersectionObserver(filtersSentinel, ([e]) => (filtersStuck.value = !!e && !e.isIntersecting && e.boundingClientRect.top < 100), { rootMargin: '-68px 0px 0px 0px' })
// Phones: the stuck bar slides away under the header while you scroll down the cases and comes back on the first
// scroll up (not while you type in its search)
const filtersHidden = ref(false)
let lastY = 0
useEventListener(
  'scroll',
  () => {
    const y = window.scrollY
    if (Math.abs(y - lastY) < 8) return
    filtersHidden.value = filtersStuck.value && y > lastY && !document.activeElement?.closest('.kd-filters input')
    lastY = y
  },
  { passive: true },
)

// Sections with a clock (the weekly picks) count down on their header
const clock = useClock(1000)
const allCases = computed(() => (data.value?.sections ?? []).flatMap((s) => s.cases))

// Bento cells from the home layout (desktop): a case set to wide takes a 2×1 cell, tall a 1×2 cell, each showing its
// shaped picture; they go first so the rows fill. Phones keep the even grid; a themed row keeps its scene's look.
// A tall cell needs a second row to stretch into: a one-row section (5 cases or fewer) keeps it square.
// Sorted or filtered, every card is standard: the cells keep the chosen order instead of the shaped ones jumping first
const shapeOf = (c: CaseSummary, s: CaseSection) =>
  s.theme || filters.isActive.value ? undefined : c.card === 'wide' && c.art?.wide ? ('wide' as const) : c.card === 'tall' && c.art?.tall && s.cases.length > 5 ? ('tall' as const) : undefined
// Both stand at the row's right edge: the tall cell in the last column, the wide one just left of it; the standard
// cards fill in from the left
const SHAPE_CELL = { wide: 'lg:order-first lg:[grid-column:span_2/-2]', tall: 'lg:order-first lg:[grid-column:-2/-1] lg:row-span-2' } as const
// Phones: every row is the two-column grid, no sideways swiping. A short row (one desktop row or less) with an odd
// count drops its last card there, so no case stands alone on a line; the big catalog below still has every case
const isShortOdd = (s: CaseSection) => s.cases.length <= 5 && s.cases.length % 2 === 1

// The home layout editor (prototype, opened from the debug dock): rows and cards are edited where they stand
const homeLayout = useHomeLayout()
onMounted(() => watch(homeLayout.editing, (on) => on && homeLayout.load(), { immediate: true }))
// While editing, each hidden row stands just before the next shown row (or at the end), where it will come back
const hiddenBefore = computed(() => {
  const at: Record<string, HomeLayout['sections']> = { end: [] }
  if (!homeLayout.editing.value || !homeLayout.layout.value) return at
  let waiting: HomeLayout['sections'] = []
  for (const r of homeLayout.layout.value.sections) {
    if (r.hidden) waiting.push(r)
    else {
      at[r.id] = waiting
      waiting = []
    }
  }
  at.end = waiting
  return at
})

const scrollToCases = () => casesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div>
    <!-- the banner runs edge to edge above the column -->
    <HomeHeroBleed @start="scrollToCases" />
    <div class="mx-auto flex max-w-content flex-col gap-6 px-4 lg:gap-10 lg:px-0">

      <!-- One Forge canvas for the big wins and the cases (a phone keeps one WebGL context per page, not one per block).
           Cases right after the big wins; the cases to continue and the live battles break up the grid further down.
           Phones: the canvas runs edge to edge like the running lines in it, so their fire isn't cut at the side gutters -->
      <div ref="fxHost" class="relative flex flex-col gap-6 max-lg:-mx-4 max-lg:px-4 lg:gap-10">
      <HomeBigWins />

      <div ref="casesEl" class="flex scroll-mt-40 flex-col gap-4 lg:gap-10">
        <span ref="filtersSentinel" class="-mb-4 h-px lg:-mb-10" aria-hidden="true" />
        <div class="kd-filters-wrap sticky top-17 z-20 lg:top-18" :class="[filtersStuck && 'is-stuck', filtersHidden && 'is-hidden']">
        <HomeCaseFilters
          v-model:price="filters.price.value"
          v-model:risks="filters.risks.value"
          v-model:affordable="filters.affordable.value"
          v-model:sort="filters.sort.value"
          v-model:query="filters.query.value"
        />
        </div>

        <!-- the catalog on its way: two rows of card skeletons in the grid's own columns -->
        <template v-if="!data">
          <section v-for="n in 2" :key="n" class="flex flex-col gap-4" aria-hidden="true">
            <div class="flex h-8 items-center"><span class="kd-skeleton h-6 w-44 rounded-md" /></div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              <HomeCaseCardSkeleton v-for="k in 5" :key="k" />
            </div>
          </section>
        </template>

        <template v-for="(s, i) in sections" :key="s.id">
        <HomeHiddenRow v-for="r in hiddenBefore[s.id]" :key="r.id" :row="r" />
        <!-- sections after the first are skipped by the renderer until they come near the screen -->
        <!-- a themed row draws its scene edge to edge, so it is never skipped by the renderer (that would clip the scene) -->
        <!-- collapsed, a themed row drops its scene and its air: just the header, like any other -->
        <section class="relative flex flex-col gap-4" :class="[s.theme && !collapsed[s.id] && `kd-themed is-${s.theme}`, i > 0 && !s.theme && 'kd-offscreen']">
          <div v-if="s.theme && !collapsed[s.id]" class="kd-row-scene" aria-hidden="true"><img :src="`/img/coop/${s.theme}.webp`" alt="" draggable="false" loading="lazy" /></div>
          <UiSectionHeader
            :title="s.title"
            collapsible
            :collapsed="collapsed[s.id]"
            @toggle="collapsed[s.id] = !collapsed[s.id]"
          >
            <template v-if="homeLayout.editing.value" #actions>
              <HomeRowControls :id="s.id" class="max-lg:hidden" />
            </template>
            <!-- the weekly picks say when they change -->
            <template v-else-if="s.endsAt" #actions>
              <span class="type-12-caps flex shrink-0 items-center gap-1.5 text-neutral-11">
                <UiIcon name="refresh" :size="14" /><span class="max-sm:hidden">{{ $t('home.newPicks') }}</span><span class="tabular-nums text-neutral-13">{{ countdownLong(s.endsAt, clock) }}</span>
              </span>
            </template>
          </UiSectionHeader>
          <!-- phones: the row's tools get their own line, the title keeps the header -->
          <HomeRowControls v-if="homeLayout.editing.value" :id="s.id" class="lg:hidden" />
          <div
            v-show="!collapsed[s.id]"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-flow-dense xl:grid-cols-5"
            :class="isShortOdd(s) && 'max-sm:[&>*:last-child]:hidden'"
          >
            <HomeCaseCard
              v-for="c in s.cases"
              :key="c.id"
              :item="c"
              :shape="shapeOf(c, s)"
              :look="s.theme"
              :class="shapeOf(c, s) && SHAPE_CELL[shapeOf(c, s)!]"
            >
              <HomeCardKindPicker v-if="homeLayout.editing.value" :item="c" :themed="!!s.theme" />
            </HomeCaseCard>
          </div>
        </section>
        <HomeContinue v-if="i === 0" :cases="allCases" />
        <HomeLiveBattles v-if="i === Math.min(2, sections.length - 1)" />
        </template>

        <HomeHiddenRow v-for="r in hiddenBefore.end" :key="r.id" :row="r" />
        <ClientOnly><HomeLayoutBar v-if="homeLayout.editing.value" /></ClientOnly>

        <UiEmptyState v-if="data && !sections.length" :text="$t('cases.empty')" art="empty-search">
          <UiButton variant="secondary" @click="filters.reset()">{{ $t('filters.reset') }}</UiButton>
        </UiEmptyState>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* A themed row: the scene spans the whole screen width behind the row and melts into the page at every edge */
.kd-themed {
  isolation: isolate;
  padding-block: 24px 8px;
}
.kd-row-scene {
  position: absolute;
  z-index: -1;
  top: -40px;
  bottom: -48px;
  left: 50%;
  width: 100vw;
  translate: -50% 0;
  pointer-events: none;
  /* the wall only: it fades out before the straw floor, the pedestals stand against the boards */
  mask-image: linear-gradient(180deg, transparent, #000 18%, #000 46%, transparent 74%), linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
  mask-composite: intersect;
}
.kd-row-scene img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* the boards and the rail, not the straw floor */
  object-position: 50% 30%;
  filter: brightness(0.7);
  opacity: 0.8;
}

/* Phones: stuck 8 px under the header, only the filters' own card shows, nothing behind it */
@media (max-width: 63.999rem) {
  .kd-filters-wrap {
    transition:
      transform var(--dur-base) var(--ease-out),
      opacity var(--dur-base) var(--ease-out);
  }
  .kd-filters-wrap.is-hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
}
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
