// Home banner variants to compare (prototype): the card as it is, or full width —
//   a — one scene edge to edge, no frame, the art spilling past the content column
//   b — the three banners (home, bonuses, Provably Fair) on a carousel, the neighbours peeking at the screen's sides
//   c — a, with the latest real drops from the live feed drifting behind it
// Picked by ?hero=a|b|c or from the debug dock; kept for the visit.
export type HeroVariant = 'card' | 'a' | 'b' | 'c'
const VARIANTS: HeroVariant[] = ['card', 'a', 'b', 'c']

export function useHeroVariant() {
  const route = useRoute()
  const fromQuery = String(route.query.hero ?? '') as HeroVariant
  return useState<HeroVariant>('kd-hero-variant', () => (VARIANTS.includes(fromQuery) ? fromQuery : 'card'))
}
