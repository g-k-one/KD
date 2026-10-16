// In-browser mock API for the static artifact build (KD_ARTIFACT=1), where there is no Nitro server.
// Reuses the same mock state as server/api so both modes behave the same.
import type { MeResponse } from '#shared/types/api'
import { applyDebugState, getCaseSections, getFeed, getMockState, type DebugStateBody } from '../../server/utils/mock-db'

const SESSION_KEY = 'kd_session'

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'demo'
  } catch {
    return false
  }
}

function writeSession(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, 'demo')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // storage blocked: session lives in memory only
  }
}

let loggedIn = readSession()

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function handleMockRequest(url: string, opts: { method?: string; body?: unknown } = {}): Promise<unknown> {
  const path = url.split('?')[0]
  const method = (opts.method ?? 'GET').toUpperCase()
  await delay(80)

  switch (`${method} ${path}`) {
    case 'GET /api/me':
      return { user: loggedIn ? getMockState().user : null } satisfies MeResponse
    case 'POST /api/auth/login':
      loggedIn = true
      writeSession(true)
      return { user: getMockState().user } satisfies MeResponse
    case 'POST /api/auth/logout':
      loggedIn = false
      writeSession(false)
      return { ok: true }
    case 'GET /api/cases':
      return { sections: getCaseSections() }
    case 'GET /api/feed':
      return getFeed()
    case 'POST /api/debug/state':
      return applyDebugState((opts.body ?? {}) as DebugStateBody)
    default:
      throw Object.assign(new Error(`Mock API: no handler for ${method} ${path}`), { statusCode: 404 })
  }
}
