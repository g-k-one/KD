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
  /** Skeletal (Spine) art. Cards play it only while on screen, a few at a time; `image` stays the fallback. */
  rig?: CaseRig
  /** Video art: a transparent looping AVIF, played under the same rules as `rig`; `image` is its first frame */
  animation?: string
  price: number
  risk: RiskLevel
  tag?: CaseTag
  /** Return to player, basis points (9240 = 92.40%). Configured in the admin panel. */
  rtp: number
  /** Chance that one drop is worth at least the case price, basis points. Home sorts by it. */
  payback: number
  /** Biggest multiplier (drop price / case price) this case paid in the last 24 h; null if nothing notable */
  bestToday: number | null
  /** How home shows this case's card (the admin's home layout); the plain card when absent */
  card?: HomeCardKind
  /** Extra art: a wide picture (a 2×1 bento cell), a tall one (a 1×2 cell), and/or a full scene that fills the card */
  art?: { wide?: string; tall?: string; full?: string }
  /** A limited case: how many there were and how many are left. Every open spends one; at 0 it is sold out. */
  limited?: { total: number; left: number }
  createdAt: string
}

/** A Spine 4.3 rig: skeleton JSON plus its atlas (the atlas names its page image, next to it). */
export interface CaseRig {
  skeleton: string
  atlas: string
  /** Looping animation to play; `idle` when omitted */
  animation?: string
  /** Looping animation while the pointer is over the card */
  hover?: string
  /** A control bone the pointer moves sideways (a slider on it turns the head), up to ±`range` world units */
  look?: { bone: string; range: number }
}

export interface CaseSection {
  id: string
  title: string
  cases: CaseSummary[]
  /** A section with a clock: when the weekly picks rotate */
  endsAt?: string
  /** A themed row: its cards drop their plates and sit in a scene drawn behind the row (coop: straw nests) */
  theme?: SectionTheme
}

/** A case card on home: plain, its full scene, or a bigger bento cell — wide 2×1 or tall 1×2 (desktop). Each needs its art. */
export type HomeCardKind = 'standard' | 'full' | 'wide' | 'tall'
/** A row's scene behind its cards */
export type SectionTheme = 'coop'

/** The home layout an admin sets. GET / PUT /api/admin/home-layout; POST /api/admin/home-layout/reset. */
export interface HomeLayout {
  /** Every row in its order; a hidden row stays listed so it can come back */
  sections: Array<{ id: string; title: string; hidden?: boolean; theme?: SectionTheme | null }>
  /** Card kind per case slug, the same in every row; a case left out is plain */
  cards: Record<string, HomeCardKind>
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
  /** Coin cents still to spend for the next level (XP left) */
  levelLeft?: number
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

/**
 * How a battle is won. classic: the most value takes it all · crazy: the least value takes it all · team: 2 vs 2
 * (seats 0–1 against 2–3), the team with more value wins and its two players split the drops.
 */
export type BattleMode = 'classic' | 'crazy' | 'team'

export interface Battle {
  id: string
  mode: BattleMode
  /** Players in the battle: 2, 3 or 4 (team is always 4) */
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
  /** The first winning seat (the only one outside team mode) */
  winnerSlot: number | null
  /** Every winning seat: one, or the two of the winning team */
  winners: number[]
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
  mode?: BattleMode
  /** Ignored for team (always 4) */
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

// --- Bonuses: the daily case and the welcome cases ---------------------------------------------

export interface DailyInfo {
  /** The free case; its contents get better every 5 levels */
  case: CaseDetails
  tier: number
  /** null = can be opened now; otherwise when it unlocks */
  nextAt: string | null
}

/** Free cases for signing up (opened from Bonuses, real drops). Configured in the admin panel. */
export interface WelcomeInfo {
  case: CaseDetails
  /** Opens left; 0 once used up */
  left: number
  total: number
}

/** GET /api/bonuses: what the Bonuses page offers (the promo code is a form of its own) */
export interface BonusesResponse {
  daily: DailyInfo
  welcome: WelcomeInfo
}

/** POST /api/bonuses/promo. 400 for an unknown or already used code. */
export interface PromoBody {
  code: string
}
export interface PromoResponse {
  balance: number
  credited: number
}


// --- Game rules (admin settings the UI plays by too) ---------------------------------------------

/** Upgrade odds: chance = stake / target × (100% − edge), between the floor and the cap. Basis points. */
export interface UpgradeRules {
  /** House edge, basis points (500 = 5%) */
  edgeBp: number
  /** Best chance an upgrade can have (8000 = 80%) */
  maxChanceBp: number
  /** Upgrades below this chance are refused (100 = 1%) */
  minChanceBp: number
  /** Skins in one stake; balance coins count as one of them */
  maxItems: number
}

export interface PvpRules {
  /** ms per round the client replays */
  roundMs: number
  /** Rounds (cases) one battle can have */
  maxRounds: number
  /** Names the bots take when called into a seat */
  botNames: string[]
}

/** GET /api/rules (public): the numbers the backend plays by, so the UI shows the same chances and limits */
export interface GameRules {
  upgrade: UpgradeRules
  pvp: PvpRules
}

// --- Admin panel (/admin) -------------------------------------------------------------------------
//
// Every setting of the site. Each section is read with GET and saved whole with PUT; the answer is the saved
// value as the backend took it (clamped, unknown ids dropped), and the UI shows that. Errors: 400 { message }.
//
//   GET    /api/admin/cases                   → { cases: AdminCase[] }
//   GET    /api/admin/cases/:slug             → { case: AdminCase }
//   PUT    /api/admin/cases/:slug             { case: AdminCaseInput } → { case: AdminCase }
//   POST   /api/admin/cases/:slug/duplicate   → { case: AdminCase } (a copy with the same art, contents and odds)
//   DELETE /api/admin/cases/:slug             → { ok: true } (copies only)
//   GET    /api/admin/home-layout             → { layout: HomeLayout }   (PUT { layout }, POST …/reset)
//   GET    /api/admin/bonuses                 → { bonuses: AdminBonuses }   (PUT { bonuses })
//   GET    /api/admin/games                   → { games: GameRules }        (PUT { games })
//   GET    /api/admin/feed                    → { feed: AdminFeed }         (PUT { feed })
//   GET    /api/admin/big-wins                → { wins: BigWin[] } (all of the last 24 h, best first)
//   POST   /api/admin/big-wins                { win: AdminBigWinInput } → { wins }
//   DELETE /api/admin/big-wins/:id            → { wins }
//   GET    /api/admin/users                   → { users: AdminUsers }       (PUT { users })
//   GET    /api/admin/snapshot                → AdminSnapshot (every section at once: backup, or move between envs)
//   PUT    /api/admin/snapshot                AdminSnapshot → AdminSnapshot
//   POST   /api/admin/reset                   → AdminSnapshot (everything back to the defaults)

/** How a case's odds are set: auto solves them from the target RTP; manual takes each skin's tickets as given */
export type AdminOddsMode = 'auto' | 'manual'

export interface AdminCase {
  slug: string
  name: string
  image: string
  /** Coin cents */
  price: number
  /** The RTP the auto odds aim at, basis points (9240 = 92.40%) */
  targetRtp: number
  /** What the odds table really pays, basis points */
  rtp: number
  risk: RiskLevel
  tag: CaseTag | null
  /** A limited case: every open spends one, at 0 it is sold out */
  limited: { total: number; left: number } | null
  /** Its card on home (the same as HomeLayout.cards) */
  card: HomeCardKind
  /** The art it has; a card kind needs its art */
  art: { wide?: string; tall?: string; full?: string }
  odds: AdminOddsMode
  /** Contents, priciest first, each with its tickets out of PF_TICKETS (auto: what the solver gave) */
  items: Array<Item & { tickets: number }>
  /** Set on a copy: the case it was made from. Only copies can be deleted */
  copyOf: string | null
}

/**
 * PUT /api/admin/cases/:slug. Items name skins by id; tickets count in manual mode only and are scaled to add
 * up to PF_TICKETS. A case needs 2 skins or more.
 */
export interface AdminCaseInput {
  name: string
  price: number
  targetRtp: number
  risk: RiskLevel
  tag: CaseTag | null
  limited: { total: number; left: number } | null
  card: HomeCardKind
  odds: AdminOddsMode
  items: Array<{ id: string; tickets: number }>
}

/** Promo codes: coins are credited on Bonuses (value = coin cents); deposit codes add a bonus to a deposit (value = bp) */
export interface AdminPromo {
  code: string
  kind: 'coins' | 'deposit'
  value: number
}

export interface AdminBonuses {
  daily: {
    /** Hours until the daily case can be opened again */
    cooldownHours: number
    /** Every this many levels the player moves to the next tier */
    levelsPerTier: number
    /** Tier 1, 2, …: what the case is worth and the skins in it (RTP 100%, the odds are solved). PUT reads item ids only */
    tiers: Array<{ price: number; items: Item[] }>
  }
  welcome: {
    /** Free cases a new player gets */
    total: number
    price: number
    items: Item[]
  }
  promos: AdminPromo[]
}

export interface AdminFeed {
  /** No random drops; the players' own drops still show */
  paused: boolean
  /** Chance a poll brings a new random drop, basis points */
  rateBp: number
  /** Of the random drops: upgrade wins and PvP wins, basis points (the rest are case drops) */
  upgradeShareBp: number
  pvpShareBp: number
}

/** POST /api/admin/big-wins: a seeded big win. Source: a case slug, "upgrade" or "pvp" */
export interface AdminBigWinInput {
  nickname: string
  itemId: string
  source: string
  multiplier: number
  /** How long ago it happened, hours (under 24 to show today) */
  hoursAgo: number
}

/** A fake player: shows in the live feed, big wins, case top drops and PvP lobbies */
export interface AdminPlayer {
  nickname: string
  level: number
}

export interface AdminUsers {
  /** The signed-in demo player */
  player: { nickname: string; balance: number; level: number; levelProgress: number }
  players: AdminPlayer[]
}

export interface AdminSnapshot {
  cases: AdminCase[]
  layout: HomeLayout
  bonuses: AdminBonuses
  games: GameRules
  feed: AdminFeed
  bigWins: BigWin[]
  users: AdminUsers
}
