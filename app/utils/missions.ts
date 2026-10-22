import type { MissionKind } from '#shared/types/api'

// Where each mission goal is done and its icon — shared by the daily missions and the mission chains
export const MISSION_LINK: Record<MissionKind, string> = {
  open_cases: '/',
  win_upgrade: '/upgrade',
  try_upgrade: '/upgrade',
  play_battle: '/pvp',
  create_battle: '/pvp/create',
  win_battle: '/pvp',
  sell_skin: '/profile?tab=inventory',
  spend: '/',
}
/** "Open 5 cases", "Play 3 PvP battles", "Play 50 coins" — the goal count picks the plural form */
export const missionTitle = (t: (key: string, named: Record<string, unknown>, plural: number) => string, kind: MissionKind, goal: number) =>
  t(`bonus.mission.${kind}`, { n: kind === 'spend' ? formatCoins(goal) : goal }, kind === 'spend' ? 2 : goal)

export const MISSION_ICON: Record<MissionKind, string> = {
  open_cases: 'cases',
  win_upgrade: 'upgrade',
  try_upgrade: 'upgrade',
  play_battle: 'pvp',
  create_battle: 'deck-plus',
  win_battle: 'trophy',
  sell_skin: 'wallet',
  spend: 'wallet',
}
