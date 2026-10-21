// Single entry for the mock API; routing lives in server/utils/mock-api.ts.
export default defineEventHandler(async (event) => {
  const loggedIn = isLoggedIn(event)
  const method = event.method
  const path = event.path.split('?')[0]!
  const body = method === 'GET' ? {} : ((await readBody(event).catch(() => ({}))) ?? {})

  if (method === 'POST' && path === '/api/auth/login') {
    setCookie(event, SESSION_COOKIE, 'demo', { httpOnly: true, sameSite: 'lax', path: '/' })
  }
  if (method === 'POST' && path === '/api/auth/logout') {
    deleteCookie(event, SESSION_COOKIE, { path: '/' })
  }

  try {
    return await mockRoute(method, path, body, getQuery(event) as Record<string, string>, {
      loggedIn: loggedIn || path === '/api/auth/login',
    })
  } catch (e) {
    if (e instanceof MockError) throw createError({ statusCode: e.statusCode, statusMessage: e.message, data: { message: e.message } })
    throw e
  }
})
