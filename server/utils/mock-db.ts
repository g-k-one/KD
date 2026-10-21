// In-memory mock backend state. Resets on dev server restart (or page reload in the artifact build).
// Replaced by the Go backend later — the UI only talks to it through mock-api.ts routes.
import type {
  CaseDetails,
  CaseItem,
  CaseOdds,
  CaseSection,
  CaseSummary,
  FeedDrop,
  FeedResponse,
  FiatCurrency,
  HistoryEntry,
  PfRoll,
  InventoryItem,
  Item,
  PaymentMethod,
  Rarity,
  User,
} from '#shared/types/api'
import { PF_TICKETS, pickByTicket, pfRoll, pfTicket, randomSeed, sha256Hex } from '#shared/utils/pf'

export const SESSION_COOKIE = 'kd_session'

export class MockError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

// --- Item catalog (prices in coin cents) ---------------------------------

const c = (coins: number) => Math.round(coins * 100)

export const CATALOG: Item[] = [
  { id: 'karambit-fade', weapon: 'Karambit', skin: 'Fade', rarity: 'gold', wear: 'FN', image: '/img/items/karambit-fade.png', price: c(8200) },
  { id: 'sport-vice', weapon: 'Sport Gloves', skin: 'Vice', rarity: 'gold', wear: 'FT', image: '/img/items/gloves-sport.png', price: c(6000) },
  { id: 'butterfly-fade', weapon: 'Butterfly Knife', skin: 'Fade', rarity: 'gold', wear: 'FN', image: '/img/items/butterfly-fade.png', price: c(5000) },
  { id: 'awp-dragon-lore', weapon: 'AWP', skin: 'Dragon Lore', rarity: 'covert', wear: 'MW', statTrak: true, image: '/img/items/awp-dragon-lore.png', price: c(3000) },
  { id: 'm4a4-howl', weapon: 'M4A4', skin: 'Howl', rarity: 'covert', wear: 'FN', image: '/img/items/m4a4-howl.png', price: c(2850) },
  { id: 'specialist-crimson', weapon: 'Specialist Gloves', skin: 'Crimson Web', rarity: 'gold', wear: 'MW', image: '/img/items/gloves-crimson.png', price: c(980) },
  { id: 'sport-omega', weapon: 'Sport Gloves', skin: 'Omega', rarity: 'gold', wear: 'FT', image: '/img/items/gloves-tiger.png', price: c(610) },
  { id: 'ak-vulcan', weapon: 'AK-47', skin: 'Vulcan', rarity: 'covert', wear: 'FT', image: '/img/items/ak-vulcan.png', price: c(170) },
  { id: 'awp-wildfire', weapon: 'AWP', skin: 'Wildfire', rarity: 'covert', wear: 'MW', image: '/img/items/awp-wildfire.png', price: c(155) },
  { id: 'awp-asiimov', weapon: 'AWP', skin: 'Asiimov', rarity: 'covert', wear: 'BS', image: '/img/items/awp-asiimov.png', price: c(120) },
  { id: 'usp-kill-confirmed', weapon: 'USP-S', skin: 'Kill Confirmed', rarity: 'covert', wear: 'MW', image: '/img/items/usp-kill-confirmed.png', price: c(65) },
  { id: 'ak-redline', weapon: 'AK-47', skin: 'Redline', rarity: 'classified', wear: 'FT', image: '/img/items/ak-redline.png', price: c(22) },
  { id: 'm4a1-hyper-beast', weapon: 'M4A1-S', skin: 'Hyper Beast', rarity: 'covert', wear: 'FT', image: '/img/items/m4a1-hyper-beast.png', price: c(14.5) },
  { id: 'glock-water-elemental', weapon: 'Glock-18', skin: 'Water Elemental', rarity: 'classified', wear: 'MW', image: '/img/items/glock-water-elemental.png', price: c(4.2) },
  { id: 'p250-asiimov', weapon: 'P250', skin: 'Asiimov', rarity: 'restricted', wear: 'FT', image: '/img/items/p250-asiimov.png', price: c(1.8) },
  { id: 'mp9-wild-lily', weapon: 'MP9', skin: 'Wild Lily', rarity: 'milspec', wear: 'WW', image: '/img/items/mp9-wild-lily.png', price: c(0.4) },
]

const byId = (id: string) => CATALOG.find((i) => i.id === id)!

// --- Cases ---------------------------------------------------------------

interface CaseDef extends Omit<CaseSummary, 'rtp'> {
  /** Target RTP from the admin panel, basis points */
  targetRtp: number
  itemIds: string[]
}

const CHEAP = ['mp9-wild-lily', 'p250-asiimov', 'glock-water-elemental', 'm4a1-hyper-beast', 'ak-redline']
const MID = ['usp-kill-confirmed', 'awp-asiimov', 'awp-wildfire', 'ak-vulcan']
const TOP = ['sport-omega', 'specialist-crimson', 'm4a4-howl', 'awp-dragon-lore', 'butterfly-fade', 'sport-vice', 'karambit-fade']

const CASE_DEFS: CaseDef[] = [
  { id: 'c1', slug: 'pierogi-pack', name: 'Pierogi Pack', image: '/img/cases/pierogi-pack.png', price: 99, risk: 'low', tag: 'new', targetRtp: 9350, createdAt: '2026-10-10', itemIds: [...CHEAP, 'usp-kill-confirmed', 'awp-asiimov'] },
  { id: 'c2', slug: 'kurwa-classic', name: 'Kurwa Classic', image: '/img/cases/kurwa-classic.png', price: 1250, risk: 'medium', targetRtp: 9240, createdAt: '2026-08-01', itemIds: [...CHEAP, ...MID, 'sport-omega', 'butterfly-fade'] },
  { id: 'c3', slug: 'zloty-rush', name: 'Zloty Rush', image: '/img/cases/zloty-rush.png', price: 490, risk: 'high', tag: 'new', targetRtp: 9100, createdAt: '2026-10-12', itemIds: [...CHEAP, ...MID, 'specialist-crimson'] },
  { id: 'c4', slug: 'babcias-box', name: 'Babcia’s Box', image: '/img/cases/babcias-box.png', price: 750, risk: 'medium', targetRtp: 9300, createdAt: '2026-07-15', itemIds: [...CHEAP, ...MID, 'sport-omega'] },
  { id: 'c5', slug: 'warsaw-nights', name: 'Warsaw Nights', image: '/img/cases/warsaw-nights.png', price: 1250, risk: 'extreme', tag: 'new', targetRtp: 9240, createdAt: '2026-10-14', itemIds: ['sport-vice', 'awp-dragon-lore', 'm4a4-howl', 'butterfly-fade', 'ak-vulcan', 'awp-asiimov', 'usp-kill-confirmed', 'ak-redline', 'm4a1-hyper-beast', 'glock-water-elemental', 'p250-asiimov', 'mp9-wild-lily'] },
  { id: 'c6', slug: 'vodka-drop', name: 'Vodka Drop', image: '/img/cases/vodka-drop.png', price: 2900, risk: 'medium', targetRtp: 9200, createdAt: '2026-06-02', itemIds: ['ak-redline', 'm4a1-hyper-beast', ...MID, 'sport-omega', 'specialist-crimson', 'm4a4-howl'] },
  { id: 'c7', slug: 'krakow-knife', name: 'Krakow Knife', image: '/img/cases/krakow-knife.png', price: 4900, risk: 'high', targetRtp: 9050, createdAt: '2026-05-20', itemIds: ['ak-redline', ...MID, 'butterfly-fade', 'karambit-fade'] },
  { id: 'c8', slug: 'golden-kielbasa', name: 'Golden Kielbasa', image: '/img/cases/golden-kielbasa.png', price: 9900, risk: 'extreme', targetRtp: 9000, createdAt: '2026-04-11', itemIds: ['ak-redline', ...MID, ...TOP] },
  { id: 'c9', slug: 'budget-boom', name: 'Budget Boom', image: '/img/cases/budget-boom.png', price: 14900, risk: 'low', targetRtp: 9400, createdAt: '2026-03-08', itemIds: [...MID, 'sport-omega', 'specialist-crimson', 'm4a4-howl'] },
  { id: 'c10', slug: 'high-roller', name: 'High Roller', image: '/img/cases/high-roller.png', price: 29900, risk: 'high', tag: 'hot', targetRtp: 9150, createdAt: '2026-02-01', itemIds: ['awp-wildfire', 'ak-vulcan', ...TOP] },
]

/**
 * Builds the odds table like the admin panel would: weights ∝ price^-α, with α solved so the
 * expected value hits the target RTP. Tickets are then rounded and the real RTP recomputed,
 * so what the page shows is exactly what the table pays.
 */
function buildCase(def: CaseDef): CaseDetails {
  const items = def.itemIds.map(byId).sort((a, b) => b.price - a.price)
  const target = (def.price * def.targetRtp) / 10_000
  const ev = (alpha: number) => {
    const w = items.map((i) => i.price ** -alpha)
    const sum = w.reduce((a, b) => a + b, 0)
    return items.reduce((acc, it, k) => acc + (it.price * w[k]!) / sum, 0)
  }
  let lo = 0
  let hi = 8
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (ev(mid) > target) lo = mid
    else hi = mid
  }
  const alpha = (lo + hi) / 2
  const w = items.map((i) => i.price ** -alpha)
  const sum = w.reduce((a, b) => a + b, 0)
  const tickets = w.map((x) => Math.max(1, Math.round((x / sum) * PF_TICKETS)))
  // Put the rounding remainder on the most likely item so tickets add up to exactly 1 000 000
  const most = tickets.indexOf(Math.max(...tickets))
  tickets[most]! += PF_TICKETS - tickets.reduce((a, b) => a + b, 0)

  let from = 1
  const caseItems: CaseItem[] = items.map((it, k) => {
    const t = tickets[k]!
    const ci: CaseItem = { ...it, tickets: t, ticketFrom: from, ticketTo: from + t - 1 }
    from += t
    return ci
  })

  const pct = (pred: (i: CaseItem) => boolean) =>
    Math.round(caseItems.filter(pred).reduce((a, i) => a + i.tickets, 0) / (PF_TICKETS / 10_000))
  const odds: CaseOdds = {
    below1x: pct((i) => i.price < def.price),
    x2: pct((i) => i.price >= def.price * 2),
    x3: pct((i) => i.price >= def.price * 3),
    x5: pct((i) => i.price >= def.price * 5),
    x10: pct((i) => i.price >= def.price * 10),
  }
  const realEv = caseItems.reduce((a, i) => a + (i.price * i.tickets) / PF_TICKETS, 0)

  // KURWADROP: 2% Golden Chicken → respin among the expensive items; priced so the RTP is unchanged
  const KURWA_TICKETS = 20_000
  let pool = caseItems.filter((i) => i.price >= def.price * 3)
  if (pool.length < 3) pool = caseItems.slice(0, 3)
  const poolTickets = pool.reduce((a, i) => a + i.tickets, 0)
  const poolEv = pool.reduce((a, i) => a + (i.price * i.tickets) / poolTickets, 0)
  const kurwaEv = (1 - KURWA_TICKETS / PF_TICKETS) * realEv + (KURWA_TICKETS / PF_TICKETS) * poolEv
  const kurwadrop = { price: Math.round((def.price * kurwaEv) / realEv), chickenTickets: KURWA_TICKETS, poolIds: pool.map((i) => i.id) }

  const { targetRtp: _t, itemIds: _i, ...summary } = def
  return { ...summary, rtp: Math.round((realEv / def.price) * 10_000), items: caseItems, odds, oddsVersion: 1, kurwadrop }
}

const CASES: CaseDetails[] = CASE_DEFS.map(buildCase)

const toSummary = ({ items: _i, odds: _o, oddsVersion: _v, kurwadrop: _k, ...s }: CaseDetails): CaseSummary => s

export function getCaseSections(): CaseSection[] {
  const all = CASES.map(toSummary)
  const pick = (slugs: string[]) => slugs.map((s) => all.find((c) => c.slug === s)!)
  return [
    { id: 'featured', title: 'Featured cases', cases: all },
    { id: 'polish-classics', title: 'Polish classics', cases: pick(['babcias-box', 'vodka-drop', 'golden-kielbasa', 'kurwa-classic', 'pierogi-pack']) },
  ]
}

export function getCase(slug: string): CaseDetails {
  const found = CASES.find((c) => c.slug === slug)
  if (!found) throw new MockError(404, 'Case not found')
  return found
}

// --- State ---------------------------------------------------------------

const DEFAULT_USER: User = {
  id: 'u1',
  nickname: 'Nickname',
  avatar: '/img/brand/avatar.png',
  steamId: '76561198000004821',
  level: 12,
  levelProgress: 64,
  balance: 312540,
  skinsValue: 0,
}

let uidSeq = 0
export function toInventory(item: Item, source: InventoryItem["source"]): InventoryItem {
  uidSeq += 1
  return { ...item, uid: `inv${uidSeq}`, acquiredAt: new Date().toISOString(), source, status: 'owned' }
}

const STARTER_INVENTORY = ['butterfly-fade', 'glock-water-elemental', 'awp-wildfire', 'm4a4-howl', 'ak-redline', 'p250-asiimov', 'mp9-wild-lily']

interface SeedState {
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  nonce: number
}

interface MockState {
  user: User
  inventory: InventoryItem[]
  seed: SeedState
  previousSeed: (SeedState & { serverSeed: string }) | null
  feedPaused: boolean
  /** Drops pushed from /debug or by the user's own opens, served before random ones */
  queuedDrops: FeedDrop[]
  history: HistoryEntry[]
}

const state: MockState = {
  user: structuredClone(DEFAULT_USER),
  inventory: STARTER_INVENTORY.map((id) => toInventory(byId(id), 'case')),
  seed: { serverSeed: '', serverSeedHash: '', clientSeed: randomSeed(5), nonce: 0 },
  previousSeed: null,
  feedPaused: false,
  queuedDrops: [],
  history: [],
}

// --- Debug: forced outcomes (prototype only; breaks provable fairness on purpose) -----------

export type ForcedCase = { rarity?: Rarity; itemId?: string; kurwa?: boolean }
export type ForcedUpgrade = 'win' | 'lose' | 'edge-win' | 'edge-lose' | null
export type ForcedBattle = 'you' | 'other' | null
export interface DebugForce {
  /** Applied one per opened case, in order */
  cases: ForcedCase[]
  /** Applied to the next upgrade, then cleared */
  upgrade: ForcedUpgrade
  /** Applied to the next battle that fills, then cleared */
  battle: ForcedBattle
}
const force: DebugForce = { cases: [], upgrade: null, battle: null }
export const getForce = () => force
export function setForce(body: Partial<DebugForce> & { clear?: boolean }) {
  if (body.clear) {
    force.cases = []
    force.upgrade = null
    force.battle = null
  }
  if (body.cases) force.cases.push(...body.cases)
  if (body.upgrade !== undefined) force.upgrade = body.upgrade
  if (body.battle !== undefined) force.battle = body.battle
  return force
}
/** Next forced case result resolved against this case's items. */
function takeForcedCase(cs: CaseDetails, _k: number): { item?: CaseItem; kurwa?: boolean } | null {
  const f = force.cases.shift()
  if (!f) return null
  let item: CaseItem | undefined
  if (f.itemId) item = cs.items.find((i) => i.id === f.itemId)
  if (!item && f.rarity) {
    const of = cs.items.filter((i) => i.rarity === f.rarity)
    item = of.length ? of[Math.floor(Math.random() * of.length)] : undefined
    // No item of that rarity in this case: take the closest more common one
    if (!item) item = cs.items[cs.items.length - 1]
  }
  return { item, kurwa: f.kurwa }
}
export function takeForcedBattle(): ForcedBattle {
  const b = force.battle
  force.battle = null
  return b
}

let historySeq = 0
// A few past rows so the history tab is not empty on first look
setTimeout(() => {
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
  state.history.push(
    { id: 'h-s1', at: ago(12), game: 'upgrade', title: 'AWP | Asiimov', bet: 6300, payout: 12000, status: 'won', nonce: 3 },
    { id: 'h-s2', at: ago(40), game: 'case', title: 'Kurwa Classic', bet: 1250, payout: 420, status: 'lost', nonce: 2 },
    { id: 'h-s3', at: ago(41), game: 'case', title: 'Kurwa Classic', bet: 1250, payout: 2200, status: 'won', nonce: 1 },
    { id: 'h-s4', at: ago(65), game: 'deposit', title: 'BLIK', bet: 0, payout: 5727, status: 'done' },
  )
})
export function record(e: Omit<HistoryEntry, "id" | "at">) {
  historySeq += 1
  state.history.unshift({ id: `h${historySeq}`, at: new Date().toISOString(), ...e })
  state.history.splice(200)
}

export function getHistory() {
  return { entries: state.history }
}

async function freshServerSeed() {
  const serverSeed = randomSeed(32)
  return { serverSeed, serverSeedHash: await sha256Hex(serverSeed) }
}

let seedReady: Promise<void> | null = null
async function ensureSeed() {
  seedReady ??= freshServerSeed().then((s) => {
    Object.assign(state.seed, s)
  })
  await seedReady
}

export function getMockState() {
  syncSkinsValue()
  return state
}

export function syncSkinsValue() {
  state.user.skinsValue = ownedItems().reduce((a, i) => a + i.price, 0)
}

export function resetMockUser() {
  state.user = structuredClone(DEFAULT_USER)
  state.inventory = STARTER_INVENTORY.map((id) => toInventory(byId(id), 'case'))
  syncSkinsValue()
}

export function spend(amount: number) {
  if (state.user.balance < amount) throw new MockError(402, 'Not enough balance')
  state.user.balance -= amount
}

const ownedItems = () => state.inventory.filter((i) => i.status === 'owned')

// --- Seeds / provably fair ------------------------------------------------

export async function getSeeds() {
  await ensureSeed()
  const { serverSeedHash, clientSeed, nonce } = state.seed
  return {
    active: { serverSeedHash, clientSeed, nonce },
    previous: state.previousSeed
      ? {
          serverSeedHash: state.previousSeed.serverSeedHash,
          clientSeed: state.previousSeed.clientSeed,
          nonce: state.previousSeed.nonce,
          serverSeed: state.previousSeed.serverSeed,
        }
      : null,
  }
}

export async function rotateSeeds(clientSeed?: string) {
  await ensureSeed()
  state.previousSeed = { ...state.seed }
  Object.assign(state.seed, await freshServerSeed(), { nonce: 0, clientSeed: clientSeed?.trim() || randomSeed(5) })
  return getSeeds()
}

const publicSeed = () => ({ serverSeedHash: state.seed.serverSeedHash, clientSeed: state.seed.clientSeed, nonce: state.seed.nonce })

// --- Cases: open / sell -----------------------------------------------------

export async function openCase(slug: string, count: number, demo: boolean, kurwadrop = false) {
  await ensureSeed()
  const cs = getCase(slug)
  const n = Math.min(5, Math.max(1, Math.floor(count)))
  const price = kurwadrop ? cs.kurwadrop.price : cs.price
  if (!demo) spend(price * n)

  const K = cs.kurwadrop.chickenTickets
  const pool = cs.items.filter((i) => cs.kurwadrop.poolIds.includes(i.id))
  const poolTotal = pool.reduce((a, i) => a + i.tickets, 0)

  const drops: InventoryItem[] = []
  const kurwa: boolean[] = []
  const rolls: PfRoll[] = []
  for (let k = 0; k < n; k++) {
    // Demo spins use a throwaway seed so they never move the real nonce
    const nonce = demo ? k : ++state.seed.nonce
    const serverSeed = demo ? randomSeed(16) : state.seed.serverSeed
    const forced = takeForcedCase(cs, k)
    let { ticket } = await pfTicket(serverSeed, state.seed.clientSeed, nonce)
    let hit = false
    let picked: CaseItem
    if (kurwadrop && (forced?.kurwa ?? ticket <= K)) {
      // Golden Chicken: second roll among the expensive items
      hit = true
      const { ticket: t2 } = await pfTicket(serverSeed, `${state.seed.clientSeed}:kurwadrop`, nonce)
      let r = Math.ceil((t2 * poolTotal) / PF_TICKETS)
      picked = forced?.item && pool.some((p) => p.id === forced.item!.id) ? forced.item : pool.find((p) => (r -= p.tickets) <= 0) ?? pool[pool.length - 1]!
    } else {
      if (kurwadrop) ticket = Math.ceil(((ticket - K) * PF_TICKETS) / (PF_TICKETS - K))
      picked = forced?.item ?? pickByTicket(cs.items, ticket)
    }
    const { tickets: _t, ticketFrom: _f, ticketTo: _to, ...item } = picked
    const inv = toInventory(item, 'case')
    if (!demo) {
      state.inventory.unshift(inv)
      state.queuedDrops.push(makeDrop({ ...item, itemName: item.weapon, skinName: item.skin, caseSlug: slug, userNickname: state.user.nickname }))
    }
    drops.push(inv)
    kurwa.push(hit)
    rolls.push({ nonce, ticket })
  }
  if (!demo) {
    drops.forEach((d, k) =>
      record({ game: 'case', title: cs.name, bet: price, payout: d.price, status: d.price >= price ? 'won' : 'lost', nonce: rolls[k]!.nonce }),
    )
  }
  syncSkinsValue()
  return { drops, kurwa, rolls, balance: state.user.balance, seed: publicSeed() }
}

export function sellItems(uids: string[]) {
  const sold: string[] = []
  for (const it of state.inventory) {
    if (uids.includes(it.uid) && it.status === 'owned') {
      it.status = 'sold'
      state.user.balance += it.price
      sold.push(it.uid)
      record({ game: 'sell', title: `${it.weapon} | ${it.skin}`, bet: 0, payout: it.price, status: 'done' })
    }
  }
  syncSkinsValue()
  return { sold, balance: state.user.balance }
}

export function getInventory() {
  return { items: ownedItems() }
}

// --- Upgrade ----------------------------------------------------------------

/** House edge for upgrades: 5%, max chance 95%. Chance in basis points. */
export function upgradeChance(inputValue: number, targetPrice: number) {
  if (targetPrice <= 0) return 0
  return Math.min(9500, Math.floor((inputValue / targetPrice) * 9500))
}

export function getMarket() {
  return { items: CATALOG }
}

export async function upgrade(itemUids: string[], balanceAmount: number, targetItemId: string) {
  await ensureSeed()
  const target = byId(targetItemId)
  if (!target) throw new MockError(404, 'Item not found')
  const items = ownedItems().filter((i) => itemUids.includes(i.uid))
  const extra = Math.max(0, Math.floor(balanceAmount))
  const input = items.reduce((a, i) => a + i.price, 0) + extra
  if (input <= 0) throw new MockError(400, 'Choose skins or add balance')
  const chance = upgradeChance(input, target.price)
  if (chance < 100) throw new MockError(400, 'Chance is below 1%')

  spend(extra)
  for (const i of items) i.status = 'used'

  const nonce = ++state.seed.nonce
  let { roll } = await pfRoll(state.seed.serverSeed, state.seed.clientSeed, nonce)
  // Debug: steer the roll (edge = within half a point of the chance line)
  const f = force.upgrade
  force.upgrade = null
  const c = chance / 100
  if (f === 'win') roll = +(Math.random() * c * 0.9).toFixed(2)
  if (f === 'lose') roll = +(c + Math.random() * (100 - c)).toFixed(2)
  if (f === 'edge-win') roll = +Math.max(0, c - 0.1 - Math.random() * 0.4).toFixed(2)
  if (f === 'edge-lose') roll = +Math.min(99.99, c + 0.1 + Math.random() * 0.4).toFixed(2)
  const win = roll * 100 < chance
  const won = win ? toInventory(target, 'upgrade') : null
  if (won) {
    state.inventory.unshift(won)
    state.queuedDrops.push(makeDrop({ ...target, itemName: target.weapon, skinName: target.skin, caseSlug: 'upgrade', userNickname: state.user.nickname }))
  }
  record({ game: 'upgrade', title: `${target.weapon} | ${target.skin}`, bet: input, payout: win ? target.price : 0, status: win ? 'won' : 'lost', nonce })
  syncSkinsValue()
  return { win, roll, chance, item: won, balance: state.user.balance, nonce, seed: publicSeed() }
}

// --- Deposit ------------------------------------------------------------------

/** Coins per 1 unit of fiat (1 coin ≈ 1 USD). */
export const FX: Record<FiatCurrency, number> = { USD: 1, EUR: 1.08, PLN: 0.249 }

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'blik', name: 'BLIK', logo: '/img/pay/blik.svg', bonusBp: 500, min: 10, max: 20000 },
  { id: 'card', name: 'Visa', logo: '/img/pay/visa.svg', bonusBp: 500, min: 10, max: 50000 },
  { id: 'mastercard', name: 'Mastercard', logo: '/img/pay/mastercard.svg', bonusBp: 500, min: 20, max: 10000 },
  { id: 'googlepay', name: 'Google Pay', logo: '/img/pay/googlepay.svg', bonusBp: 0, min: 20, max: 10000 },
  { id: 'skrill', name: 'Skrill', logo: '/img/pay/skrill.svg', bonusBp: 0, min: 50, max: null },
  { id: 'crypto', name: 'Crypto', logo: '/img/pay/crypto.svg', bonusBp: 0, min: 20, max: 10000 },
]

export const PROMO_CODES: Record<string, number> = { KURWA10: 1000, PIEROGI: 500 }

export function checkPromo(code: string) {
  const bp = PROMO_CODES[code.trim().toUpperCase()]
  if (!bp) throw new MockError(404, 'Promo code not found')
  return { code: code.trim().toUpperCase(), bonusBp: bp }
}

export function quoteDeposit(amount: number, currency: FiatCurrency, methodId: string, promoCode?: string) {
  const method = PAYMENT_METHODS.find((m) => m.id === methodId)
  const coins = Math.round(amount * FX[currency] * 100)
  const methodBonus = Math.round((coins * (method?.bonusBp ?? 0)) / 10_000)
  const promoBp = promoCode ? (PROMO_CODES[promoCode.trim().toUpperCase()] ?? 0) : 0
  const promoBonus = Math.round((coins * promoBp) / 10_000)
  return { amount, currency, coins, methodBonus, promoBonus, total: coins + methodBonus + promoBonus }
}

export function deposit(amount: number, currency: FiatCurrency, methodId: string, promoCode?: string) {
  const method = PAYMENT_METHODS.find((m) => m.id === methodId)
  if (!method) throw new MockError(400, 'Choose a payment method')
  if (amount < method.min || (method.max && amount > method.max)) throw new MockError(400, 'Amount is outside the method limits')
  const q = quoteDeposit(amount, currency, methodId, promoCode)
  state.user.balance += q.total
  record({ game: 'deposit', title: method.name, bet: 0, payout: q.total, status: 'done' })
  return { credited: q.total, balance: state.user.balance }
}

// --- Live feed -----------------------------------------------------------------

const NICKNAMES = ['pierogi_king', 'babcia99', 'zlotyboy', 'kurwa_pro', 'vodkashot', 'krakow_kid', 'ez_drop']

let dropSeq = 0
const feed: FeedDrop[] = []

export function makeDrop(overrides: Partial<FeedDrop> & Partial<Item> = {}): FeedDrop {
  const cs = CASES[Math.floor(Math.random() * CASES.length)]!
  const it = pickByTicket(cs.items, 1 + Math.floor(Math.random() * PF_TICKETS))
  dropSeq += 1
  return {
    id: `d${dropSeq}`,
    itemName: it.weapon,
    skinName: it.skin,
    rarity: it.rarity,
    image: it.image,
    price: it.price,
    caseSlug: cs.slug,
    userNickname: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]!,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeDropOfRarity(rarity: Rarity): FeedDrop {
  const it = CATALOG.find((i) => i.rarity === rarity) ?? CATALOG[0]!
  return makeDrop({ itemName: it.weapon, skinName: it.skin, rarity, image: it.image, price: it.price })
}

for (let i = 0; i < 24; i++) feed.unshift(makeDrop())

/** Called on every feed poll: occasionally appends a new drop so the strip feels alive. */
export function tickFeed() {
  if (state.queuedDrops.length) {
    feed.unshift(...state.queuedDrops.splice(0))
  } else if (!state.feedPaused && Math.random() < 0.6) {
    feed.unshift(makeDrop())
  }
  feed.splice(40)
  return feed
}

export function getFeed(): FeedResponse {
  const drops = tickFeed().slice(0, 30)
  const highlight = drops.reduce<FeedResponse['highlight']>((best, d) => (!best || d.price > best.price ? d : best), null)
  return { drops, highlight }
}

// --- Debug controls (used by /debug) ---------------------------------------

export interface DebugStateBody {
  user?: Partial<Pick<User, 'balance' | 'level' | 'levelProgress' | 'nickname'>>
  resetUser?: boolean
  feedPaused?: boolean
  pushDrop?: Rarity
}

export function applyDebugState(body: DebugStateBody) {
  if (body.resetUser) resetMockUser()
  if (body.user) Object.assign(state.user, body.user)
  if (typeof body.feedPaused === 'boolean') state.feedPaused = body.feedPaused
  if (body.pushDrop) state.queuedDrops.push(makeDropOfRarity(body.pushDrop))
  syncSkinsValue()
  return { user: state.user, feedPaused: state.feedPaused }
}
