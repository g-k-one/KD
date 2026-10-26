<script setup lang="ts">
/*
 * Home banner, full width: one scene from edge to edge with no frame. The light pours from the top as a wide warm arc
 * and dissolves into the page (the imigo final call's glow, turned upside down); the words line up with the page's
 * column and sit high. Right: today's top drop, big (HomeHeroDrop), leaning toward the pointer anywhere on the band.
 */
const emit = defineEmits<{ start: [] }>()
const { onMove, onLeave, vars } = usePointerTilt()
</script>

<template>
  <section class="kd-bleed relative isolate pt-4 pb-6 lg:pt-10 lg:pb-2" :style="vars" @pointermove="onMove" @pointerleave="onLeave">
    <!-- the light: an arc of warm colour hanging from the top, brightest in the middle, gone before the page -->
    <span class="kd-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <div class="mx-auto max-w-content">
      <HomeHeroBanner bare @start="emit('start')">
        <template #art><HomeHeroDrop /></template>
        <template #aside><HomeHeroDrop part="tag" /></template>
      </HomeHeroBanner>
    </div>
  </section>
</template>

<style scoped>
/* the light: brand red → orange → gold → orange → wine across the band, a white-hot middle, masked to an arc that hangs
   from the top and fades out on an eased curve (no edge anywhere) */
.kd-glow {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(255 240 210 / 0.22), transparent 70%),
    linear-gradient(100deg, #5e1307, #e5401a 26%, #ff8a1f 48%, #ffc04a 58%, #ff6a1a 74%, #6e1236);
  opacity: 0.62;
  mask-image: radial-gradient(
    ellipse 80% 100% at 50% 0%,
    #000 0%,
    rgb(0 0 0 / 1) 20%,
    rgb(0 0 0 / 0.966) 28%,
    rgb(0 0 0 / 0.869) 36%,
    rgb(0 0 0 / 0.724) 44%,
    rgb(0 0 0 / 0.552) 52%,
    rgb(0 0 0 / 0.379) 60%,
    rgb(0 0 0 / 0.226) 68%,
    rgb(0 0 0 / 0.11) 76%,
    rgb(0 0 0 / 0.037) 84%,
    rgb(0 0 0 / 0.006) 92%,
    rgb(0 0 0 / 0) 100%
  );
}
/* phones: a narrow screen needs a wider arc to reach its sides */
@media (max-width: 639px) {
  .kd-glow {
    mask-size: 190% 100%;
    mask-position: 50% 0;
    mask-repeat: no-repeat;
  }
}
</style>
