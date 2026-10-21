import type { CaseItem } from './types/api'

/** The Golden Chicken as it appears on the reel. It is never paid out; it triggers the respin. */
export function goldenChicken(chickenTickets: number): CaseItem {
  return {
    id: 'kurwa-chicken',
    weapon: 'KURWADROP',
    skin: 'Golden Chicken',
    rarity: 'gold',
    wear: 'FN',
    image: '/img/items/golden-chicken.svg',
    price: 0,
    tickets: chickenTickets,
    ticketFrom: 1,
    ticketTo: chickenTickets,
  }
}

export const KURWA_CHICKEN_ID = 'kurwa-chicken'
