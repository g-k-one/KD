import type { HistoryEntry } from '#shared/types/api'

// Where a drop came from: a case, an upgrade or a PvP battle. The feed and big wins carry it in caseSlug
// ("upgrade" / "pvp"), so one helper turns it into a link and a picture.
export type DropSource = 'case' | 'upgrade' | 'pvp'

export const sourceOf = (slug: string): DropSource => (slug === 'upgrade' || slug === 'pvp' ? slug : 'case')

export const sourceLink = (slug: string) => {
  const s = sourceOf(slug)
  return s === 'case' ? `/case/${slug}` : `/${s}`
}

// little pictures for the same (feed tiles, the hover card): full colour, no plate, so they read over any skin
export const SOURCE_ART = { upgrade: '/img/source/upgrade.webp', pvp: '/img/source/pvp.webp' } as const

// A history row's game: a PvP battle, an upgrade or a case, and the picture that stands for it (the case's own, or the
// upgrade / PvP art); payments have none and keep their icon
export const isPvpEntry = (e: HistoryEntry) => e.title.startsWith('PvP')
export const historyArt = (e: HistoryEntry) => (isPvpEntry(e) ? SOURCE_ART.pvp : e.game === 'upgrade' ? SOURCE_ART.upgrade : e.caseImage)
