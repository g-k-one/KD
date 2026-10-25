import type { HomeCardKind, HomeLayout, SectionTheme } from '#shared/types/api'

// The admin's home layout, edited in place on home (prototype): rows in order, their scenes, each case's card.
// Every change goes to the backend at once and home refetches, so what you see is what players get.
export function useHomeLayout() {
  const prefs = usePersisted('kd_home_edit', { on: false })
  const editing = computed({ get: () => prefs.value.on, set: (on: boolean) => (prefs.value = { ...prefs.value, on }) })
  const layout = useState<HomeLayout | null>('home-layout', () => null)

  async function load() {
    layout.value = (await $fetch<{ layout: HomeLayout }>('/api/admin/home-layout')).layout
  }
  async function save(next: HomeLayout) {
    layout.value = next
    layout.value = (await $fetch<{ layout: HomeLayout }>('/api/admin/home-layout', { method: 'PUT', body: { layout: next } })).layout
    await refreshNuxtData('cases')
  }
  async function reset() {
    layout.value = (await $fetch<{ layout: HomeLayout }>('/api/admin/home-layout/reset', { method: 'POST' })).layout
    await refreshNuxtData('cases')
  }

  function patchRow(id: string, patch: { hidden?: boolean; theme?: SectionTheme | null }) {
    if (!layout.value) return
    save({ ...layout.value, sections: layout.value.sections.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  }
  /** Swaps a row with the nearest shown row above or below it (hidden rows keep their places) */
  function moveRow(id: string, dir: -1 | 1) {
    if (!layout.value) return
    const rows = [...layout.value.sections]
    const from = rows.findIndex((r) => r.id === id)
    let to = from + dir
    while (rows[to]?.hidden) to += dir
    if (from < 0 || !rows[to]) return
    ;[rows[from], rows[to]] = [rows[to]!, rows[from]!]
    save({ ...layout.value, sections: rows })
  }
  function setCard(slug: string, kind: HomeCardKind) {
    if (!layout.value) return
    const cards = { ...layout.value.cards }
    if (kind === 'standard') delete cards[slug]
    else cards[slug] = kind
    save({ ...layout.value, cards })
  }
  /** Where a shown row stands among the shown rows: it can't go up from the top or down from the bottom */
  function rowPlace(id: string) {
    const shown = (layout.value?.sections ?? []).filter((r) => !r.hidden)
    const i = shown.findIndex((r) => r.id === id)
    return { first: i <= 0, last: i === shown.length - 1 }
  }

  return { editing, layout, load, reset, patchRow, moveRow, setCard, rowPlace }
}
