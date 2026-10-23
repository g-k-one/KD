import type { BonusesResponse } from '#shared/types/api'

// Daily case + welcome cases, shared by the Bonuses page, the header timer, the tab-bar dot and the level-up plate.
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
  if (import.meta.client) {
    watch(
      () => [session.user?.id, session.user?.level],
      ([id]) => (id ? refresh() : (data.value = null as unknown as BonusesResponse)),
      { immediate: true },
    )
  }
  const now = useClock(1000)
  const dailyReady = computed(() => !!data.value && !data.value.daily.nextAt)
  const dailyIn = computed(() => (data.value?.daily.nextAt ? countdown(data.value.daily.nextAt, now.value) : ''))
  /** Welcome cases still to open (free for signing up) */
  const welcomeLeft = computed(() => data.value?.welcome?.left ?? 0)
  return { data, refresh, dailyReady, dailyIn, welcomeLeft, now }
}
