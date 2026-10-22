// Mock PvP battles. When the last seat fills, every round is rolled at once (PF ticket per player
// per round, a future "EOS block" as the client seed) and the battle goes live; the client replays
// the rounds from startedAt + roundMs.
import type { Battle, BattleCaseRef, BattlePlayerRef, BattleRoundResult, CreateBattleRequest } from '#shared/types/api'
import { pickByTicket, pfTicket, randomSeed, sha256Hex } from '#shared/utils/pf'
import { getCase, getCaseSections, getMockState, MockError, record, spend, syncSkinsValue, takeForcedBattle, toInventory, trackMission } from './mock-db'

const ROUND_MS = 4200
const BOT_NAMES = ['Bot Pierogi', 'Bot Babcia', 'Bot Zloty', 'Bot Vodka']
const PLAYERS: BattlePlayerRef[] = [
  { nickname: 'krakow_kid', avatar: '/img/brand/avatar.webp', level: 8 },
  { nickname: 'babcia99', avatar: '/img/brand/avatar.webp', level: 21 },
  { nickname: 'zlotyboy', avatar: '/img/brand/avatar.webp', level: 4 },
  { nickname: 'ez_drop', avatar: '/img/brand/avatar.webp', level: 33 },
]

interface StoredBattle extends Battle {
  serverSeed: string
  clientSeed: string
}

const battles: StoredBattle[] = []
let idSeq = 48200

const caseRef = (slug: string): BattleCaseRef => {
  const c = getCase(slug)
  return { slug: c.slug, name: c.name, image: c.image, price: c.price }
}

async function newBattle(size: number, rounds: BattleCaseRef[]): Promise<StoredBattle> {
  const serverSeed = randomSeed(32)
  idSeq += 1
  return {
    id: String(idSeq),
    size,
    rounds,
    cost: rounds.reduce((a, r) => a + r.price, 0),
    status: 'waiting',
    slots: Array.from({ length: size }, (_, slot) => ({ slot, player: null })),
    results: null,
    startedAt: null,
    roundMs: ROUND_MS,
    winnerSlot: null,
    viewers: 0,
    seed: { serverSeedHash: await sha256Hex(serverSeed), eosBlock: null, serverSeed: null },
    serverSeed,
    clientSeed: '',
    createdAt: new Date().toISOString(),
  }
}

async function start(b: StoredBattle) {
  const eosBlock = 412_000_000 + Math.floor(Math.random() * 1_000_000)
  b.seed.eosBlock = eosBlock
  b.clientSeed = String(eosBlock)
  const results: BattleRoundResult[] = []
  let nonce = 0
  for (const r of b.rounds) {
    const cs = getCase(r.slug)
    const drops = []
    const tickets = []
    for (let s = 0; s < b.size; s++) {
      const { ticket } = await pfTicket(b.serverSeed, b.clientSeed, nonce++)
      const { tickets: _t, ticketFrom: _f, ticketTo: _to, ...item } = pickByTicket(cs.items, ticket)
      drops.push(item)
      tickets.push(ticket)
    }
    results.push({ drops, tickets })
  }
  let totals = b.slots.map((_, s) => results.reduce((a, r) => a + r.drops[s]!.price, 0))
  // Debug: steer the winner by swapping whole drop columns between seats
  const forced = takeForcedBattle()
  const meSlot = b.slots.findIndex((s) => s.player?.you)
  if (forced && meSlot >= 0) {
    const best = totals.indexOf(Math.max(...totals))
    const other = totals.map((t, i) => ({ t, i })).filter((x) => x.i !== meSlot).sort((a, z) => z.t - a.t)[0]!.i
    const swapWith = forced === 'you' ? (best !== meSlot ? best : -1) : best === meSlot ? other : -1
    if (swapWith >= 0) {
      for (const r of results) {
        ;[r.drops[meSlot], r.drops[swapWith]] = [r.drops[swapWith]!, r.drops[meSlot]!]
        ;[r.tickets[meSlot], r.tickets[swapWith]] = [r.tickets[swapWith]!, r.tickets[meSlot]!]
      }
      totals = b.slots.map((_, s) => results.reduce((a, r) => a + r.drops[s]!.price, 0))
    }
  }
  b.results = results
  b.winnerSlot = totals.indexOf(Math.max(...totals))
  b.status = 'live'
  b.startedAt = new Date(Date.now() + 3600).toISOString()

  // Winner takes every drop. The mock pays the signed-in user at once; the UI reveals it at the end.
  const youSlot = b.slots.findIndex((s) => s.player?.you)
  if (youSlot >= 0) {
    const won = b.winnerSlot === youSlot
    if (won) trackMission('win_battle')
    if (won) {
      const st = getMockState()
      for (const r of results) for (const d of r.drops) st.inventory.unshift(toInventory(d, 'case'))
      syncSkinsValue()
    }
    record({ game: 'case', title: `PvP #${b.id}`, bet: b.cost, payout: won ? totals.reduce((a, x) => a + x, 0) : 0, status: won ? 'won' : 'lost' })
  }
}

function refreshStatus(b: StoredBattle) {
  if (b.status === 'live' && b.startedAt && Date.now() > Date.parse(b.startedAt) + b.rounds.length * b.roundMs + 1500) {
    b.status = 'finished'
    b.seed.serverSeed = b.serverSeed
  }
}

/** Fake audience: live rooms draw a crowd that drifts, waiting rooms a few, finished ones empty out. */
function viewersOf(b: StoredBattle) {
  const base = (Number(b.id) * 37) % 50
  const wave = Math.round(Math.sin(Date.now() / 9000 + Number(b.id)) * 6)
  if (b.status === 'live') return 40 + base + b.size * 15 + wave
  if (b.status === 'waiting') return 3 + (base % 12) + Math.max(0, wave)
  return Math.max(0, (base % 6) + wave)
}

function publicBattle(b: StoredBattle, loggedIn: boolean): Battle {
  refreshStatus(b)
  const { serverSeed: _s, clientSeed: _c, ...pub } = b
  return {
    ...pub,
    viewers: viewersOf(b),
    seed: { ...pub.seed },
    slots: pub.slots.map((s) => ({ ...s, player: s.player ? { ...s.player, you: loggedIn && !!s.player.you } : null })),
  }
}

// Lobby starts with a few battles in every state
let seeded: Promise<void> | null = null
function ensureSeeded() {
  seeded ??= (async () => {
    // Cheaper cases make friendlier lobby battles; spread rounds across them
    const all = getCaseSections().find((s) => s.id === 'featured')!.cases.filter((c) => c.price <= 3000).map((c) => c.slug)
    const pick = (n: number, from: number) => Array.from({ length: n }, (_, i) => caseRef(all[(from + i * 3) % all.length]!))
    const specs = [
      { size: 3, rounds: pick(5, 0), filled: 2 },
      { size: 2, rounds: pick(3, 2), filled: 1 },
      { size: 4, rounds: pick(6, 1), filled: 3 },
      { size: 2, rounds: pick(8, 4), filled: 2 },
      { size: 3, rounds: pick(2, 3), filled: 3, past: true },
    ]
    for (const [i, sp] of specs.entries()) {
      const b = await newBattle(sp.size, sp.rounds)
      for (let s = 0; s < sp.filled; s++) b.slots[s]!.player = PLAYERS[(i + s) % PLAYERS.length]!
      if (sp.filled === sp.size) {
        await start(b)
        if (sp.past) b.startedAt = new Date(Date.now() - 600_000).toISOString()
      }
      battles.unshift(b)
    }
  })()
  return seeded
}

export async function listBattles(loggedIn: boolean) {
  await ensureSeeded()
  const order = { waiting: 0, live: 1, finished: 2 }
  return {
    battles: battles
      .map((b) => publicBattle(b, loggedIn))
      .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt)),
  }
}

function find(id: string) {
  const b = battles.find((x) => x.id === id)
  if (!b) throw new MockError(404, 'Battle not found')
  return b
}

export async function getBattle(id: string, loggedIn: boolean) {
  await ensureSeeded()
  return { battle: publicBattle(find(id), loggedIn) }
}

const you = (): BattlePlayerRef => {
  const u = getMockState().user
  return { nickname: u.nickname, avatar: u.avatar, level: u.level, you: true }
}

export async function createBattle(req: CreateBattleRequest) {
  await ensureSeeded()
  const size = Math.min(4, Math.max(2, Math.floor(req.size)))
  const rounds = (req.cases ?? []).flatMap((c) => Array.from({ length: Math.min(10, Math.max(0, c.qty)) }, () => caseRef(c.slug)))
  if (!rounds.length) throw new MockError(400, 'Add at least one case')
  if (rounds.length > 25) throw new MockError(400, 'A battle can have up to 25 rounds')
  const b = await newBattle(size, rounds)
  spend(b.cost)
  trackMission('create_battle')
  trackMission('play_battle')
  b.slots[0]!.player = you()
  battles.unshift(b)
  return { battle: publicBattle(b, true), balance: getMockState().user.balance }
}

export async function joinBattle(id: string, slot?: number) {
  await ensureSeeded()
  const b = find(id)
  if (b.status !== 'waiting') throw new MockError(409, 'This battle has already started')
  if (b.slots.some((s) => s.player?.you)) throw new MockError(409, 'You are already in this battle')
  const free = b.slots.find((s) => !s.player && (slot == null || s.slot === slot))
  if (!free) throw new MockError(409, 'No free seats')
  spend(b.cost)
  trackMission('play_battle')
  free.player = you()
  if (b.slots.every((s) => s.player)) await start(b)
  return { battle: publicBattle(b, true), balance: getMockState().user.balance }
}

/** Fills one free seat with a bot (only the battle creator may do this in the real product). */
export async function callBot(id: string, slot?: number) {
  await ensureSeeded()
  const b = find(id)
  if (b.status !== 'waiting') throw new MockError(409, 'This battle has already started')
  const free = b.slots.find((s) => !s.player && (slot == null || s.slot === slot))
  if (!free) throw new MockError(409, 'No free seats')
  free.player = { nickname: BOT_NAMES[free.slot % BOT_NAMES.length]!, avatar: '/img/brand/logo-mark.svg', level: 1, bot: true }
  if (b.slots.every((s) => s.player)) await start(b)
  return { battle: publicBattle(b, true) }
}
