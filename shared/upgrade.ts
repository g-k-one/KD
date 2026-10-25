import type { UpgradeRules } from './types/api'

/**
 * Upgrade odds, shared by the backend and the UI so they never disagree.
 * chance = stake / target × (100% − house edge), capped like the big upgrade sites. The numbers are admin
 * settings (GET /api/rules); these are the defaults: 5% edge, 80% cap, 1% floor, 6 pieces.
 * Basis points: 8000 = 80.00%.
 */
export const DEFAULT_UPGRADE_RULES: UpgradeRules = { edgeBp: 500, maxChanceBp: 8000, minChanceBp: 100, maxItems: 6 }

/** What the stake is worth against the target after the house edge: 0.95 at 5% */
export const upgradeKeep = (rules: UpgradeRules = DEFAULT_UPGRADE_RULES) => 1 - rules.edgeBp / 10_000

export function upgradeChanceBp(input: number, targetPrice: number, rules: UpgradeRules = DEFAULT_UPGRADE_RULES) {
  if (targetPrice <= 0 || input <= 0) return 0
  return Math.min(rules.maxChanceBp, Math.floor((input / targetPrice) * upgradeKeep(rules) * 10000))
}

/** Uncapped chance in %, for aiming: the target price that gives `pct` is input × 95 / pct */
export const targetPriceFor = (input: number, pct: number, rules: UpgradeRules = DEFAULT_UPGRADE_RULES) => (input * upgradeKeep(rules) * 100) / pct
