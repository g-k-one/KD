// Which layout the PvP battle cards use while we choose one: a — the stage, b — open, c — versus. Set from the debug
// page (kept per browser) or with ?card=a|b|c on any page; goes away once a layout is picked.
export type PvpCardVariant = 'a' | 'b' | 'c'

export function usePvpCardVariant() {
  const saved = usePersisted<{ v: PvpCardVariant }>('kd_pvp_card', { v: 'a' })
  const q = useRoute().query.card
  return computed<PvpCardVariant>({
    get: () => (q === 'a' || q === 'b' || q === 'c' ? q : saved.value.v),
    set: (v) => (saved.value = { v }),
  })
}
