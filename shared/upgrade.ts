/**
 * Upgrade odds, shared by the backend and the UI so they never disagree.
 * chance = stake / target × 95% (5% house edge), capped at 80% like the big upgrade sites.
 * Basis points: 8000 = 80.00%.
 */
export const UPGRADE_EDGE = 0.95
export const UPGRADE_MAX_BP = 8000
export const UPGRADE_MAX_PCT = UPGRADE_MAX_BP / 100

export function upgradeChanceBp(input: number, targetPrice: number) {
  if (targetPrice <= 0 || input <= 0) return 0
  return Math.min(UPGRADE_MAX_BP, Math.floor((input / targetPrice) * UPGRADE_EDGE * 10000))
}

/** Uncapped chance in %, for aiming: the target price that gives `pct` is input × 95 / pct */
export const targetPriceFor = (input: number, pct: number) => (input * UPGRADE_EDGE * 100) / pct
