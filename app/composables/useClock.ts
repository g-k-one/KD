/** Current time in ms, refreshed every `ms` on the client (static on the server). */
export function useClock(ms: number) {
  const now = ref(Date.now())
  if (import.meta.client) useIntervalFn(() => (now.value = Date.now()), ms)
  return now
}
