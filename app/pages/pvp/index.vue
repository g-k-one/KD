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
// The lobby, on the case page's model: sections with a header and a grid of battle cards — open seats first, then
// what is live, then the finished ones (one row, Show all opens the rest). Filters in one line from the kit: mode, sort
// by price, and "fits my balance" (seats the player can pay for).
const session = useSessionStore()
const mode = ref<'all' | BattleMode>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
// how many players, as skin.club filters (2v2 is the Team mode, so 4 covers it)
const players = ref<0 | 2 | 3 | 4>(0)
const playerOptions = computed(() => [{ value: 0 as const, label: t('pvp.anyPlayers') }, ...([2, 3, 4] as const).map((n) => ({ value: n, label: String(n), title: t('pvp.playersN', { n }) }))])
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`), icon: PVP_MODE_ICON[m], iconColor: PVP_MODE_COLOR[m] }))])
// the battles come newest first: the default order says so
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s === 'default' ? 'newest' : s}`) })))
const inPlay = computed(() => (data.value?.battles ?? []).filter((b) => b.status !== 'finished').reduce((a, b) => a + b.cost * b.size, 0))
const watching = computed(() => (data.value?.battles ?? []).reduce((a, b) => a + (b.viewers ?? 0), 0))

const filtered = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => mode.value === 'all' || b.mode === mode.value)
    .filter((b) => !players.value || b.size === players.value)
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
/** Phones: the rows as cards, their tiles smaller */
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
    <!-- One plate, as the home page's filters: the mode, the sort, the players and the budget on the left; on the right what
         is going on (battles live when there are any, coins in play; people watching on phones) and Create PvP, as every
         battle site puts it. Phones: the filters on one line, the players, the numbers, then Create PvP across -->
    <div class="kd-filters flex flex-wrap items-center gap-2 rounded-3xl bg-neutral-2 p-2">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <UiSelect v-model="mode" :options="modeOptions" menu-width="fixed" class="min-w-0 flex-1 lg:w-48 lg:flex-none" :active="mode !== 'all'">
          <template #leading><UiIcon :name="mode === 'all' ? 'pvp' : PVP_MODE_ICON[mode]" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
        <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:w-48" :active="sort !== 'default'">
          <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
        <UiSegmented v-model="players" :options="playerOptions" size="s" class="kd-players shrink-0 max-lg:hidden" />
        <UiChip size="m" variant="field" icon="wallet" :active="affordable" :disabled="!session.user" class="shrink-0" @click="affordable = !affordable"><span class="max-sm:hidden">{{ $t('filters.affordableShort') }}</span></UiChip>
      </div>
      <!-- the numbers on their way: their cells, not zeros -->
      <!-- phones: the players on their own line, the width of the plate -->
      <UiSegmented v-model="players" :options="playerOptions" size="s" block class="kd-players lg:hidden" />
      <div class="flex items-center gap-2 max-lg:w-full max-lg:justify-center max-lg:gap-1">
        <template v-if="!data">
          <span v-for="n in 2" :key="n" class="kd-skeleton h-10 w-28 rounded-lg max-lg:flex-1" aria-hidden="true" />
        </template>
        <template v-else>
          <!-- no battle running: no "0 live" -->
          <span v-if="counts.live" class="kd-stat type-12-caps"><span class="kd-stat-dot" /><span class="text-neutral-15 tabular-nums">{{ counts.live }}</span>{{ $t('pvp.live') }}</span>
          <span class="kd-stat is-phone type-12-caps"><UiIcon name="eye" :size="16" /><span class="text-neutral-15 tabular-nums">{{ watching }}</span>{{ $t('pvp.watching') }}</span>
          <span class="kd-stat type-12-caps">{{ $t('pvp.inPlay') }}<UiPrice :amount="inPlay" size="s" tone="coin" /></span>
        </template>
        <UiButton icon="plus" to="/pvp/create" class="shrink-0 max-lg:hidden">{{ $t('pvp.create') }}</UiButton>
      </div>
      <UiButton icon="plus" to="/pvp/create" block class="lg:hidden">{{ $t('pvp.create') }}</UiButton>
    </div>
    <!-- The battles as a table, as every battle site lists them: the header names the columns (desktop), a row per battle —
         the open seats first, then what is live (a red round) and what just ended (Ended, for a minute). Phones: no
         header, each row a card in three lines -->
    <section class="kd-pvp-table flex flex-col gap-2">
      <div class="kd-pvp-head type-10-caps grid items-center gap-x-4 rounded-2xl bg-neutral-2 px-3 py-2.5 text-neutral-11 max-lg:hidden">
        <span class="text-center">{{ $t('pvp.rounds') }}</span>
        <span>{{ $t('pvp.cases') }}</span>
        <span class="text-center">{{ $t('pvp.cost') }}</span>
        <span class="text-center">{{ $t('pvp.players') }}</span>
        <span />
      </div>
      <!-- the battles on their way: row skeletons -->
      <template v-if="!data">
        <span v-for="n in 6" :key="n" class="kd-skeleton h-[188px] rounded-3xl lg:h-[96px] lg:rounded-2xl" aria-hidden="true" />
      </template>
      <TransitionGroup v-else tag="div" name="kd-list" class="relative flex flex-col gap-2">
        <PvpCard v-for="b in lobby" :key="b.id" :battle="b" :compact="isPhone" />
      </TransitionGroup>
    </section>

  </div>
</template>

<style scoped>
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
/* the table's columns, shared by the header and every row (components/pvp/Card.vue) */
.kd-pvp-table {
  --pvp-cols: 72px minmax(0, 1fr) 112px 200px 152px;
}
.kd-pvp-head {
  grid-template-columns: var(--pvp-cols);
}
/* the players: the plate's 40 px controls (the small segmented, its 6 px thumb 4 px in) */
.kd-players {
  border-radius: 10px;
}
/* a number on the plate: the controls' 40 px height and 8 px corners (16 − 8); phones: plain text on one thin line */
.kd-stat {
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  background: var(--color-neutral-1);
  padding: 0 12px;
  color: var(--color-neutral-11);
  white-space: nowrap;
}
@media (max-width: 63.999rem) {
  .kd-stat {
    height: 24px;
    background: none;
    padding-inline: 4px;
  }
}
/* people watching: phones only (the desktop plate has Create PvP there); a class, since the scoped display wins over lg:hidden */
@media (min-width: 64rem) {
  .kd-stat.is-phone {
    display: none;
  }
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
