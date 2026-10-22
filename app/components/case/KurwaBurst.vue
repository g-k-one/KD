<script setup lang="ts">
import type { ExtrudeHandle } from '~/composables/useExtrude'

/*
 * KURWADROP: a gold 3D "KURWADROP!" over the reel while the Golden Chicken screams (docs/motion.md → Reel → KURWADROP).
 *   in    — the letters pop out from the centre with a flash, together with the chicken growing and squawking
 *   show  — a shine sweeps across, the letters sway in a soft wave
 *   out   — the letters fly at the viewer and fade, gold feathers burst out of the word
 * It fits the reel's existing pause before the respin: 1.7 s (Fast — twice as fast, ~0.85 s). The glyphs are prepared
 * when KURWADROP is switched on (Web Worker), so the moment itself costs nothing. No WebGL / reduced motion: play()
 * resolves false and the reel keeps its plain banner.
 */
const props = defineProps<{ text: string }>()

const ex = useExtrude()
const fx = useForge()
const haptics = useHaptics()
const box = useTemplateRef<HTMLElement>('box')
const active = ref(false)
let label: ExtrudeHandle | null = null
let run = 0
const timers: ReturnType<typeof setTimeout>[] = []

const GOLD = {
  font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
  face: ['#fff3c4', '#f5c649', '#c98a10'],
  side: ['#e4ae39', '#2a1400'],
  metal: 0.8,
  bevel: 3,
  curve: 0.5,
  gloss: 0.5,
  glow: { color: '#f5c649', size: 12, strength: 0.55 },
  strokes: [{ color: '#2a1400', width: 1.4, inset: 0 }],
  depth: 22,
  // near-frontal pose: the side shows little, so the fit keeps a small margin for it (× depth)
  pad: 0.7,
  yaw: -10,
  pitch: 10,
  persp: 700,
  drag: false,
}

onMounted(async () => {
  if (!box.value) return
  const narrow = box.value.clientWidth < 480
  label = await ex.mount(box.value, { ...GOLD, ...(narrow && { depth: 14, glow: { ...GOLD.glow, size: 8 } }), text: ' ', charset: props.text, fit: props.text })
})
onBeforeUnmount(() => {
  stop()
  label?.destroy()
  label = null
})

const later = (ms: number, f: () => void) => timers.push(setTimeout(f, ms))

/** Plays the burst; resolves true when it played (after ~1.65 s, Fast ~0.85 s), false when 3D is unavailable */
function play(fast = false): Promise<boolean> {
  const t = label
  if (!t) return Promise.resolve(false)
  stop()
  const my = ++run
  const k = fast ? 0.5 : 1
  const speed = 1 / k
  active.value = true
  return new Promise((resolve) => {
    t.ready.then(() => {
      if (run !== my) return resolve(true)
      t.set({ text: props.text })
      // in: letters pop from the centre, a flash on top
      t.play('pop', { speed, from: 'center' })
      t.play('flash', { speed })
      // show: the shine, and a soft wave as a layer
      later(450 * k, () => {
        t.shine()
        t.play('wave', { time: 0.9 * k })
      })
      // out: the letters fly at the viewer and fade, gold feathers burst out of the word
      later(1200 * k, () => {
        t.play('fly', { speed: speed * 1.6 })   // ~0.42 с: буквы улетели до начала респина
        haptics.tap()
        if (box.value) fx.at('feathers:gold', box.value, 1.1)
      })
      later(1650 * k, () => {
        if (run !== my) return
        active.value = false
        resolve(true)
      })
    })
  })
}

/** Skip: gone at once */
function stop() {
  run++
  timers.splice(0).forEach(clearTimeout)
  active.value = false
  label?.stop()
  label?.set({ text: ' ' })
}

defineExpose({ play, stop, active })
</script>

<template>
  <div ref="box" class="pointer-events-none" aria-hidden="true" />
</template>
