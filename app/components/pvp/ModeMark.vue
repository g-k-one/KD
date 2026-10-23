<script setup lang="ts">
import type { ExtrudeHandle } from '~/composables/useExtrude'
import type { BattleMode } from '#shared/types/api'

/*
 * The room's hero: the mode as a 3D wordmark (Extrude, the same engine as KURWADROP!) in the mode's own colours —
 * Classic in our orange-gold, Crazy in violet, Team 2v2 in blue. It pops in on load and catches a shine on every
 * new round (`beat` changes). No WebGL / reduced motion: the same word as plain big type with the mode's gradient.
 */
const props = defineProps<{ mode: BattleMode; text: string; beat?: number | string }>()

const LOOK: Record<BattleMode, { face: string[]; side: string[]; glow: string; css: string }> = {
  classic: { face: ['#fff1c9', '#ffb13b', '#ff5f1f'], side: ['#ff5f1f', '#2a0f00'], glow: '#ff8a2b', css: 'linear-gradient(180deg, #fff1c9, #ffb13b 55%, #ff5f1f)' },
  crazy: { face: ['#ffe4ff', '#e879f9', '#8b5cf6'], side: ['#a21caf', '#1a0026'], glow: '#d946ef', css: 'linear-gradient(180deg, #ffe4ff, #e879f9 55%, #8b5cf6)' },
  team: { face: ['#e0f2ff', '#38bdf8', '#2563eb'], side: ['#1d4ed8', '#020b26'], glow: '#38bdf8', css: 'linear-gradient(180deg, #e0f2ff, #38bdf8 55%, #2563eb)' },
}

const ex = useExtrude()
const box = useTemplateRef<HTMLElement>('box')
const live = ref(false)
let label: ExtrudeHandle | null = null

onMounted(async () => {
  if (!box.value) return
  const l = LOOK[props.mode]
  const narrow = box.value.clientWidth < 480
  label = await ex.mount(box.value, {
    font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
    text: props.text,
    fit: props.text,
    face: l.face,
    side: l.side,
    metal: 0.6,
    bevel: 3,
    curve: 0.5,
    gloss: 0.5,
    glow: { color: l.glow, size: narrow ? 8 : 12, strength: 0.5 },
    strokes: [{ color: l.side[1], width: 1.4, inset: 0 }],
    depth: narrow ? 14 : 22,
    pad: 0.7,
    yaw: -8,
    pitch: 10,
    persp: 700,
    drag: false,
  })
  if (!label) return
  live.value = true
  await label.ready
  label.play('pop', { from: 'center' })
  setTimeout(() => label?.shine(), 500)
})
onBeforeUnmount(() => {
  label?.destroy()
  label = null
})
// a new round: a shine runs across and the letters sway once
watch(
  () => props.beat,
  () => {
    if (!label) return
    label.shine()
    label.play('wave', { time: 0.8 })
  },
)
</script>

<template>
  <div class="relative flex h-16 w-full max-w-[560px] items-center justify-center sm:h-24 lg:h-28">
    <div ref="box" class="absolute inset-0" aria-hidden="true" />
    <h1 class="kd-mark type-48-caps transition-opacity" :class="live && 'sr-only'" :style="{ backgroundImage: LOOK[mode].css }">{{ text }}</h1>
  </div>
</template>

<style scoped>
.kd-mark {
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 4px 0 rgb(0 0 0 / 0.5));
}
</style>
