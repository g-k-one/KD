<script setup lang="ts">
/*
 * The home banner's art: today's top drop, one thing, big. "UNREAL DROP" over its multiplier as a giant burning
 * number, the skin in front over a fire in its rarity's colour (kdFlame, the big wins' calm flame); `part="tag"` is
 * who won it, from which case, for how much — the banner puts it on its buttons' line. It is the live feed's
 * highlight (the one the strip pins), so it is always a real drop; when a bigger one lands, the new skin drops in. The
 * skin floats and leans toward the pointer (the band sets --px / --py); a tap opens the case it came from.
 */
const props = withDefaults(defineProps<{ part?: 'art' | 'tag' }>(), { part: 'art' })
const { feed } = useLiveFeed()
const drop = computed(() => feed.value?.highlight ?? null)
const x = computed(() => {
  const m = drop.value ? drop.value.price / Math.max(1, drop.value.casePrice) : 0
  return m >= 10 ? `x${Math.floor(m)}` : `x${m.toFixed(1)}`
})

// the fire draws on its own Forge layer behind the skin; desktop only (a phone keeps one WebGL context per page)
const isLg = useMediaQuery('(min-width: 1024px)')
const fxHost = useTemplateRef<HTMLElement>('fxHost')
if (props.part === 'art') provideForge(fxHost)
</script>

<template>
  <NuxtLink
    v-if="drop && part === 'art'"
    :to="sourceLink(drop.caseSlug)"
    class="kd-drop absolute inset-0 block"
    :aria-label="`${$t('hero.unrealDrop')}: ${drop.itemName} | ${drop.skinName}, ${x}`"
  >
    <span ref="fxHost" class="pointer-events-none absolute inset-0" aria-hidden="true" />
    <!-- the words over the number, the number a giant behind everything -->
    <span class="kd-drop-head pointer-events-none absolute flex flex-col items-center" aria-hidden="true">
      <span class="kd-drop-title">{{ $t('hero.unrealDrop') }}</span>
      <span class="kd-drop-x">{{ x }}</span>
    </span>
    <!-- the fire rises from under the skin, in its rarity's colour -->
    <span v-if="isLg" class="kd-drop-fire pointer-events-none absolute" aria-hidden="true">
      <FxFire :key="drop.id" effect="kdFlame" :color="RARITY_HEX[drop.rarity]" :spread="1.6" class="w-full"><span class="block h-2 w-full" /></FxFire>
    </span>

    <!-- the skin: floats, leans to the pointer; a new top drop falls in -->
    <span class="kd-drop-stage absolute">
      <span class="kd-drop-lean block">
        <Transition name="kd-drop-swap" mode="out-in">
          <img :key="drop.id" :src="drop.image" alt="" class="kd-drop-skin block" draggable="false" fetchpriority="high" />
        </Transition>
      </span>
    </span>
  </NuxtLink>

  <!-- who, where, how much -->
  <NuxtLink v-else-if="drop && part === 'tag'" :to="sourceLink(drop.caseSlug)" class="kd-drop-tag kd-press flex h-14 items-center gap-2.5 rounded-2xl pr-4 pl-2">
    <UiAvatar :src="drop.userAvatar" :size="40" />
    <span class="flex min-w-0 flex-col">
      <span class="type-14 truncate">{{ drop.itemName }} | {{ drop.skinName }}</span>
      <span class="type-12-regular truncate text-neutral-12">{{ drop.userNickname }} · {{ drop.caseName }}</span>
    </span>
    <UiPrice :amount="drop.price" tone="coin" class="ml-2 shrink-0" />
  </NuxtLink>
</template>

<style scoped>
.kd-drop {
  perspective: 1200px;
}
.kd-drop-head {
  left: 50%;
  top: 2%;
  translate: -50% 0;
}
/* "UNREAL DROP": loud caps over the number, white-hot like the band's light */
.kd-drop-title {
  font-size: 28px;
  line-height: 32px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #fff3df;
  text-shadow: 0 2px 16px rgb(255 120 40 / 0.6);
}
/* the multiplier: big, the burning gold-to-orange of the big wins' numbers, fading toward its foot */
.kd-drop-x {
  margin-top: -10px;
  font-size: 220px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  white-space: nowrap;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 45%, rgb(255 95 31 / 0.15) 95%);
  background-clip: text;
  color: transparent;
  opacity: 0.85;
  filter: drop-shadow(0 4px 24px rgb(255 95 31 / 0.45));
}
/* a strip under the skin the fire rises from */
.kd-drop-fire {
  left: 24%;
  right: 24%;
  bottom: 36%;
  z-index: 1;
}
.kd-drop-stage {
  left: 50%;
  top: 38%;
  z-index: 2;
  translate: -50% -50%;
  animation: kd-drop-float 5.5s ease-in-out infinite alternate;
}
/* the pointer tilts it like a card in the hand */
.kd-drop-lean {
  transform: rotateY(calc(var(--px, 0) * 14deg)) rotateX(calc(var(--py, 0) * -10deg)) rotate(-12deg);
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-drop-skin {
  width: 400px;
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
  max-width: 100%;
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

/* phones: the band above the words — a smaller skin, the words and number behind it */
@media (max-width: 639px) {
  .kd-drop-head {
    top: 0;
  }
  .kd-drop-title {
    font-size: 16px;
    line-height: 20px;
  }
  .kd-drop-x {
    margin-top: -6px;
    font-size: 110px;
  }
  .kd-drop-stage {
    top: 62%;
  }
  .kd-drop-skin {
    width: 240px;
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .kd-drop-x {
    font-size: 150px;
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
