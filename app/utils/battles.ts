import type { Battle, BattleCaseRef } from '#shared/types/api'

/** Collapses consecutive rounds of the same case into thumbnails with a quantity badge. */
export function groupRounds(rounds: BattleCaseRef[]) {
  const out: Array<BattleCaseRef & { qty: number; from: number }> = []
  rounds.forEach((r, i) => {
    const last = out[out.length - 1]
    if (last && last.slug === r.slug) last.qty += 1
    else out.push({ ...r, qty: 1, from: i })
  })
  return out
}

/** Which round is playing right now (−1 before start, rounds.length when done). */
export function battleClock(b: Battle, now: number) {
  if (!b.startedAt) return { round: -1, inRound: 0 }
  const t = now - Date.parse(b.startedAt)
  if (t < 0) return { round: -1, inRound: 0 }
  const round = Math.floor(t / b.roundMs)
  return { round: Math.min(round, b.rounds.length), inRound: t - round * b.roundMs }
}

/** Sum of drops each slot has revealed by the end of `throughRound` (exclusive). */
export function slotTotals(b: Battle, throughRound: number) {
  return b.slots.map((s) => (b.results ?? []).slice(0, Math.max(0, throughRound)).reduce((a, r) => a + (r.drops[s.slot]?.price ?? 0), 0))
}
