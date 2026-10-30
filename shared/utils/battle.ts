import type { BattleMode } from '../types/api'
import { hmacSha256Hex } from './pf'

/**
 * Who wins a PvP battle — the backend, the mock and the battle check all decide it with this one rule.
 *   classic: the most value takes it all · crazy: the least value takes it all
 *   team: seats 0–1 against 2–3, the team with more value wins
 * A tie is settled by the seeds, not by the seat: tie = parseInt(HMAC_SHA256(server_seed, block_id + ":tie")[0:8], 16),
 * and the winner is tied[tie % tied.length] (teams: [team 0–1, team 2–3][tie % 2]).
 */
/** From the last seat filling to the first reel: the countdown's 3, 2, 1, the VS and its smoke */
export const BATTLE_LEAD_MS = 4500

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
