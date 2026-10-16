import type { FeedResponse } from '#shared/types/api'

// Polling stand-in for the backend WebSocket feed.
export default defineEventHandler((): FeedResponse => getFeed())
