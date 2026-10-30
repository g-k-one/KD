// The admin panel's side of the mock (/admin, routes in mock-api.ts): every setting of the site, read and saved
// section by section. Each setter takes the section whole, clamps it to what makes sense, and answers with the
// saved value. The contract is in shared/types/api.ts (Admin*).
import type {
  AdminBigWinInput,
  AdminBonuses,
  AdminCase,
  AdminCaseInput,
  AdminFeed,
  AdminPromo,
  AdminSnapshot,
  AdminUsers,
  BigWin,
  CaseTag,
  GameRules,
  HomeCardKind,
  Item,
  RiskLevel,
} from '#shared/types/api'
import { PF_TICKETS } from '#shared/utils/pf'
import {
  adminSettings,
  bigWins,
  builtCase,
  caseDefs,
  clearBonusCases,
  findItem,
  getHomeLayout,
  getMockState,
  MockError,
  placeLike,
  pushBigWin,
  PVP_SRC,
  rebuildCase,
  removeCase,
  setCaseCard,
  setHomeLayout,
  syncBestToday,
  UPGRADE_SRC,
  xpFor,
  type CaseDef,
} from './mock-db'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const clamp = (v: unknown, lo: number, hi: number, fallback = lo) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}
const RISKS: RiskLevel[] = ['low', 'medium', 'high', 'extreme']
const CARDS: HomeCardKind[] = ['standard', 'full', 'wide', 'tall']
/** Known skin ids, each once */
const skinIds = (ids: unknown) => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter((id) => findItem(id))

// --- Cases ----------------------------------------------------------------------------------

const defOf = (slug: string) => {
  const def = caseDefs.find((d) => d.slug === slug)
  if (!def) throw new MockError(404, 'Case not found')
  return def
}

function toAdminCase(def: CaseDef): AdminCase {
  const c = builtCase(def.slug)!
  return {
    slug: def.slug,
    name: def.name,
    image: def.image,
    price: def.price,
    targetRtp: def.targetRtp,
    rtp: c.rtp,
    risk: def.risk,
    tag: def.tag ?? null,
    // the built case keeps the stock as opens spend it
    limited: c.limited ? { ...c.limited } : null,
    endsAt: c.endsAt ?? null,
    card: getHomeLayout().layout.cards[def.slug] ?? 'standard',
    art: { ...c.art },
    animated: !!(def.rig || def.animation),
    odds: def.preset ? 'manual' : 'auto',
    items: c.items.map(({ ticketFrom: _f, ticketTo: _t, drops24h: _d, ...i }) => i),
    copyOf: def.copyOf ?? null,
  }
}

export const listAdminCases = () => ({ cases: caseDefs.map(toAdminCase) })
export const getAdminCase = (slug: string) => ({ case: toAdminCase(defOf(slug)) })

/** Manual odds: the tickets as given, scaled to add up to PF_TICKETS (every skin keeps at least one) */
function scaleTickets(items: Array<{ item: Item; tickets: number }>) {
  const sum = items.reduce((a, i) => a + i.tickets, 0)
  if (sum <= 0) throw new MockError(400, 'Give the skins their chances')
  const tickets = items.map((i) => Math.max(1, Math.round((i.tickets / sum) * PF_TICKETS)))
  const most = tickets.indexOf(Math.max(...tickets))
  tickets[most]! += PF_TICKETS - tickets.reduce((a, b) => a + b, 0)
  return items.map((i, k) => ({ ...i.item, tickets: tickets[k]! }))
}

export function setAdminCase(slug: string, input: Partial<AdminCaseInput>) {
  const def = defOf(slug)
  const name = String(input.name ?? def.name).trim().slice(0, 40)
  if (!name) throw new MockError(400, 'Give the case a name')
  const price = Math.round(Number(input.price ?? def.price))
  if (!(price >= 1)) throw new MockError(400, 'The price must be above 0')
  const picked = (Array.isArray(input.items) ? input.items : [])
    .map((r) => ({ item: findItem(String(r?.id)), tickets: Math.max(0, Number(r?.tickets) || 0) }))
    .filter((r, i, all): r is { item: Item; tickets: number } => !!r.item && all.findIndex((o) => o.item?.id === r.item!.id) === i)
  if (picked.length < 2) throw new MockError(400, 'A case needs at least 2 skins')

  def.name = name
  def.price = price
  def.targetRtp = clamp(input.targetRtp ?? def.targetRtp, 1000, 10_000)
  if (input.risk && RISKS.includes(input.risk)) def.risk = input.risk
  const tag: CaseTag | null = input.tag === 'new' || input.tag === 'hot' ? input.tag : null
  if (tag) def.tag = tag
  else delete def.tag
  if (input.limited) {
    const total = clamp(input.limited.total, 1, 1_000_000)
    def.limited = { total, left: clamp(input.limited.left, 0, total) }
  } else delete def.limited
  const endsAt = input.endsAt ? Date.parse(input.endsAt) : NaN
  if (Number.isNaN(endsAt)) delete def.endsAt
  else def.endsAt = new Date(endsAt).toISOString()
  if (input.odds === 'manual') {
    def.preset = scaleTickets(picked)
    delete def.itemIds
  } else {
    delete def.preset
    def.itemIds = picked.map((r) => r.item.id)
  }
  // pictures: a URL or an uploaded image (data:image/…); a new square picture drops the animation drawn from the old one,
  // and the case's own picture put back (a reset, a restored snapshot) brings its own animation back with it
  const isPic = (v: unknown): v is string => typeof v === 'string' && (/^data:image\//.test(v) || /^(\/|https?:\/\/)/.test(v))
  if (isPic(input.image) && input.image !== def.image) {
    def.image = input.image
    const own = BUILT_ART.get(def.artSlug ?? def.slug)
    if (own?.image === def.image && own.rig) def.rig = clone(own.rig)
    else delete def.rig
    if (own?.image === def.image && own.animation) def.animation = own.animation
    else delete def.animation
  }
  if (input.art && typeof input.art === 'object') {
    def.art ??= {}
    for (const k of ['wide', 'tall', 'full'] as const) {
      const v = input.art[k]
      if (v === null) def.art[k] = null
      else if (isPic(v) && v !== `/img/cases/${k}/${def.artSlug ?? def.slug}.webp`) def.art[k] = v
    }
  }
  if (input.card && CARDS.includes(input.card)) setCaseCard(slug, input.card)
  rebuildCase(def)
  // a card kind whose picture was taken away falls back to the plain card
  const built = builtCase(slug)!
  const kind = getHomeLayout().layout.cards[slug]
  if (kind && kind !== 'standard' && !built.art?.[kind]) setCaseCard(slug, 'standard')
  return getAdminCase(slug)
}

/** A copy of a case under a new slug: its art, contents, odds and card (a copy of a copy copies the original's art) */
function copyCase(from: string, slug?: string) {
  const def = defOf(from)
  const built = builtCase(from)!
  let next = slug ?? `${from}-copy`
  for (let n = 2; !slug && caseDefs.some((d) => d.slug === next); n++) next = `${from}-copy-${n}`
  const copy: CaseDef = {
    ...clone(def),
    id: `copy-${next}`,
    slug: next,
    name: `${def.name} copy`.slice(0, 40),
    artSlug: def.artSlug ?? def.slug,
    copyOf: def.slug,
    createdAt: new Date().toISOString().slice(0, 10),
    ...(built.limited && { limited: { ...built.limited } }),
    ...(built.endsAt && { endsAt: built.endsAt }),
  }
  // contents picked by the slug would change with it: name them
  if (!copy.preset) copy.itemIds = built.items.map((i) => i.id)
  caseDefs.push(copy)
  rebuildCase(copy)
  setCaseCard(next, getHomeLayout().layout.cards[from] ?? 'standard')
  placeLike(from, next)
  return copy
}
export const duplicateCase = (slug: string) => ({ case: toAdminCase(copyCase(slug)) })

export function deleteCase(slug: string) {
  if (!defOf(slug).copyOf) throw new MockError(400, 'Only copies can be deleted')
  removeCase(slug)
  return { ok: true }
}

// --- Bonuses --------------------------------------------------------------------------------

const itemsOf = (ids: string[]) => ids.map(findItem).filter((i): i is Item => !!i)
export function getAdminBonuses(): { bonuses: AdminBonuses } {
  const { daily, welcome, promos } = adminSettings.bonuses
  return {
    bonuses: clone({
      daily: { ...daily, tiers: daily.tiers.map((t) => ({ price: t.price, items: itemsOf(t.itemIds) })) },
      welcome: { total: welcome.total, price: welcome.price, items: itemsOf(welcome.itemIds) },
      promos,
    }),
  }
}
const idsOf = (items: unknown) => skinIds((Array.isArray(items) ? items : []).map((i) => (i as { id?: string })?.id))

export function setAdminBonuses(b: Partial<AdminBonuses>) {
  const cur = getAdminBonuses().bonuses
  const d = b.daily ?? cur.daily
  const tiers = (Array.isArray(d.tiers) ? d.tiers : []).map((t, k) => {
    const itemIds = idsOf(t?.items)
    if (itemIds.length < 2) throw new MockError(400, `Daily tier ${k + 1} needs at least 2 skins`)
    return { price: clamp(t?.price, 1, 100_000_000), itemIds }
  })
  if (!tiers.length) throw new MockError(400, 'The daily case needs a tier')
  const w = b.welcome ?? cur.welcome
  const welcomeIds = idsOf(w.items)
  if (welcomeIds.length < 2) throw new MockError(400, 'The welcome case needs at least 2 skins')

  const promos: AdminPromo[] = []
  for (const p of Array.isArray(b.promos) ? b.promos : cur.promos) {
    const code = String(p?.code ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new MockError(400, `"${code}" is not a code: 2–20 letters, digits, - or _`)
    const kind = p.kind === 'deposit' ? 'deposit' : 'coins'
    if (promos.some((o) => o.code === code && o.kind === kind)) throw new MockError(400, `${code} is listed twice`)
    promos.push({ code, kind, value: kind === 'deposit' ? clamp(p.value, 1, 10_000) : clamp(p.value, 1, 100_000_000) })
  }

  adminSettings.bonuses = {
    daily: { cooldownHours: clamp(d.cooldownHours, 0, 720), levelsPerTier: clamp(d.levelsPerTier, 1, 100), tiers },
    welcome: { total: clamp(w.total, 0, 50), price: clamp(w.price, 1, 100_000_000), itemIds: welcomeIds },
    promos,
  }
  const st = getMockState()
  st.welcomeLeft = Math.min(st.welcomeLeft, adminSettings.bonuses.welcome.total)
  clearBonusCases()
  return getAdminBonuses()
}

// --- Upgrade and PvP --------------------------------------------------------------------------

/** GET /api/rules: what the UI shows chances and limits by */
export const getGameRules = (): GameRules => clone(adminSettings.games)
export const getAdminGames = () => ({ games: getGameRules() })

export function setAdminGames(g: Partial<GameRules>) {
  const u = { ...adminSettings.games.upgrade, ...g.upgrade }
  const p = { ...adminSettings.games.pvp, ...g.pvp }
  const maxChanceBp = clamp(u.maxChanceBp, 100, 9900)
  const botNames = [...new Set((Array.isArray(p.botNames) ? p.botNames : []).map((n) => String(n).trim().slice(0, 20)).filter(Boolean))]
  if (!botNames.length) throw new MockError(400, 'Keep at least one bot name')
  adminSettings.games = {
    upgrade: { edgeBp: clamp(u.edgeBp, 0, 5000), maxChanceBp, minChanceBp: clamp(u.minChanceBp, 1, maxChanceBp), maxItems: clamp(u.maxItems, 1, 12) },
    pvp: { roundMs: clamp(p.roundMs, 1500, 15_000), maxRounds: clamp(p.maxRounds, 1, 50), botNames },
  }
  return getAdminGames()
}

// --- Live feed and big wins -------------------------------------------------------------------

export const getAdminFeed = () => ({ feed: clone(adminSettings.feed) })

export function setAdminFeed(f: Partial<AdminFeed>) {
  const cur = { ...adminSettings.feed, ...f }
  const upgradeShareBp = clamp(cur.upgradeShareBp, 0, 10_000)
  adminSettings.feed = {
    paused: !!cur.paused,
    rateBp: clamp(cur.rateBp, 0, 10_000),
    upgradeShareBp,
    pvpShareBp: clamp(cur.pvpShareBp, 0, 10_000 - upgradeShareBp),
  }
  return getAdminFeed()
}

const DAY = 24 * 3600_000
/** Every big win of the last 24 h, best first (home shows the top 6) */
export const getAdminBigWins = () => ({
  wins: bigWins.filter((w) => Date.parse(w.at) > Date.now() - DAY).sort((a, b) => b.multiplier - a.multiplier),
})

export function addBigWin(input: Partial<AdminBigWinInput>) {
  const nickname = String(input.nickname ?? '').trim().slice(0, 20)
  if (!nickname) throw new MockError(400, 'Pick a player')
  const item = findItem(String(input.itemId ?? ''))
  if (!item) throw new MockError(400, 'Pick a skin')
  const src = input.source === 'upgrade' ? UPGRADE_SRC : input.source === 'pvp' ? PVP_SRC : builtCase(String(input.source ?? ''))
  if (!src) throw new MockError(400, 'Pick where it was won')
  const multiplier = clamp(input.multiplier, 1, 1_000_000)
  const hoursAgo = Math.min(23.9, Math.max(0, Number(input.hoursAgo) || 0))
  const user = getMockState().user
  const level = adminSettings.players.find((p) => p.nickname === nickname)?.level ?? (nickname === user.nickname ? user.level : 1)
  pushBigWin(src, item, Math.max(1, Math.floor(item.price / multiplier)), { nickname, level }, new Date(Date.now() - hoursAgo * 3600_000))
  return getAdminBigWins()
}

export function removeBigWin(id: string) {
  const i = bigWins.findIndex((w) => w.id === id)
  if (i < 0) throw new MockError(404, 'This win is gone already')
  bigWins.splice(i, 1)
  syncBestToday()
  return getAdminBigWins()
}

// --- Users ------------------------------------------------------------------------------------

export function getAdminUsers(): { users: AdminUsers } {
  const { nickname, balance, level, levelProgress } = getMockState().user
  return { users: { player: { nickname, balance, level, levelProgress }, players: clone(adminSettings.players) } }
}

export function setAdminUsers(u: Partial<AdminUsers>) {
  const st = getMockState()
  if (u.player) {
    const nickname = String(u.player.nickname ?? '').trim().slice(0, 20)
    if (nickname.length < 2) throw new MockError(400, 'The nickname needs 2 letters or more')
    const level = clamp(u.player.level, 1, 999)
    const levelProgress = clamp(u.player.levelProgress, 0, 99)
    Object.assign(st.user, { nickname, balance: clamp(u.player.balance, 0, 1e12), level, levelProgress })
    st.xp = Math.round((levelProgress / 100) * xpFor(level))
  }
  if (u.players) {
    const players = u.players
      .map((p) => ({ nickname: String(p?.nickname ?? '').trim().slice(0, 20), level: clamp(p?.level, 1, 999) }))
      .filter((p, i, all) => p.nickname && all.findIndex((o) => o.nickname === p.nickname) === i)
    if (!players.length) throw new MockError(400, 'Keep at least one player: the live feed needs names')
    adminSettings.players = players
  }
  return getAdminUsers()
}

// --- Snapshot: every section at once ------------------------------------------------------------

export function exportSnapshot(): AdminSnapshot {
  return clone({
    cases: listAdminCases().cases,
    layout: getHomeLayout().layout,
    bonuses: getAdminBonuses().bonuses,
    games: adminSettings.games,
    feed: adminSettings.feed,
    bigWins,
    users: getAdminUsers().users,
  })
}

/** Takes a snapshot back section by section; a section (or a case) that no longer fits keeps its current value */
export function importSnapshot(snap: Partial<AdminSnapshot>) {
  const s = clone(snap)
  const step = (fn: () => void) => {
    try {
      fn()
    } catch {
      // stale shape: this piece stays as it is
    }
  }
  if (Array.isArray(s.cases)) {
    const cases = s.cases
    // copies made since go; copies in the snapshot come back under their own slug
    for (const d of [...caseDefs]) if (d.copyOf && !cases.some((c) => c.slug === d.slug)) removeCase(d.slug)
    for (const c of cases) {
      step(() => {
        if (!caseDefs.some((d) => d.slug === c.slug)) {
          if (!c.copyOf) return
          copyCase(c.copyOf, c.slug)
        }
        setAdminCase(c.slug, { ...c, items: c.items.map((i) => ({ id: i.id, tickets: i.tickets })) })
      })
    }
  }
  if (s.layout) step(() => setHomeLayout(s.layout!))
  if (s.bonuses) step(() => setAdminBonuses(s.bonuses!))
  if (s.games) step(() => setAdminGames(s.games!))
  if (s.feed) step(() => setAdminFeed(s.feed!))
  if (s.users) step(() => setAdminUsers(s.users!))
  if (Array.isArray(s.bigWins)) {
    step(() => {
      const wins = s.bigWins!.filter((w): w is BigWin => !!w?.id && !!w.item && typeof w.multiplier === 'number' && typeof w.at === 'string')
      bigWins.splice(0, bigWins.length, ...wins)
      syncBestToday()
    })
  }
  return exportSnapshot()
}

// What the mock starts with, taken before any change: POST /api/admin/reset goes back to it
const DEFAULTS = exportSnapshot()
// Each built-in case's picture with its animation: a snapshot carries only an "animated" flag, so a picture put back
// takes its rig or video from here (a copy from the case its art comes from)
const BUILT_ART = new Map(caseDefs.map((d) => [d.slug, { image: d.image, rig: d.rig && clone(d.rig), animation: d.animation }]))
export const resetAdmin = () => importSnapshot(DEFAULTS)
