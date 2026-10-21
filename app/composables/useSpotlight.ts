// Feeds the pointer position into .kd-spotlight as --spot-x / --spot-y.
export function useSpotlight() {
  function onPointerMove(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }
  return { onPointerMove }
}
