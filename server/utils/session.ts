import type { H3Event } from 'h3'

export function isLoggedIn(event: H3Event) {
  return getCookie(event, SESSION_COOKIE) === 'demo'
}

export function requireUser(event: H3Event) {
  if (!isLoggedIn(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return getMockState().user
}
