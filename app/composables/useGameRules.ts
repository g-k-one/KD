import type { GameRules } from '#shared/types/api'
import { DEFAULT_UPGRADE_RULES } from '#shared/upgrade'

// The upgrade and PvP numbers the backend plays by (admin settings, GET /api/rules). The defaults render first,
// the real ones arrive once per visit; the admin panel puts its saved rules here, so the site follows at once.
export function useGameRules() {
  const rules = useState<GameRules>('game-rules', () => ({
    upgrade: { ...DEFAULT_UPGRADE_RULES },
    pvp: { roundMs: 4200, maxRounds: 25, botNames: [] },
  }))
  const loaded = useState('game-rules-loaded', () => false)
  if (import.meta.client && !loaded.value) {
    loaded.value = true
    $fetch<GameRules>('/api/rules')
      .then((r) => (rules.value = r))
      .catch(() => (loaded.value = false))
  }
  return rules
}
