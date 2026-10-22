// Vibration on phones that support it (Android Chrome; iOS ignores navigator.vibrate). Settings → Vibration.
// Patterns from docs/motion.md: a light click on every stop, a double pulse for rare, a long roll for jackpots.
export function useHaptics() {
  const settings = useSettingsStore()
  const buzz = (pattern: number | number[]) => {
    if (!import.meta.client || !settings.settings.haptics || !('vibrate' in navigator)) return
    try {
      navigator.vibrate(pattern)
    } catch {
      // blocked by the browser: no vibration
    }
  }
  return {
    /** Reel stops, upgrade lands, chip pressed */
    tap: () => buzz(12),
    /** Covert drop, upgrade won */
    rare: () => buzz([30, 50, 30]),
    /** Gold, Golden Chicken */
    jackpot: () => buzz([80, 40, 80, 40, 160]),
    /** Lost upgrade */
    lose: () => buzz(60),
  }
}
