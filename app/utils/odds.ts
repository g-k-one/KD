import type { CaseItem } from '#shared/types/api'

/**
 * Picks a filler item with the case's real drop odds (tickets out of 1 000 000), so the reel
 * shows rare items exactly as often as they actually drop — no visual near-miss inflation.
 * `rand` defaults to Math.random; pass a seeded generator for a deterministic strip.
 */
export function pickByTickets(items: CaseItem[], rand: () => number = Math.random): CaseItem {
  const total = items.reduce((a, i) => a + i.tickets, 0)
  let r = rand() * total
  for (const it of items) {
    r -= it.tickets
    if (r < 0) return it
  }
  return items[items.length - 1]!
}

/** Small seeded PRNG (mulberry32) for strips that must match between server and client. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
