// In-browser mock API for the static artifact build (KD_ARTIFACT=1), where there is no Nitro server.
// Uses the same router as server/api, so both modes behave the same.
import { MockError } from '../../server/utils/mock-db'
import { mockRoute } from '../../server/utils/mock-api'
import ARTIFACT_ASSETS from './artifact-assets.json'

// Pictures kept in the artifact's asset store (the host caps a version at 511 files, the store doesn't count):
// path without the leading slash -> store URL. Every response hands the UI the store URL instead of the path.
const STORE = ARTIFACT_ASSETS as Record<string, string>
const hasStore = Object.keys(STORE).length > 0
function toStore(v: unknown): unknown {
  if (typeof v === 'string') return STORE[v.replace(/^\//, '')] ?? v
  if (Array.isArray(v)) return v.map(toStore)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toStore(x)]))
  return v
}

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

// The admin's home layout outlives a reload here (there is no server to keep it): saved on every change,
// handed back to the mock before the first request
const LAYOUT_KEY = 'kd_home_layout'
let layoutRestored = false
async function restoreLayout() {
  layoutRestored = true
  try {
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved) await mockRoute('PUT', '/api/admin/home-layout', { layout: JSON.parse(saved) }, {}, { loggedIn })
  } catch {
    // storage blocked or a stale shape: the default layout stays
  }
}
function saveLayout(data: unknown, path: string) {
  try {
    if (path.endsWith('/reset')) localStorage.removeItem(LAYOUT_KEY)
    else localStorage.setItem(LAYOUT_KEY, JSON.stringify((data as { layout: unknown }).layout))
  } catch {
    // storage blocked: the layout lives until the reload
  }
}

export async function handleMockRequest(
  url: string,
  opts: { method?: string; body?: unknown; query?: Record<string, unknown>; params?: Record<string, unknown> } = {},
): Promise<unknown> {
  const [path, qs] = url.split('?') as [string, string | undefined]
  const method = (opts.method ?? 'GET').toUpperCase()
  const query: Record<string, string> = Object.fromEntries(new URLSearchParams(qs ?? ''))
  for (const [k, v] of Object.entries({ ...opts.params, ...opts.query })) if (v != null) query[k] = String(v)
  // no fake latency: the artifact should feel instant (still async, like the network)
  await Promise.resolve()
  if (!layoutRestored) await restoreLayout()

  if (method === 'POST' && path === '/api/auth/login') {
    loggedIn = true
    writeSession(true)
  }
  if (method === 'POST' && path === '/api/auth/logout') {
    loggedIn = false
    writeSession(false)
  }

  try {
    // JSON copy, not structuredClone: bodies can hold reactive arrays (Proxy), which structuredClone rejects
    const data = await mockRoute(method, path, JSON.parse(JSON.stringify(opts.body ?? {})) as Record<string, unknown>, query, { loggedIn })
    if (method !== 'GET' && path.startsWith('/api/admin/home-layout')) saveLayout(data, path)
    // Behave like the network: hand the UI a copy, never the mock's live state objects
    const copy = JSON.parse(JSON.stringify(data))
    return hasStore ? toStore(copy) : copy
  } catch (e) {
    if (e instanceof MockError) {
      // Same shape as an ofetch FetchError so UI error handling works in both modes
      throw Object.assign(new Error(e.message), { statusCode: e.statusCode, statusMessage: e.message, data: { message: e.message } })
    }
    throw e
  }
}
