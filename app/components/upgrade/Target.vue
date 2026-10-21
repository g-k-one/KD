<script setup lang="ts">
import type { Item } from '#shared/types/api'

/*
 * Figma "UpgradeItem" for the target side.
 * Desktop State=Item: name (20 ExtraBold caps, rarity colour), weapon | ST wear, close button,
 * glow 170 + star 140 + image 310 centred, Price XXL at the bottom. Empty: dashed card with a hint.
 * Phones get the same card at full width with a smaller art stack.
 * Motion: a new target drops in, the item hovers while the gauge spins, a win bursts out in its
 * rarity colour, a loss shakes and goes grey.
 */
const props = defineProps<{ item: Item | null; state: 'idle' | 'spinning' | 'win' | 'lose' }>()
defineEmits<{ clear: [] }>()
const isLg = useMediaQuery('(min-width: 1024px)')
const rc = computed(() => (props.item ? RARITY_COLOR[props.item.rarity] : undefined))
</script>

<template>
  <div class="min-w-0">
    <!-- Desktop -->
    <div
      class="kd-target relative h-72 overflow-hidden rounded-5xl bg-neutral-2 lg:h-90"
      :class="[item ? 'border border-transparent' : 'border border-dashed border-neutral-7', `is-${state}`]"
      :style="{ '--rc': rc }"
    >
      <Transition name="kd-target" mode="out-in">
        <div v-if="item" :key="item.id" class="absolute inset-0">
          <span class="kd-target-burst pointer-events-none absolute top-1/2 left-1/2 size-[170px] rounded-full" />
        <FxBurst v-if="state === 'win'" :tier="Math.max(2, RARITY_TIER[item.rarity])" :color="RARITY_COLOR[item.rarity]" :size="isLg ? 260 : 200" />
          <div class="kd-target-art absolute inset-0">
            <ItemArt :image="item.image" :rarity="item.rarity" :size="isLg ? 186 : 140" class="absolute top-1/2 left-1/2 w-[310px] -translate-1/2" />
          </div>
          <div class="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="truncate text-xl leading-6 font-extrabold tracking-[0.05em] uppercase" :style="{ color: rc }">{{ item.skin }}</span>
              <span class="type-14-caps flex items-center gap-3 text-neutral-11">
                {{ item.weapon }}
                <span class="h-4 w-px bg-neutral-8" />
                <span class="flex gap-2">
                  <span v-if="item.statTrak" class="text-brand-light">ST</span>
                  {{ item.wear }}
                </span>
              </span>
            </div>
            <button
              type="button"
              class="kd-press grid size-10 shrink-0 place-items-center rounded-lg text-neutral-15/64 hover:bg-white-4 hover:text-neutral-15"
              :aria-label="$t('upgrade.clear')"
              :disabled="state === 'spinning'"
              @click="$emit('clear')"
            >
              <UiIcon name="close" :size="18" />
            </button>
          </div>
          <UiPrice :amount="item.price" size="xxl" class="absolute bottom-6 left-1/2 -translate-x-1/2" />
        </div>
        <div v-else key="empty" class="flex h-full flex-col items-center justify-center gap-4 text-center">
          <UiIcon name="diamond" :size="56" class="kd-target-icon text-neutral-8" />
          <p class="type-16-caps max-w-48 font-bold text-neutral-12">{{ $t('upgrade.chooseTarget') }}</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.kd-target {
  transition: border-color var(--dur-base) var(--ease-out);
}
.kd-target-icon {
  animation: kd-float 3.4s ease-in-out infinite;
}
@keyframes kd-float {
  50% {
    transform: translateY(-5px) rotate(4deg);
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

/* Spinning: the prize hovers and its glow breathes. */
.is-spinning .kd-target-art {
  animation: kd-hover 1.6s ease-in-out infinite;
}
@keyframes kd-hover {
  50% {
    transform: translateY(-8px);
  }
}

/* Win: rarity burst, a ring of light and a bouncy pop. */
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
  0% {
    transform: scale(0.9);
  }
  45% {
    transform: scale(1.12) rotate(-3deg);
  }
  100% {
    transform: scale(1);
  }
}
.kd-target.is-win {
  box-shadow:
    inset 0 0 0 1px var(--color-success),
    0 0 48px -12px var(--color-success);
  transition: box-shadow var(--dur-slow) var(--ease-out);
}

/* Loss: a short shake, then the prize fades to grey. */
.is-lose .kd-target-art {
  animation: kd-shake 480ms var(--ease-out) both;
  filter: grayscale(1) brightness(0.55);
  transition: filter 600ms var(--ease-out) 300ms;
}
@keyframes kd-shake {
  20%,
  60% {
    transform: translateX(-8px) rotate(-2deg);
  }
  40%,
  80% {
    transform: translateX(8px) rotate(2deg);
  }
}
.kd-target.is-lose {
  box-shadow: inset 0 0 0 1px var(--color-danger-48);
}

</style>
