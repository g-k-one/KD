import type { RaceResponse } from '#shared/types/api'

// The weekly race, shared by Bonuses and the header chip; refreshed every minute and when the player changes
export function useRace() {
  const session = useSessionStore()
  const { data, refresh } = useFetch<RaceResponse>('/api/race', { key: 'race', server: false, lazy: true })
  if (import.meta.client) {
    watch(() => session.user?.id, () => refresh())
    useIntervalFn(() => refresh(), 60_000)
  }
  return { data, refresh }
}
