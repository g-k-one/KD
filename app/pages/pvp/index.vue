<script setup lang="ts">
import type { BattlesResponse, BattleStatus } from '#shared/types/api'

useHead({ title: 'PvP · KurwaDROP' })
const { t } = useI18n()
const { data, refresh } = await useFetch<BattlesResponse>('/api/battles', { key: 'battles' })
useIntervalFn(() => refresh(), 3000)

const filter = ref<BattleStatus | 'all'>('all')
const counts = computed(() => {
  const list = data.value?.battles ?? []
  return { all: list.length, waiting: list.filter((b) => b.status === 'waiting').length, live: list.filter((b) => b.status === 'live').length, finished: list.filter((b) => b.status === 'finished').length }
})
const tabs = computed(() =>
  (['all', 'waiting', 'live', 'finished'] as const).map((v) => ({ value: v, label: t(`pvp.${v}`), count: counts.value[v] })),
)
// The biggest live battle plays at the top; the rest are big cards, live and joinable first
const featured = computed(() => {
  const live = (data.value?.battles ?? []).filter((b) => b.status === 'live' && b.results)
  return live.length ? live.reduce((best, b) => (b.cost * b.size > best.cost * best.size ? b : best)) : null
})
const ORDER = { live: 0, waiting: 1, finished: 2 } as const
const prefs = usePersisted('kd_pvp', { view: 'grid' as 'grid' | 'list' })
const view = computed({ get: () => prefs.value.view, set: (v: 'grid' | 'list') => (prefs.value = { ...prefs.value, view: v }) })
const list = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => b.id !== featured.value?.id && (filter.value === 'all' || b.status === filter.value))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
)
const inPlay = computed(() => (data.value?.battles ?? []).filter((b) => b.status !== 'finished').reduce((a, b) => a + b.cost * b.size, 0))
const watching = computed(() => (data.value?.battles ?? []).reduce((a, b) => a + (b.viewers ?? 0), 0))
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('pvp.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />
    <div class="flex flex-wrap items-center gap-3">
      <span class="kd-stat type-12-caps"><span class="kd-stat-dot" />{{ counts.live }} {{ $t('pvp.live') }}</span>
      <span class="kd-stat type-12-caps"><UiIcon name="eye" :size="14" />{{ watching }}</span>
      <span class="kd-stat type-12-caps max-sm:hidden">{{ $t('pvp.inPlay') }} <UiPrice :amount="inPlay" size="s" tone="coin" /></span>
      <UiButton icon="plus" size="l" class="ml-auto" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
    </div>
    <Transition name="kd-feat" mode="out-in">
      <PvpFeatured v-if="featured" :key="featured.id" :battle="featured" />
    </Transition>
    <!-- Tabs and the tiles/lines switch share one line and one rule under it -->
    <div class="flex items-center gap-3 border-b border-neutral-4">
      <UiTabs v-model="filter" :tabs="tabs" flush class="min-w-0 flex-1" />
      <UiSegmented v-model="view" size="s" class="shrink-0" :options="[{ value: 'grid', icon: 'view-grid', title: $t('pvp.view_grid') }, { value: 'list', icon: 'view-list', title: $t('pvp.view_list') }]" />
    </div>
    <TransitionGroup v-if="view === 'grid'" key="grid" tag="div" name="kd-list" class="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <PvpCard v-for="b in list" :key="b.id" :battle="b" />
    </TransitionGroup>
    <TransitionGroup v-else key="list" tag="div" name="kd-list" class="relative flex flex-col gap-2">
      <PvpRow v-for="b in list" :key="b.id" :battle="b" />
    </TransitionGroup>
    <UiEmptyState v-if="!list.length" :text="$t('pvp.empty')">
      <UiButton icon="plus" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
    </UiEmptyState>
  </div>
</template>

<style scoped>
.kd-stat {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  background: var(--color-neutral-2);
  padding: 0 10px;
  color: var(--color-neutral-12);
}
.kd-stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--color-danger);
  animation: kd-blink 1.4s ease-in-out infinite;
}
@keyframes kd-blink {
  50% {
    opacity: 0.3;
  }
}
.kd-feat-enter-active,
.kd-feat-leave-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    translate var(--dur-slow) var(--ease-out);
}
.kd-feat-enter-from {
  opacity: 0;
  translate: 0 10px;
}
.kd-feat-leave-to {
  opacity: 0;
}
.kd-list-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-list-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
  position: absolute;
  width: 100%;
}
.kd-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.kd-list-leave-to {
  opacity: 0;
}
.kd-list-move {
  transition: transform var(--dur-slow) var(--ease-out);
}
</style>
