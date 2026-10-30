// One router for the mock API, used by Nitro (server/api/[...path].ts) and by the
// in-browser mock of the static artifact build (app/mock/client-api.ts).
// Mirrors the contract in shared/types/api.ts that the Go backend implements.
import {
  applyDebugState,
  getForce,
  setForce,
  checkPromo,
  deposit,
  getCase,
  getCaseSections,
  getFeed,
  getHistory,
  getHistoryStats,
  getPairRolls,
  getHomeLayout,
  resetHomeLayout,
  setHomeLayout,
  getBigWins,
  bonusPreview,
  claimRakeback,
  openLevelCase,
  getBonuses,
  openDaily,
  openWelcome,
  redeemPromo,
  getInventory,
  getMarket,
  getMockState,
  getSeeds,
  xpFor,
  MockError,
  openCase,
  PAYMENT_METHODS,
  quoteDeposit,
  rotateSeeds,
  sellItems,
  setTradeUrl,
  withdrawItems,
  upgrade,
  type DebugStateBody,
} from './mock-db'

/** The player, with the XP still to spend for the next level (what the level bar can say in coins) */
function meUser() {
  const st = getMockState()
  return { ...st.user, levelLeft: Math.max(0, xpFor(st.user.level) - st.xp) }
}
import { callBot, createBattle, getBattle, joinBattle, listBattles } from './mock-battles'
import {
  addBigWin,
  deleteCase,
  duplicateCase,
  exportSnapshot,
  getAdminBigWins,
  getAdminBonuses,
  getAdminCase,
  getAdminFeed,
  getAdminGames,
  getAdminUsers,
  getGameRules,
  importSnapshot,
  listAdminCases,
  removeBigWin,
  resetAdmin,
  setAdminBonuses,
  setAdminCase,
  setAdminFeed,
  setAdminGames,
  setAdminUsers,
} from './mock-admin'

import { getFaq, getLegal, sendContact } from './mock-content'

export interface MockContext {
  loggedIn: boolean
}

type Body = Record<string, any>

export async function mockRoute(method: string, path: string, body: Body, query: Record<string, string>, ctx: MockContext): Promise<unknown> {
  const m = method.toUpperCase()
  const authed = () => {
    if (!ctx.loggedIn) throw new MockError(401, 'Sign in to continue')
  }

  let match: RegExpMatchArray | null

  if (m === 'GET' && path === '/api/me') return { user: ctx.loggedIn ? meUser() : null }
  if (m === 'POST' && path === '/api/auth/login') return { user: meUser() }
  if (m === 'POST' && path === '/api/auth/logout') return { ok: true }

  if (m === 'GET' && path === '/api/cases') return { sections: getCaseSections() }
  // the admin's home layout (the prototype edits it in place on home)
  if (m === 'GET' && path === '/api/admin/home-layout') return getHomeLayout()
  if (m === 'PUT' && path === '/api/admin/home-layout') return setHomeLayout(body.layout ?? {})
  if (m === 'POST' && path === '/api/admin/home-layout/reset') return resetHomeLayout()
  // the admin panel (/admin): every other setting, section by section (shared/types/api.ts, Admin*)
  if (m === 'GET' && path === '/api/admin/cases') return listAdminCases()
  if ((match = path.match(/^\/api\/admin\/cases\/([\w-]+)$/))) {
    if (m === 'GET') return getAdminCase(match[1]!)
    if (m === 'PUT') return setAdminCase(match[1]!, body.case ?? {})
    if (m === 'DELETE') return deleteCase(match[1]!)
  }
  if (m === 'POST' && (match = path.match(/^\/api\/admin\/cases\/([\w-]+)\/duplicate$/))) return duplicateCase(match[1]!)
  if (m === 'GET' && path === '/api/admin/bonuses') return getAdminBonuses()
  if (m === 'PUT' && path === '/api/admin/bonuses') return setAdminBonuses(body.bonuses ?? {})
  if (m === 'GET' && path === '/api/admin/games') return getAdminGames()
  if (m === 'PUT' && path === '/api/admin/games') return setAdminGames(body.games ?? {})
  if (m === 'GET' && path === '/api/admin/feed') return getAdminFeed()
  if (m === 'PUT' && path === '/api/admin/feed') return setAdminFeed(body.feed ?? {})
  if (m === 'GET' && path === '/api/admin/big-wins') return getAdminBigWins()
  if (m === 'POST' && path === '/api/admin/big-wins') return addBigWin(body.win ?? {})
  if (m === 'DELETE' && (match = path.match(/^\/api\/admin\/big-wins\/([\w-]+)$/))) return removeBigWin(match[1]!)
  if (m === 'GET' && path === '/api/admin/users') return getAdminUsers()
  if (m === 'PUT' && path === '/api/admin/users') return setAdminUsers(body.users ?? {})
  if (m === 'GET' && path === '/api/admin/snapshot') return exportSnapshot()
  if (m === 'PUT' && path === '/api/admin/snapshot') return importSnapshot(body)
  if (m === 'POST' && path === '/api/admin/reset') return resetAdmin()
  if (m === 'GET' && path === '/api/rules') return getGameRules()
  if (m === 'GET' && (match = path.match(/^\/api\/cases\/([\w-]+)$/))) return { case: getCase(match[1]!) }
  if (m === 'POST' && (match = path.match(/^\/api\/cases\/([\w-]+)\/open$/))) {
    if (!body.demo) authed()
    return openCase(match[1]!, Number(body.count ?? 1), !!body.demo, !!body.kurwadrop)
  }

  if (m === 'GET' && path === '/api/faq') return getFaq()
  if (m === 'GET' && (match = path.match(/^\/api\/legal\/([\w-]+)$/))) return getLegal(match[1]!)
  if (m === 'POST' && path === '/api/contact') return sendContact(body)

  if (m === 'GET' && path === '/api/feed') return getFeed()
  if (m === 'GET' && path === '/api/wins/today') return getBigWins()

  if (m === 'GET' && path === '/api/bonuses/preview') return bonusPreview()
  if (m === 'POST' && path === '/api/bonuses/rakeback/claim') {
    authed()
    return claimRakeback()
  }
  if (m === 'POST' && path === '/api/bonuses/level/open') {
    authed()
    return openLevelCase()
  }
  if (m === 'GET' && path === '/api/bonuses') {
    authed()
    return getBonuses()
  }
  if (m === 'POST' && path === '/api/bonuses/daily/open') {
    authed()
    return openDaily()
  }
  if (m === 'POST' && path === '/api/bonuses/welcome/open') {
    authed()
    return openWelcome()
  }
  if (m === 'POST' && path === '/api/bonuses/promo') {
    authed()
    return redeemPromo(String(body.code ?? ''))
  }

  if (m === 'GET' && path === '/api/inventory') {
    authed()
    return getInventory()
  }
  if (m === 'POST' && path === '/api/inventory/withdraw') {
    authed()
    return withdrawItems(body.uids ?? [])
  }
  if (m === 'PUT' && path === '/api/me/trade-url') {
    authed()
    return setTradeUrl(body.tradeUrl)
  }
  if (m === 'POST' && path === '/api/inventory/sell') {
    authed()
    return sellItems(body.uids ?? [])
  }

  if (m === 'GET' && path === '/api/history') {
    authed()
    return getHistory(query)
  }
  if (m === 'GET' && path === '/api/history/stats') {
    authed()
    return getHistoryStats()
  }
  if (m === 'GET' && path === '/api/market') return getMarket()
  if (m === 'POST' && path === '/api/upgrade') {
    authed()
    return upgrade(body.itemUids ?? [], Number(body.balanceAmount ?? 0), String(body.targetItemId))
  }

  if (m === 'GET' && path === '/api/battles') return listBattles(ctx.loggedIn)
  if (m === 'POST' && path === '/api/battles') {
    authed()
    return createBattle(body as never)
  }
  if (m === 'GET' && (match = path.match(/^\/api\/battles\/(\d+)$/))) return getBattle(match[1]!, ctx.loggedIn)
  if (m === 'POST' && (match = path.match(/^\/api\/battles\/(\d+)\/join$/))) {
    authed()
    return joinBattle(match[1]!, body.slot)
  }
  if (m === 'POST' && (match = path.match(/^\/api\/battles\/(\d+)\/bot$/))) {
    authed()
    return callBot(match[1]!, body.slot)
  }

  if (m === 'GET' && path === '/api/seeds') return getSeeds()
  if (m === 'POST' && path === '/api/seeds/rotate') {
    authed()
    return rotateSeeds(body.clientSeed)
  }
  if (m === 'GET' && (match = path.match(/^\/api\/seeds\/(\w+)\/rolls$/))) {
    authed()
    return getPairRolls(match[1]!)
  }

  if (m === 'GET' && path === '/api/deposit/methods') return { methods: PAYMENT_METHODS }
  if (m === 'GET' && path === '/api/deposit/quote') {
    return quoteDeposit(Number(query.amount ?? 0), (query.currency ?? 'PLN') as never, String(query.methodId ?? ''), query.promoCode)
  }
  if (m === 'POST' && path === '/api/deposit/promo') return checkPromo(String(body.code ?? ''))
  if (m === 'POST' && path === '/api/deposit') {
    authed()
    return deposit(Number(body.amount), body.currency, String(body.methodId), body.promoCode)
  }

  if (m === 'POST' && path === '/api/debug/state') return applyDebugState(body as DebugStateBody)
  if (m === 'GET' && path === '/api/debug/force') return getForce()
  if (m === 'POST' && path === '/api/debug/force') return setForce(body as never)

  throw new MockError(404, `No mock route for ${m} ${path}`)
}
