<script setup lang="ts">
import type { CasesResponse } from '#shared/types/api'

const { data } = await useFetch<CasesResponse>('/api/cases', { key: 'cases' })
const filters = useCaseFilters()

const collapsed = ref<Record<string, boolean>>({})
const casesEl = useTemplateRef<HTMLElement>('casesEl')

const sections = computed(() =>
  (data.value?.sections ?? []).map((s) => ({ ...s, cases: filters.apply(s.cases) })).filter((s) => s.cases.length),
)

const scrollToCases = () => casesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <HomeHeroBanner @start="scrollToCases" />

    <div ref="casesEl" class="flex scroll-mt-40 flex-col gap-4 lg:gap-10">
      <HomeCaseFilters
        v-model:price="filters.price.value"
        v-model:risks="filters.risks.value"
        v-model:affordable="filters.affordable.value"
        v-model:sort="filters.sort.value"
      />

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

      <div v-if="!sections.length" class="flex flex-col items-center gap-4 rounded-5xl border border-neutral-4 py-16 text-center">
        <p class="type-14-regular text-neutral-12">{{ $t('cases.empty') }}</p>
        <UiButton variant="secondary" @click="filters.reset()">{{ $t('filters.reset') }}</UiButton>
      </div>
    </div>
  </div>
</template>
