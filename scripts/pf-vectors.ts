// Generates shared/pf-test-vectors.json: the Go backend must reproduce every value.
// Usage: node scripts/pf-vectors.ts
import { writeFileSync } from 'node:fs'
import { pfNumber, PF_TICKETS, sha256Hex } from '../shared/utils/pf.ts'

const cases = [
  { serverSeed: 'kurwadrop-test-server-seed-0001', clientSeed: 'pierogi', nonce: 1 },
  { serverSeed: 'kurwadrop-test-server-seed-0001', clientSeed: 'pierogi', nonce: 2 },
  { serverSeed: 'kurwadrop-test-server-seed-0001', clientSeed: 'pierogi', nonce: 1000 },
  { serverSeed: '9f2c1e7a4b0d3e8f6a5c2b1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f', clientSeed: 'f3a9c1d27b', nonce: 1284 },
  { serverSeed: 'zażółć gęślą jaźń', clientSeed: 'Kraków:42', nonce: 0 },
]

const vectors = []
for (const c of cases) {
  const { hash, number } = await pfNumber(c.serverSeed, c.clientSeed, c.nonce)
  vectors.push({
    ...c,
    serverSeedHash: await sha256Hex(c.serverSeed),
    hmac: hash,
    number,
    ticket: (number % PF_TICKETS) + 1,
    upgradeRoll: (number % 10_000) / 100,
  })
}

writeFileSync(
  new URL('../shared/pf-test-vectors.json', import.meta.url),
  `${JSON.stringify({ formula: 'hmac = HMAC_SHA256(key=server_seed, msg=client_seed + ":" + nonce) hex; number = parseInt(hmac[0:8], 16); ticket = number % 1000000 + 1; upgradeRoll = (number % 10000) / 100', vectors }, null, 2)}\n`,
)
console.log(`wrote ${vectors.length} vectors`)
