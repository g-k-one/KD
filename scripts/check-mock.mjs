// Regression checks for the mock API (server/utils/mock-*.ts), run straight in Node: `node scripts/check-mock.mjs`.
// Each one replays a bug the 28 Oct review found, so it cannot come back unnoticed; CI runs them before the Pages build.
// The front-end ones (Forge leaks, the hero hen, overlays and focus) need a browser and are not here.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const jiti = createJiti(import.meta.url, { alias: { '#shared': root('shared') } })
const db = await jiti.import(root('server/utils/mock-db.ts'))
const admin = await jiti.import(root('server/utils/mock-admin.ts'))
const { pfTicket } = await jiti.import(root('shared/utils/pf.ts'))

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`ok    ${name}`)
  } catch (e) {
    failed++
    console.log(`FAIL  ${name}\n      ${e.message}`)
  }
}
const status = async (fn) => {
  try {
    await fn()
    return 200
  } catch (e) {
    return e.statusCode ?? e.status ?? 500
  }
}
const balance = () => db.getMockState().user.balance
const cheapCase = () => db.getCaseSections().flatMap((s) => s.cases).find((c) => c.price > 0 && c.price < 300)

await check('a seed rotation during case opens: every history line verifies under its own seed', async () => {
  const slug = cheapCase().slug
  await Promise.all([db.openCase(slug, 3, false), db.rotateSeeds(), db.openCase(slug, 2, false)])
  await db.rotateSeeds()
  const seeds = await db.getSeeds()
  const h = await db.getHistory()
  const lines = (h.entries ?? h.items ?? h).filter((e) => e.game === 'case').slice(0, 5)
  assert.equal(lines.length, 5)
  for (const e of lines) {
    const s = seeds.history.find((x) => x.serverSeedHash === e.seedHash)
    assert.ok(s?.serverSeed, `seed ${e.seedHash.slice(0, 8)} not revealed`)
    assert.equal((await pfTicket(s.serverSeed, s.clientSeed, e.nonce)).ticket, e.ticket, `nonce ${e.nonce}`)
  }
})

await check('bad amounts are refused before the wallet moves', async () => {
  const before = balance()
  const target = db.getMarket().items[50].id
  assert.equal(await status(() => db.deposit(50, 'XXX', 'card')), 400, 'unknown currency')
  assert.equal(await status(() => db.deposit(NaN, 'USD', 'card')), 400, 'no amount')
  assert.equal(await status(() => db.upgrade([], NaN, target)), 400, 'NaN coin stake')
  assert.equal(await status(() => db.upgrade([], 1e300, target)), 400, 'huge coin stake')
  assert.equal(await status(() => db.upgrade([], 10, 'no-such-skin')), 404, 'unknown target')
  assert.equal(balance(), before)
  assert.ok(Number.isFinite(db.getMockState().xp))
})

await check('rewards claimed at once pay out once', async () => {
  db.applyDebugState({ resetDaily: true, resetWelcome: true, levels: 2 })
  const many = (fn, n) => Promise.all(Array.from({ length: n }, () => status(fn))).then((s) => s.filter((x) => x === 200).length)
  const welcome = db.getMockState().welcomeLeft
  const levels = db.getMockState().levelCases.length
  assert.equal(await many(() => db.openDaily(), 5), 1, 'daily')
  assert.equal(await many(() => db.openWelcome(), welcome + 3), welcome, 'welcome')
  assert.equal(await many(() => db.openLevelCase(), levels + 3), levels, 'level cases')
})

await check('admin reset brings an animated case its animation back', async () => {
  const slug = 'kurwa-classic'
  const c0 = admin.getAdminCase(slug).case
  assert.ok(c0.animated, 'starts animated')
  admin.setAdminCase(slug, { ...c0, image: '/img/cases/zloty-rush.webp', items: c0.items.map((i) => ({ id: i.id, tickets: i.tickets })) })
  assert.equal(admin.getAdminCase(slug).case.animated, false, 'a new picture drops it')
  admin.resetAdmin()
  const c2 = admin.getAdminCase(slug).case
  assert.equal(c2.image, c0.image)
  assert.ok(c2.animated, 'reset brings it back')
})

if (failed) {
  console.log(`\n${failed} failed`)
  process.exit(1)
}
