<script setup lang="ts">
import type { Rarity } from '#shared/types/api'

// Figma "Art": blurred rarity glow + rarity star + item image. Size scales the whole stack.
// morph: the stack stays mounted when the item changes — the rarity colour flows into the new one and the
// weapon turns into the next (the old one twists away blurred while the new one twists in), no remount.
// float: the art is alive while it waits — the skin bobs, the rarity star turns slowly, the glow breathes
// (transform/opacity only, so it stays smooth on phones).
// reveal: the landing moment, built on the rarity shape (any value > 0 plays it; the step comes from the rarity):
// the shape pops in and turns into place, then waves of the same shape spread from behind the skin — none for
// mil-spec and below, 1 restricted, 2 classified, 3 covert and gold; classified flashes the shape, covert and gold
// bloom the glow. Forge (rarityRank) only adds sparks on covert and the full rank on gold.
const props = withDefaults(defineProps<{ image: string; rarity: Rarity; size?: number; dim?: boolean; alt?: string; morph?: boolean; float?: boolean; reveal?: number; eager?: boolean }>(), {
  size: 96,
  reveal: 0,
})
/** The reveal step by rarity: -1 none, 0 mil-spec and below … 4 gold */
const step = computed(() => (props.reveal ? RARITY_TIER[props.rarity] : -1))
const waves = computed(() => Math.min(3, Math.max(0, step.value)))
</script>

<template>
  <div class="kd-art relative" :class="[float && 'is-float', morph && 'is-morph', step >= 3 && 'is-bloom']" :style="{ height: `${size}px`, '--rc': RARITY_COLOR[rarity], '--s': size / 96 }">
    <span class="kd-art-glow absolute top-1/2 left-1/2 rounded-full" />
    <!-- waves of the rarity shape, behind the skin; each starts a beat after the pop -->
    <span v-for="n in waves" :key="`w${n}`" class="kd-rarity-star kd-art-wave absolute top-1/2 left-1/2" :style="{ animationDelay: `${160 + (n - 1) * 150}ms` }" />
    <span class="kd-rarity-star kd-art-star absolute top-1/2 left-1/2" :class="[reveal && 'is-reveal', step >= 2 && 'is-flash']" />
    <Transition v-if="morph" name="kd-art-morph">
      <img
        :key="image"
        :src="image"
        :alt="alt ?? ''"
        draggable="false"
        decoding="async"
        class="kd-art-img pointer-events-none absolute top-1/2 left-1/2 object-contain"
        :class="dim && 'opacity-50 grayscale'"
      />
    </Transition>
    <img
      v-else
      :src="image"
      :alt="alt ?? ''"
      :loading="eager ? 'eager' : 'lazy'"
      draggable="false"
        decoding="async"
      class="kd-art-img pointer-events-none absolute top-1/2 left-1/2 object-contain"
      :class="dim && 'opacity-50 grayscale'"
    />
  </div>
</template>

<style>
/* The rarity colour is a typed property, so a new rarity fades into place instead of snapping */
@property --rc {
  syntax: '<color>';
  inherits: true;
  initial-value: transparent;
}
/* only a morphing art (stake / target cards) fades its colour; reels and grids switch instantly — a --rc
   transition on every card of a fresh strip repainted all their glows each frame */
.kd-art.is-morph {
  transition: --rc 600ms var(--ease-out);
}
/* Gentle: a slight sway of the skin and the star, the glow breathing. The star and glow are centred with
   transform: translate(-50%, -50%), so the motion lives inside transform too (a separate rotate would swing
   the offset around and drag the shape off-centre). */
/* Reveal */
.kd-art-star.is-reveal {
  animation: kd-star-in 900ms var(--ease-spring) both;
}
@keyframes kd-star-in {
  0% {
    transform: translate(-50%, -50%) scale(0.4) rotate(-45deg);
    opacity: 0;
  }
  45% {
    transform: translate(-50%, -50%) scale(1.18) rotate(8deg);
    opacity: 1;
    filter: brightness(1.5);
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}
/* the flash: from classified the shape lands brighter and keeps a short afterglow */
.kd-art-star.is-reveal.is-flash {
  animation:
    kd-star-in 900ms var(--ease-spring) both,
    kd-star-flash 1100ms var(--ease-out) both;
}
@keyframes kd-star-flash {
  0%,
  20% {
    opacity: 0.32;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0.32;
  }
}
/* A wave: the same shape, filled, grows out and fades (transform/opacity only) */
.kd-art-wave {
  width: calc(72px * var(--s));
  height: calc(72px * var(--s));
  opacity: 0;
  transform: translate(-50%, -50%);
  animation: kd-wave 900ms var(--ease-out) both;
  pointer-events: none;
}
@keyframes kd-wave {
  0% {
    opacity: 0.75;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.5) rotate(20deg);
  }
}
/* covert and gold: the glow swells once behind it all */
.kd-art.is-bloom .kd-art-glow {
  animation: kd-bloom 1200ms var(--ease-out) both;
}
@keyframes kd-bloom {
  30% {
    transform: translate(-50%, -50%) scale(1.45);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-art-star.is-reveal {
    animation: none;
  }
  .kd-art-wave {
    display: none;
  }
}
.kd-art.is-float .kd-art-img {
  animation: kd-art-sway 4.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.kd-art.is-float .kd-art-star {
  animation: kd-art-star-sway 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.kd-art.is-float .kd-art-glow {
  animation: kd-art-breathe 4.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes kd-art-sway {
  0%,
  100% {
    transform: translate(-50%, -50%) rotate(-2deg);
  }
  50% {
    transform: translate(-50%, calc(-50% - 2px)) rotate(2deg);
  }
}
@keyframes kd-art-star-sway {
  0%,
  100% {
    transform: translate(-50%, -50%) rotate(-10deg);
  }
  50% {
    transform: translate(-50%, -50%) rotate(10deg);
  }
}
@keyframes kd-art-breathe {
  50% {
    opacity: 0.7;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-art.is-float * {
    animation: none !important;
  }
}
.kd-art-morph-enter-active,
.kd-art-morph-leave-active {
  transition:
    opacity 420ms var(--ease-out),
    transform 560ms var(--ease-spring),
    filter 420ms var(--ease-out);
}
.kd-art-morph-leave-active {
  transition-timing-function: var(--ease-in);
  transition-duration: 300ms;
}
/* the image is centred by transform: translate(-50%, -50%), so the twist is composed with it */
.kd-art-morph-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.72) rotate(16deg);
  filter: blur(8px) brightness(1.6);
}
.kd-art-morph-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.86) rotate(-14deg);
  filter: blur(8px);
}
.kd-art-glow {
  /* A soft gradient as wide as the old 88px blob blurred by 32px — no filter, so a reel of hundreds of
     cards stays cheap to paint and move */
  width: calc(152px * var(--s));
  height: calc(152px * var(--s));
  /* at rest the glow is a hint of the rarity, not a light: drops and reveals push it up for a moment */
  background: radial-gradient(closest-side, color-mix(in srgb, var(--rc) 75%, transparent), color-mix(in srgb, var(--rc) 32%, transparent) 40%, color-mix(in srgb, var(--rc) 8%, transparent) 70%, transparent);
  transform: translate(-50%, -50%);
  opacity: 0.6;
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}
.kd-art-star {
  width: calc(72px * var(--s));
  height: calc(72px * var(--s));
  transform: translate(-50%, -50%);
  transition: transform 900ms var(--ease-out);
}
.kd-art-img {
  width: calc(160px * var(--s));
  height: calc(160px * var(--s));
  max-width: none;
  transform: translate(-50%, -50%);
  transition: transform var(--dur-slow) var(--ease-out), filter var(--dur-base) var(--ease-out);
}
/* Hovering the parent card: the item lifts a touch and the rarity star turns gently. No scaling. */
@media (hover: hover) {
  .group:hover .kd-art-img {
    transform: translate(-50%, calc(-50% - 3px));
  }
  .group:hover .kd-art-star {
    transform: translate(-50%, -50%) rotate(12deg);
  }
  .group:hover .kd-art-glow {
    opacity: 1;
  }
}
</style>
