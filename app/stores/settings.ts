import { defineStore } from 'pinia'

export type DisplayCurrency = 'USD' | 'EUR' | 'PLN'

interface Settings {
  currency: DisplayCurrency
  sound: boolean
  volume: number
  streamerMode: boolean
}

const DEFAULTS: Settings = { currency: 'USD', sound: true, volume: 70, streamerMode: false }
const KEY = 'kd_settings'

// Stored in a cookie so SSR renders the same state as the client.
// The static artifact build has no SSR and may block cookies, so it uses localStorage instead.
function useSettingsSource() {
  if (!useRuntimeConfig().public.clientMock) {
    return useCookie<Settings>(KEY, { default: () => ({ ...DEFAULTS }), maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  }
  let initial: Settings = { ...DEFAULTS }
  try {
    initial = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    // storage unavailable
  }
  const source = ref<Settings>(initial)
  watch(source, (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      // storage unavailable
    }
  })
  return source
}

export const useSettingsStore = defineStore('settings', () => {
  const source = useSettingsSource()

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
