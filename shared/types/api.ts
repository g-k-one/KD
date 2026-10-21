/**
 * API contract between the Nuxt prototype and the Go backend.
 * Mock implementation lives in server/api. Keep this file in sync with the OpenAPI spec.
 *
 * Money: every amount is an integer number of coin cents (1 coin = 100). Never floats.
 */

export type Rarity = 'covert' | 'classified' | 'restricted' | 'milspec' | 'industrial' | 'gold'

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type CaseTag = 'new' | 'hot'

export interface CaseSummary {
  id: string
  slug: string
  name: string
  image: string
  price: number
  risk: RiskLevel
  tag?: CaseTag
  /** Return to player, basis points (9240 = 92.40%). Configured in the admin panel. */
  rtp: number
  createdAt: string
}

export interface CaseSection {
  id: string
  title: string
  cases: CaseSummary[]
}

export interface CasesResponse {
  sections: CaseSection[]
}

export interface User {
  id: string
  nickname: string
  avatar: string
  steamId: string
  level: number
  /** 0..100 progress to the next level */
  levelProgress: number
  balance: number
  skinsValue: number
}

export interface MeResponse {
  user: User | null
}

export interface FeedDrop {
  id: string
  itemName: string
  skinName: string
  rarity: Rarity
  image: string
  price: number
  caseSlug: string
  userNickname: string
  createdAt: string
}

export interface FeedResponse {
  drops: FeedDrop[]
  /** Highest-value recent drop, shown pinned at the start of the feed */
  highlight: FeedDrop | null
}

// --- Items -------------------------------------------------------------

export type Wear = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'

export interface Item {
  id: string
  weapon: string
  skin: string
  rarity: Rarity
  wear: Wear
  statTrak?: boolean
  image: string
  price: number
}

/** An item owned by the user. `uid` is unique per copy. */
export interface InventoryItem extends Item {
  uid: string
  acquiredAt: string
  /** Where it came from, for history and the "Sold" badge on results */
  source: 'case' | 'upgrade'
  status: 'owned' | 'sold' | 'used'
}

// --- Case page -----------------------------------------------------------

export interface CaseItem extends Item {
  /** Drop chance in tickets out of PF_TICKETS (1 000 000). */
  tickets: number
  /** Inclusive ticket range owned by this item, assigned in list order. */
  ticketFrom: number
  ticketTo: number
}

export interface CaseOdds {
  /** Chances to get back less than the price, ≥2×, ≥3×, ≥5×, ≥10×. Basis points. */
  below1x: number
  x2: number
  x3: number
  x5: number
  x10: number
}

export interface CaseDetails extends CaseSummary {
  items: CaseItem[]
  odds: CaseOdds
  /** Version of the odds table committed into the seed hash (see fairness page). */
  oddsVersion: number
  kurwadrop: KurwadropInfo
}

/**
 * KURWADROP option: a Golden Chicken joins the case. Landing on it triggers a second roll
 * among the expensive items only. The option price is set so the RTP stays the same:
 * price = case price × (EV with the chicken) / (EV without it).
 *
 * PF: roll 1 is the normal ticket. Tickets 1…chickenTickets are the chicken; anything above is
 * rescaled onto the normal table: ceil((ticket − chickenTickets) × 1 000 000 / (1 000 000 − chickenTickets)).
 * Roll 2 (chicken only) uses client seed + ":kurwadrop" with the same nonce, mapped onto the pool's
 * tickets rescaled to 1 000 000.
 */
export interface KurwadropInfo {
  /** Open price with the option on, coin cents */
  price: number
  /** Chicken share out of PF_TICKETS */
  chickenTickets: number
  /** Item ids the second roll picks from (price ≥ 3× case price, at least the top 3) */
  poolIds: string[]
}

export interface CaseResponse {
  case: CaseDetails
}

export interface OpenCaseRequest {
  count: 1 | 2 | 3 | 4 | 5
  demo?: boolean
  kurwadrop?: boolean
}

export interface PfRoll {
  nonce: number
  ticket: number
}

export interface OpenCaseResponse {
  drops: InventoryItem[]
  /** Per drop: true when roll 1 hit the Golden Chicken and the drop came from the respin */
  kurwa: boolean[]
  rolls: PfRoll[]
  balance: number
  seed: SeedPairPublic
}

// --- Inventory / wallet -------------------------------------------------

export interface InventoryResponse {
  items: InventoryItem[]
}

export interface SellRequest {
  uids: string[]
}

export interface SellResponse {
  sold: string[]
  balance: number
}

// --- Upgrade --------------------------------------------------------------

export interface MarketResponse {
  items: Item[]
}

export interface UpgradeRequest {
  itemUids: string[]
  /** Extra coins added from balance, coin cents */
  balanceAmount: number
  targetItemId: string
}

export interface UpgradeResponse {
  win: boolean
  /** 0.00–100.00 roll, win if roll < chance */
  roll: number
  /** Chance in basis points (7200 = 72.00%) */
  chance: number
  item: InventoryItem | null
  balance: number
  nonce: number
  seed: SeedPairPublic
}

// --- Provably fair --------------------------------------------------------

export interface SeedPairPublic {
  serverSeedHash: string
  clientSeed: string
  nonce: number
}

export interface SeedsResponse {
  active: SeedPairPublic
  /** Last revealed pair, after a rotation */
  previous: (SeedPairPublic & { serverSeed: string }) | null
}

// --- Deposit --------------------------------------------------------------

export type FiatCurrency = 'PLN' | 'EUR' | 'USD'

export interface PaymentMethod {
  id: string
  name: string
  logo: string
  /** Coin cents bonus in basis points, e.g. 500 = +5% */
  bonusBp: number
  min: number
  max: number | null
}

export interface DepositQuote {
  amount: number
  currency: FiatCurrency
  coins: number
  methodBonus: number
  promoBonus: number
  total: number
}

export interface DepositRequest {
  methodId: string
  amount: number
  currency: FiatCurrency
  promoCode?: string
}

export interface DepositResponse {
  credited: number
  balance: number
}

export interface PromoResponse {
  code: string
  bonusBp: number
}

// --- History --------------------------------------------------------------

export type HistoryGame = 'case' | 'upgrade' | 'deposit' | 'sell'

export interface HistoryEntry {
  id: string
  at: string
  game: HistoryGame
  /** Case name, upgrade target, payment method… */
  title: string
  bet: number
  payout: number
  status: 'won' | 'lost' | 'done'
  nonce?: number
}

export interface HistoryResponse {
  entries: HistoryEntry[]
}

// --- PvP battles ----------------------------------------------------------------

export type BattleStatus = 'waiting' | 'live' | 'finished'

export interface BattleCaseRef {
  slug: string
  name: string
  image: string
  price: number
}

export interface BattlePlayerRef {
  nickname: string
  avatar: string
  level: number
  bot?: boolean
  /** True for the signed-in user */
  you?: boolean
}

export interface BattleSlot {
  slot: number
  player: BattlePlayerRef | null
}

export interface BattleRoundResult {
  /** One drop per slot, in slot order */
  drops: Item[]
  tickets: number[]
}

export interface Battle {
  id: string
  /** Players in the battle: 2, 3 or 4 */
  size: number
  /** One entry per round, already expanded (a case ×2 appears twice) */
  rounds: BattleCaseRef[]
  /** What one seat costs */
  cost: number
  status: BattleStatus
  slots: BattleSlot[]
  /** Present once the battle is full: every round is rolled up front, the UI replays them */
  results: BattleRoundResult[] | null
  startedAt: string | null
  /** ms per round the client should use to replay */
  roundMs: number
  winnerSlot: number | null
  seed: { serverSeedHash: string; eosBlock: number | null; serverSeed: string | null }
  createdAt: string
}

export interface BattlesResponse {
  battles: Battle[]
}

export interface BattleResponse {
  battle: Battle
  balance?: number
}

export interface CreateBattleRequest {
  size: 2 | 3 | 4
  cases: Array<{ slug: string; qty: number }>
}
