// Pull a bottom sheet down to close it (phones): grab it anywhere — the handle, the header, or the content when the
// content is scrolled to the top — and it follows the finger; let go past a quarter of its height or with a flick and
// it slides away, otherwise it springs back. Pulling up, sideways, or inside a scrolled list scrolls as usual.
export function useSheetDrag(
  panel: Readonly<Ref<HTMLElement | null>>,
  close: () => void,
  opts: { scrim?: Readonly<Ref<HTMLElement | null>>; enabled?: () => boolean } = {},
) {
  let y0 = 0
  let x0 = 0
  let dy = 0
  let state: 'idle' | 'maybe' | 'drag' | 'off' = 'idle'
  let samples: { y: number; t: number }[] = []

  // Something between the finger and the panel is scrolled (a list, the body): its own scroll wins
  const scrolledAbove = (target: EventTarget | null) => {
    for (let el = target as HTMLElement | null; el && el !== panel.value?.parentElement; el = el.parentElement) {
      if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true
    }
    return false
  }
  const paint = (y: number, transition = '') => {
    const el = panel.value
    if (!el) return
    el.style.transition = transition
    el.style.transform = y ? `translate3d(0, ${y}px, 0)` : ''
    const s = opts.scrim?.value
    if (s) {
      s.style.transition = transition && 'opacity 280ms var(--ease-out)'
      s.style.opacity = y ? String(Math.max(0, 1 - y / el.offsetHeight)) : ''
    }
  }

  useEventListener(
    panel,
    'touchstart',
    (e: TouchEvent) => {
      const t = e.touches[0]
      if (e.touches.length > 1 || !t || (opts.enabled && !opts.enabled())) return (state = 'off')
      if ((e.target as HTMLElement).closest('input[type="range"], [data-no-sheet-drag]')) return (state = 'off')
      state = scrolledAbove(e.target) ? 'off' : 'maybe'
      y0 = t.clientY
      x0 = t.clientX
      dy = 0
      samples = [{ y: t.clientY, t: e.timeStamp }]
    },
    { passive: true },
  )
  useEventListener(
    panel,
    'touchmove',
    (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t || state === 'off' || state === 'idle') return
      const d = t.clientY - y0
      if (state === 'maybe') {
        if (Math.abs(t.clientX - x0) > Math.abs(d)) return (state = 'off')
        if (d < -2) return (state = 'off')
        // Claim the gesture on its first downward move, or the browser starts its own overscroll and won't give it back
        if (e.cancelable) e.preventDefault()
        if (d < 6) return
        state = 'drag'
      }
      e.preventDefault()
      dy = Math.max(0, t.clientY - y0)
      samples.push({ y: t.clientY, t: e.timeStamp })
      if (samples.length > 5) samples.shift()
      paint(dy)
    },
    { passive: false },
  )
  const end = () => {
    if (state !== 'drag') return (state = 'idle')
    state = 'idle'
    const el = panel.value
    const a = samples[0]
    const b = samples.at(-1)
    const v = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0
    if (el && (dy > el.offsetHeight * 0.25 || (v > 0.4 && dy > 24))) {
      paint(el.offsetHeight, 'transform 200ms var(--ease-in)')
      close()
    } else {
      paint(0, 'transform 320ms var(--ease-out)')
    }
  }
  useEventListener(panel, 'touchend', end, { passive: true })
  useEventListener(panel, 'touchcancel', end, { passive: true })
}
