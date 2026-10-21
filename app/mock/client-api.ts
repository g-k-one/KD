// In-browser mock API for the static artifact build (KD_ARTIFACT=1), where there is no Nitro server.
// Uses the same router as server/api, so both modes behave the same.
import { toRaw } from 'vue'
import { MockError } from '../../server/utils/mock-db'
import { mockRoute } from '../../server/utils/mock-api'

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

export async function handleMockRequest(
  url: string,
  opts: { method?: string; body?: unknown; query?: Record<string, unknown>; params?: Record<string, unknown> } = {},
): Promise<unknown> {
  const [path, qs] = url.split('?') as [string, string | undefined]
  const method = (opts.method ?? 'GET').toUpperCase()
  const query: Record<string, string> = Object.fromEntries(new URLSearchParams(qs ?? ''))
  for (const [k, v] of Object.entries({ ...opts.params, ...opts.query })) if (v != null) query[k] = String(v)
  await delay(80)

  if (method === 'POST' && path === '/api/auth/login') {
    loggedIn = true
    writeSession(true)
  }
  if (method === 'POST' && path === '/api/auth/logout') {
    loggedIn = false
    writeSession(false)
  }

  try {
    const data = await mockRoute(method, path, structuredClone(toRaw(opts.body ?? {})) as Record<string, unknown>, query, { loggedIn })
    // Behave like the network: hand the UI a copy, never the mock's live state objects
    return JSON.parse(JSON.stringify(data))
  } catch (e) {
    if (e instanceof MockError) {
      // Same shape as an ofetch FetchError so UI error handling works in both modes
      throw Object.assign(new Error(e.message), { statusCode: e.statusCode, statusMessage: e.message, data: { message: e.message } })
    }
    throw e
  }
}
