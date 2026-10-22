import type { EventResponse } from '#shared/types/api'

// The running event, shared by its page, the home section and the header chip; refreshed every minute
// and when the player changes
export function useEvent() {
  const session = useSessionStore()
  const { data, refresh } = useFetch<EventResponse>('/api/event', { key: 'event', server: false, lazy: true })
  if (import.meta.client) {
    watch(() => session.user?.id, () => refresh())
    useIntervalFn(() => refresh(), 60_000)
  }
  const now = useClock(1000)
  const endsIn = computed(() => (data.value ? countdownLong(data.value.endsAt, now.value) : ''))
  return { data, refresh, endsIn, now }
}
