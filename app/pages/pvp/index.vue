<script setup lang="ts">
import type { Battle, BattleMode, BattlesResponse, BattleStatus } from '#shared/types/api'

useHead({ title: 'PvP · KurwaDROP' })
const { t } = useI18n()
const { data, refresh } = await useFetch<BattlesResponse>('/api/battles', { key: 'battles' })
useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 3000)

const counts = computed(() => {
  const list = data.value?.battles ?? []
  return { all: list.length, waiting: list.filter((b) => b.status === 'waiting').length, live: list.filter((b) => b.status === 'live').length, finished: list.filter((b) => b.status === 'finished').length }
})
// The lobby, on the case page's model: sections with a header and a grid of battle cards — open seats first, then
// what is live, then the finished ones (one row, Show all opens the rest). Filters in one line from the kit: mode, sort
// by price, and "fits my balance" (seats the player can pay for).
const session = useSessionStore()
const mode = ref<'all' | BattleMode>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`) }))])
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s}`) })))
const inPlay = computed(() => (data.value?.battles ?? []).filter((b) => b.status !== 'finished').reduce((a, b) => a + b.cost * b.size, 0))
const watching = computed(() => (data.value?.battles ?? []).reduce((a, b) => a + (b.viewers ?? 0), 0))

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
/** Phones: two columns of compact cards. The finished ones show one row until Show all */
// false through hydration (the server renders desktop), then the real width — or hydrated cards keep desktop classes
const mounted = useMounted()
const phoneQuery = useMediaQuery('(max-width: 639.98px)')
const isPhone = computed(() => mounted.value && phoneQuery.value)
const allFinished = ref(false)
const ROW = computed(() => (isPhone.value ? 2 : 4))
const shown = (key: string, list: Battle[]) => (key === 'finished' && !allFinished.value ? list.slice(0, ROW.value) : list)
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('pvp.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />
    <!-- The plate, as the case page's dock: live and watching · Create PvP · in play -->
    <div class="kd-dock flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
      <!-- phones: three even cells, the number over its word, so all three fit one line; desktop: one line each -->
      <div class="flex gap-2 max-lg:order-last">
        <!-- no battle running: no "0 live" -->
        <span v-if="counts.live" class="kd-dock-stat kd-dock-cell type-12-caps"><span class="flex items-center gap-2"><span class="kd-stat-dot" /><span class="text-neutral-15 tabular-nums">{{ counts.live }}</span></span>{{ $t('pvp.live') }}</span>
        <span class="kd-dock-stat kd-dock-cell type-12-caps"><span class="flex items-center gap-2"><UiIcon name="eye" :size="16" /><span class="text-neutral-15 tabular-nums">{{ watching }}</span></span>{{ $t('pvp.watching') }}</span>
        <span class="flex min-w-0 flex-1 lg:hidden"><span class="kd-dock-stat kd-dock-cell type-12-caps"><UiPrice :amount="inPlay" size="s" tone="coin" />{{ $t('pvp.inPlay') }}</span></span>
      </div>
      <UiButton icon="plus" size="l" class="w-full lg:h-14 lg:w-80" to="/pvp/create">{{ $t('pvp.create') }}</UiButton>
      <div class="flex justify-end max-lg:hidden">
        <span class="kd-dock-stat type-12-caps">{{ $t('pvp.inPlay') }} <UiPrice :amount="inPlay" size="m" tone="coin" /></span>
      </div>
    </div>
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
              <button v-if="sec.key === 'finished' && sec.list.length > ROW" type="button" class="type-12-caps flex h-8 items-center gap-0.5 text-neutral-12 hover:text-neutral-15" @click="allFinished = !allFinished">
                {{ allFinished ? $t('pvp.showLess') : $t('pvp.showAll', { n: sec.list.length }) }}
                <UiIcon :name="allFinished ? 'chevron-up' : 'chevron-down'" :size="14" />
              </button>
              <span v-else class="type-12-caps text-neutral-11 tabular-nums">{{ sec.list.length }}</span>
            </template>
          </UiSectionHeader>
          <TransitionGroup tag="div" name="kd-list" class="relative grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <PvpCard v-for="b in shown(sec.key, sec.list)" :key="b.id" :battle="b" :compact="isPhone" />
          </TransitionGroup>
        </section>
      </template>
      <UiEmptyState v-if="!filtered.length" :text="$t('pvp.empty')">
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
/* phones: a dock cell is a column — the number, then its word */
@media (max-width: 63.999rem) {
  .kd-dock-cell {
    flex: 1;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding-inline: 8px;
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
