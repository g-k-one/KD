/*
 * What every overlay (modal, sheet, drawer, dropdown) does while it is open, in one place, so stacked ones agree:
 *  - lock: the page under it stays still. One shared, counted lock: closing a confirm over the inventory keeps the
 *    page locked while the inventory is still open.
 *  - Escape closes only the topmost overlay, not every one listening.
 *  - trap (with a panel): the keyboard stays inside it — focus moves to the panel on open, Tab wraps around its
 *    controls, the page behind (#kd-page in the layout) is inert, and focus goes back to what opened it on close.
 *
 *   useOverlay(() => open.value, () => (open.value = false), { panel })
 */
interface Entry {
  trap: boolean
}
const stack: Entry[] = []
let locks = 0
let pageLock: Ref<boolean> | null = null

function lockPage(d: number) {
  // one VueUse lock for the whole app, outside any component, so no single overlay owns it
  pageLock ??= effectScope(true).run(() => useScrollLock(document.body))!
  locks = Math.max(0, locks + d)
  pageLock.value = locks > 0
}
function syncInert() {
  const page = document.getElementById('kd-page')
  if (page) page.inert = stack.some((e) => e.trap)
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const focusables = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.getClientRects().length)

export interface OverlayOptions {
  /** the dialog panel: with it, focus is trapped inside and the page behind goes inert */
  panel?: Ref<HTMLElement | null | undefined>
  /** lock the page's scroll while open (default true; a dropdown passes false) */
  lock?: boolean
}

export function useOverlay(active: () => boolean, close: () => void, { panel, lock = true }: OverlayOptions = {}) {
  if (!import.meta.client) return
  const me: Entry = { trap: !!panel }
  let on = false
  let back: HTMLElement | null = null

  function set(v: boolean) {
    if (v === on) return
    on = v
    if (lock) lockPage(v ? 1 : -1)
    if (v) {
      stack.push(me)
      if (panel) {
        back = document.activeElement as HTMLElement | null
        nextTick(() => panel.value?.focus({ preventScroll: true }))
      }
    } else {
      const i = stack.indexOf(me)
      if (i >= 0) stack.splice(i, 1)
      if (back?.isConnected) back.focus({ preventScroll: true })
      back = null
    }
    if (panel) syncInert()
  }
  watch(active, set, { immediate: true })
  onBeforeUnmount(() => set(false))

  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (!on || e.defaultPrevented) return
    if (e.key === 'Escape' && stack.at(-1) === me) {
      // marked handled, so an overlay under this one does not close in the same keypress
      e.preventDefault()
      close()
      return
    }
    // Tab belongs to the topmost trapping overlay (a dropdown open inside a modal does not trap)
    const el = panel?.value
    if (e.key !== 'Tab' || !el || stack.findLast((x) => x.trap) !== me) return
    const list = focusables(el)
    const first = list[0]
    const last = list.at(-1)
    const at = document.activeElement
    if (!first || !last) {
      e.preventDefault()
      el.focus()
    } else if (e.shiftKey && (at === first || at === el || !el.contains(at))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (at === last || !el.contains(at))) {
      e.preventDefault()
      first.focus()
    }
  })
}
