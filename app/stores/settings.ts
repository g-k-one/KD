import { defineStore } from 'pinia'

export type DisplayCurrency = 'USD' | 'EUR' | 'PLN'

interface Settings {
  currency: DisplayCurrency
  sound: boolean
  volume: number
  streamerMode: boolean
  haptics: boolean
}

const DEFAULTS: Settings = { currency: 'USD', sound: true, volume: 70, streamerMode: false, haptics: true }

export const useSettingsStore = defineStore('settings', () => {
  const source = usePersisted<Settings>('kd_settings', DEFAULTS)

  const settings = computed(() => ({ ...DEFAULTS, ...source.value }))

  function update(patch: Partial<Settings>) {
    source.value = { ...settings.value, ...patch }
  }

  function reset() {
    source.value = { ...DEFAULTS }
  }

  return { settings, update, reset }
})

export const CURRENCIES: Array<{ code: DisplayCurrency; label: string }> = [
  { code: 'USD', label: 'USD — $' },
  { code: 'EUR', label: 'EUR — €' },
  { code: 'PLN', label: 'PLN — zł' },
]
