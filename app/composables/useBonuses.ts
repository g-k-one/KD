import type { BonusesResponse } from '#shared/types/api'

// Daily case + welcome cases + the level program (level cases, rakeback), shared by the Bonuses page, the header timer, the tab-bar dot and the level-up plate.
export function useBonuses() {
  const session = useSessionStore()
  const { data, refresh } = useFetch<BonusesResponse>('/api/bonuses', {
    key: 'bonuses',
    server: false,
    lazy: true,
    immediate: false,
    // Signed out: nothing to show
    default: () => null as unknown as BonusesResponse,
  })
  // switched off (FEATURES.bonuses): nothing is fetched, so every free-case timer and dot stays quiet
  if (import.meta.client && FEATURES.bonuses) {
    watch(
      () => [session.user?.id, session.user?.level],
      ([id]) => (id ? refresh() : (data.value = null as unknown as BonusesResponse)),
      { immediate: true },
    )
  }
  const now = useClock(1000)
  // what the timers and dots read: nothing while switched off, even if a refresh (the debug tools) fetched it anyway
  const live = computed(() => (FEATURES.bonuses ? data.value : null))
  const dailyReady = computed(() => !!live.value && !live.value.daily.nextAt)
  const dailyIn = computed(() => (live.value?.daily.nextAt ? countdown(live.value.daily.nextAt, now.value) : ''))
  /** Welcome cases still to open (free for signing up) */
  const welcomeLeft = computed(() => live.value?.welcome?.left ?? 0)
  /** Level cases earned and not opened yet */
  const levelCount = computed(() => live.value?.level?.levelCases.length ?? 0)
  /** Free cases waiting right now: the welcome ones and the level ones (the daily case has its own timer) */
  const freeCount = computed(() => welcomeLeft.value + levelCount.value)
  return { data, refresh, dailyReady, dailyIn, welcomeLeft, levelCount, freeCount, now }
}
