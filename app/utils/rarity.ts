import type { Rarity } from '#shared/types/api'

export const RARITY_COLOR: Record<Rarity, string> = {
  covert: 'var(--color-item-covert)',
  classified: 'var(--color-item-classified)',
  restricted: 'var(--color-item-restricted)',
  milspec: 'var(--color-item-milspec)',
  industrial: 'var(--color-item-industrial)',
  gold: 'var(--color-item-gold)',
}

export const RARITIES = Object.keys(RARITY_COLOR) as Rarity[]

/** Soft radial glow behind an item, as in Figma "DropChip" / item cards. */
export function rarityGlow(rarity: Rarity, radius = 57) {
  return `radial-gradient(circle ${radius}px at 50% 50%, ${RARITY_COLOR[rarity]}, transparent), var(--color-neutral-4)`
}
