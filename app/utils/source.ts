// Where a drop came from: a case, an upgrade or a PvP battle. The feed and big wins carry it in caseSlug
// ("upgrade" / "pvp"), so one helper turns it into a link and a picture.
export type DropSource = 'case' | 'upgrade' | 'pvp'

export const sourceOf = (slug: string): DropSource => (slug === 'upgrade' || slug === 'pvp' ? slug : 'case')

export const sourceLink = (slug: string) => {
  const s = sourceOf(slug)
  return s === 'case' ? `/case/${slug}` : `/${s}`
}

// little pictures for the same (feed tiles, the hover card): full colour, no plate, so they read over any skin
export const SOURCE_ART = { upgrade: '/img/source/upgrade.svg', pvp: '/img/source/pvp.svg' } as const
