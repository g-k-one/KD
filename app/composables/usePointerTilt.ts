// The pointer over a banner as -1…1 on both axes, for a BannerStage's depth: bind `onMove` / `onLeave` on the banner
// and put `vars` in its style. Mouse only: a finger has no hover to follow.
export function usePointerTilt() {
  const tilt = ref({ x: 0, y: 0 })
  function onMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tilt.value = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 }
  }
  const onLeave = () => (tilt.value = { x: 0, y: 0 })
  const vars = computed(() => ({ '--px': tilt.value.x, '--py': tilt.value.y }))
  return { onMove, onLeave, vars }
}
