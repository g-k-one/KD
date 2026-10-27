import type { FeedResponse } from '#shared/types/api'

const POLL_MS = 3000
/** Debug "Fast feed": the strip polls this often (and the mock adds a drop every time) */
const FAST_MS = 700

// One poll for the whole app, however many components read the feed; it stops while the tab is hidden
// and when the last reader unmounts.
let users = 0
let stop: (() => void) | null = null

// Polls the mock feed. The Go backend will push over WebSocket — swap the transport here only.
export function useLiveFeed() {
  const { data, refresh, status } = useFetch<FeedResponse>('/api/feed', {
    key: 'live-feed',
    default: () => ({ drops: [], highlight: null }),
  })

  const reelBusy = useState('kd_reel_busy', () => false)
  const fast = useState('kd_feed_fast', () => false)

  if (import.meta.client && getCurrentInstance()) {
    onMounted(() => {
      users += 1
      if (stop) return
      // plain timer, not tied to the first reader's scope, so it outlives that component; each tick sets the next,
      // so the debug fast feed takes effect on the next poll
      let id: ReturnType<typeof setTimeout>
      const tick = () => {
        if (document.visibilityState === 'visible' && !reelBusy.value) refresh()
        id = setTimeout(tick, fast.value ? FAST_MS : POLL_MS)
      }
      id = setTimeout(tick, POLL_MS)
      stop = () => {
        clearTimeout(id)
        stop = null
      }
    })
    onBeforeUnmount(() => {
      users -= 1
      if (!users) stop?.()
    })
  }

  // `loading`: the first answer hasn't come yet (later polls keep what is shown)
  const loading = computed(() => status.value !== 'success' && status.value !== 'error' && !data.value.drops.length)
  return { feed: data, refresh, loading }
}
