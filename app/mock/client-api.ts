// In-browser mock API for the static artifact build (KD_ARTIFACT=1), where there is no Nitro server.
// Uses the same router as server/api, so both modes behave the same.
import { MockError } from '../../server/utils/mock-db'
import { mockRoute } from '../../server/utils/mock-api'
import ARTIFACT_ASSETS from './artifact-assets.json'

// Pictures kept in the artifact's asset store (the host caps a version at 511 files, the store doesn't count):
// path without the leading slash -> store URL. Every response hands the UI the store URL instead of the path.
// The GitHub Pages build (KD_PAGES) ships the pictures beside the page, so it has no store.
const STORE = (import.meta.env.VITE_KD_PAGES ? {} : ARTIFACT_ASSETS) as Record<string, string>
// Pages instead gives every picture its content hash (?v=…), so a redrawn one is not served from an old cache
const VERSION = import.meta.env.VITE_KD_IMAGE_V as unknown as Record<string, string>
const hasStore = Object.keys(STORE).length > 0 || Object.keys(VERSION).length > 0
function toStore(v: unknown): unknown {
  if (typeof v === 'string') {
    const key = v.replace(/^\//, '')
    return STORE[key] ?? (VERSION[key] ? `${v}?v=${VERSION[key]}` : v)
  }
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

// The admin's settings outlive a reload here (there is no server to keep them): after every admin change the
// mock's snapshot (GET /api/admin/snapshot) is saved, and handed back to the mock before the first request
const ADMIN_KEY = 'kd_admin'
// the home layout alone, from before the admin panel
const LAYOUT_KEY = 'kd_home_layout'
let adminRestored = false
async function restoreAdmin() {
  adminRestored = true
  try {
    const saved = localStorage.getItem(ADMIN_KEY)
    const layout = localStorage.getItem(LAYOUT_KEY)
    if (saved) await mockRoute('PUT', '/api/admin/snapshot', JSON.parse(saved), {}, { loggedIn })
    else if (layout) await mockRoute('PUT', '/api/admin/home-layout', { layout: JSON.parse(layout) }, {}, { loggedIn })
  } catch {
    // storage blocked or a stale shape: the defaults stay
  }
}
async function saveAdmin(path: string) {
  try {
    localStorage.removeItem(LAYOUT_KEY)
    if (path === '/api/admin/reset') localStorage.removeItem(ADMIN_KEY)
    else localStorage.setItem(ADMIN_KEY, JSON.stringify(await mockRoute('GET', '/api/admin/snapshot', {}, {}, { loggedIn })))
  } catch {
    // storage blocked: the settings live until the reload
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
  if (!adminRestored) await restoreAdmin()

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
    if (method !== 'GET' && path.startsWith('/api/admin/')) await saveAdmin(path)
    // Behave like the network: hand the UI a copy, never the mock's live state objects
    const copy = JSON.parse(JSON.stringify(data))
    return hasStore ? toStore(copy) : copy
  } catch (e) {
    if (e instanceof MockError) {
      // Same shape as an ofetch FetchError so UI error handling works in both modes
      throw Object.assign(new Error(e.message), { statusCode: e.statusCode, statusMessage: e.message, data: { message: e.message } })
    }
    // a bug in the mock itself: say what broke (the toast shows it) instead of a bare "Something went wrong"
    console.error('[mock]', method, path, e)
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    throw Object.assign(new Error(msg), { statusCode: 500, statusMessage: msg, data: { message: `${path} — ${msg}` } })
  }
}
