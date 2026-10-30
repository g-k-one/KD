// The fast spin is one choice for every game: the case page and the upgrade share it
export function useFast() {
  const pref = usePersisted('kd_fast', { on: false })
  return computed({ get: () => !!pref.value.on, set: (v: boolean) => (pref.value = { on: v }) })
}
