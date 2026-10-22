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
// One list of battle rows (docs/ux-research-v3.md → PvP): the open seats first, then what is live, finished last.
// Filters in one line from the kit: mode, sort by price, and "fits my balance" (seats the player can pay for).
const session = useSessionStore()
const ORDER = { waiting: 0, live: 1, finished: 2 } as const
const mode = ref<'all' | '2' | '3' | '4'>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['2', '3', '4'] as const).map((n) => ({ value: n, label: t(`pvp.modes.${n}`) }))])
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s}`) })))
const list = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => filter.value === 'all' || b.status === filter.value)
    .filter((b) => mode.value === 'all' || String(b.size) === mode.value)
    .filter((b) => !affordable.value || (b.status === 'waiting' && b.cost <= (session.user?.balance ?? 0)))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (sort.value === 'priceDesc' ? b.cost - a.cost : sort.value === 'priceAsc' ? a.cost - b.cost : 0)),
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
    <!-- Status tabs on the left, the filters on the right; one line on desktop, two on phones -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
      <UiTabs v-model="filter" :tabs="tabs" flush class="min-w-0 border-b border-neutral-4 lg:flex-1" />
      <div class="flex items-center gap-2">
        <UiSelect v-model="mode" :options="modeOptions" menu-width="fixed" class="min-w-0 flex-1 lg:w-40 lg:flex-none" :active="mode !== 'all'" />
        <!-- phones: the sort is an icon (as on the cases filter) -->
        <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:w-48" :active="sort !== 'default'">
          <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
        <UiChip size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" class="shrink-0" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
      </div>
    </div>
    <TransitionGroup tag="div" name="kd-list" class="relative flex flex-col gap-2">
      <PvpRow v-for="b in list" :key="b.id" :battle="b" />
    </TransitionGroup>
    <UiEmptyState v-if="!list.length" :text="$t('pvp.empty')">
      <UiButton icon="plus" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
    </UiEmptyState>
  </div>
</template>

<style scoped>
:deep(.kd-sort > ul) {
  left: auto;
  right: 0;
}
@media (max-width: 1023.98px) {
  :deep(.kd-sort button .type-14),
  :deep(.kd-sort button > :last-child) {
    display: none;
  }
}
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
