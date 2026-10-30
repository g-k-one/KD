import type { Battle } from '#shared/types/api'

/** Each battle mode's icon (its colour is the card's .kd-mode): the trophy for the most value, a falling line for the least, people for the teams */
export const PVP_MODE_ICON = { classic: 'mode-classic', crazy: 'mode-crazy', team: 'mode-team' } as const
/** …and its colour, as the cards wear it */
export const PVP_MODE_COLOR = { classic: 'var(--color-coin)', crazy: 'var(--color-item-classified)', team: 'var(--color-item-milspec)' } as const

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
