/**
 * Current time in ms, refreshed every `ms` on the client (static on the server).
 * One shared timer per interval: twenty PvP cards ticking at 500ms run a single setInterval, not twenty.
 */
const clocks = new Map<number, { now: Ref<number>; users: number; timer: ReturnType<typeof setInterval> | null }>()

export function useClock(ms: number) {
  if (!import.meta.client) return ref(Date.now())
  let c = clocks.get(ms)
  if (!c) {
    c = { now: ref(Date.now()), users: 0, timer: null }
    clocks.set(ms, c)
  }
  const clock = c
  clock.users += 1
  if (!clock.timer) clock.timer = setInterval(() => (clock.now.value = Date.now()), ms)
  onScopeDispose(() => {
    clock.users -= 1
    if (clock.users <= 0 && clock.timer) {
      clearInterval(clock.timer)
      clock.timer = null
    }
  })
  return readonly(clock.now) as Ref<number>
}
