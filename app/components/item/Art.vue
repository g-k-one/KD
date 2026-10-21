<script setup lang="ts">
import type { Rarity } from '#shared/types/api'

// Figma "Art": blurred rarity glow + rarity star + item image. Size scales the whole stack.
withDefaults(defineProps<{ image: string; rarity: Rarity; size?: number; dim?: boolean; alt?: string }>(), {
  size: 96,
})
</script>

<template>
  <div class="kd-art relative" :style="{ height: `${size}px`, '--rc': RARITY_COLOR[rarity], '--s': size / 96 }">
    <span class="kd-art-glow absolute top-1/2 left-1/2 rounded-full" />
    <span class="kd-rarity-star kd-art-star absolute top-1/2 left-1/2" />
    <img
      :src="image"
      :alt="alt ?? ''"
      loading="lazy"
      draggable="false"
      class="kd-art-img pointer-events-none absolute top-1/2 left-1/2 object-contain"
      :class="dim && 'opacity-50 grayscale'"
    />
  </div>
</template>

<style>
.kd-art-glow {
  width: calc(88px * var(--s));
  height: calc(88px * var(--s));
  background: radial-gradient(circle, var(--rc), color-mix(in srgb, var(--rc) 10%, transparent));
  filter: blur(calc(32px * var(--s)));
  transform: translate(-50%, -50%);
  opacity: 0.9;
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
