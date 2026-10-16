import type { MeResponse } from '#shared/types/api'

export default defineEventHandler((event): MeResponse => {
  return { user: isLoggedIn(event) ? getMockState().user : null }
})
