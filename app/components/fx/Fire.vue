<script setup lang="ts">
import { FORGE_KEY, type ForgeLayer, type ForgeHandle } from '~/composables/useForge'

/*
 * Wraps a label (badge, multiplier) and sets it on fire with a looping Forge effect (kdBurn by default).
 * The effect box is a square sized from the label's width, so nothing is clipped, and placed so the
 * effect's base line (y ≈ 300 of 360) runs through the label's middle: the glow hugs the label and the
 * embers rise from its whole width. Draws on the nearest provided Forge layer (provideForge on the
 * section) so it stays under the sticky header and behind the label text. Runs only while on screen.
 */
const props = withDefaults(defineProps<{ effect?: string; spread?: number; on?: boolean }>(), { effect: 'kdBurn', spread: 1.35, on: true })
const root = useTemplateRef<HTMLElement>('root')
const box = useTemplateRef<HTMLElement>('box')
const { width: w, height: h } = useElementSize(root)
const side = computed(() => Math.max(72, w.value * props.spread))
const fx = inject<ForgeLayer | null>(FORGE_KEY, null) ?? useForge()
let handle: ForgeHandle | null = null
let want = false

async function start() {
  want = true
  if (handle || !box.value || !props.on) return
  const hd = await fx.play(props.effect, { el: box.value, loop: true })
  // Scrolled away while the engine was loading
  if (!want) hd?.kill()
  else handle = hd
}
function stop() {
  want = false
  handle?.kill()
  handle = null
}

useIntersectionObserver(root, ([e]) => (e?.isIntersecting ? start() : stop()))
watch(
  () => props.on,
  (v) => (v ? start() : stop()),
)
onBeforeUnmount(stop)
</script>

<template>
  <span ref="root" class="relative inline-flex">
    <span
      v-if="on"
      ref="box"
      class="pointer-events-none absolute left-1/2 -translate-x-1/2"
      :style="{ width: `${side}px`, height: `${side}px`, top: `${h / 2 - side * 0.833}px` }"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
