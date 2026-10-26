<script setup lang="ts">
/*
 * The home banner's art: today's top drop, one thing, big. The skin in its rarity's light, its multiplier as a giant
 * number behind it, and under it who won it, from which case, for how much. It is the live feed's highlight (the one
 * the strip pins), so it is always a real drop; when a bigger one lands, the new skin drops in. The skin floats and
 * leans toward the pointer (the band sets --px / --py); a tap opens the case it came from.
 */
const { feed } = useLiveFeed()
const drop = computed(() => feed.value?.highlight ?? null)
const x = computed(() => {
  const m = drop.value ? drop.value.price / Math.max(1, drop.value.casePrice) : 0
  return m >= 10 ? `x${Math.floor(m)}` : `x${m.toFixed(1)}`
})
</script>

<template>
  <NuxtLink
    v-if="drop"
    :to="sourceLink(drop.caseSlug)"
    class="kd-drop absolute inset-0 block"
    :style="{ '--glow': RARITY_COLOR[drop.rarity] }"
    :aria-label="`${$t('hero.topDrop')}: ${drop.itemName} | ${drop.skinName}, ${x}`"
  >
    <!-- the rarity's light, and the multiplier as a backdrop -->
    <span class="kd-drop-glow pointer-events-none absolute" aria-hidden="true" />
    <span class="kd-drop-x pointer-events-none absolute" aria-hidden="true">{{ x }}</span>

    <!-- the skin: floats, leans to the pointer; a new top drop falls in -->
    <span class="kd-drop-stage absolute">
      <span class="kd-drop-lean block">
        <Transition name="kd-drop-swap" mode="out-in">
          <img :key="drop.id" :src="drop.image" alt="" class="kd-drop-skin block" draggable="false" fetchpriority="high" />
        </Transition>
      </span>
    </span>

    <!-- who, where, how much -->
    <span class="kd-drop-tag absolute flex items-center gap-2.5 rounded-2xl py-2 pr-4 pl-2">
      <UiAvatar :src="drop.userAvatar" :size="32" />
      <span class="flex min-w-0 flex-col">
        <span class="type-10-caps flex items-center gap-1 text-brand-light"><UiIcon name="fire" :size="12" />{{ $t('hero.topDrop') }}</span>
        <span class="type-12 truncate">{{ drop.itemName }} | {{ drop.skinName }}</span>
        <span class="type-12-regular truncate text-neutral-12">{{ drop.userNickname }} · {{ drop.caseName }}</span>
      </span>
      <UiPrice :amount="drop.price" tone="coin" class="ml-2 shrink-0" />
    </span>
  </NuxtLink>
</template>

<style scoped>
.kd-drop {
  perspective: 1200px;
}
/* a pool of the rarity's colour, brightest under the skin; screened, so it only ever lightens the warm light */
.kd-drop-glow {
  mix-blend-mode: screen;
  left: 50%;
  top: 46%;
  width: 640px;
  height: 460px;
  translate: -50% -50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--glow) 55%, transparent), transparent);
  opacity: 0.9;
}
/* the multiplier, huge and quiet behind the skin: the brand gradient, faded */
.kd-drop-x {
  left: 50%;
  top: 4%;
  translate: -50% 0;
  font-size: 220px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  white-space: nowrap;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 50%, transparent 92%);
  background-clip: text;
  color: transparent;
  opacity: 0.32;
}
.kd-drop-stage {
  left: 50%;
  top: 46%;
  translate: -50% -50%;
  animation: kd-drop-float 5.5s ease-in-out infinite alternate;
}
/* the pointer tilts it like a card in the hand; the light under it moves the other way */
.kd-drop-lean {
  transform: rotateY(calc(var(--px, 0) * 14deg)) rotateX(calc(var(--py, 0) * -10deg)) rotate(-12deg);
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-drop-skin {
  width: 460px;
  max-width: none;
  filter: drop-shadow(0 18px 20px rgb(0 0 0 / 0.35));
  transition: transform var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-drop:hover .kd-drop-skin {
    transform: scale(1.04);
  }
}
.kd-drop-tag {
  left: 50%;
  bottom: 8px;
  translate: -50% 0;
  max-width: calc(100% - 32px);
  background: rgb(12 13 16 / 0.72);
  box-shadow: inset 0 0 0 1px var(--color-neutral-5);
  backdrop-filter: blur(8px);
}
@keyframes kd-drop-float {
  from {
    transform: translateY(-6px);
  }
  to {
    transform: translateY(8px);
  }
}
/* a new top drop: the old one lifts away, the new one falls in with a little bounce */
.kd-drop-swap-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-drop-swap-leave-to {
  opacity: 0;
  transform: translateY(-24px) scale(0.9);
}
.kd-drop-swap-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-drop-swap-enter-from {
  opacity: 0;
  transform: translateY(-40px) scale(1.1);
}

/* phones: the band above the words — a smaller skin, the number behind it, the tag hidden (the strip above says it) */
@media (max-width: 639px) {
  .kd-drop-x {
    top: 0;
    font-size: 120px;
  }
  .kd-drop-glow {
    width: 360px;
    height: 220px;
  }
  .kd-drop-skin {
    width: 250px;
  }
  .kd-drop-tag {
    display: none;
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .kd-drop-x {
    font-size: 160px;
  }
  .kd-drop-skin {
    width: 340px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-drop-stage {
    animation: none;
  }
}
</style>
