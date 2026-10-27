<script setup lang="ts">
/*
 * The full-width banner that opens the home page, Bonuses and Provably Fair: one scene from edge to edge with no frame,
 * the light an arc of colour hanging from the top and dissolving into the page; the words line up with the page's
 * column. One layout and one shape of words for all three — an eyebrow, a one-line title, one line under it — with the
 * same gaps, so the eyebrow, the title and the buttons stand in the same place on each.
 * Slots: `art` (the scene on the right; a band above the words on phones), `actions` (the buttons' line).
 * The pointer anywhere on the band sets --px / --py (-1…1) for the art's parallax.
 */
withDefaults(
  defineProps<{
    glow: 'warm' | 'gold' | 'green'
    eyebrow: string
    title: string
    text?: string
    /** the art's box, past the shared band: a taller one for a scene that needs it */
    artClass?: string
  }>(),
  { text: undefined, artClass: 'h-44' },
)
const { onMove, onLeave, vars } = usePointerTilt()
const EYEBROW = { warm: 'text-brand-light', gold: 'text-coin', green: 'text-success' } as const
</script>

<template>
  <section class="relative isolate pt-4 pb-6 lg:py-10" :style="vars" @pointermove="onMove" @pointerleave="onLeave">
    <!-- the light: an arc of the page's colour hanging from the top, brightest in the middle, gone before the page -->
    <span class="kd-bleed-glow pointer-events-none absolute inset-0 -z-10" :class="`is-${glow}`" aria-hidden="true" />

    <div class="mx-auto max-w-content">
      <div class="relative flex flex-col p-4 sm:min-h-60 sm:flex-row sm:px-4 sm:py-6 lg:py-10 xl:px-0">
        <div class="relative -mx-4 -mt-4 mb-2 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[52%] lg:w-[620px]" :class="artClass">
          <slot name="art" />
        </div>
        <!-- the words and the buttons, centred in the band, the same gaps on every page; only they take the pointer, the art behind the empty middle stays clickable -->
        <div class="pointer-events-none relative z-10 flex flex-col justify-center gap-4 sm:max-w-[52%] lg:w-[600px] lg:gap-6 lg:max-w-none [&>*]:pointer-events-auto">
          <div class="flex flex-col gap-1 sm:gap-2">
            <p class="type-12-caps lg:type-16-caps" :class="EYEBROW[glow]">{{ eyebrow }}</p>
            <h1 class="text-[28px] leading-8 font-extrabold uppercase tabular-nums sm:text-[36px] sm:leading-10 lg:text-[50px] lg:leading-[54px] lg:tracking-[-0.01em]">
              {{ title }}
            </h1>
            <p v-if="text" class="type-14 mt-1 text-neutral-14 lg:type-16-medium lg:w-[520px] lg:text-neutral-13">{{ text }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* the light: dark at the sides, the page's colour, a white-hot middle; masked to an arc that hangs from the top and fades
   out on an eased curve (no edge anywhere) */
.kd-bleed-glow {
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
/* home: brand red → orange → gold → orange → wine */
.kd-bleed-glow.is-warm {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(255 240 210 / 0.22), transparent 70%),
    linear-gradient(100deg, #5e1307, #e5401a 26%, #ff8a1f 48%, #ffc04a 58%, #ff6a1a 74%, #6e1236);
  opacity: 0.62;
}
/* bonuses: deep amber → gold → pale gold → gold → bronze, the coin's colours */
.kd-bleed-glow.is-gold {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(255 246 214 / 0.22), transparent 70%),
    linear-gradient(100deg, #3a2304, #b8780c 26%, #f2b631 48%, #ffe08a 58%, #e8a21c 74%, #4a2a06);
  opacity: 0.55;
}
/* Provably Fair: deep green → emerald → mint → emerald → teal */
.kd-bleed-glow.is-green {
  background:
    radial-gradient(ellipse 36% 40% at 50% 8%, rgb(220 255 235 / 0.2), transparent 70%),
    linear-gradient(100deg, #04261a, #0c7a45 26%, #19c97a 48%, #7dffb8 58%, #12b76a 74%, #053a3a);
  opacity: 0.5;
}
/* phones: a narrow screen needs a wider arc to reach its sides */
@media (max-width: 639px) {
  .kd-bleed-glow {
    mask-size: 190% 100%;
    mask-position: 50% 0;
    mask-repeat: no-repeat;
  }
}
</style>
