// Mock PvP battles. When the last seat fills, a future EOS block is named; once it is produced its ID is the salt
// (the client seed) and every round is rolled at once (a PF ticket per player per round); the battle goes live and the
// client replays the rounds from startedAt + roundMs.
// The real backend names a block a few ahead of the chain's head when the seats fill and rolls only after that block
// exists, with the block ID read from the chain; the mock stands a random 64-hex ID in for it.
import type { Battle, BattleCaseRef, BattleMode, BattlePlayerRef, BattleRoundResult, CreateBattleRequest } from '#shared/types/api'
import { avatarFor } from '#shared/utils/avatar'
import { battleTie, battleTotals, battleWinners } from '#shared/utils/battle'
import { pickByTicket, pfTicket, randomSeed, sha256Hex } from '#shared/utils/pf'
import { adminSettings, getCase, getMockState, lobbyCaseSlugs, MockError, record, spend, syncSkinsValue, takeForcedBattle, toInventory } from './mock-db'

// Round time, round cap and bot names are admin settings (adminSettings.games.pvp); lobby players are the fake players
const pvp = () => adminSettings.games.pvp
const lobbyPlayers = (): BattlePlayerRef[] => adminSettings.players.slice(0, 4).map((p) => ({ nickname: p.nickname, avatar: avatarFor(p.nickname), level: p.level }))

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

async function newBattle(size: number, rounds: BattleCaseRef[], mode: BattleMode = 'classic'): Promise<StoredBattle> {
  const serverSeed = randomSeed(32)
  idSeq += 1
  if (mode === 'team') size = 4
  return {
    id: String(idSeq),
    mode,
    size,
    rounds,
    cost: rounds.reduce((a, r) => a + r.price, 0),
    status: 'waiting',
    slots: Array.from({ length: size }, (_, slot) => ({ slot, player: null })),
    results: null,
    startedAt: null,
    roundMs: pvp().roundMs,
    winnerSlot: null,
    winners: [],
    viewers: 0,
    seed: { serverSeedHash: await sha256Hex(serverSeed), eosBlock: null, eosBlockId: null, serverSeed: null },
    // the odds are fixed with the seed: what each ticket gives can't change after the hash is shown
    odds: Object.fromEntries([...new Set(rounds.map((r) => r.slug))].map((slug) => [slug, getCase(slug).items.map((i) => ({ ...i }))])),
    serverSeed,
    clientSeed: '',
    createdAt: new Date().toISOString(),
  }
}

/** Every round of a battle rolled with one salt: a ticket per seat per round (nonce counting up), its skin, the winners */
async function roll(b: StoredBattle, salt: string) {
  const results: BattleRoundResult[] = []
  let nonce = 0
  for (const r of b.rounds) {
    const drops = []
    const tickets = []
    for (let s = 0; s < b.size; s++) {
      const { ticket } = await pfTicket(b.serverSeed, salt, nonce++)
      const { tickets: _t, ticketFrom: _f, ticketTo: _to, drops24h: _d, ...item } = pickByTicket(b.odds[r.slug]!, ticket)
      drops.push(item)
      tickets.push(ticket)
    }
    results.push({ drops, tickets })
  }
  const totals = battleTotals(b.size, results.map((r) => r.drops))
  return { salt, results, winners: battleWinners(b.mode, totals, await battleTie(b.serverSeed, salt)) }
}

async function start(b: StoredBattle) {
  // the block is named now; its ID (unknown to anyone until the block is produced) is the salt
  b.seed.eosBlock = 412_000_000 + Math.floor(Math.random() * 1_000_000)
  let out = await roll(b, randomSeed(32))
  // Debug: steer the winner the honest way — the mock's stand-in block ID is drawn again until the battle comes out as
  // asked, so every ticket, skin and the winner still check out against the seeds
  const forced = takeForcedBattle()
  const meSlot = b.slots.findIndex((s) => s.player?.you)
  if (forced && meSlot >= 0) {
    for (let n = 0; n < 400 && out.winners.includes(meSlot) !== (forced === 'you'); n++) out = await roll(b, randomSeed(32))
  }
  b.seed.eosBlockId = out.salt
  b.clientSeed = out.salt
  const results = out.results
  b.results = results
  b.winners = out.winners
  b.winnerSlot = b.winners[0]!
  b.status = 'live'
  b.startedAt = new Date(Date.now() + 3000).toISOString()

  // The winner takes every drop; a winning team deals them out between its two players, priciest first, in turn.
  // The mock pays the signed-in user at once; the UI reveals it at the end.
  const youSlot = b.slots.findIndex((s) => s.player?.you)
  if (youSlot >= 0) {
    const won = b.winners.includes(youSlot)
    const all = results.flatMap((r) => r.drops).sort((x, y) => y.price - x.price)
    const mine = won ? all.filter((_, i) => i % b.winners.length === b.winners.indexOf(youSlot)) : []
    if (mine.length) {
      const st = getMockState()
      for (const d of mine) st.inventory.unshift(toInventory(d, 'case'))
      syncSkinsValue()
    }
    // the best skin of the battle stands for it in the history: the player's if they won, else the one that beat them
    const best = (won ? mine : all)[0]
    record({ game: 'case', title: `PvP #${b.id}`, bet: b.cost, payout: mine.reduce((a, d) => a + d.price, 0), status: won ? 'won' : 'lost', battleId: b.id, result: best ? { name: `${best.weapon} | ${best.skin}`, image: best.image, rarity: best.rarity, price: best.price } : undefined })
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
    const all = lobbyCaseSlugs()
    const pick = (n: number, from: number) => Array.from({ length: n }, (_, i) => caseRef(all[(from + i * 3) % all.length]!))
    const specs: Array<{ mode: BattleMode; size: number; rounds: BattleCaseRef[]; filled: number; past?: boolean }> = [
      { mode: 'classic', size: 3, rounds: pick(5, 0), filled: 2 },
      { mode: 'crazy', size: 2, rounds: pick(3, 2), filled: 1 },
      { mode: 'team', size: 4, rounds: pick(6, 1), filled: 3 },
      { mode: 'classic', size: 2, rounds: pick(8, 4), filled: 2 },
      { mode: 'crazy', size: 3, rounds: pick(4, 5), filled: 3 },
      { mode: 'classic', size: 3, rounds: pick(2, 3), filled: 3, past: true },
      { mode: 'team', size: 4, rounds: pick(3, 6), filled: 4, past: true },
    ]
    for (const [i, sp] of specs.entries()) {
      const b = await newBattle(sp.size, sp.rounds, sp.mode)
      const players = lobbyPlayers()
      for (let s = 0; s < sp.filled; s++) b.slots[s]!.player = players[(i + s) % players.length]!
      if (sp.filled === sp.size) {
        await start(b)
        if (sp.past) b.startedAt = new Date(Date.now() - 600_000).toISOString()
      }
      battles.unshift(b)
    }
  })()
  return seeded
}

// The lobby's list is a summary: no results (the lobby shows the rounds' progress by the clock, the drops are the room's —
// and the rolls of a battle still replaying stay out of anyone's reach until its room shows them) and no odds (the
// fairness check is the room's). The Go backend: the same, or the summary pushed over the lobby's WebSocket.
export async function listBattles(loggedIn: boolean) {
  await ensureSeeded()
  const order = { waiting: 0, live: 1, finished: 2 }
  return {
    battles: battles
      .map((b) => ({ ...publicBattle(b, loggedIn), results: null, odds: {} }))
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
  const mode: BattleMode = req.mode === 'crazy' || req.mode === 'team' ? req.mode : 'classic'
  const size = Math.min(4, Math.max(2, Math.floor(req.size)))
  const rounds = (req.cases ?? []).flatMap((c) => Array.from({ length: Math.min(10, Math.max(0, c.qty)) }, () => caseRef(c.slug)))
  if (!rounds.length) throw new MockError(400, 'Add at least one case')
  if (rounds.length > pvp().maxRounds) throw new MockError(400, `A battle can have up to ${pvp().maxRounds} rounds`)
  const b = await newBattle(size, rounds, mode)
  spend(b.cost)
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
  const bots = pvp().botNames.length ? pvp().botNames : ['Bot']
  free.player = { nickname: bots[free.slot % bots.length]!, avatar: '/img/brand/logo-mark.svg', level: 1, bot: true }
  if (b.slots.every((s) => s.player)) await start(b)
  return { battle: publicBattle(b, true) }
}
