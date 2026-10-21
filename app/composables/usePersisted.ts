// Per-viewer preferences. Cookie in the normal build (SSR renders the same state as the client);
// localStorage in the static artifact build, which has no SSR and may block cookies.
export function usePersisted<T extends object>(key: string, defaults: T): Ref<T> {
  if (!useRuntimeConfig().public.clientMock) {
    return useCookie<T>(key, { default: () => ({ ...defaults }), maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' }) as Ref<T>
  }
  let initial: T = { ...defaults }
  try {
    initial = { ...defaults, ...JSON.parse(localStorage.getItem(key) ?? '{}') }
  } catch {
    // storage unavailable
  }
  const source = ref(initial) as Ref<T>
  watch(source, (v) => {
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {
      // storage unavailable
    }
  })
  return source
}
