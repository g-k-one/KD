<script setup lang="ts">
/*
 * The home banner's art: the chicken, alone and big — bursting up out of the band's foot, waist up, wings out,
 * screaming, light fans turning slowly behind it. One thing, alive: it bobs, leans with the pointer (the band sets
 * --px / --py), and a poke makes it jolt and squawk with a puff of feathers; the banner counts the pokes (its bubble,
 * and on the fifth the golden egg — here a gold burst too).
 */
const props = defineProps<{ bubble?: string; pokes?: number }>()
const emit = defineEmits<{ poke: [] }>()
const sfx = useSfx()
const haptics = useHaptics()
const fx = useForge()
const body = useTemplateRef<HTMLElement>('body')
// bumped on every poke: the key of the jolt, so its keyframes restart even mid-way
const jolt = ref(0)
function poke() {
  jolt.value += 1
  haptics.tap()
  sfx.squawk()
  fx.at('feathers:white', body.value, 0.9)
  emit('poke')
}
watch(
  () => props.pokes,
  (n) => {
    if (n === 5) {
      haptics.jackpot()
      fx.at('kdJackpot', body.value, 1.2)
    }
  },
)
</script>

<template>
  <div class="kd-chick absolute inset-0">
    <span class="kd-chick-rays pointer-events-none absolute" aria-hidden="true" />
    <button ref="body" type="button" class="kd-chick-poke absolute" :aria-label="$t('hero.pokeLabel')" @click="poke">
      <span class="kd-chick-lean block">
        <span class="kd-chick-bob block">
          <span :key="jolt" class="kd-chick-jolt block" :class="jolt > 0 && 'is-on'">
            <img src="/img/hero/chicken.webp" alt="" draggable="false" fetchpriority="high" class="block w-full" />
          </span>
        </span>
      </span>
    </button>
    <span v-if="bubble" class="kd-chick-bubble type-12-caps lg:type-14-caps absolute rounded-lg px-2.5 py-1.5">{{ bubble }}</span>
  </div>
</template>

<style scoped>
/* the chicken stands on the band's foot (40 px under the banner on desktop) and fades out at the waist */
.kd-chick-poke {
  right: 0;
  bottom: -40px;
  width: 440px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  mask-image: linear-gradient(180deg, #000 64%, transparent 97%);
}
.kd-chick-lean {
  transform: translate3d(calc(var(--px, 0) * 14px), calc(var(--py, 0) * 8px), 0) rotate(calc(var(--px, 0) * 3deg));
  transition: transform var(--dur-slow) var(--ease-out);
}
/* idle: it rides up and down */
.kd-chick-bob {
  animation: kd-chick-bob 2.6s var(--ease-in-out) infinite;
  transform-origin: 50% 100%;
}
@keyframes kd-chick-bob {
  50% {
    transform: translateY(-10px) rotate(-1.5deg);
  }
}
/* the poke: a squash, a kick up and a settle */
.kd-chick-jolt.is-on {
  animation: kd-chick-jolt 0.5s var(--ease-out);
  transform-origin: 50% 90%;
}
@keyframes kd-chick-jolt {
  20% {
    transform: scale(1.06, 0.92) rotate(-4deg);
  }
  45% {
    transform: scale(0.96, 1.06) rotate(3deg) translateY(-18px);
  }
  72% {
    transform: scale(1.02, 0.98) rotate(-1deg);
  }
}
/* light fans behind its head, turning slowly */
.kd-chick-rays {
  right: -50px;
  top: -110px;
  width: 640px;
  height: 640px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgb(255 190 90 / 0.28) 0deg 8deg, transparent 8deg 22deg);
  mask-image: radial-gradient(closest-side, #000 18%, transparent 70%);
  animation: kd-chick-rays 30s linear infinite;
}
@keyframes kd-chick-rays {
  to {
    rotate: 360deg;
  }
}
.kd-chick-bubble {
  right: 40px;
  top: 6px;
  z-index: 2;
  color: var(--color-neutral-1);
  background: var(--color-neutral-15);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.35);
}

/* tablets and phones: the band above the words — a smaller chicken, centred */
@media (max-width: 1023px) {
  .kd-chick-poke {
    right: 50%;
    bottom: -16px;
    width: 300px;
    translate: 50% 0;
  }
  .kd-chick-rays {
    right: 50%;
    top: -120px;
    width: 420px;
    height: 420px;
    translate: 50% 0;
  }
  .kd-chick-bubble {
    right: 12%;
  }
}
@media (max-width: 639px) {
  .kd-chick-poke {
    width: 230px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-chick-bob,
  .kd-chick-rays {
    animation: none;
  }
}
</style>
