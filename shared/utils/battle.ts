import type { BattleMode } from '../types/api'
import { hmacSha256Hex } from './pf'

/**
 * Who wins a PvP battle — the backend, the mock and the battle check all decide it with this one rule.
 *   classic: the most value takes it all · crazy: the least value takes it all
 *   team: seats 0–1 against 2–3, the team with more value wins
 * A tie is settled by the seeds, not by the seat: tie = parseInt(HMAC_SHA256(server_seed, block_id + ":tie")[0:8], 16),
 * and the winner is tied[tie % tied.length] (teams: [team 0–1, team 2–3][tie % 2]).
 */
/**
 * What each winner of a battle takes. Alone: everything. A team: exactly half each. The skins are dealt priciest first, each to
 * whoever holds less so far; what is left between the two is settled by one skin: the cheapest of the richer side's that
 * covers the gap goes for its price in coins, shared so both come to the same sum. A lone odd cent stays with the first.
 */
export function splitWin<T extends { price: number }>(drops: T[], winners: number): { items: T[]; coins: number }[] {
  const shares = Array.from({ length: Math.max(1, winners) }, () => ({ items: [] as T[], coins: 0 }))
  const sum = (i: number) => shares[i]!.items.reduce((a, d) => a + d.price, 0)
  if (shares.length === 1) {
    shares[0]!.items = [...drops]
    return shares
  }
  for (const d of [...drops].sort((x, y) => y.price - x.price)) shares[sum(0) <= sum(1) ? 0 : 1]!.items.push(d)
  const hi = sum(0) >= sum(1) ? 0 : 1
  const gap = Math.floor((sum(hi) - sum(1 - hi)) / 2)
  if (gap > 0) {
    const skin = shares[hi]!.items.filter((d) => d.price >= gap).sort((x, y) => x.price - y.price)[0]!
    shares[hi]!.items.splice(shares[hi]!.items.indexOf(skin), 1)
    shares[hi]!.coins = skin.price - gap
    shares[1 - hi]!.coins = gap
  }
  return shares
}

/** From the last seat filling to the first reel: the countdown's 3, 2, 1, the VS and its smoke */
export const BATTLE_LEAD_MS = 3800

export function battleWinners(mode: BattleMode, totals: number[], tie: number): number[] {
  if (mode === 'team') {
    const a = totals[0]! + totals[1]!
    const b = totals[2]! + totals[3]!
    if (a !== b) return a > b ? [0, 1] : [2, 3]
    return tie % 2 === 0 ? [0, 1] : [2, 3]
  }
  const best = mode === 'crazy' ? Math.min(...totals) : Math.max(...totals)
  const tied = totals.flatMap((t, seat) => (t === best ? [seat] : []))
  return [tied[tie % tied.length]!]
}

/** The tie-break number of a battle, from its seeds (see battleWinners) */
export async function battleTie(serverSeed: string, blockId: string): Promise<number> {
  return Number.parseInt((await hmacSha256Hex(serverSeed, `${blockId}:tie`)).slice(0, 8), 16)
}

/** What each seat's drops are worth, in seat order */
export const battleTotals = (size: number, rounds: { price: number }[][]) =>
  Array.from({ length: size }, (_, seat) => rounds.reduce((a, r) => a + r[seat]!.price, 0))
