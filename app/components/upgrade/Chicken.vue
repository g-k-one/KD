<script setup lang="ts">
import type { ExtrudeHandle } from '~/composables/useExtrude'

/*
 * The meme chicken on the upgrade dial, for close calls only (presentation, it never changes a chance):
 *   nearWin  — won by a hair: peeks out, relieved ("By a feather!" + the margin)
 *   nearLose — missed by a hair: peeks out and teases ("LOL, not this time")
 * The line is picked at random from a short set so it does not repeat every time. It is set in matte 3D letters
 * (Extrude, no metal: warm yellow for a near win, white for the tease) with the chicken tucked right under it; without
 * WebGL / with reduced motion the flat bubble stays.
 */
const props = defineProps<{ mood: 'nearWin' | 'nearLose' | null; margin?: number }>()
const { tm, rt } = useI18n()
const line = ref('')
watch(
  () => props.mood,
  (m) => {
    if (!m) return
    const lines = tm(`upgrade.chicken.${m}`) as unknown as string[]
    const pick = lines[Math.floor(Math.random() * lines.length)]
    line.value = pick ? rt(pick as never) : ''
  },
  { immediate: true },
)
const text = computed(() => (props.mood ? `${line.value}${props.margin != null ? ` ${props.margin.toFixed(2)}` : ''}` : ''))

const ex = useExtrude()
const box = useTemplateRef<HTMLElement>('box')
/** pending until the 3D label mounts or fails; plain = the flat bubble */
const look = ref<'pending' | '3d' | 'plain'>('pending')
let label: ExtrudeHandle | null = null
const STYLE = (mood: 'nearWin' | 'nearLose') => ({
  font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
  face: mood === 'nearWin' ? ['#fff7cf', '#ffd84a', '#ffab1f'] : ['#ffffff', '#f2f2f5', '#c9cbd3'],
  side: mood === 'nearWin' ? ['#e07b00', '#4a2200'] : ['#8a8d99', '#24262d'],
  metal: 0,
  gloss: 0.2,
  bevel: 3,
  curve: 0.6,
  depth: 12,
  strokes: [{ color: mood === 'nearWin' ? '#3a1a00' : '#1b1c21', width: 1.2, inset: 0 }],
  glow: { color: mood === 'nearWin' ? '#ffb13b' : '#ffffff', size: 6, strength: 0.35 },
  // the engine keeps depth × pad × 2 + glow × 2 of margin around the letters: kept small so they fill the box
  pad: 0.5,
  yaw: -8,
  pitch: 12,
  persp: 700,
  drag: false,
})
watch(
  () => props.mood,
  async (m) => {
    label?.destroy()
    label = null
    look.value = 'pending'
    if (!m) return
    await nextTick()
    if (!box.value || props.mood !== m) return
    const t = await ex.mount(box.value, { ...STYLE(m), text: text.value, fit: text.value })
    if (props.mood !== m) return t?.destroy()
    if (!t) return (look.value = 'plain')
    label = t
    look.value = '3d'
    // in, a beat to read it, out: the letters pop from the centre and fly off; the chicken stays
    t.ready.then(async () => {
      if (label !== t) return
      await t.play('pop', { from: 'center' })
      setTimeout(() => label === t && t.play('fly'), 1600)
    })
  },
  { immediate: true },
)
onBeforeUnmount(() => label?.destroy())
</script>

<template>
  <Transition name="kd-chick">
    <span v-if="mood" class="kd-chick-wrap pointer-events-none absolute left-1/2 z-[4] flex flex-col items-center" :class="`is-${mood}`">
      <!-- the line in 3D letters; the flat bubble only when 3D is unavailable -->
      <span ref="box" class="kd-chick-3d relative z-[1] block h-20 w-[300px] lg:h-24 lg:w-[400px]" :class="look !== '3d' && 'is-off'" aria-hidden="true" />
      <span v-if="look === 'plain'" class="kd-bubble type-16-caps absolute top-6 whitespace-nowrap rounded-xl px-2.5 py-1" :class="mood === 'nearLose' ? 'is-tease' : 'is-phew'">
        {{ line }}<template v-if="margin != null"> · {{ margin.toFixed(2) }}</template>
      </span>
      <span class="sr-only">{{ text }}</span>
      <!-- one sprite, two meme frames: laughing at a near miss, wiping its brow on a near win -->
      <span class="kd-chick kd-chick-meme -mt-7 block size-24 lg:-mt-9 lg:size-28" :class="mood === 'nearLose' ? 'is-lol' : 'is-phew'" aria-hidden="true" />
    </span>
  </Transition>
</template>

<style scoped>
/* peeks out from under the dial's bottom edge, most of the body hidden */
.kd-chick-wrap {
  bottom: -56px;
  translate: -50% 0;
}
.kd-chick {
  filter: drop-shadow(0 8px 18px rgb(228 174 57 / 0.55));
  transform-origin: 50% 100%;
}
.kd-chick-meme {
  background: url('/img/items/chicken-moods.webp') no-repeat 0 0 / 200% 100%;
  filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.5));
}
.kd-chick-meme.is-phew {
  background-position: 100% 0;
}
.is-nearWin .kd-chick {
  animation: kd-chick-phew 1.2s var(--ease-in-out) infinite;
}
.is-nearLose .kd-chick {
  animation: kd-chick-laugh 420ms var(--ease-in-out) 4;
}
@keyframes kd-chick-phew {
  50% {
    translate: 0 -4px;
    rotate: 3deg;
  }
}
@keyframes kd-chick-laugh {
  50% {
    rotate: -8deg;
    scale: 1.04 0.96;
  }
}
/* the 3D label keeps its box (so the chicken does not jump) and stays invisible until its letters pop */
.kd-chick-3d.is-off {
  visibility: hidden;
}
.kd-bubble {
  /* the flat fallback also comes and goes */
  animation:
    kd-bubble-in 420ms var(--ease-spring) 260ms both,
    kd-bubble-out 300ms var(--ease-in) 2.3s forwards;
}
@keyframes kd-bubble-out {
  to {
    opacity: 0;
    scale: 0.8;
  }
}
.kd-bubble.is-phew {
  background: linear-gradient(90deg, var(--color-gold), var(--color-gold-light), var(--color-item-gold));
  color: var(--color-neutral-1);
}
.kd-bubble.is-tease {
  background: var(--color-neutral-15);
  color: var(--color-neutral-1);
}
@keyframes kd-bubble-in {
  0% {
    opacity: 0;
    scale: 0.4;
    translate: 0 8px;
  }
}
.kd-chick-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate 600ms var(--ease-spring);
}
.kd-chick-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-in),
    translate var(--dur-base) var(--ease-in);
}
.kd-chick-enter-from {
  opacity: 0;
  translate: -50% 70px;
}
.kd-chick-leave-to {
  opacity: 0;
  translate: -50% 40px;
}
</style>
