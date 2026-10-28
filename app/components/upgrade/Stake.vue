<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

/*
 * Figma "UpgradeItem" for the stake side.
 * State=Empty (dashed, "Choose your skins below") → State=1 (one piece shown big, like the target card)
 * → State=2+ (3×2 slots, coins count as a piece). All keep the total (Price XXL) and "Add balance" below.
 * Phones get the same panel at full width.
 * Motion (docs/motion.md): going to slots, the pieces deal into place one by one; a new piece flies up
 * from the inventory and lands with a flash of the slot rim; a removed one drops back down. The next free
 * slot breathes. The total counts up, the coin flips when the amount changes; while the upgrade runs the
 * pieces stay put and pulse in turn, a loss drains them to grey. A win spends the stake in one light move: everything in
 * the card (pieces, slots, total) leans towards the target and fades as one layer, then the card clears.
 */
const props = defineProps<{
  items: InventoryItem[]
  coins: number
  total: number
  state: 'idle' | 'spinning' | 'win' | 'lose'
  disabled?: boolean
}>()
const emit = defineEmits<{ remove: [uid: string]; clearCoins: [] }>()

const SLOTS = 6
type Piece = { key: string; kind: 'skin'; item: InventoryItem } | { key: string; kind: 'coins'; amount: number }

const pieces = computed<Piece[]>(() => {
  const list: Piece[] = [...props.items].sort((a, b) => b.price - a.price).map((item) => ({ key: item.uid, kind: 'skin', item }))
  if (props.coins > 0) list.push({ key: 'coins', kind: 'coins', amount: props.coins })
  return list
})
// The page caps the stake at six pieces (coins count as one), so every piece has a slot
const shown = computed(() => pieces.value.slice(0, SLOTS))
const layout = computed(() => (pieces.value.length === 0 ? 'empty' : pieces.value.length === 1 ? 'single' : 'grid'))
const single = computed(() => pieces.value[0])
const isLg = useMediaQuery('(min-width: 1024px)')

// Total counts towards the new value instead of jumping
const totalSrc = computed(() => props.total)
const totalShown = useTransition(totalSrc, { duration: 450, transition: [0.22, 1, 0.36, 1] })


// One big piece ↔ slots: the piece that stays morphs (FLIP) from where it was to where it lands —
// the big art shrinks into its slot when a second skin arrives, and grows back when only one is left.
const root = useTemplateRef<HTMLElement>('root')
const morphing = ref<string | null>(null)
const artOf = (key: string) => root.value?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"] .kd-morph`)
watch(
  layout,
  (now, before) => {
    if (!((before === 'single' && now === 'grid') || (before === 'grid' && now === 'single'))) return
    const stays = now === 'single' ? pieces.value[0]?.key : root.value?.querySelector<HTMLElement>('.kd-single-art')?.dataset.key
    const from = stays && artOf(stays)?.getBoundingClientRect()
    if (!stays || !from) return
    morphing.value = stays
    nextTick(() => {
      const el = artOf(stays)
      const to = el?.getBoundingClientRect()
      if (el && to && to.width) {
        const dx = from.left + from.width / 2 - (to.left + to.width / 2)
        const dy = from.top + from.height / 2 - (to.top + to.height / 2)
        el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})` }, { transform: 'none' }], {
          duration: 560,
          easing: 'linear(0, 0.25 7%, 0.68 17%, 0.97 27%, 1.08 35%, 1.06 45%, 1.01 58%, 0.995 72%, 1)',
        })
      }
      setTimeout(() => (morphing.value = null), 600)
    })
  },
  { flush: 'pre' },
)

function removePiece(p: Piece) {
  if (props.disabled) return
  if (p.kind === 'coins') emit('clearCoins')
  else emit('remove', p.item.uid)
}
</script>

<template>
  <div class="min-w-0">
    <div
      ref="root"
      class="kd-stake relative flex flex-col rounded-5xl bg-neutral-2 lg:h-76"
      :class="`is-${state}`"
    >
      <Transition name="kd-stake-swap" mode="out-in">
        <div v-if="layout === 'empty'" key="empty" class="flex min-h-56 flex-1 flex-col items-center justify-center gap-4 text-center">
          <UiIcon name="deck-plus" :size="72" class="kd-stake-icon kd-ico-deck text-neutral-10" />
          <!-- the same words as the phone's card: the step, then where it comes from -->
          <p class="flex flex-col gap-1">
            <span class="type-16-caps font-bold text-neutral-12">{{ $t('upgrade.addSkins') }}</span>
            <span class="type-14-regular text-neutral-11">{{ $t('upgrade.addSkinsHint') }}</span>
          </p>
        </div>

        <!-- One piece: shown big, same layout as the target card -->
        <!-- single and grid live in one keyed wrapper, so switching between them morphs instead of fading -->
        <div v-else key="filled" class="kd-stake-spent relative flex min-h-56 flex-1 flex-col">
        <div v-if="layout === 'single' && single" class="relative min-h-56 flex-1">
          <Transition :name="morphing ? 'kd-none' : 'kd-single'" mode="out-in" appear>
            <div :key="single.key" class="absolute inset-0">
              <div class="kd-single-art absolute inset-0 grid place-items-center" :data-key="single.key">
                <ItemArt v-if="single.kind === 'skin'" float :image="single.item.image" :rarity="single.item.rarity" :size="isLg ? 150 : 120" class="kd-morph w-[260px]" />
                <UiCoinStack v-else :size="isLg ? 96 : 76" :amount="coins" class="kd-morph" />
              </div>
              <div class="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <div v-if="single.kind === 'skin'" class="flex min-w-0 flex-col gap-1">
                  <UiTextSwap :text="single.item.skin" class="truncate type-20-caps tracking-[0.05em]" :style="{ color: RARITY_COLOR[single.item.rarity] }" />
                  <span class="type-14-caps flex items-center gap-3 text-weapon">
                    <UiTextSwap :text="single.item.weapon" />
                    <span class="h-4 w-px bg-neutral-8" />
                    <span class="flex items-center gap-1.5"><span v-if="single.item.statTrak" class="text-brand-light">ST</span><UiTextSwap :text="single.item.wear" /></span>
                  </span>
                </div>
                <div v-else class="flex min-w-0 flex-col gap-1">
                  <span class="text-xl leading-6 font-extrabold tracking-[0.05em] text-item-gold uppercase">{{ $t('common.coins') }}</span>
                  <span class="type-14-caps text-neutral-11">KD</span>
                </div>
                <UiButton variant="ghost" icon="close" icon-only :aria-label="$t('upgrade.clear')" :disabled="disabled" @click="removePiece(single)" />
              </div>
            </div>
          </Transition>
        </div>

        <!-- 2+: slots. Empty slots are a fixed layer underneath; pieces deal in on top. -->
        <div v-else class="relative flex-1">
          <div class="grid h-full grid-cols-3 gap-2.5 p-4 lg:grid-rows-2">
            <div
              v-for="n in SLOTS"
              :key="n"
              class="kd-slot grid aspect-[116/127] place-items-center rounded-2xl bg-neutral-3 text-neutral-7 lg:aspect-auto"
              :class="n - 1 === pieces.length && state === 'idle' && 'is-next'"
            >
              <!-- the next free slot shows a quiet + instead of the placeholder gun; nothing pulses -->
              <UiIcon :name="n - 1 === pieces.length && state === 'idle' ? 'plus' : 'pistol'" :size="n - 1 === pieces.length && state === 'idle' ? 24 : 40" />
            </div>
          </div>
          <TransitionGroup tag="div" name="kd-piece" appear class="absolute inset-0 grid grid-cols-3 gap-2.5 p-4 lg:grid-rows-2">
            <button
              v-for="(p, i) in shown"
              :key="p.key"
              type="button"
              class="kd-piece group relative aspect-[116/127] overflow-hidden rounded-2xl border text-left lg:aspect-auto"
              :class="[p.kind === 'coins' && 'is-coins', morphing === p.key && 'is-morph']"
              :data-key="p.key"
              :style="{ '--i': i }"
              :disabled="disabled"
              :aria-label="p.kind === 'coins' ? 'KD Coins' : `${p.item.weapon} | ${p.item.skin}`"
              @click="removePiece(p)"
            >
              <template v-if="p.kind === 'skin'">
                <span class="absolute inset-0 grid place-items-center">
                  <ItemArt :image="p.item.image" :rarity="p.item.rarity" :size="56" class="kd-morph w-full" />
                </span>
                <div class="kd-piece-text absolute inset-x-0 top-0 flex flex-col gap-0.5 px-1.5 py-1">
                  <UiPrice :amount="p.item.price" size="s" />
                  <span class="type-10-caps flex gap-1">
                    <span v-if="p.item.statTrak" class="text-brand-light">ST</span>
                    <span class="text-neutral-15/48">{{ p.item.wear }}</span>
                  </span>
                </div>
                <div class="kd-piece-text absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-1.5 py-0.5">
                  <span class="type-10-caps truncate text-weapon">{{ p.item.weapon }}</span>
                  <span class="type-12 truncate" :style="{ color: RARITY_COLOR[p.item.rarity] }">{{ p.item.skin }}</span>
                </div>
              </template>
              <template v-else>
                <!-- the coin pictures are square (a skin is wide and low), so they may run under the price and the label like a
                     skin does; the text sits above them (every tile has that shadow) -->
                <span class="absolute inset-0 grid place-items-center"><UiCoinStack :size="32" :amount="coins" class="kd-morph" /></span>
                <div class="kd-piece-text absolute inset-x-0 top-0 px-1.5 py-1">
                  <UiPrice :amount="p.amount" size="s" />
                </div>
                <div class="kd-piece-text absolute inset-x-0 bottom-0 flex flex-col px-1.5 py-0.5">
                  <span class="type-10-caps text-neutral-15/48">KD</span>
                  <span class="type-12 text-item-gold">{{ $t('common.coins') }}</span>
                </div>
              </template>
              <UiIcon name="x-circle" :size="24" class="kd-piece-x absolute top-1/2 left-1/2 text-neutral-15" />
            </button>
          </TransitionGroup>
        </div>
        </div>
      </Transition>

      <!-- the total centred at the bottom, the same place as the target's price across the dial: the two read as a pair -->
      <!-- empty: no "0" — the card reads exactly like the empty target card across the dial -->
      <div v-if="layout !== 'empty'" class="kd-stake-spent flex items-center justify-center px-4 pb-6">
        <UiPrice :amount="Math.round(totalShown)" size="xxl" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-stake {
  transition: border-color var(--dur-base) var(--ease-out);
}
.kd-stake-icon {
  animation: kd-float 3.2s var(--ease-in-out) infinite;
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
/* every tile: its labels sit above the art with a soft shadow, so they read where the art runs under them */
.kd-piece-text {
  z-index: 1;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.85);
}

/* Slots: empty ones show a faint gun; the next free one a quiet + (only while idle) */
.kd-slot.is-next {
  color: var(--color-neutral-11);
  background: var(--color-neutral-4);
}

/* A new piece flies up from the inventory below, overshoots and lands (no rim flash — no hard outlines).
   Switching from one big piece to slots deals them in one after another. */
.kd-piece-enter-active.is-morph {
  animation: none;
}
.kd-piece-enter-active {
  animation: kd-piece-in 560ms var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 55ms);
}
@keyframes kd-piece-in {
  0% {
    opacity: 0;
    transform: translateY(48px) scale(0.55) rotate(-8deg);
  }
  55% {
    opacity: 1;
    transform: translateY(-6px) scale(1.06) rotate(2deg);
  }
  78% {
    transform: translateY(1px) scale(0.98);
  }
  100% {
    transform: none;
  }
}
/* Removed: drops back down towards the inventory; the rest slide over afterwards */
.kd-piece-leave-active {
  animation: kd-piece-out 240ms var(--ease-in) both;
}
@keyframes kd-piece-out {
  to {
    opacity: 0;
    transform: translateY(28px) scale(0.75) rotate(4deg);
  }
}
.kd-piece-move {
  transition: transform var(--dur-slow) var(--ease-spring);
}

/* Single piece: drops in like the target; swapping it for another crossfades */
.kd-single-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-single-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-single-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.9);
}
.kd-single-leave-to {
  opacity: 0;
  transform: scale(0.94);
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

/* Upgrade running: the pieces stay where they are and float in turn — no outlines, no flashing.
   Won: they are spent — the card's contents lean towards the target and fade, the won skin takes their place.
   Lost: they drain to grey and sink a little. */
.is-spinning .kd-piece,
.is-spinning .kd-single-art {
  animation: kd-piece-float 1.6s var(--ease-in-out) infinite;
  animation-delay: calc(var(--i, 0) * 140ms);
}
@keyframes kd-piece-float {
  50% {
    translate: 0 -4px;
  }
}
/* Won: the card's contents (pieces, slots, total) lean towards the target and fade, as one layer each — two elements,
   transform and opacity only, done inside the result's hold (Fast's too) */
.is-win .kd-stake-spent {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
  transition:
    opacity 320ms var(--ease-in),
    transform 320ms var(--ease-in);
}
.is-lose .kd-piece,
.is-lose .kd-single-art {
  filter: grayscale(1) brightness(0.5);
  opacity: 0.6;
  translate: 0 6px;
  transition:
    filter 700ms var(--ease-out),
    opacity 700ms var(--ease-out),
    translate 700ms var(--ease-out);
}
</style>
