// In-memory mock backend state. Resets on dev server restart (or page reload in the artifact build).
// Replaced by the Go backend later — the UI only talks to it through mock-api.ts routes.
import { upgradeChanceBp } from '#shared/upgrade'
import type {
  BigWin,
  CaseDetails,
  CaseTopDrop,
  CaseItem,
  CaseOdds,
  CaseSection,
  HomeLayout,
  CaseSummary,
  FeedDrop,
  FeedResponse,
  FiatCurrency,
  HistoryEntry,
  InventoryItem,
  Item,
  PaymentMethod,
  PfRoll,
  Rarity,
  User,
} from '#shared/types/api'
import { PF_TICKETS, pickByTicket, pfRoll, pfTicket, randomSeed, sha256Hex } from '#shared/utils/pf'
// Real CS2 skins with Skinport prices (scripts/import-cs2-skins.py)
import CS2_SKINS from '#shared/data/cs2-skins.json'
import GEM_CASES from '#shared/data/kd-cases.json'

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

const LEGACY: Item[] = [
  { id: 'karambit-fade', weapon: 'Karambit', skin: 'Fade', rarity: 'gold', wear: 'FN', image: '/img/items/karambit-fade.webp', price: c(8200) },
  { id: 'sport-vice', weapon: 'Sport Gloves', skin: 'Vice', rarity: 'gold', wear: 'FT', image: '/img/items/gloves-sport.webp', price: c(6000) },
  { id: 'butterfly-fade', weapon: 'Butterfly Knife', skin: 'Fade', rarity: 'gold', wear: 'FN', image: '/img/items/butterfly-fade.webp', price: c(5000) },
  { id: 'awp-dragon-lore', weapon: 'AWP', skin: 'Dragon Lore', rarity: 'covert', wear: 'MW', statTrak: true, image: '/img/items/awp-dragon-lore.webp', price: c(3000) },
  { id: 'm4a4-howl', weapon: 'M4A4', skin: 'Howl', rarity: 'covert', wear: 'FN', image: '/img/items/m4a4-howl.webp', price: c(2850) },
  { id: 'specialist-crimson', weapon: 'Specialist Gloves', skin: 'Crimson Web', rarity: 'gold', wear: 'MW', image: '/img/items/gloves-crimson.webp', price: c(980) },
  { id: 'sport-omega', weapon: 'Sport Gloves', skin: 'Omega', rarity: 'gold', wear: 'FT', image: '/img/items/gloves-tiger.webp', price: c(610) },
  { id: 'ak-vulcan', weapon: 'AK-47', skin: 'Vulcan', rarity: 'covert', wear: 'FT', image: '/img/items/ak-vulcan.webp', price: c(170) },
  { id: 'awp-wildfire', weapon: 'AWP', skin: 'Wildfire', rarity: 'covert', wear: 'MW', image: '/img/items/awp-wildfire.webp', price: c(155) },
  { id: 'awp-asiimov', weapon: 'AWP', skin: 'Asiimov', rarity: 'covert', wear: 'BS', image: '/img/items/awp-asiimov.webp', price: c(120) },
  { id: 'usp-kill-confirmed', weapon: 'USP-S', skin: 'Kill Confirmed', rarity: 'covert', wear: 'MW', image: '/img/items/usp-kill-confirmed.webp', price: c(65) },
  { id: 'ak-redline', weapon: 'AK-47', skin: 'Redline', rarity: 'classified', wear: 'FT', image: '/img/items/ak-redline.webp', price: c(22) },
  { id: 'm4a1-hyper-beast', weapon: 'M4A1-S', skin: 'Hyper Beast', rarity: 'covert', wear: 'FT', image: '/img/items/m4a1-hyper-beast.webp', price: c(14.5) },
  { id: 'glock-water-elemental', weapon: 'Glock-18', skin: 'Water Elemental', rarity: 'classified', wear: 'MW', image: '/img/items/glock-water-elemental.webp', price: c(4.2) },
  { id: 'p250-asiimov', weapon: 'P250', skin: 'Asiimov', rarity: 'restricted', wear: 'FT', image: '/img/items/p250-asiimov.webp', price: c(1.8) },
  { id: 'mp9-wild-lily', weapon: 'MP9', skin: 'Wild Lily', rarity: 'milspec', wear: 'WW', image: '/img/items/mp9-wild-lily.webp', price: c(0.4) },
]

// The CS2 import is the catalog; the first hand-picked set stays for the starter inventory and the daily case,
// minus any skin the import already has (its price is real)
const cs2 = CS2_SKINS as Item[]
const key = (i: Item) => `${i.weapon}|${i.skin}`.toLowerCase()
const gemItems = (GEM_CASES as Array<{ items: Array<Item & { tickets?: number }> }>).flatMap((g) => g.items.map(({ tickets: _t, ...i }) => i as Item))
const uniq = (list: Item[]) => list.filter((i, k) => list.findIndex((x) => x.id === i.id) === k)
export const CATALOG: Item[] = uniq([...cs2, ...gemItems, ...LEGACY.filter((l) => !cs2.some((c) => key(c) === key(l)))]).sort((a, b) => b.price - a.price)

const byId = (id: string) => CATALOG.find((i) => i.id === id) ?? CATALOG.find((i) => key(i) === key(LEGACY.find((l) => l.id === id)!))!

// --- Cases ---------------------------------------------------------------

interface CaseDef extends Omit<CaseSummary, 'rtp' | 'payback' | 'bestToday'> {
  /** Target RTP from the admin panel, basis points */
  targetRtp: number
  /** Fixed contents; otherwise picked from the catalog by price and risk (contentsFor) */
  itemIds?: string[]
  /** Contents with fixed odds (cases modelled on a live site); the price then decides the RTP */
  preset?: Array<Item & { tickets: number }>
}

/** Top prize as a multiple of the case price, by risk */
const TOP_MULT: Record<CaseSummary['risk'], number> = { low: 12, medium: 40, high: 120, extreme: 400 }
/**
 * Contents like a real site's case: ~14 skins spread evenly (in log price) from ~0.06× to the risk's top
 * multiple of the case price, deterministic per case. Odds come later from buildCase's RTP solver.
 */
function contentsFor(def: CaseDef): string[] {
  let seed = [...def.slug].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const lo = def.price * 0.06
  const hi = def.price * TOP_MULT[def.risk]
  const pool = CATALOG.filter((i) => i.price >= lo && i.price <= hi)
  const N = 14
  const picked = new Set<string>()
  for (let k = 0; k < N; k++) {
    // aim at an evenly spaced log price, take a random skin near it
    const aim = Math.exp(Math.log(lo) + ((k + 0.5) / N) * (Math.log(hi) - Math.log(lo)))
    const near = [...pool].sort((a, b) => Math.abs(Math.log(a.price / aim)) - Math.abs(Math.log(b.price / aim))).slice(0, 4)
    const free = near.filter((i) => !picked.has(i.id))
    const it = free[Math.floor(rand() * free.length)]
    if (it) picked.add(it.id)
  }
  return [...picked]
}


const CASE_DEFS: CaseDef[] = [
  { id: 'c1', slug: 'pierogi-pack', name: 'Pierogi Pack', image: '/img/cases/pierogi-pack.webp', price: 99, risk: 'low', tag: 'new', targetRtp: 9350, createdAt: '2026-10-10' },
  { id: 'c2', slug: 'kurwa-classic', name: 'Kurwa Classic', image: '/img/cases/kurwa-chicken.webp', rig: { skeleton: '/img/cases/rig/kurwa-chicken.json', atlas: '/img/cases/rig/kurwa-chicken.atlas', hover: 'hover', look: { bone: 'look', range: 60 } }, price: 1250, risk: 'medium', targetRtp: 9240, createdAt: '2026-08-01' },
  { id: 'c3', slug: 'zloty-rush', name: 'Zloty Rush', image: '/img/cases/zloty-rush.webp', rig: { skeleton: '/img/cases/rig/zloty-rush.json', atlas: '/img/cases/rig/zloty-rush.atlas' }, price: 490, risk: 'high', tag: 'new', targetRtp: 9100, createdAt: '2026-10-12', limited: { total: 1000, left: 214 } },
  { id: 'c4', slug: 'babcias-box', name: 'Babcia’s Box', image: '/img/cases/babcias-box.webp', price: 750, risk: 'medium', targetRtp: 9300, createdAt: '2026-07-15' },
  { id: 'c5', slug: 'warsaw-nights', name: 'Warsaw Nights', image: '/img/cases/warsaw-nights.webp', price: 1250, risk: 'extreme', tag: 'new', targetRtp: 9240, createdAt: '2026-10-14', limited: { total: 500, left: 37 } },
  { id: 'c6', slug: 'vodka-drop', name: 'Vodka Drop', image: '/img/cases/vodka-drop.webp', price: 2900, risk: 'medium', targetRtp: 9200, createdAt: '2026-06-02' },
  { id: 'c7', slug: 'krakow-knife', name: 'Krakow Knife', image: '/img/cases/krakow-agent.webp', animation: '/img/cases/krakow-knife.avif', price: 4900, risk: 'high', targetRtp: 9050, createdAt: '2026-05-20' },
  { id: 'c8', slug: 'golden-kielbasa', name: 'Golden Kielbasa', image: '/img/cases/golden-kielbasa.webp', price: 9900, risk: 'extreme', targetRtp: 9000, createdAt: '2026-04-11' },
  { id: 'c9', slug: 'budget-boom', name: 'Budget Boom', image: '/img/cases/budget-boom.webp', price: 14900, risk: 'low', targetRtp: 9400, createdAt: '2026-03-08' },
  { id: 'c10', slug: 'high-roller', name: 'High Roller', image: '/img/cases/high-roller.webp', price: 29900, risk: 'high', tag: 'hot', targetRtp: 9150, createdAt: '2026-02-01', limited: { total: 100, left: 12 } },
]

/**
 * Builds the odds table like the admin panel would: weights ∝ price^-α, with α solved so the
 * expected value hits the target RTP. Tickets are then rounded and the real RTP recomputed,
 * so what the page shows is exactly what the table pays.
 */
function buildCase(def: CaseDef): CaseDetails {
  if (def.preset) return finishCase(def, [...def.preset].sort((a, b) => b.price - a.price))
  const items = (def.itemIds ?? contentsFor(def)).map(byId).sort((a, b) => b.price - a.price)
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
  return finishCase(def, items.map((it, k) => ({ ...it, tickets: tickets[k]! })))
}

/** Ticket ranges, odds table, KURWADROP pool and the real RTP from items that already have their tickets. */
/** Small stable string hash (FNV-1a), for mock numbers that must not jump between requests */
function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function finishCase(def: CaseDef, withTickets: Array<Item & { tickets: number }>): CaseDetails {
  const items: Item[] = withTickets
  const tickets = withTickets.map((i) => i.tickets)
  let from = 1
  // Opens of this case in the last 24 h (stable per case); each item's count follows its odds
  const opens24h = 1500 + (hashStr(def.slug) % 4000)
  const caseItems: CaseItem[] = items.map((it, k) => {
    const t = tickets[k]!
    const expected = (opens24h * t) / PF_TICKETS
    const drops24h = Math.max(0, Math.round(expected * (0.75 + ((hashStr(it.id + def.slug) % 50) / 100))))
    const ci: CaseItem = { ...it, tickets: t, ticketFrom: from, ticketTo: from + t - 1, drops24h }
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

  // KURWADROP: no extra chance and no surcharge. When the roll lands on a top item (price ≥ 3× the case,
  // at least the top 3) the reel shows the Golden Chicken first and then a second spin onto that item.
  let pool = caseItems.filter((i) => i.price >= def.price * 3)
  if (pool.length < 3) pool = caseItems.slice(0, 3)
  const kurwadrop = { price: def.price, chickenTickets: pool.reduce((a, i) => a + i.tickets, 0), poolIds: pool.map((i) => i.id) }

  // Top drops of the last 7 days: stable per case, from the items worth 2× the case or more
  const NICKS = ['pierogi_king', 'babcia99', 'zlotyboy', 'kurwa_pro', 'vodkashot', 'krakow_kid', 'ez_drop', 'wroclaw_wolf']
  const rich = caseItems.filter((i) => i.price >= def.price * 2).sort((a, b) => b.price - a.price).slice(0, 10)
  const topDrops: CaseTopDrop[] = Array.from({ length: Math.min(6, rich.length) }, (_, k) => {
    const h = hashStr(`${def.slug}:${k}`)
    const { tickets: _tk, ticketFrom: _f, ticketTo: _to, drops24h: _d, ...item } = rich[h % rich.length]!
    return { item, nickname: NICKS[h % NICKS.length]!, multiplier: Math.round((item.price / def.price) * 10) / 10, at: new Date(Date.now() - ((h % 160) + 2) * 3600_000).toISOString() }
  }).sort((a, b) => b.multiplier - a.multiplier)

  const { targetRtp: _t, itemIds: _i, ...summary } = def
  return {
    ...summary,
    // every case has its wide, tall and full-scene pictures, named after it
    art: { wide: `/img/cases/wide/${def.slug}.webp`, tall: `/img/cases/tall/${def.slug}.webp`, full: `/img/cases/full/${def.slug}.webp` },
    rtp: Math.round((realEv / def.price) * 10_000),
    payback: pct((i) => i.price >= def.price),
    bestToday: null,
    items: caseItems,
    odds,
    oddsVersion: 1,
    kurwadrop,
    topDrops,
    // all-time opens: about half a year of the daily rate, stable per case
    opens: opens24h * (150 + (hashStr(`${def.slug}:opens`) % 250)),
  }
}

// Three cases with contents and odds modelled on CSGOGem (scripts/import-gem-cases.py), under our own names
type GemCase = { slug: string; price: number; items: Array<Item & { tickets: number }> }
const GEM_LOOK: Record<string, Omit<CaseDef, 'price' | 'targetRtp' | 'preset'>> = {
  hades: { id: 'g1', slug: 'pieklo', name: 'Piekło', image: '/img/cases/pieklo.webp', risk: 'extreme', tag: 'hot', createdAt: '2026-10-18' },
  spring: { id: 'g2', slug: 'wiosna', name: 'Wiosna', image: '/img/cases/wiosna.webp', risk: 'high', createdAt: '2026-10-19' },
  mobster: { id: 'g3', slug: 'mafia', name: 'Mafia', image: '/img/cases/mafia.webp', risk: 'extreme', tag: 'new', createdAt: '2026-10-20' },
}
const GEM_DEFS: CaseDef[] = (GEM_CASES as GemCase[]).map((g) => ({ ...GEM_LOOK[g.slug]!, price: g.price, targetRtp: 9200, preset: g.items }))

const CASES: CaseDetails[] = [...CASE_DEFS, ...GEM_DEFS].map(buildCase)

// --- Big wins of the day (seeded, then the user's own big drops join) -------------------------------

const WINNERS = [
  { nickname: 'pierogi_king', level: 27 },
  { nickname: 'babcia99', level: 21 },
  { nickname: 'zlotyboy', level: 9 },
  { nickname: 'ez_drop', level: 33 },
  { nickname: 'krakow_kid', level: 8 },
]
const bigWins: BigWin[] = []
let winSeq = 0
export function pushBigWin(cs: Pick<CaseDetails, 'slug' | 'name' | 'image'>, item: Item, cost: number, who: { nickname: string; level: number; avatar?: string }, at = new Date()) {
  winSeq += 1
  const multiplier = Math.floor(item.price / Math.max(1, cost))
  bigWins.push({ id: `w${winSeq}`, nickname: who.nickname, avatar: who.avatar ?? '/img/brand/avatar.webp', level: who.level, item, caseSlug: cs.slug, caseName: cs.name, caseImage: cs.image, cost, multiplier, at: at.toISOString() })
  const c = CASES.find((x) => x.slug === cs.slug)
  if (c && multiplier >= 5 && multiplier > (c.bestToday ?? 0)) c.bestToday = multiplier
  // the player's own big drop joins this case's 7-day top
  if (c) {
    c.topDrops = [...c.topDrops, { item, nickname: who.nickname, multiplier: Math.round((item.price / Math.max(1, cost)) * 10) / 10, at: at.toISOString() }]
      .sort((a, b) => b.multiplier - a.multiplier)
      .slice(0, 8)
  }
}
// Every case gets a notable drop from its top items earlier today; three become the day's big wins
CASES.forEach((cs, k) => {
  const top = cs.items.filter((i) => i.price >= cs.price * 5)
  if (!top.length) return
  const { tickets: _t, ticketFrom: _f, ticketTo: _to, ...item } = top[(k * 7) % top.length]!
  pushBigWin(cs, item, cs.price, WINNERS[k % WINNERS.length]!, new Date(Date.now() - (k + 1) * 47 * 60_000))
})
// Not only cases: a few long-shot upgrades and PvP wins made the day too
const UPGRADE_SRC = { slug: 'upgrade', name: 'Upgrade', image: '' }
const PVP_SRC = { slug: 'pvp', name: 'PvP battle', image: '' }
;[
  { src: UPGRADE_SRC, rank: 2, x: 312, h: 1.5 },
  { src: PVP_SRC, rank: 6, x: 96, h: 3.2 },
  { src: UPGRADE_SRC, rank: 14, x: 41, h: 7 },
  { src: PVP_SRC, rank: 20, x: 22, h: 9.5 },
].forEach(({ src, rank, x, h }, k) => {
  const item = CATALOG[rank]!
  pushBigWin(src, item, +(item.price / x).toFixed(2), WINNERS[(k + 2) % WINNERS.length]!, new Date(Date.now() - h * 3600_000))
})

export function getBigWins() {
  const dayAgo = Date.now() - 24 * 3600_000
  return { wins: bigWins.filter((w) => Date.parse(w.at) > dayAgo).sort((a, b) => b.multiplier - a.multiplier).slice(0, 6) }
}

const toSummary = ({ items: _i, odds: _o, oddsVersion: _v, kurwadrop: _k, ...s }: CaseDetails): CaseSummary => ({ ...s })

// --- Home layout (an admin setting): rows in order, their scenes, each case's card ----------------------------

const DEFAULT_HOME_LAYOUT: HomeLayout = {
  sections: [
    { id: 'hot', title: 'Hot right now' },
    { id: 'weekly', title: 'Weekly picks', theme: 'coop' },
    { id: 'featured', title: 'Featured cases' },
    { id: 'polish-classics', title: 'Polish classics' },
  ],
  cards: { mafia: 'full', 'babcias-box': 'full', 'vodka-drop': 'full' },
}
let homeLayout: HomeLayout = structuredClone(DEFAULT_HOME_LAYOUT)

export const getHomeLayout = () => ({ layout: homeLayout })
export function resetHomeLayout() {
  homeLayout = structuredClone(DEFAULT_HOME_LAYOUT)
  return getHomeLayout()
}
/** Takes the admin's layout as far as it makes sense: known rows only (any left out go to the end), known kinds only */
export function setHomeLayout(next: Partial<HomeLayout>) {
  const known = DEFAULT_HOME_LAYOUT.sections
  const rows = (next.sections ?? []).filter((r, i, all) => known.some((k) => k.id === r.id) && all.findIndex((o) => o.id === r.id) === i)
  const sections = [...rows, ...known.filter((k) => !rows.some((r) => r.id === k.id))].map((r) => {
    const base = known.find((k) => k.id === r.id)!
    return { id: r.id, title: base.title, hidden: !!r.hidden || undefined, theme: r.theme === 'coop' ? ('coop' as const) : null }
  })
  const KINDS: string[] = ['full', 'wide', 'tall']
  const cards = Object.fromEntries(
    Object.entries(next.cards ?? {}).filter(([slug, kind]) => CASES.some((c) => c.slug === slug) && KINDS.includes(kind)),
  ) as HomeLayout['cards']
  homeLayout = { sections, cards }
  return getHomeLayout()
}

export function getCaseSections(): CaseSection[] {
  const all = CASES.map(toSummary).map((c) => {
    const card = homeLayout.cards[c.slug]
    return card && card !== 'standard' ? { ...c, card } : c
  })
  const pick = (slugs: string[]) => slugs.map((s) => all.find((c) => c.slug === s)!)
  const rows: Record<string, () => CaseSection> = {
    hot: () => ({ id: 'hot', title: 'Hot right now', cases: pick(['pieklo', 'mafia', 'wiosna']) }),
    weekly: () => weeklyPicks(all),
    featured: () => ({ id: 'featured', title: 'Featured cases', cases: all.filter((c) => !['pieklo', 'mafia', 'wiosna'].includes(c.slug)) }),
    'polish-classics': () => ({ id: 'polish-classics', title: 'Polish classics', cases: pick(['babcias-box', 'vodka-drop', 'golden-kielbasa', 'kurwa-classic', 'pierogi-pack']) }),
  }
  return homeLayout.sections
    .filter((r) => !r.hidden)
    .map((r) => {
      const row = rows[r.id]!()
      return r.theme ? { ...row, theme: r.theme } : row
    })
}

// Weekly picks (#36, Casehug's "new bestsellers in 6d"): five cases that change every Monday 00:00 UTC,
// with the clock to the next set on the header
function weeklyPicks(all: CaseSummary[]): CaseSection {
  const WEEK_MS = 7 * 86_400_000
  const ORIGIN = Date.UTC(1970, 0, 5)
  const week = Math.floor((Date.now() - ORIGIN) / WEEK_MS)
  const cases = [...all].sort((a, b) => hashStr(`${a.slug}:${week}`) - hashStr(`${b.slug}:${week}`)).slice(0, 5)
  return { id: 'weekly', title: 'Weekly picks', cases, endsAt: new Date(ORIGIN + (week + 1) * WEEK_MS).toISOString() }
}

export function getCase(slug: string): CaseDetails {
  if (slug === DAILY_SLUG) return dailyCase()
  if (slug === WELCOME_SLUG) return welcomeCase()
  const found = CASES.find((c) => c.slug === slug)
  if (!found) throw new MockError(404, 'Case not found')
  return found
}

// --- State ---------------------------------------------------------------

const DEFAULT_USER: User = {
  id: 'u1',
  nickname: 'Nickname',
  avatar: '/img/brand/avatar.webp',
  steamId: '76561198000004821',
  level: 12,
  levelProgress: 64,
  balance: 2_500_000,
  skinsValue: 0,
  tradeUrl: null,
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
  createdAt: string
}

interface MockState {
  user: User
  inventory: InventoryItem[]
  seed: SeedState
  previousSeed: (SeedState & { serverSeed: string }) | null
  /** Every revealed pair, newest first */
  seedHistory: Array<SeedState & { rotatedAt: string; clientChanged: boolean }>
  feedPaused: boolean
  /** Drops pushed from /debug or by the user's own opens, served before random ones */
  queuedDrops: FeedDrop[]
  history: HistoryEntry[]
  /** XP inside the current level (coin cents spent) */
  xp: number
  /** When the daily case unlocks again (ms), 0 = now */
  dailyAt: number
  /** Free welcome cases still to open */
  welcomeLeft: number
  promoUsed: string[]
}

/** Free welcome cases a new player gets (admin-configured on the backend) */
export const WELCOME_TOTAL = 3

/** XP (coin cents spent) for the next level: grows with the level, 25 coins at level 1, ~205 at level 12 */
export const xpFor = (level: number) => 2500 + level * 1500

const state: MockState = {
  user: structuredClone(DEFAULT_USER),
  inventory: STARTER_INVENTORY.map((id) => toInventory(byId(id), 'case')),
  seed: { serverSeed: '', serverSeedHash: '', clientSeed: randomSeed(5), nonce: 0, createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  previousSeed: null,
  seedHistory: [],
  feedPaused: false,
  queuedDrops: [],
  history: [],
  xp: Math.round((DEFAULT_USER.levelProgress / 100) * xpFor(DEFAULT_USER.level)),
  dailyAt: 0,
  welcomeLeft: WELCOME_TOTAL,
  promoUsed: [],
}

// --- Debug: forced outcomes (prototype only; breaks provable fairness on purpose) -----------

export type ForcedCase = { rarity?: Rarity; itemId?: string; kurwa?: boolean }
export type ForcedUpgrade = 'win' | 'lose' | 'edge-win' | 'edge-lose' | 'near-win' | 'near-lose' | null
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
export function record(e: Omit<HistoryEntry, "id" | "at">) {
  historySeq += 1
  state.history.unshift({ id: `h${historySeq}`, at: new Date().toISOString(), ...e })
  state.history.splice(200)
}

export async function getHistory() {
  await ensureSeed()
  return { entries: state.history }
}

async function freshServerSeed() {
  const serverSeed = randomSeed(32)
  return { serverSeed, serverSeedHash: await sha256Hex(serverSeed) }
}

let seedReady: Promise<void> | null = null
async function ensureSeed() {
  seedReady ??= (async () => {
    Object.assign(state.seed, await freshServerSeed())
    // A couple of past rotations, so the history has something to show on first look
    const day = 86_400_000
    for (const [from, to, rolls, client] of [[9, 2, 37, true], [15, 9, 112, false]] as const) {
      state.seedHistory.push({
        ...(await freshServerSeed()),
        clientSeed: randomSeed(5),
        nonce: rolls,
        createdAt: new Date(Date.now() - from * day).toISOString(),
        rotatedAt: new Date(Date.now() - to * day).toISOString(),
        clientChanged: client,
      })
    }
    // A few past rows so the history is not empty on first look: real rolls 1–3 of the active pair
    const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
    const { serverSeed, serverSeedHash: seedHash, clientSeed } = state.seed
    const ticket = async (n: number) => (await pfTicket(serverSeed, clientSeed, n)).ticket
    state.history.push(
      { id: 'h-s1', at: ago(12), game: 'upgrade', title: 'AWP | Asiimov', bet: 6300, payout: 12000, status: 'won', nonce: 3, seedHash, roll: (await pfRoll(serverSeed, clientSeed, 3)).roll },
      { id: 'h-s2', at: ago(40), game: 'case', title: 'Kurwa Classic', bet: 1250, payout: 420, status: 'lost', nonce: 2, seedHash, ticket: await ticket(2), drop: 'P250 | Asiimov' },
      { id: 'h-s3', at: ago(41), game: 'case', title: 'Kurwa Classic', bet: 1250, payout: 2200, status: 'won', nonce: 1, seedHash, ticket: await ticket(1), drop: 'AK-47 | Redline' },
      { id: 'h-s4', at: ago(65), game: 'deposit', title: 'BLIK', bet: 0, payout: 5727, status: 'done' },
    )
    state.seed.nonce = 3
  })()
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
  state.xp = Math.round((DEFAULT_USER.levelProgress / 100) * xpFor(DEFAULT_USER.level))
  state.dailyAt = 0
  state.welcomeLeft = WELCOME_TOTAL
  state.inventory = STARTER_INVENTORY.map((id) => toInventory(byId(id), 'case'))
  syncSkinsValue()
}

export function spend(amount: number) {
  if (state.user.balance < amount) throw new MockError(402, 'Not enough balance')
  state.user.balance -= amount
  addXp(amount)
}

// --- Promo codes ------------------------------------------------------------------

/** Demo codes; the real ones live in the admin panel */
const PROMO: Record<string, number> = { KURWA: 500, WELCOME: 250, PIEROGI: 100 }
export function redeemPromo(code: string) {
  const c = String(code ?? '').trim().toUpperCase()
  const amount = PROMO[c]
  if (!amount) throw new MockError(400, 'This code does not exist')
  if (state.promoUsed.includes(c)) throw new MockError(400, 'You have already used this code')
  state.promoUsed.push(c)
  state.user.balance += amount
  record({ game: 'deposit', title: `Promo ${c}`, bet: 0, payout: amount, status: 'done' })
  return { balance: state.user.balance, credited: amount }
}

/** Spending earns XP; xpFor(level) of it makes the next level */
export function addXp(amount: number) {
  state.xp += amount
  while (state.xp >= xpFor(state.user.level)) {
    state.xp -= xpFor(state.user.level)
    state.user.level += 1
  }
  state.user.levelProgress = Math.floor((state.xp / xpFor(state.user.level)) * 100)
}

const ownedItems = () => state.inventory.filter((i) => i.status === 'owned')

// --- Seeds / provably fair ------------------------------------------------

export async function getSeeds() {
  await ensureSeed()
  const { serverSeedHash, clientSeed, nonce, createdAt } = state.seed
  const history = state.seedHistory.map((h) => ({
    serverSeedHash: h.serverSeedHash,
    clientSeed: h.clientSeed,
    nonce: h.nonce,
    serverSeed: h.serverSeed,
    createdAt: h.createdAt,
    rotatedAt: h.rotatedAt,
    clientChanged: h.clientChanged,
  }))
  return { active: { serverSeedHash, clientSeed, nonce, createdAt }, previous: history[0] ?? null, history }
}

export async function rotateSeeds(clientSeed?: string) {
  await ensureSeed()
  state.previousSeed = { ...state.seed }
  const next = clientSeed?.trim() || randomSeed(5)
  const now = new Date().toISOString()
  state.seedHistory.unshift({ ...state.seed, rotatedAt: now, clientChanged: !!clientSeed?.trim() && next !== state.seed.clientSeed })
  Object.assign(state.seed, await freshServerSeed(), { nonce: 0, clientSeed: next, createdAt: now })
  return getSeeds()
}

const publicSeed = () => ({ serverSeedHash: state.seed.serverSeedHash, clientSeed: state.seed.clientSeed, nonce: state.seed.nonce })

// --- Cases: open / sell -----------------------------------------------------

export async function openCase(slug: string, count: number, demo: boolean, kurwadrop = false) {
  if (slug === DAILY_SLUG) throw new MockError(400, 'Open the daily case from Bonuses')
  if (slug === WELCOME_SLUG) throw new MockError(400, 'Open the welcome cases from Bonuses')
  await ensureSeed()
  const cs = getCase(slug)
  const n = Math.min(5, Math.max(1, Math.floor(count)))
  const price = kurwadrop ? cs.kurwadrop.price : cs.price
  // a limited case: the stock must cover every case of the open (x1…x5); demo spins never spend it
  if (!demo && cs.limited && cs.limited.left < n) throw new MockError(409, cs.limited.left ? `Only ${cs.limited.left} left` : 'Sold out')
  if (!demo) spend(price * n)
  if (!demo) {
    cs.opens += n
    if (cs.limited) cs.limited = { ...cs.limited, left: cs.limited.left - n }
  }
  return roll(cs, n, demo, kurwadrop, price)
}

async function roll(cs: CaseDetails, n: number, demo: boolean, kurwadrop: boolean, price: number) {
  const slug = cs.slug

  const pool = cs.items.filter((i) => cs.kurwadrop.poolIds.includes(i.id))

  const drops: InventoryItem[] = []
  const kurwa: boolean[] = []
  const rolls: PfRoll[] = []
  for (let k = 0; k < n; k++) {
    // Demo spins use a throwaway seed so they never move the real nonce
    const nonce = demo ? k : ++state.seed.nonce
    const serverSeed = demo ? randomSeed(16) : state.seed.serverSeed
    const forced = takeForcedCase(cs, k)
    const { ticket } = await pfTicket(serverSeed, state.seed.clientSeed, nonce)
    // Debug "chicken" forces a top item; otherwise the one normal roll decides
    let picked: CaseItem = forced?.kurwa && !forced.item ? pool[Math.floor(Math.random() * pool.length)]! : (forced?.item ?? pickByTicket(cs.items, ticket))
    if (forced?.kurwa && forced.item && !pool.some((p) => p.id === forced.item!.id)) picked = pool[0]!
    // KURWADROP is presentation only: a top drop arrives through the Golden Chicken and a second spin
    const hit = kurwadrop && pool.some((p) => p.id === picked.id)
    const { tickets: _t, ticketFrom: _f, ticketTo: _to, ...item } = picked
    const inv = toInventory(item, 'case')
    if (!demo) {
      if (price > 0 && item.price >= price * 10) pushBigWin(cs, item, price, state.user)
      state.inventory.unshift(inv)
      state.queuedDrops.push(makeDrop({ ...item, itemName: item.weapon, skinName: item.skin, caseSlug: slug, caseName: cs.name, casePrice: price || cs.price, userNickname: state.user.nickname }))
    }
    drops.push(inv)
    kurwa.push(hit)
    rolls.push({ nonce, ticket })
  }
  if (!demo) {
    drops.forEach((d, k) =>
      record({ game: 'case', title: cs.name, bet: price, payout: d.price, status: d.price >= price ? 'won' : 'lost', nonce: rolls[k]!.nonce, seedHash: state.seed.serverSeedHash, ticket: rolls[k]!.ticket, drop: `${d.weapon} | ${d.skin}` }),
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

export const TRADE_URL_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]{6,}$/
export function setTradeUrl(url: string) {
  const v = String(url ?? '').trim()
  if (!TRADE_URL_RE.test(v)) throw new MockError(400, 'This is not a Steam trade link')
  state.user.tradeUrl = v
  return { tradeUrl: v }
}

let offerSeq = 4800
/** Sends the skins in one trade offer (the real backend goes through the bot inventory). */
export function withdrawItems(uids: string[]) {
  if (!state.user.tradeUrl) throw new MockError(400, 'Add your Steam trade link first')
  const items = state.inventory.filter((it) => uids.includes(it.uid) && it.status === 'owned')
  if (!items.length) throw new MockError(400, 'Choose skins to withdraw')
  for (const it of items) {
    it.status = 'withdrawn'
    record({ game: 'withdraw', title: `${it.weapon} | ${it.skin}`, bet: 0, payout: it.price, status: 'done' })
  }
  syncSkinsValue()
  offerSeq += 1
  const now = Date.now()
  return {
    withdrawn: items.map((i) => i.uid),
    offer: { id: `${7_100_000_000 + offerSeq}`, sentAt: new Date(now).toISOString(), expiresAt: new Date(now + 15 * 60_000).toISOString() },
  }
}

export function getInventory() {
  return { items: ownedItems() }
}

// --- Bonuses: the daily case and the welcome cases --------------------------------------------

export const DAILY_SLUG = 'daily'
const DAILY_TIERS = [
  ['mp9-wild-lily', 'p250-asiimov', 'glock-water-elemental', 'm4a1-hyper-beast', 'ak-redline', 'usp-kill-confirmed'],
  ['p250-asiimov', 'glock-water-elemental', 'm4a1-hyper-beast', 'ak-redline', 'usp-kill-confirmed', 'awp-asiimov'],
  ['glock-water-elemental', 'm4a1-hyper-beast', 'ak-redline', 'usp-kill-confirmed', 'awp-asiimov', 'awp-wildfire', 'ak-vulcan'],
  ['m4a1-hyper-beast', 'ak-redline', 'usp-kill-confirmed', 'awp-asiimov', 'awp-wildfire', 'ak-vulcan', 'sport-omega'],
]
const dailyTier = () => Math.min(DAILY_TIERS.length - 1, Math.floor(state.user.level / 5) - 1 < 0 ? 0 : Math.floor(state.user.level / 5) - 1)
const dailyCache = new Map<number, CaseDetails>()
/** Free once a day; worth ~0.5 coin per level band and pays it all back on average (RTP 100%). */
function dailyCase(): CaseDetails {
  const tier = dailyTier()
  let cs = dailyCache.get(tier)
  if (!cs) {
    cs = buildCase({
      id: `daily-${tier}`,
      slug: DAILY_SLUG,
      name: 'Babcia’s Daily',
      image: '/img/cases/babcias-box.webp',
      price: 150 * (tier + 1) ** 2,
      risk: 'low',
      targetRtp: 10_000,
      createdAt: '2026-10-01',
      itemIds: DAILY_TIERS[tier]!,
    })
    dailyCache.set(tier, cs)
  }
  return cs
}

// Welcome cases: three free opens for signing up, real drops from a cheap case that pays back on average
// (RTP 100%, the daily case's first-tier items). The count lives in the admin panel.
export const WELCOME_SLUG = 'welcome'
let welcomeCache: CaseDetails | null = null
function welcomeCase(): CaseDetails {
  welcomeCache ??= buildCase({
    id: 'welcome',
    slug: WELCOME_SLUG,
    name: 'Welcome Pack',
    image: '/img/cases/kurwa-classic.webp',
    price: 150,
    risk: 'low',
    targetRtp: 10_000,
    createdAt: '2026-10-01',
    itemIds: DAILY_TIERS[0]!,
  })
  return welcomeCache
}

export async function openWelcome() {
  if (state.welcomeLeft <= 0) throw new MockError(409, 'No welcome cases left')
  await ensureSeed()
  state.welcomeLeft -= 1
  return roll(welcomeCase(), 1, false, false, 0)
}

export function getBonuses() {
  return {
    daily: { case: dailyCase(), tier: dailyTier(), nextAt: state.dailyAt > Date.now() ? new Date(state.dailyAt).toISOString() : null },
    welcome: { case: welcomeCase(), left: state.welcomeLeft, total: WELCOME_TOTAL },
  }
}

export async function openDaily() {
  if (state.dailyAt > Date.now()) throw new MockError(409, 'The daily case is not ready yet')
  await ensureSeed()
  state.dailyAt = Date.now() + 24 * 3600_000
  return roll(dailyCase(), 1, false, false, 0)
}

// --- Upgrade ----------------------------------------------------------------

/** House edge for upgrades: 5%, max chance 80% (shared/upgrade.ts). Chance in basis points. */
export function upgradeChance(inputValue: number, targetPrice: number) {
  return upgradeChanceBp(inputValue, targetPrice)
}

/** The market lists every real skin once: the CS2 base and the csgogem case items overlap under different ids
 * (case contents keep resolving by either id through CATALOG). */
const MARKET: Item[] = (() => {
  const seen = new Set<string>()
  return CATALOG.filter((i) => {
    const k = `${i.weapon}|${i.skin}|${i.wear}|${i.statTrak ? 1 : 0}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
})()
export function getMarket() {
  return { items: MARKET }
}

export async function upgrade(itemUids: string[], balanceAmount: number, targetItemId: string) {
  await ensureSeed()
  const target = byId(targetItemId)
  if (!target) throw new MockError(404, 'Item not found')
  const items = ownedItems().filter((i) => itemUids.includes(i.uid))
  const extra = Math.max(0, Math.floor(balanceAmount))
  const input = items.reduce((a, i) => a + i.price, 0) + extra
  if (input <= 0) throw new MockError(400, 'Choose skins or add balance')
  if (items.length + (extra > 0 ? 1 : 0) > 6) throw new MockError(400, 'An upgrade takes up to 6 items')
  if (target.price <= input) throw new MockError(400, 'Pick a skin worth more than your stake')
  const chance = upgradeChance(input, target.price)
  if (chance < 100) throw new MockError(400, 'Chance is below 1%')

  spend(extra)
  addXp(items.reduce((a, i) => a + i.price, 0))
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
  // near: within 3 points of the edge
  if (f === 'near-win') roll = +Math.max(0, c - 0.6 - Math.random() * 2).toFixed(2)
  if (f === 'near-lose') roll = +Math.min(99.99, c + 0.6 + Math.random() * 2).toFixed(2)
  const win = roll * 100 < chance
  const won = win ? toInventory(target, 'upgrade') : null
  if (won) {
    state.inventory.unshift(won)
    if (target.price >= input * 10) pushBigWin({ slug: 'upgrade', name: 'Upgrade', image: '' }, target, input, state.user)
    state.queuedDrops.push(makeDrop({ ...target, itemName: target.weapon, skinName: target.skin, caseSlug: 'upgrade', caseName: 'Upgrade', casePrice: input, userNickname: state.user.nickname }))
  }
  record({ game: 'upgrade', title: `${target.weapon} | ${target.skin}`, bet: input, payout: win ? target.price : 0, status: win ? 'won' : 'lost', nonce, seedHash: state.seed.serverSeedHash, chance, roll, targetPrice: target.price })
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
  // The strip mixes games: mostly case drops, some upgrade wins (a pricier skin for a stake) and PvP wins
  const r = Math.random()
  if (!overrides.caseSlug && r < 0.25) {
    const up = r < 0.15
    const skin = up ? CATALOG[Math.floor(Math.random() * Math.min(CATALOG.length, 160))]! : it
    const chance = up ? 0.08 + Math.random() * 0.6 : 0
    return makeDrop({
      ...skin,
      itemName: skin.weapon,
      skinName: skin.skin,
      caseSlug: up ? 'upgrade' : 'pvp',
      caseName: up ? 'Upgrade' : `PvP · ${cs.name}`,
      // PvP: the winner takes everyone's drops for one entry, so a 2–4 player battle pays a few times the case
      casePrice: up ? +(skin.price * chance).toFixed(2) : +(cs.price * (0.6 + Math.random() * 0.4)).toFixed(2),
      ...overrides,
    })
  }
  return {
    id: `d${dropSeq}`,
    itemName: it.weapon,
    skinName: it.skin,
    rarity: it.rarity,
    image: it.image,
    price: it.price,
    caseSlug: cs.slug,
    caseName: cs.name,
    casePrice: cs.price,
    userNickname: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]!,
    userAvatar: '/img/brand/avatar.webp',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeDropOfRarity(rarity: Rarity): FeedDrop {
  const it = CATALOG.find((i) => i.rarity === rarity) ?? CATALOG[0]!
  return makeDrop({ itemName: it.weapon, skinName: it.skin, rarity, image: it.image, price: it.price })
}

for (let i = 0; i < 24; i++) feed.unshift(makeDrop())
// Today's big wins are in the feed too, so Top and the highlight have something worth showing
bigWins
  .slice()
  .sort((x, y) => y.multiplier - x.multiplier)
  .slice(0, 4)
  .forEach((w, k) =>
    feed.splice(3 + k * 5, 0, makeDrop({ itemName: w.item.weapon, skinName: w.item.skin, rarity: w.item.rarity, image: w.item.image, price: w.item.price, caseSlug: w.caseSlug, caseName: w.caseName, casePrice: w.cost, userNickname: w.nickname })),
  )

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
  const mult = (d: FeedDrop) => d.price / Math.max(1, d.casePrice)
  const highlight = drops.reduce<FeedResponse['highlight']>((best, d) => (!best || mult(d) > mult(best) ? d : best), null)
  return { drops, highlight }
}

// --- Debug controls (used by /debug) ---------------------------------------

export interface DebugStateBody {
  user?: Partial<Pick<User, 'balance' | 'level' | 'levelProgress' | 'nickname'>>
  resetUser?: boolean
  feedPaused?: boolean
  pushDrop?: Rarity
  resetDaily?: boolean
  /** Give the three welcome cases back */
  resetWelcome?: boolean
  /** 'empty' clears the inventory; 'loaded' adds 12 skins from across the price range */
  inventory?: 'empty' | 'loaded'
  /** Push n random drops (with a couple of big ones) into the live feed at once */
  feedBurst?: number
  /** Levels gained at once (the level-up plate shows) */
  levels?: number
}

export function applyDebugState(body: DebugStateBody) {
  if (body.resetUser) resetMockUser()
  if (body.user) Object.assign(state.user, body.user)
  if (typeof body.feedPaused === 'boolean') state.feedPaused = body.feedPaused
  if (body.pushDrop) state.queuedDrops.push(makeDropOfRarity(body.pushDrop))
  if (body.resetDaily) state.dailyAt = 0
  if (body.resetWelcome) state.welcomeLeft = WELCOME_TOTAL
  if (body.inventory === 'empty') for (const i of state.inventory) if (i.status === 'owned') i.status = 'sold'
  if (body.inventory === 'loaded') for (let k = 0; k < 12; k++) state.inventory.unshift(toInventory(CATALOG[Math.floor((k / 12) * CATALOG.length)]!, 'case'))
  if (body.levels) {
    state.user.level += body.levels
    state.user.levelProgress = 5
  }
  if (body.feedBurst) {
    for (let k = 0; k < body.feedBurst; k++) state.queuedDrops.push(k % 5 === 4 ? makeDropOfRarity(k % 10 === 9 ? 'gold' : 'covert') : makeDrop())
  }
  syncSkinsValue()
  return { user: state.user, feedPaused: state.feedPaused }
}
