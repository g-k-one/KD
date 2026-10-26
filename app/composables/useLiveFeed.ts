import type { FeedResponse } from '#shared/types/api'

const POLL_MS = 3000

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

  if (import.meta.client && getCurrentInstance()) {
    onMounted(() => {
      users += 1
      if (stop) return
      // plain timer, not tied to the first reader's scope, so it outlives that component
      const id = setInterval(() => document.visibilityState === 'visible' && !reelBusy.value && refresh(), POLL_MS)
      stop = () => {
        clearInterval(id)
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
