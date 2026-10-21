<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

/*
 * Figma "UpgradeItem" for the stake side.
 * Desktop: State=Empty (dashed, "Choose your skins below") → State=2+ (3×2 slots, coins count as a piece).
 *          Both keep the total (Price XXL) and the "Add balance" field at the bottom.
 * Phones get the same panel at full width; slots keep the desktop tile proportions.
 * Motion: pieces pop into their slot, leave by shrinking away, the total counts up, the coin flips when the
 * amount changes, and while the upgrade runs every piece is pulled towards the gauge.
 */
const props = defineProps<{
  items: InventoryItem[]
  coins: number
  total: number
  state: 'idle' | 'spinning' | 'win' | 'lose'
  disabled?: boolean
}>()
const extra = defineModel<string>('extra', { required: true })
const emit = defineEmits<{ remove: [uid: string]; clearCoins: [] }>()

const SLOTS = 6
type Piece = { key: string; kind: 'skin'; item: InventoryItem } | { key: string; kind: 'coins'; amount: number }

const pieces = computed<Piece[]>(() => {
  const list: Piece[] = [...props.items].sort((a, b) => b.price - a.price).map((item) => ({ key: item.uid, kind: 'skin', item }))
  if (props.coins > 0) list.push({ key: 'coins', kind: 'coins', amount: props.coins })
  return list
})
// More than six pieces: five are shown, the sixth slot says +N
const overflow = computed(() => Math.max(0, pieces.value.length - SLOTS))
const shown = computed(() => (overflow.value ? pieces.value.slice(0, SLOTS - 1) : pieces.value))
const emptySlots = computed(() => Math.max(0, SLOTS - shown.value.length - (overflow.value ? 1 : 0)))
const isEmpty = computed(() => pieces.value.length === 0)

// Total counts towards the new value instead of jumping
const totalSrc = computed(() => props.total)
const totalShown = useTransition(totalSrc, { duration: 450, transition: [0.22, 1, 0.36, 1] })

// Coin flips each time the balance part changes
const coinFlip = ref(0)
watch(
  () => props.coins,
  (v, old) => v !== old && v > 0 && coinFlip.value++,
)

function removePiece(p: Piece) {
  if (props.disabled) return
  if (p.kind === 'coins') emit('clearCoins')
  else emit('remove', p.item.uid)
}

</script>

<template>
  <div class="min-w-0">
    <!-- Desktop -->
    <div
      class="kd-stake relative flex flex-col rounded-5xl bg-neutral-2 lg:h-90"
      :class="[isEmpty ? 'is-empty border border-dashed border-neutral-7' : 'border border-transparent', `is-${state}`]"
    >
      <Transition name="kd-stake-swap" mode="out-in">
        <div v-if="isEmpty" key="empty" class="flex min-h-56 flex-1 flex-col items-center justify-center gap-4 text-center">
          <UiIcon name="stake-empty" :size="73" class="kd-stake-icon text-neutral-8" />
          <p class="type-16-caps max-w-40 font-bold text-neutral-12">{{ $t('upgrade.chooseSkins') }}</p>
        </div>
        <TransitionGroup v-else key="grid" tag="div" name="kd-piece" class="relative grid flex-1 grid-cols-3 gap-2.5 p-4 lg:grid-rows-2">
          <button
            v-for="(p, i) in shown"
            :key="p.key"
            type="button"
            class="kd-piece group relative aspect-[116/127] overflow-hidden rounded-2xl border text-left lg:aspect-auto"
            :class="p.kind === 'coins' ? 'is-coins' : ''"
            :style="{ '--i': i }"
            :disabled="disabled"
            :aria-label="p.kind === 'coins' ? 'KD Coins' : `${p.item.weapon} | ${p.item.skin}`"
            @click="removePiece(p)"
          >
            <template v-if="p.kind === 'skin'">
              <ItemArt :image="p.item.image" :rarity="p.item.rarity" :size="56" class="absolute inset-0 m-auto w-full" />
              <div class="absolute inset-x-0 top-0 flex flex-col gap-0.5 px-1.5 py-1">
                <UiPrice :amount="p.item.price" size="s" />
                <span class="type-10-caps flex gap-1">
                  <span v-if="p.item.statTrak" class="text-brand-light">ST</span>
                  <span class="text-neutral-15/48">{{ p.item.wear }}</span>
                </span>
              </div>
              <div class="absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-1.5 py-0.5">
                <span class="type-10-caps truncate text-neutral-15/48">{{ p.item.weapon }}</span>
                <span class="type-12 truncate" :style="{ color: RARITY_COLOR[p.item.rarity] }">{{ p.item.skin }}</span>
              </div>
            </template>
            <template v-else>
              <img :key="coinFlip" src="/img/items/coins.png" alt="" class="kd-coin-img absolute top-1/2 left-1/2 size-24 object-contain" draggable="false" />
              <div class="absolute inset-x-0 top-0 px-1.5 py-1">
                <UiPrice :amount="p.amount" size="s" />
              </div>
              <div class="absolute inset-x-0 bottom-0 flex flex-col px-1.5 py-0.5">
                <span class="type-10-caps text-neutral-15/48">KD</span>
                <span class="type-12 text-item-gold">Coins</span>
              </div>
            </template>
            <UiIcon name="x-circle" :size="24" class="kd-piece-x absolute top-1/2 left-1/2 text-neutral-15" />
          </button>
          <div v-if="overflow" key="more" class="kd-piece-slot grid aspect-[116/127] place-items-center lg:aspect-auto rounded-2xl bg-neutral-3">
            <span class="type-16-caps font-bold text-neutral-12">+{{ overflow + 1 }}</span>
          </div>
          <div v-for="n in emptySlots" :key="`e${n}`" class="kd-piece-slot grid aspect-[116/127] place-items-center lg:aspect-auto rounded-2xl bg-neutral-3 text-neutral-7">
            <UiIcon name="pistol" :size="40" />
          </div>
        </TransitionGroup>
      </Transition>

      <div class="flex items-center justify-between gap-3 pr-4 pb-4 pl-6">
        <UiPrice :amount="Math.round(totalShown)" size="xxl" />
        <label class="kd-extra flex h-12 w-36 shrink-0 items-center gap-2 rounded-lg border border-neutral-4 bg-neutral-1 px-3 focus-within:border-brand-base">
          <UiCoin :size="20" />
          <input
            id="upgrade-extra"
            v-model.lazy="extra"
            inputmode="decimal"
            :placeholder="$t('upgrade.addBalance')"
            class="type-14 w-full min-w-0 bg-transparent outline-none placeholder:text-neutral-11"
            :disabled="disabled"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-stake {
  transition: border-color var(--dur-base) var(--ease-out);
}
.kd-stake-icon {
  animation: kd-float 3.4s ease-in-out infinite;
}
@keyframes kd-float {
  50% {
    transform: translateY(-5px) rotate(-3deg);
  }
}

/* Pieces in the stake: Figma InventoryItem on the neutral-4 stake surface; coins get a neutral-6 rim. */
.kd-piece {
  background: var(--color-neutral-4);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring),
    opacity var(--dur-base) var(--ease-out),
    filter var(--dur-base) var(--ease-out);
}
.kd-piece.is-coins {
  border-color: var(--color-neutral-6);
}
.kd-piece-x {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5) rotate(-90deg);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  .kd-piece:hover {
    background: var(--color-brand-24);
    border-color: var(--color-brand-base);
  }
  .kd-piece:hover .kd-piece-x {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0);
  }
}
.kd-piece:active {
  transform: scale(0.95);
  transition-duration: var(--dur-press);
}
.kd-piece:disabled {
  pointer-events: none;
}

/* The coin turns over every time the amount changes */
.kd-coin-img {
  transform: translate(-50%, -50%);
  animation: kd-coin-flip 700ms var(--ease-spring) both;
}
@keyframes kd-coin-flip {
  from {
    transform: translate(-50%, -50%) rotateY(-180deg) scale(0.6);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%);
  }
}

/* Slot transitions: pop in with a little overshoot, shrink away, neighbours slide over. */
.kd-piece-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-piece-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
  position: absolute;
  visibility: hidden;
}
.kd-piece-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.7);
}
.kd-piece-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
.kd-piece-move {
  transition: transform var(--dur-slow) var(--ease-out);
}

.kd-stake-swap-enter-active,
.kd-stake-swap-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-stake-swap-enter-from,
.kd-stake-swap-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* Upgrade running: every piece is drawn towards the gauge one after another and stays spent
   through the result (same animation name, so it does not restart when the state flips). */
.is-spinning .kd-piece,
.is-win .kd-piece,
.is-lose .kd-piece {
  animation: kd-feed 900ms var(--ease-in-out) both;
  animation-delay: calc(var(--i) * 70ms);
}
@keyframes kd-feed {
  40% {
    transform: scale(1.04);
    box-shadow: 0 0 0 1px var(--color-brand-base), 0 0 24px -6px var(--color-brand-base);
  }
  to {
    transform: translateX(40px) scale(0.6);
    opacity: 0.15;
    filter: blur(2px);
  }
}

</style>
