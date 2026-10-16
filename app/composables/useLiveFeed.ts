import type { FeedResponse } from '#shared/types/api'

const POLL_MS = 3000

// Polls the mock feed. The Go backend will push over WebSocket — swap the transport here only.
export function useLiveFeed() {
  const { data, refresh } = useFetch<FeedResponse>('/api/feed', {
    key: 'live-feed',
    default: () => ({ drops: [], highlight: null }),
  })

  if (import.meta.client) {
    const { pause, resume } = useIntervalFn(() => refresh(), POLL_MS)
    const visibility = useDocumentVisibility()
    watch(visibility, (v) => (v === 'visible' ? resume() : pause()))
  }

  return { feed: data, refresh }
}
