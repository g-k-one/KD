<script setup lang="ts">
import type { Item, Rarity } from '#shared/types/api'

/*
 * Figma "UpgradeItem" for the target side.
 * Desktop State=Item: name (20 ExtraBold caps, rarity colour), weapon | ST wear, close button,
 * glow 170 + star 140 + image 310 centred, Price XXL at the bottom. Empty: dashed card with a hint.
 * Phones get the same card at full width with a smaller art stack.
 * Motion: switching targets keeps the card — the texts swap letter by letter (UiTextSwap), the price
 * counts to the new value, the rarity colour flows over and the weapon morphs into the next (ItemArt morph); the item hovers while the gauge spins,
 * a win flashes a ring of rarity light and pops, a loss drains to grey and sinks.
 */
const props = defineProps<{ item: Item | null; state: 'idle' | 'spinning' | 'win' | 'lose' }>()
defineEmits<{ clear: [] }>()
const isLg = useMediaQuery('(min-width: 1024px)')
// The card's own Forge layer under the art: the aura while the dial turns and the rank reveal of a won skin
// (the page calls aura() / rank()). Inside the card, so both scroll with it.
const fxHost = useTemplateRef<HTMLElement>('fxHost')
const fx = useForge(fxHost)
const root = useTemplateRef<HTMLElement>('root')
defineExpose({
  rank: (rarity: Rarity, scale: number) => rarityRank(fx, root.value?.querySelector<HTMLElement>('.kd-art img'), rarity, scale),
  aura: (scale: number) => fx.at('kdAura', root.value, scale, true),
})
const rc = computed(() => (props.item ? RARITY_COLOR[props.item.rarity] : undefined))
const priceSrc = computed(() => props.item?.price ?? 0)
const priceShown = useTransition(priceSrc, { duration: 500, transition: [0.22, 1, 0.36, 1] })
// While the player flicks through targets (dragging the chance bar) the wear sits out — it would jump with
// every weapon name — and fades back once the choice holds still for a moment
const settled = ref(true)
let settleTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.item?.id,
  (id, old) => {
    if (!id || !old) return
    settled.value = false
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => (settled.value = true), 350)
  },
)
</script>

<template>
  <div class="min-w-0">
    <!-- Desktop -->
    <div
      ref="root"
      class="kd-target relative h-72 overflow-hidden rounded-5xl bg-neutral-2 lg:h-76"
      :class="`is-${state}`"
      :style="{ '--rc': rc }"
    >
      <div ref="fxHost" class="pointer-events-none absolute inset-0" />
      <Transition name="kd-target" mode="out-in">
        <div v-if="item" key="item" class="absolute inset-0">
          <span class="kd-target-burst pointer-events-none absolute top-1/2 left-1/2 size-[170px] rounded-full" />
          <div class="kd-target-art absolute inset-0">
            <ItemArt morph float :image="item.image" :rarity="item.rarity" :size="isLg ? 150 : 140" class="absolute top-1/2 left-1/2 w-[310px] -translate-1/2" />
          </div>
          <div class="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div class="flex min-w-0 flex-col gap-1">
              <UiTextSwap :text="item.skin" class="truncate type-20-caps tracking-[0.05em] transition-colors duration-300" :style="{ color: rc }" />
              <span class="type-14-caps flex items-center gap-3 text-weapon">
                <UiTextSwap :text="item.weapon" />
                <span class="kd-wear flex items-center gap-3" :class="!settled && 'is-hidden'">
                  <span class="h-4 w-px bg-neutral-8" />
                  <span class="flex items-center gap-1.5"><span v-if="item.statTrak" class="text-brand-light">ST</span><UiTextSwap :text="item.wear" /></span>
                </span>
              </span>
            </div>
            <UiButton variant="ghost" icon="close" icon-only :aria-label="$t('upgrade.clear')" :disabled="state === 'spinning'" @click="$emit('clear')" />
          </div>
          <UiPrice :amount="Math.round(priceShown)" size="xxl" class="absolute bottom-6 left-1/2 -translate-x-1/2" />
        </div>
        <div v-else key="empty" class="flex h-full flex-col items-center justify-center gap-4 text-center">
          <UiIcon name="target-up" :size="72" class="kd-target-icon kd-ico-target text-neutral-10" />
          <p class="type-16-caps max-w-48 font-bold text-neutral-12">{{ $t('upgrade.chooseTarget') }}</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.kd-wear {
  transition:
    opacity var(--dur-base) var(--ease-out),
    translate var(--dur-base) var(--ease-out);
}
.kd-wear.is-hidden {
  opacity: 0;
  translate: -4px 0;
}
.kd-target-icon {
  animation: kd-float 3.2s var(--ease-in-out) infinite;
}
@keyframes kd-float {
  50% {
    transform: translateY(-5px) rotate(3deg);
  }
}

/* New target: drops in from above with a bounce. */
.kd-target-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-target-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-target-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.92);
}
.kd-target-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.kd-target-burst {
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  background: radial-gradient(circle, var(--rc) 0%, transparent 70%);
}

/* Spinning: the prize hovers in place */
.is-spinning .kd-target-art {
  animation: kd-hover 1.6s var(--ease-in-out) infinite;
}
@keyframes kd-hover {
  50% {
    transform: translateY(-6px);
  }
}

/* Win: a soft ring of rarity light, the prize pops once and settles; the card itself stays as it is */
.is-win .kd-target-burst {
  animation: kd-burst 900ms var(--ease-out) both;
}
@keyframes kd-burst {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(3.2);
    opacity: 0;
  }
}
.is-win .kd-target-art {
  animation: kd-win-pop 700ms var(--ease-spring) both;
}
@keyframes kd-win-pop {
  40% {
    transform: scale(1.14);
  }
  100% {
    transform: scale(1.04);
  }
}
.kd-target {
  transition:
    background-color var(--dur-slow) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}


/* Loss: no shaking — the prize drains to grey and sinks away from reach */
.kd-target-art {
  transition:
    filter 700ms var(--ease-out),
    opacity 700ms var(--ease-out),
    translate 700ms var(--ease-out);
}
.is-lose .kd-target-art {
  filter: grayscale(1) brightness(0.5);
  opacity: 0.7;
  translate: 0 8px;
}
</style>
