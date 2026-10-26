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

let depth = SHOUT.depth
onMounted(async () => {
  if (!box.value) return
  const narrow = box.value.clientWidth < 480
  if (narrow) depth = 11
  // built in the shout's style from the start: the chicken's scream then only types letters (a style change rebuilds
  // the glyphs in the worker, and that landed on the scream itself as a hitch); the plain label restyles on its rare path
  label = await ex.mount(box.value, { ...GOLD, ...SHOUT, depth, text: ' ', charset: props.text, fit: props.text })
})

/**
 * Moves the box so `word` stands centred on `at` (a viewport x: the screaming chicken), as far as it still fits inside
 * the box's own width. The engine's font size is fitted the same way (the fit line across, the box's height), so the
 * word's width is known before it is typed; a word as wide as the box stays put.
 */
function aim(word: string, at?: number) {
  const el = box.value
  if (!el) return
  el.style.translate = ''
  if (at == null) return
  const room = depth * GOLD.pad * 2 + 8 + GOLD.glow.size * 2
  const x = (aim.ctx ??= document.createElement('canvas').getContext('2d')!)
  x.font = GOLD.font.replace('{s}', '100')
  const fs = Math.min((el.clientWidth - room) / x.measureText(props.text).width * 100, (el.clientHeight - room) / 1.05)
  // the turned word's near end (K) comes out bigger than its flat width: a margin keeps it off the reel's frame
  const w = (x.measureText(word).width * fs) / 100
  const free = Math.max(0, (el.clientWidth - w * 1.12 - room) / 2)
  const r = el.getBoundingClientRect()
  const dx = Math.max(-free, Math.min(free, at - (r.left + r.width / 2)))
  el.style.translate = `${Math.round(dx)}px 0`
}
aim.ctx = null as CanvasRenderingContext2D | null
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
  aim(props.text)
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
 * 140 ms (only the new one pops) — then a shake; blast() blows it apart at the pop. Fast — twice as fast. `at`: the
 * chicken's centre (viewport x) — a chicken off the reel's middle (multi-open) shouts from its own place.
 */
function shout(word: string, fast = false, at?: number) {
  const t = label
  if (!t) return
  stop()
  aim(word, at)
  const my = ++run
  const k = fast ? 0.5 : 1
  active.value = true
  t.ready.then(() => {
    if (run !== my) return
    t.set({ text: word[0] })
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
