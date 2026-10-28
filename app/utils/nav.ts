// Main navigation. `icon` = desktop line icon, `mobileIcon` = filled Material Symbol from the mobile kit.
export interface NavItem {
  key: string
  to: string
  icon: string
  mobileIcon: string
  badge?: string
  // the colour its icon lights up in while you are there (the brand orange when unset)
  accent?: string
}

export const MAIN_NAV: NavItem[] = [
  { key: 'cases', to: '/', icon: 'cases', mobileIcon: 'm-cases' },
  { key: 'upgrade', to: '/upgrade', icon: 'upgrade', mobileIcon: 'm-upgrade' },
  { key: 'pvp', to: '/pvp', icon: 'pvp', mobileIcon: 'm-pvp', badge: 'nav.new' },
  ...(FEATURES.bonuses ? [{ key: 'bonuses', to: '/bonuses', icon: 'bonuses', mobileIcon: 'm-bonus' }] : []),
  { key: 'provablyFair', to: '/fairness', icon: 'shield', mobileIcon: 'm-fair', accent: 'text-success' },
]

export const INFO_NAV = [
  { key: 'faq', to: '/faq', mobileIcon: 'm-faq' },
  { key: 'contact', to: '/contact', mobileIcon: 'm-mail' },
  { key: 'terms', to: '/terms', mobileIcon: 'm-gavel' },
]

export const LEGAL_NAV = [
  { key: 'terms', to: '/terms' },
  { key: 'privacy', to: '/privacy' },
  { key: 'aml', to: '/aml' },
  { key: 'refund', to: '/refund' },
]

export function isNavActive(route: { path: string }, to: string) {
  if (to === '/') return route.path === '/' || route.path.startsWith('/case/')
  return route.path === to || route.path.startsWith(`${to}/`)
}
