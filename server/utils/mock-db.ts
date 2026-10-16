// In-memory mock backend state. Resets on dev server restart.
// Replaced by the Go backend later — nothing outside server/ should depend on this file.
import type { CaseSection, CaseSummary, FeedDrop, FeedResponse, Rarity, User } from '#shared/types/api'

export const SESSION_COOKIE = 'kd_session'

const cases: CaseSummary[] = [
  { id: 'c1', slug: 'pierogi-pack', name: 'Pierogi Pack', image: '/img/cases/pierogi-pack.png', price: 99, risk: 'low', tag: 'new', rtp: 9350, createdAt: '2026-10-10' },
  { id: 'c2', slug: 'kurwa-classic', name: 'Kurwa Classic', image: '/img/cases/kurwa-classic.png', price: 1250, risk: 'medium', rtp: 9240, createdAt: '2026-08-01' },
  { id: 'c3', slug: 'zloty-rush', name: 'Zloty Rush', image: '/img/cases/zloty-rush.png', price: 490, risk: 'high', tag: 'new', rtp: 9100, createdAt: '2026-10-12' },
  { id: 'c4', slug: 'babcias-box', name: 'Babcia’s Box', image: '/img/cases/babcias-box.png', price: 750, risk: 'medium', rtp: 9300, createdAt: '2026-07-15' },
  { id: 'c5', slug: 'warsaw-nights', name: 'Warsaw Nights', image: '/img/cases/warsaw-nights.png', price: 1250, risk: 'extreme', tag: 'new', rtp: 9240, createdAt: '2026-10-14' },
  { id: 'c6', slug: 'vodka-drop', name: 'Vodka Drop', image: '/img/cases/vodka-drop.png', price: 2900, risk: 'medium', rtp: 9200, createdAt: '2026-06-02' },
  { id: 'c7', slug: 'krakow-knife', name: 'Krakow Knife', image: '/img/cases/krakow-knife.png', price: 4900, risk: 'high', rtp: 9050, createdAt: '2026-05-20' },
  { id: 'c8', slug: 'golden-kielbasa', name: 'Golden Kielbasa', image: '/img/cases/golden-kielbasa.png', price: 9900, risk: 'extreme', rtp: 9000, createdAt: '2026-04-11' },
  { id: 'c9', slug: 'budget-boom', name: 'Budget Boom', image: '/img/cases/budget-boom.png', price: 14900, risk: 'low', rtp: 9400, createdAt: '2026-03-08' },
  { id: 'c10', slug: 'high-roller', name: 'High Roller', image: '/img/cases/high-roller.png', price: 29900, risk: 'high', tag: 'hot', rtp: 9150, createdAt: '2026-02-01' },
]

export function getCaseSections(): CaseSection[] {
  return [
    { id: 'featured', title: 'Featured cases', cases },
    { id: 'polish-classics', title: 'Polish classics', cases: [cases[3]!, cases[5]!, cases[7]!, cases[1]!, cases[0]!] },
  ]
}

const DEFAULT_USER: User = {
  id: 'u1',
  nickname: 'Nickname',
  avatar: '/img/brand/avatar.png',
  steamId: '76561198000004821',
  level: 12,
  levelProgress: 64,
  balance: 312540,
  skinsValue: 3100000,
}

interface MockState {
  user: User
  feedPaused: boolean
  /** Drops pushed from /debug, served before random ones */
  queuedDrops: FeedDrop[]
}

const state: MockState = {
  user: structuredClone(DEFAULT_USER),
  feedPaused: false,
  queuedDrops: [],
}

export function getMockState() {
  return state
}

export function resetMockUser() {
  state.user = structuredClone(DEFAULT_USER)
}

// --- Live feed ---------------------------------------------------------

const FEED_ITEMS: Array<Pick<FeedDrop, 'itemName' | 'skinName' | 'rarity' | 'image' | 'price'>> = [
  { itemName: 'Butterfly Knife', skinName: 'Fade', rarity: 'covert', image: '/img/items/butterfly-fade.png', price: 500000 },
  { itemName: 'Karambit', skinName: 'Fade', rarity: 'covert', image: '/img/items/karambit-fade.png', price: 820000 },
  { itemName: 'Sport Gloves', skinName: 'Vice', rarity: 'restricted', image: '/img/items/gloves-tiger.png', price: 61000 },
  { itemName: 'Specialist Gloves', skinName: 'Crimson Web', rarity: 'classified', image: '/img/items/gloves-crimson.png', price: 98000 },
  { itemName: 'AWP', skinName: 'Wildfire', rarity: 'milspec', image: '/img/items/awp-wildfire.png', price: 12000 },
  { itemName: 'AWP', skinName: 'Wildfire', rarity: 'gold', image: '/img/items/awp-wildfire.png', price: 15500 },
]

const NICKNAMES = ['pierogi_king', 'babcia99', 'zlotyboy', 'kurwa_pro', 'vodkashot', 'krakow_kid', 'ez_drop']

let dropSeq = 0
const feed: FeedDrop[] = []

export function makeDrop(overrides: Partial<FeedDrop> = {}): FeedDrop {
  const base = FEED_ITEMS[Math.floor(Math.random() * FEED_ITEMS.length)]!
  const c = cases[Math.floor(Math.random() * cases.length)]!
  dropSeq += 1
  return {
    id: `d${dropSeq}`,
    ...base,
    caseSlug: c.slug,
    userNickname: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]!,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeDropOfRarity(rarity: Rarity): FeedDrop {
  const pool = FEED_ITEMS.filter((i) => i.rarity === rarity)
  const base = pool[0] ?? FEED_ITEMS[0]!
  return makeDrop({ ...base, rarity })
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

// --- Debug controls (used by /debug) ------------------------------------

export interface DebugStateBody {
  user?: Partial<Pick<User, 'balance' | 'level' | 'levelProgress' | 'nickname' | 'skinsValue'>>
  resetUser?: boolean
  feedPaused?: boolean
  pushDrop?: Rarity
}

export function applyDebugState(body: DebugStateBody) {
  if (body.resetUser) resetMockUser()
  if (body.user) Object.assign(state.user, body.user)
  if (typeof body.feedPaused === 'boolean') state.feedPaused = body.feedPaused
  if (body.pushDrop) state.queuedDrops.push(makeDropOfRarity(body.pushDrop))
  return { user: state.user, feedPaused: state.feedPaused }
}
