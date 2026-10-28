<script setup lang="ts">
import type { Battle, BattleMode, BattlesResponse, BattleStatus } from '#shared/types/api'

useHead({ title: 'PvP · KurwaDROP' })
const { t } = useI18n()
// The same bar as the upgrade's: all cases and this game's history on the left, how it works and fairness on the right
const howOpen = ref(false)
const barLeft = computed(() => [
  { label: t('case.allCases'), icon: 'arrow-left', to: '/' },
  { label: t('upgrade.history'), icon: 'history', to: '/profile?tab=history&game=pvp' },
])
const barRight = computed(() => [
  { label: t('upgrade.howItWorks'), icon: 'info', onClick: () => (howOpen.value = true) },
  { label: t('case.fairness'), icon: 'shield', to: '/fairness' },
])
const HOW = [
  { icon: 'cases', n: 1 },
  { icon: 'pvp', n: 2 },
  { icon: 'crown', n: 3 },
  { icon: 'shield-check', n: 4 },
]
// The page shows at once on a tap from elsewhere: card skeletons hold the rows until the battles come in (the
// first load, rendered on the server, comes complete)
const req = useFetch<BattlesResponse>('/api/battles', { key: 'battles', lazy: true })
if (import.meta.server) await req
const { data, refresh } = req
useIntervalFn(() => document.visibilityState === 'visible' && refresh(), 3000)

const counts = computed(() => {
  const list = data.value?.battles ?? []
  return { all: list.length, waiting: list.filter((b) => b.status === 'waiting').length, live: list.filter((b) => b.status === 'live').length, finished: list.filter((b) => b.status === 'finished').length }
})
// The lobby, on the profile's model: the home page's filter plate, then one card with the battle table — open seats
// first, then what is live, then what just ended. Filters: mode, players, "fits my balance" (seats the player can pay
// for), sort by price.
const session = useSessionStore()
const mode = ref<'all' | BattleMode>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
// how many players, as skin.club filters (2v2 is the Team mode, so 4 covers it)
const players = ref<'any' | '2' | '3' | '4'>('any')
const playerOptions = computed(() => [{ value: 'any' as const, label: t('pvp.anyPlayers') }, ...(['2', '3', '4'] as const).map((n) => ({ value: n, label: t('pvp.playersN', { n }) }))])
const dirty = computed(() => mode.value !== 'all' || players.value !== 'any' || affordable.value || sort.value !== 'default')
const sheet = ref(false)
function reset() {
  mode.value = 'all'
  players.value = 'any'
  affordable.value = false
  sort.value = 'default'
}
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`), icon: PVP_MODE_ICON[m], iconColor: PVP_MODE_COLOR[m] }))])
// the battles come newest first: the default order says so
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s === 'default' ? 'newest' : s}`) })))

const filtered = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => mode.value === 'all' || b.mode === mode.value)
    .filter((b) => players.value === 'any' || b.size === Number(players.value))
    .filter((b) => !affordable.value || (b.status === 'waiting' && b.cost <= (session.user?.balance ?? 0)))
    .sort((a, b) => (sort.value === 'priceDesc' ? b.cost - a.cost : sort.value === 'priceAsc' ? a.cost - b.cost : 0)),
)
const byStatus = (st: BattleStatus) => filtered.value.filter((b) => b.status === st)
// No list of finished battles (they are in each player's history): a battle that just ended stays in Live for a minute
// with its result, then goes
const JUST_ENDED_MS = 60_000
const now = useClock(5000)
const endedAt = (b: Battle) => (b.startedAt ? Date.parse(b.startedAt) + b.rounds.length * b.roundMs : 0)
const lobby = computed(() => [...byStatus('waiting'), ...byStatus('live'), ...byStatus('finished').filter((b) => now.value - endedAt(b) < JUST_ENDED_MS)])
/** Phones: the header's button is the small one */
// the server and hydration answer at the phone width the ssr-width plugin provides (most players are on phones),
// so a phone gets its own layout from the first paint instead of the desktop one switching after mount
const isPhone = useMediaQuery('(max-width: 639.98px)')
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-5 px-4 pt-4 lg:gap-8 lg:px-0 lg:pt-10">
    <!-- phones: 16 px down to the content, as under the case page's bar -->
    <UiPageBar logo :left="barLeft" :right="barRight" class="max-lg:-mb-1" />

    <!-- How it works: a battle in four plain steps, as the upgrade explains itself -->
    <UiModal v-model="howOpen" :title="$t('pvp.howTitle')" :width="520">
      <ol class="flex flex-col gap-3">
        <li v-for="st in HOW" :key="st.n" class="flex gap-3 rounded-2xl bg-neutral-3 p-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-4 text-brand-light"><UiIcon :name="st.icon" :size="20" /></span>
          <span class="flex min-w-0 flex-col gap-1">
            <span class="type-14-caps">{{ st.n }}. {{ $t(`pvp.how${st.n}t`) }}</span>
            <span class="type-14-regular text-neutral-12">{{ $t(`pvp.how${st.n}`) }}</span>
          </span>
        </li>
      </ol>
      <div class="mt-4 flex items-center justify-between gap-3">
        <span class="type-12-regular text-neutral-11">{{ $t('pvp.howFair') }}</span>
        <UiButton variant="fair" size="s" icon="shield-check" to="/fairness" class="shrink-0" @click="howOpen = false">{{ $t('case.fairness') }}</UiButton>
      </div>
    </UiModal>
    <!-- The filters, as the home page's plate (components/home/CaseFilters.vue). Desktop: dropdowns — the mode, the
         players — and the "fits my balance" switch; Reset when something is set; the sort on the right. Phones: the mode,
         the wallet one tap away, the filters icon (the players, the switch and the sort in a sheet) and the sort icon -->
    <div class="kd-filters flex items-center gap-2 rounded-3xl bg-neutral-2 p-2">
      <UiSelect v-model="mode" :options="modeOptions" menu-width="fixed" class="min-w-0 flex-1 lg:w-48 lg:flex-none" :active="mode !== 'all'">
        <template #leading><UiIcon :name="mode === 'all' ? 'pvp' : PVP_MODE_ICON[mode]" :size="16" class="text-neutral-11" /></template>
      </UiSelect>
      <UiSelect v-model="players" :options="playerOptions" menu-width="fixed" class="w-44 shrink-0 max-lg:hidden" :active="players !== 'any'">
        <template #leading><UiIcon name="user" :size="16" class="text-neutral-11" /></template>
      </UiSelect>
      <UiChip size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" class="shrink-0 max-lg:hidden" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
      <button
        v-if="session.user"
        type="button"
        :aria-label="$t('filters.affordable')"
        :aria-pressed="affordable"
        class="kd-press grid size-10 shrink-0 place-items-center rounded-lg lg:hidden"
        :class="affordable ? 'bg-brand-base/16 text-brand-light ring-1 ring-brand-base ring-inset' : 'bg-neutral-1 text-neutral-12'"
        @click="affordable = !affordable"
      >
        <UiIcon name="wallet" :size="18" />
      </button>
      <button type="button" :aria-label="$t('filters.title')" class="kd-press relative grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-1 lg:hidden" @click="sheet = true">
        <UiIcon name="sliders" :size="18" class="text-neutral-12" />
        <span v-if="players !== 'any'" class="type-10-caps absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-base px-1 text-neutral-1">1</span>
      </button>
      <Transition name="kd-reset">
        <UiButton v-if="dirty" variant="ghost" size="m" icon="refresh" class="max-lg:hidden" @click="reset">{{ $t('filters.reset') }}</UiButton>
      </Transition>
      <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:ml-auto lg:w-48" :active="sort !== 'default'">
        <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
      </UiSelect>

      <UiSheet v-model="sheet" :title="$t('filters.title')">
        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-11">{{ $t('pvp.players') }}</span>
          <div class="flex flex-wrap gap-1.5">
            <UiChip v-for="o in playerOptions" :key="o.value" size="m" class="normal-case" :active="players === o.value" @click="players = o.value">{{ o.label }}</UiChip>
          </div>
        </section>
        <label class="flex h-12 items-center gap-3 rounded-xl bg-neutral-3 px-3" :class="!session.user && 'opacity-40'">
          <UiToggle v-model="affordable" :label="$t('filters.affordable')" :disabled="!session.user" />
          <span class="type-14">{{ $t('filters.affordable') }}</span>
        </label>
        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-11">{{ $t('filters.sort') }}</span>
          <div class="flex flex-wrap gap-1.5">
            <UiChip v-for="o in sortOptions" :key="o.value" size="m" class="normal-case" :active="sort === o.value" @click="sort = o.value">{{ o.label }}</UiChip>
          </div>
        </section>
        <template #actions>
          <UiButton variant="secondary" size="l" class="flex-1" :disabled="!dirty" @click="reset">{{ $t('filters.reset') }}</UiButton>
          <UiButton size="l" class="flex-1" @click="sheet = false">{{ $t('upgrade.done') }}</UiButton>
        </template>
      </UiSheet>
    </div>

    <!-- The battles, as the profile's Game history card: its header (the title, how many are live, Create PvP), then the
         table — the open seats first, then what is live and what just ended (for a minute) -->
    <section class="flex min-w-0 flex-col rounded-5xl bg-neutral-2">
      <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
        <UiIcon name="pvp" :size="24" class="text-neutral-13" />
        <span class="type-14 lg:type-16-medium">{{ $t('pvp.battles') }}</span>
        <!-- no battle running: no "0 live" -->
        <span v-if="counts.live" class="type-12-caps flex items-center gap-1.5 text-neutral-11"><span class="kd-stat-dot" /><span class="text-neutral-15 tabular-nums">{{ counts.live }}</span>{{ $t('pvp.live') }}</span>
        <UiButton icon="plus" :size="isPhone ? 's' : 'm'" to="/pvp/create" class="ml-auto shrink-0">{{ $t('pvp.create') }}</UiButton>
      </div>
      <!-- the battles on their way: line skeletons -->
      <div v-if="!data" class="flex flex-col gap-2 p-3" aria-hidden="true">
        <span v-for="n in 6" :key="n" class="kd-skeleton h-[124px] rounded-xl lg:h-[62px]" />
      </div>
      <div v-else class="p-3">
        <PvpTable :battles="lobby" />
      </div>
    </section>

  </div>
</template>

<style scoped>
/* the home page's filter plate: the sort's menu opens to the left; on phones the sort shrinks to its icon */
:deep(.kd-sort > ul) {
  left: auto;
  right: 0;
}
@media (max-width: 1023.98px) {
  :deep(.kd-sort > button .type-14),
  :deep(.kd-sort > button > :last-child) {
    display: none;
  }
}
.kd-reset-enter-active,
.kd-reset-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-reset-enter-from,
.kd-reset-leave-to {
  opacity: 0;
  transform: translateX(6px);
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
</style>
