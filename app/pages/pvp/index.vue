<script setup lang="ts">
import type { BattleMode, BattlesResponse, BattleStatus } from '#shared/types/api'

useHead({ title: 'PvP · KurwaDROP' })
const { t } = useI18n()
const { data, refresh } = await useFetch<BattlesResponse>('/api/battles', { key: 'battles' })
useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 3000)

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
const mode = ref<'all' | BattleMode>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`) }))])
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s}`) })))
const list = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => filter.value === 'all' || b.status === filter.value)
    .filter((b) => mode.value === 'all' || b.mode === mode.value)
    .filter((b) => !affordable.value || (b.status === 'waiting' && b.cost <= (session.user?.balance ?? 0)))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (sort.value === 'priceDesc' ? b.cost - a.cost : sort.value === 'priceAsc' ? a.cost - b.cost : 0)),
)
const inPlay = computed(() => (data.value?.battles ?? []).filter((b) => b.status !== 'finished').reduce((a, b) => a + b.cost * b.size, 0))
const watching = computed(() => (data.value?.battles ?? []).reduce((a, b) => a + (b.viewers ?? 0), 0))

// --- Layout under review: A (the case page's sections of cards) · B (the upgrade page's two panels) · C (the list) ---
const route = useRoute()
const router = useRouter()
const view = computed<'a' | 'b' | 'c'>({
  get: () => (['a', 'b', 'c'].includes(String(route.query.v)) ? (route.query.v as 'a' | 'b' | 'c') : 'a'),
  set: (v) => router.replace({ query: { ...route.query, v } }),
})
const VIEWS = [
  { value: 'a' as const, label: 'A · Cases' },
  { value: 'b' as const, label: 'B · Upgrade' },
  { value: 'c' as const, label: 'C · List' },
]
/** The same filters as the list, without the status tab: A and B split by status themselves */
const filtered = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => mode.value === 'all' || b.mode === mode.value)
    .filter((b) => !affordable.value || (b.status === 'waiting' && b.cost <= (session.user?.balance ?? 0)))
    .sort((a, b) => (sort.value === 'priceDesc' ? b.cost - a.cost : sort.value === 'priceAsc' ? a.cost - b.cost : 0)),
)
const byStatus = (st: BattleStatus) => filtered.value.filter((b) => b.status === st)
const sections = computed(() => [
  { key: 'waiting', title: t('pvp.openSeats'), list: byStatus('waiting') },
  { key: 'live', title: t('pvp.liveNow'), list: byStatus('live') },
  { key: 'finished', title: t('pvp.finished'), list: byStatus('finished') },
])
const others = computed(() => [...byStatus('live'), ...byStatus('finished')])
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('pvp.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />
    <!-- The plate, as the case page's dock: live and watching · Create PvP · in play -->
    <div class="kd-dock flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
      <div class="flex gap-2 max-lg:order-last">
        <span class="kd-dock-stat type-12-caps max-lg:flex-1 max-lg:justify-center"><span class="kd-stat-dot" /><span class="text-neutral-15 tabular-nums">{{ counts.live }}</span> {{ $t('pvp.live') }}</span>
        <span class="kd-dock-stat type-12-caps max-lg:flex-1 max-lg:justify-center"><UiIcon name="eye" :size="16" /><span class="text-neutral-15 tabular-nums">{{ watching }}</span></span>
        <span class="flex flex-1 lg:hidden"><span class="kd-dock-stat type-12-caps w-full justify-center"><UiPrice :amount="inPlay" size="s" tone="coin" /></span></span>
      </div>
      <UiButton icon="plus" size="l" class="w-full lg:h-14 lg:w-80" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
      <div class="flex justify-end max-lg:hidden">
        <span class="kd-dock-stat type-12-caps">{{ $t('pvp.inPlay') }} <UiPrice :amount="inPlay" size="m" tone="coin" /></span>
      </div>
    </div>
    <!-- Layout under review: A · B · C -->
    <UiSegmented v-model="view" :options="VIEWS" class="self-center lg:w-96" />

    <!-- ============ A — the case page: sections with a header and a grid of battle cards ============ -->
    <template v-if="view === 'a'">
      <div class="flex items-center justify-end gap-2">
        <UiSelect v-model="mode" :options="modeOptions" menu-width="fixed" class="min-w-0 flex-1 lg:w-40 lg:flex-none" :active="mode !== 'all'" />
        <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:w-48" :active="sort !== 'default'">
          <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
        <UiChip size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" class="shrink-0" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
      </div>
      <template v-for="sec in sections" :key="sec.key">
        <section v-if="sec.list.length" class="flex flex-col gap-4">
          <UiSectionHeader :title="sec.title">
            <template #actions>
              <span class="type-12-caps text-neutral-11 tabular-nums">{{ sec.list.length }}</span>
            </template>
          </UiSectionHeader>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            <PvpCard v-for="b in sec.list" :key="b.id" :battle="b" />
          </div>
        </section>
      </template>
    </template>

    <!-- ============ B — the upgrade page: two panels with a header row ============ -->
    <section v-else-if="view === 'b'" class="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <div v-for="(panel, i) in [{ title: $t('pvp.openSeats'), icon: 'pvp', list: byStatus('waiting') }, { title: $t('pvp.liveAndFinished'), icon: 'live', list: others }]" :key="i" class="flex flex-col rounded-5xl bg-neutral-2 lg:pb-4">
        <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <UiIcon :name="panel.icon" :size="24" class="text-neutral-13" />
          <span class="type-14 lg:type-16-medium">{{ panel.title }} ({{ panel.list.length }})</span>
          <UiChip v-if="i === 0" size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" class="ml-auto shrink-0" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
          <UiSelect v-else v-model="mode" :options="modeOptions" menu-width="fixed" class="ml-auto w-40" :active="mode !== 'all'" />
        </div>
        <div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:p-4">
          <PvpCard v-for="b in panel.list" :key="b.id" :battle="b" compact />
        </div>
      </div>
    </section>

    <!-- ============ C — the list of rows (current) ============ -->
    <template v-else>
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
    </template>
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
/* the plate is the case page's dock: 24px radius, 12px padding; its chips are 48px high with a 12px radius (24 − 12) */
.kd-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
@media (min-width: 64rem) {
  .kd-dock {
    padding-inline: 16px;
  }
}
.kd-dock-stat {
  display: inline-flex;
  height: 48px;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  background: var(--color-neutral-3);
  padding: 0 16px;
  color: var(--color-neutral-11);
  white-space: nowrap;
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
