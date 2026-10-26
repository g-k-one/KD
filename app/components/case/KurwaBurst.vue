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

// KURWADROP's chicken screams: the shout is matte gold turned sideways (K nearest), no outline and no halo
const SHOUT = {
  face: ['#ffe9a8', '#f5c649', '#d0921c'],
  side: ['#c98a1a', '#3a1c00'],
  metal: 0,
  gloss: 0.12,
  strokes: [],
  glow: { ...GOLD.glow, strength: 0 },
  depth: 16,
  yaw: 22,
  pitch: 5,
  persp: 800,
}
const LOOK = { face: GOLD.face, side: GOLD.side, metal: GOLD.metal, gloss: GOLD.gloss, strokes: GOLD.strokes, glow: GOLD.glow, depth: GOLD.depth, yaw: GOLD.yaw, pitch: GOLD.pitch, persp: GOLD.persp }

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
      t.set({ ...LOOK, text: props.text })
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

/**
 * The chicken's shout (henShow's scream): `word` typed out — the first letters quickly, then one more letter every
 * 140 ms (only the new one pops) — then a shake; blast() blows it apart at the pop. Fast — twice as fast.
 */
function shout(word: string, fast = false) {
  const t = label
  if (!t) return
  stop()
  const my = ++run
  const k = fast ? 0.5 : 1
  active.value = true
  t.ready.then(() => {
    if (run !== my) return
    t.set({ ...SHOUT, text: word[0] })
    t.play('pop')
    t.play('flash')
    let ms = 0
    for (let i = 1; i < word.length; i++) {
      ms += (i < 5 ? 75 : i < word.length - 1 ? 140 : 120) * k
      later(ms, () => run === my && t.swap(word.slice(0, i + 1), { style: 'pop' }))
    }
    later(ms + 100 * k, () => run === my && t.play('shake', { time: 0.5 * k }))
  })
}
function blast() {
  const t = label
  if (!t) return
  const my = run
  t.play('blast')
  later(700, () => {
    if (run === my) active.value = false
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

defineExpose({ play, shout, blast, stop, active })
</script>

<template>
  <div ref="box" class="pointer-events-none" aria-hidden="true" />
</template>
