// Where a drop came from: a case, an upgrade or a PvP battle. The feed and big wins carry it in caseSlug
// ("upgrade" / "pvp"), so one helper turns it into a link and an icon.
export type DropSource = 'case' | 'upgrade' | 'pvp'

export const sourceOf = (slug: string): DropSource => (slug === 'upgrade' || slug === 'pvp' ? slug : 'case')

export const sourceLink = (slug: string) => {
  const s = sourceOf(slug)
  return s === 'case' ? `/case/${slug}` : `/${s}`
}

export const SOURCE_ICON = { upgrade: 'upgrade', pvp: 'pvp' } as const
