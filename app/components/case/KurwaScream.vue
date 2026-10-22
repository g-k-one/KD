<script setup lang="ts">
import type { ExtrudeHandle } from '~/composables/useExtrude'

/*
 * The Golden Chicken screams: a gold 3D label over the reel (docs/motion.md → Reel → KURWADROP).
 *   in    — the label swings in from a turned-away 3D pose while its letters pop
 *   grow  — "KURWA!" stretches into the full scream one letter at a time, a wave runs through it, the long scream plays
 *   punch — a flash of the glow, a wobble, the shine sweeps across
 *   out   — it spins away and the letters shrink out
 * ~2.6 s (Fast ~1.5 s). The glyphs are prepared when the reel mounts (Web Worker), so the moment itself costs nothing.
 * No WebGL or reduced motion: play() resolves false and the reel keeps its plain banner.
 */
const props = defineProps<{
  /** The full scream, e.g. "KUUUUUUURWAAAA!" */
  text: string
}>()

const sfx = useSfx()
const haptics = useHaptics()
const ex = useExtrude()
const box = useTemplateRef<HTMLElement>('box')
const screaming = ref(false)
let label: ExtrudeHandle | null = null
let run = 0

/** "KUUURWAA!" → ["KURWA!", "KUURWAA!", "KUUURWAA!"]: every run of a letter grows by one per step */
function stages(full: string) {
  const runs: [string, number][] = []
  for (const ch of full) {
    const last = runs[runs.length - 1]
    if (last && last[0] === ch) last[1]++
    else runs.push([ch, 1])
  }
  const max = Math.max(1, ...runs.map((r) => r[1]))
  const out: string[] = []
  for (let k = 1; k <= max; k++) {
    const s = runs.map(([ch, n]) => ch.repeat(Math.min(n, k))).join('')
    if (s !== out[out.length - 1]) out.push(s)
  }
  return out
}

const GOLD = {
  font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
  face: ['#fff3c4', '#f5c649', '#c98a10'],
  side: ['#e4ae39', '#2a1400'],
  // a dark rim keeps the gold letters readable over the chicken's gold flash and the feathers
  strokes: [{ color: '#2a1400', width: 1.6, inset: 0 }],
  metal: 0.8,
  bevel: 3,
  curve: 0.5,
  gloss: 0.5,
  glow: { color: '#f5c649', size: 14, strength: 0.6 },
  skew: 0.14,
  depth: 26,
  // a near-frontal pose: the side shows little, so the fit keeps a small margin for it (pad, × depth)
  pad: 0.6,
  persp: 700,
  yaw: 0,
  pitch: 8,
  drag: false,
}

onMounted(async () => {
  if (!box.value) return
  // nothing on screen until play(); the atlas holds every letter of the scream, sized for its longest stage.
  // Phones: a thinner block and a tighter glow leave the letters more of the narrow reel
  const narrow = box.value.clientWidth < 480
  label = await ex.mount(box.value, {
    ...GOLD,
    ...(narrow && { depth: 16, glow: { ...GOLD.glow, size: 9 } }),
    text: '',
    charset: [...new Set(props.text)].join(''),
    fit: props.text,
  })
})
onBeforeUnmount(() => {
  run++
  label?.destroy()
  label = null
})

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Plays the scream; resolves true when it played, false when 3D is unavailable (the caller shows its banner) */
async function play(fast = false): Promise<boolean> {
  const t = label
  if (!t) return false
  const my = ++run
  const alive = () => run === my && label === t
  screaming.value = true   // at once, so the plain banner does not flash in first
  await t.ready
  if (!alive()) return false
  const steps = stages(props.text)
  t.stop()
  t.set({ text: steps[0] })
  // in: turned away and tilted back, the spring swings it round while the letters pop
  t.rotate(-80, 30)
  await t.play('pop', { stagger: fast ? 0.025 : 0.04, time: fast ? 0.3 : 0.42 })
  if (!alive()) return true
  // grow: the scream stretches, letters pop as they appear
  sfx.scream(fast ? 0.55 : 1)
  await t.count(steps.length - 1, {
    time: fast ? 0.4 : 0.8,
    wave: fast ? 6 : 9,
    format: (v: number) => steps[Math.min(steps.length - 1, Math.round(v))],
    onLand: () => {
      if (!alive()) return
      haptics.rare()
      t.rotate(240, -90, true)
      t.shine()
    },
  })
  if (!alive()) return true
  await wait(fast ? 80 : 220)
  if (!alive()) return true
  // out: a spin kick and the letters shrink away
  t.rotate(620, 60, true)
  await t.play('out', { stagger: fast ? 0.01 : 0.015 })
  if (alive()) {
    t.set({ text: '' })
    screaming.value = false
  }
  return true
}

/** Skip: the label is gone at once */
function stop() {
  run++
  screaming.value = false
  label?.stop()
  label?.set({ text: '' })
}

defineExpose({ play, stop, screaming })
</script>

<template>
  <div ref="box" class="pointer-events-none" aria-hidden="true" />
</template>
