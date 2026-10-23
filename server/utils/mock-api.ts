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
  getBigWins,
  getBonuses,
  openDaily,
  openWelcome,
  claimLevel,
  claimMission,
  openChain,
  claimRakeback,
  redeemPromo,
  getInventory,
  getMarket,
  getMockState,
  getSeeds,
  getRace,
  getPass,
  claimPass,
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
import { callBot, createBattle, getBattle, joinBattle, listBattles } from './mock-battles'

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

  if (m === 'GET' && path === '/api/me') return { user: ctx.loggedIn ? getMockState().user : null }
  if (m === 'POST' && path === '/api/auth/login') return { user: getMockState().user }
  if (m === 'POST' && path === '/api/auth/logout') return { ok: true }

  if (m === 'GET' && path === '/api/cases') return { sections: getCaseSections() }
  if (m === 'GET' && (match = path.match(/^\/api\/cases\/([\w-]+)$/))) return { case: getCase(match[1]!) }
  if (m === 'POST' && (match = path.match(/^\/api\/cases\/([\w-]+)\/open$/))) {
    if (!body.demo) authed()
    return openCase(match[1]!, Number(body.count ?? 1), !!body.demo, !!body.kurwadrop)
  }

  if (m === 'GET' && path === '/api/feed') return getFeed()
  if (m === 'GET' && path === '/api/wins/today') return getBigWins()
  if (m === 'GET' && path === '/api/race') return getRace(ctx.loggedIn)
  if (m === 'GET' && path === '/api/pass') {
    authed()
    return getPass()
  }
  if (m === 'POST' && (match = path.match(/^\/api\/pass\/tiers\/(\d+)\/claim$/))) {
    authed()
    return claimPass(Number(match[1]))
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
  if (m === 'POST' && (match = path.match(/^\/api\/bonuses\/chains\/([\w-]+)\/open$/))) {
    authed()
    return openChain(match[1]!)
  }
  if (m === 'POST' && path === '/api/bonuses/rakeback/claim') {
    authed()
    return claimRakeback()
  }
  if (m === 'POST' && (match = path.match(/^\/api\/bonuses\/missions\/([\w-]+)\/claim$/))) {
    authed()
    return claimMission(match[1]!)
  }
  if (m === 'POST' && path === '/api/bonuses/promo') {
    authed()
    return redeemPromo(String(body.code ?? ''))
  }
  if (m === 'POST' && (match = path.match(/^\/api\/bonuses\/levels\/(\d+)\/claim$/))) {
    authed()
    return claimLevel(Number(match[1]))
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
    return getHistory()
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
