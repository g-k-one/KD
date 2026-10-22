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
  /** Chance that one drop is worth at least the case price, basis points. Home sorts by it. */
  payback: number
  /** Biggest multiplier (drop price / case price) this case paid in the last 24 h; null if nothing notable */
  bestToday: number | null
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
  /** Grows with coins spent on cases, upgrades and battles (XP = coin cents spent) */
  level: number
  /** 0..100 progress to the next level */
  levelProgress: number
  balance: number
  skinsValue: number
  /** Steam trade offer link the skins are sent to; null until the player saves one */
  tradeUrl: string | null
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
  /** "upgrade" for upgrade wins */
  caseSlug: string
  caseName: string
  /** What the player paid: the case price, or the stake for an upgrade. Multiplier = price / casePrice. */
  casePrice: number
  userNickname: string
  userAvatar: string
  createdAt: string
}

export interface FeedResponse {
  drops: FeedDrop[]
  /** Recent drop with the biggest multiplier (price / casePrice), pinned at the start of the feed */
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
  status: 'owned' | 'sold' | 'used' | 'withdrawn'
}

// --- Case page -----------------------------------------------------------

export interface CaseItem extends Item {
  /** Drop chance in tickets out of PF_TICKETS (1 000 000). */
  tickets: number
  /** Inclusive ticket range owned by this item, assigned in list order. */
  ticketFrom: number
  ticketTo: number
  /** How many times this item dropped from this case in the last 24 h (all players) */
  drops24h: number
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
  /** Best drops from this case over the last 7 days by multiplier (drop price / case price), best first, ≤ 8 */
  topDrops: CaseTopDrop[]
  /** How many times this case has been opened, all time (social proof on the case page) */
  opens: number
}

export interface CaseTopDrop {
  item: Item
  nickname: string
  /** item.price / case price, one decimal */
  multiplier: number
  at: string
}

/**
 * KURWADROP option: presentation only — same odds, same price. When the roll lands on one of the top items
 * (poolIds), the reel first stops on the Golden Chicken, then spins again among the top items onto the drop.
 * PF is the normal single ticket.
 */
export interface KurwadropInfo {
  /** Open price with the option on: the same as the case price */
  price: number
  /** How often the chicken shows: the top items' tickets out of PF_TICKETS */
  chickenTickets: number
  /** Top items that arrive through the chicken (price ≥ 3× case price, at least the top 3) */
  poolIds: string[]
}

export interface CaseResponse {
  case: CaseDetails
}

/** Site-wide counters for the trust band on home. Counts, not coins. */
export interface StatsResponse {
  casesOpened: number
  upgrades: number
  battles: number
  /** Players on the site right now */
  online: number
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
  /** Per drop: true when KURWADROP was on and the drop is a top item (shown via the chicken and a respin) */
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

// --- Withdraw to Steam ----------------------------------------------------------

/** PUT /api/me/trade-url. Must look like https://steamcommunity.com/tradeoffer/new/?partner=…&token=… */
export interface TradeUrlBody {
  tradeUrl: string
}

/** POST /api/inventory/withdraw. 400 without a saved trade URL. */
export interface WithdrawBody {
  uids: string[]
}

export interface WithdrawResponse {
  withdrawn: string[]
  /** One Steam trade offer for all of them; the player accepts it in Steam before it expires */
  offer: { id: string; sentAt: string; expiresAt: string }
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

export interface RevealedSeedPair extends SeedPairPublic {
  /** Revealed at rotation; SHA-256 of it equals serverSeedHash */
  serverSeed: string
  /** When this pair became active and when it was replaced; nonce = rolls made with it (1…nonce) */
  createdAt: string
  rotatedAt: string
  /** The player set a new client seed with this rotation (otherwise only the server seed changed) */
  clientChanged: boolean
}

export interface SeedsResponse {
  active: SeedPairPublic & { createdAt: string }
  /** Last revealed pair, after a rotation (= history[0]) */
  previous: RevealedSeedPair | null
  /** Every rotation so far, newest first: the full trail to verify any past roll */
  history: RevealedSeedPair[]
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

export type HistoryGame = 'case' | 'upgrade' | 'deposit' | 'sell' | 'withdraw'

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
  /** Rolls: the hash of the seed pair the nonce belongs to — the PF page finds the revealed seed by it */
  seedHash?: string
  /** Cases: the ticket and the skin it gave */
  ticket?: number
  drop?: string
  /** Upgrades: the chance played (basis points), the roll (0.00–99.99) and what the target was worth */
  chance?: number
  roll?: number
  targetPrice?: number
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
  /** People watching the room right now (the Go backend counts WebSocket subscribers) */
  viewers: number
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

// --- Big wins of the day ---------------------------------------------------------

export interface BigWin {
  id: string
  nickname: string
  avatar: string
  level: number
  item: Item
  caseSlug: string
  caseName: string
  caseImage: string
  /** What was paid for the roll (case price) */
  cost: number
  /** item.price / cost, rounded down */
  multiplier: number
  at: string
}

export interface BigWinsResponse {
  /** Top drops of the last 24 h by multiplier, best first */
  wins: BigWin[]
}

// --- Bonuses: daily case and level rewards ---------------------------------------------

export interface DailyInfo {
  /** The free case; its contents get better every 5 levels */
  case: CaseDetails
  tier: number
  /** null = can be opened now; otherwise when it unlocks */
  nextAt: string | null
}

// --- Weekly race and the season pass (docs/ux-research-v3.md #5, #6) -------------------

/** One row of the weekly race: coins played this week, the prize for that place */
export interface RaceEntry {
  rank: number
  nickname: string
  avatar: string
  level: number
  wagered: number
  /** Coin cents for this place; 0 outside the prize places */
  prize: number
  you?: boolean
}

/** GET /api/race. Public; `me` only for a signed-in player. Resets every Monday 00:00 UTC. */
export interface RaceResponse {
  endsAt: string
  prizePool: number
  /** The prize places (top 10) */
  top: RaceEntry[]
  me: RaceEntry | null
}

export interface PassTier {
  level: number
  /** Season points needed for this tier */
  points: number
  /** Free track reward, coin cents */
  reward: number
  /** Premium track reward, coin cents (the premium track is not open yet) */
  premiumReward: number
  status: 'locked' | 'claimable' | 'claimed'
}

/** GET /api/pass (signed in). 1 point per coin played; the season ends on a date. */
export interface PassResponse {
  season: string
  endsAt: string
  points: number
  tiers: PassTier[]
}

/** Free cases for signing up (opened from Bonuses, real drops). Configured in the admin panel. */
export interface WelcomeInfo {
  case: CaseDetails
  /** Opens left; 0 once used up */
  left: number
  total: number
}

export interface LevelReward {
  level: number
  /** Coin cents credited on claim */
  coins: number
  /** Set on levels where the daily case moves up a tier */
  dailyTier?: number
  status: 'locked' | 'claimable' | 'claimed'
}

/**
 * Rakeback: a share of every coin played comes back, the share grows with the level.
 * `pending` accrues on each spend and is claimed by hand (POST /api/bonuses/rakeback/claim).
 */
export interface RakebackInfo {
  /** Current share in basis points (50 = 0.5%) */
  rateBp: number
  /** The share at the next step and the level it unlocks at; null at the top */
  next: { level: number; rateBp: number } | null
  /** Coin cents waiting to be claimed */
  pending: number
  claimedTotal: number
}

export type MissionKind = 'open_cases' | 'win_upgrade' | 'play_battle' | 'spend' | 'try_upgrade' | 'sell_skin' | 'create_battle' | 'win_battle'

/** Daily missions: three small goals, reset every 24 h (missionsResetAt). Titles come from i18n by kind. */
export interface Mission {
  id: string
  kind: MissionKind
  /** Target count; for `spend` coin cents */
  goal: number
  progress: number
  /** Coin cents paid on claim (POST /api/bonuses/missions/:id/claim) */
  reward: number
  status: 'active' | 'claimable' | 'claimed'
}

/**
 * Mission chains (docs/ux-research-v3.md #10): themed three-step paths that teach the site, one time each.
 * Steps go in order — only the current one counts. The last step unlocks a free case, opened on the bonus reel
 * (POST /api/bonuses/chains/:id/open).
 */
export type ChainId = 'rookie' | 'investor' | 'battler'
export interface ChainStep {
  kind: MissionKind
  goal: number
  progress: number
}
export interface MissionChain {
  id: ChainId
  steps: ChainStep[]
  /** Index of the step that counts now; steps.length once all are done */
  current: number
  case: CaseDetails
  status: 'active' | 'claimable' | 'claimed'
}

export interface BonusesResponse {
  daily: DailyInfo
  welcome: WelcomeInfo
  chains: MissionChain[]
  /** A window of levels around the user's: a few behind, the current one and the next ten */
  levels: LevelReward[]
  rakeback: RakebackInfo
  missions: Mission[]
  missionsResetAt: string
}

/** POST /api/bonuses/promo. 400 for an unknown or already used code. */
export interface PromoBody {
  code: string
}
export interface PromoResponse {
  balance: number
  credited: number
}

/** Rakeback and mission claims: the new balance and the fresh bonuses state */
export interface BonusClaimResponse {
  balance: number
  bonuses: BonusesResponse
}

export interface ClaimLevelResponse {
  balance: number
  levels: LevelReward[]
}
