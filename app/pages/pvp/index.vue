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

// The lobby, skin.club's: the home page's filter plate (Create PvP at its end), then the battle list — open seats
// first, then what is live, then what just ended. Filters: mode, "fits my balance" (seats the player can pay for), sort by
// price — no players filter (the mode and the row's seats say it; the team mode is the only 2v2).
const session = useSessionStore()
const mode = ref<'all' | BattleMode>('all')
const sort = ref<'default' | 'priceDesc' | 'priceAsc'>('default')
const affordable = ref(false)
const dirty = computed(() => mode.value !== 'all' || affordable.value || sort.value !== 'default')
function reset() {
  mode.value = 'all'
  affordable.value = false
  sort.value = 'default'
}
const modeOptions = computed(() => [{ value: 'all' as const, label: t('pvp.anyMode') }, ...(['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`), icon: PVP_MODE_ICON[m], iconColor: PVP_MODE_COLOR[m] }))])
// what is going on, one quiet line in the list's header: battles live (none: no "0 live"), people watching
const liveCount = computed(() => (data.value?.battles ?? []).filter((b) => b.status === 'live').length)
const watching = computed(() => (data.value?.battles ?? []).reduce((a, b) => a + (b.viewers ?? 0), 0))

// the battles come newest first: the default order says so
const sortOptions = computed(() => (['default', 'priceDesc', 'priceAsc'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s === 'default' ? 'newest' : s}`) })))

const filtered = computed(() =>
  (data.value?.battles ?? [])
    .filter((b) => mode.value === 'all' || b.mode === mode.value)
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
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-5 px-4 pt-4 lg:gap-8 lg:px-0 lg:pt-10">
    <!-- 16 px down to the content on every width, as under the case page's bar -->
    <UiPageBar logo :left="barLeft" :right="barRight" class="max-lg:-mb-1 lg:-mb-4" />

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
    <!-- The lobby's dock, the case page's (components/case/OpenControls.vue): one block — desktop, the filters on the left
         (the mode, Fits my balance), Create PvP in the middle as the case's Open (56 px, 320 wide), Reset (when something
         is set) and the sort on the right, all 48 px; the side columns are equal and fixed, so the button never moves.
         Phones: the mode, the wallet and the sort on one line, Create PvP across under them -->
    <div class="kd-dock flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <UiSelect v-model="mode" :options="modeOptions" menu-width="fixed" class="kd-sort48 min-w-0 flex-1 lg:w-48 lg:flex-none" :active="mode !== 'all'">
          <template #leading><UiIcon :name="mode === 'all' ? 'pvp' : PVP_MODE_ICON[mode]" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
        <!-- a switch is a chip (the case dock's Fast), not a field: the fields are the selects -->
        <UiChip size="m" icon="wallet" :active="affordable" :disabled="!session.user" class="!h-12 !rounded-xl shrink-0 normal-case max-lg:hidden lg:px-4" @click="affordable = !affordable">{{ $t('filters.affordableShort') }}</UiChip>
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
        <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort w-11 shrink-0 lg:hidden" :active="sort !== 'default'">
          <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
      </div>

      <UiButton icon="plus" size="l" to="/pvp/create" class="w-full lg:h-14 lg:w-80">{{ $t('pvp.create') }}</UiButton>

      <div class="flex items-center justify-end gap-2 max-lg:hidden">
        <Transition name="kd-reset">
          <!-- Reset is an action: a quiet ghost button (the home filters' too), the dock's 48 px -->
          <UiButton v-if="dirty" variant="ghost" size="m" icon="refresh" class="!h-12 !rounded-xl shrink-0" @click="reset">{{ $t('filters.reset') }}</UiButton>
        </Transition>
        <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed" class="kd-sort kd-sort48 w-48 shrink-0" :active="sort !== 'default'">
          <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
        </UiSelect>
      </div>
    </div>

    <!-- The battles, skin.club's list: the header bar, then a row per battle — the open seats first, then what is live
         and what just ended (for a minute) -->
    <div v-if="!data" class="flex flex-col gap-2" aria-hidden="true">
      <span v-for="n in 6" :key="n" class="kd-skeleton h-[212px] rounded-4xl lg:h-[124px] lg:rounded-5xl" />
    </div>
    <PvpTable v-else :battles="lobby">
      <!-- what is going on, one quiet line in the header's free column over the buttons -->
      <template #head>
        <span class="kd-num type-10-caps"><template v-if="liveCount"><span class="kd-stat-dot" /><b>{{ liveCount }}</b>{{ $t('pvp.live') }}<span class="text-neutral-8">·</span></template><b>{{ watching }}</b>{{ $t('pvp.watching') }}</span>
      </template>
    </PvpTable>

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
/* the dock: the case page's (components/case/OpenControls.vue) — 24 px corners, 12 in; desktop 28 and 16 at the sides,
   the 48 px controls centred on the 56 px button */
/* the case dock's: 24 px corners; desktop: 16 px on all sides around the 48 px controls (the 56 px button sets the height) */
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
/* the mode and the sort at the dock's 48 px (desktop), their 12 px corners */
@media (min-width: 64rem) {
  :deep(.kd-sort48 > button) {
    height: 48px;
    border-radius: 12px;
  }
}
.kd-num {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-neutral-11);
  white-space: nowrap;
}
.kd-num b {
  font-weight: inherit;
  color: var(--color-neutral-14);
  font-variant-numeric: tabular-nums;
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
