import type { MeResponse } from '#shared/types/api'

// Mock of the Steam OpenID callback: real flow redirects to Steam and back.
export default defineEventHandler((event): MeResponse => {
  setCookie(event, SESSION_COOKIE, 'demo', { httpOnly: true, sameSite: 'lax', path: '/' })
  return { user: getMockState().user }
})
