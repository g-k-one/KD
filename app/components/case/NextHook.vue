<script setup lang="ts">
import { NuxtLink } from '#components'
import { upgradeChanceBp } from '#shared/upgrade'
import type { CaseDetails, InventoryItem, MarketResponse, PfRoll } from '#shared/types/api'

/*
 * The row under the open controls. One fixed height and the full width in both states, so nothing below jumps and
 * the row keeps its shape; the states cross over in place (the old one sinks and fades while the new one rises in),
 * and the new one's pieces come in one after another — the cards left to right, the drops along the strip.
 *   Before a drop — this case's best drops of the last 7 days, with their ×, best first (Hellcase-style
 *                   social proof: what this exact case has really paid)
 *   After a drop  — what to do with it, three equal cards across: Upgrade it (the unsold drops aimed at ~2.5×
 *                   their value, chance shown), Sell all (desktop; phones have it under the main button) and Check
 *                   this roll (the ticket, opens the rolls with the verifier one tap away; a square on phones)
 */
const props = defineProps<{ data: CaseDetails; unsold: InventoryItem[]; count: number; phase: 'idle' | 'spinning' | 'result'; rolls?: PfRoll[] }>()
const emit = defineEmits<{ sellAll: []; check: [] }>()
// the row stays after selling: the roll can still be checked
const live = computed(() => props.phase === 'result' && (props.unsold.length > 0 || !!props.rolls?.length))
const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const isLg = useMediaQuery('(min-width: 1024px)')

// Sell all, in one tap
const rules = useGameRules()
const unsoldTotal = computed(() => props.unsold.reduce((a, i) => a + i.price, 0))
const sellAll = () => emit('sellAll')

// Upgrade it
const { data: market } = useFetch<MarketResponse>('/api/market', { key: 'market', lazy: true, server: false })
const upgrade = computed(() => {
  const value = unsoldTotal.value
  if (!value) return null
  const items = (market.value?.items ?? []).filter((i) => i.price > value * 1.2)
  if (!items.length) return null
  const aim = value * 2.5
  const target = items.reduce((best, i) => (Math.abs(i.price - aim) < Math.abs(best.price - aim) ? i : best))
  const chance = upgradeChanceBp(value, target.price, rules.value.upgrade) / 100
  return { target, chance, to: `/upgrade?item=${props.unsold.map((i) => i.uid).join(',')}&target=${target.id}&from=${props.data.slug}` }
})

const top = computed(() => props.data.topDrops ?? [])
const xLabel = (m: number) => (m >= 10 ? `×${Math.round(m)}` : `×${m.toFixed(1)}`)
</script>

<template>
  <div class="kd-hook relative w-full" :class="phase === 'spinning' && 'is-resting'">
    <!-- the duration covers the last piece's staggered rise, so the enter class stays until it lands -->
    <Transition name="kd-hc" :duration="{ enter: 720, leave: 220 }">
      <!-- After a drop: what to do with it -->
      <div v-if="live" key="act" class="flex gap-2 lg:grid lg:grid-cols-3">
        <component :is="upgrade ? NuxtLink : 'div'" :to="upgrade?.to" class="kd-hook-card kd-act" :class="upgrade ? 'kd-press is-live' : 'is-muted'" style="--i: 0">
          <template v-if="upgrade">
            <ItemArt :image="upgrade.target.image" :rarity="upgrade.target.rarity" :size="40" class="w-14 shrink-0" />
            <span class="flex min-w-0 flex-col">
              <span class="type-12-caps text-neutral-11">{{ $t('case.hookUpgrade') }}</span>
              <span class="type-14 truncate" :style="{ color: RARITY_COLOR[upgrade.target.rarity] }">{{ upgrade.target.weapon }} | {{ upgrade.target.skin }}</span>
            </span>
            <span class="type-16-caps ml-auto shrink-0 tabular-nums" :class="upgrade.chance >= 60 ? 'text-success' : upgrade.chance >= 30 ? 'text-warning' : 'text-danger'">{{ upgrade.chance.toFixed(1) }}%</span>
          </template>
          <template v-else>
            <span class="kd-hc-ic bg-neutral-3 text-neutral-11"><UiIcon name="upgrade" :size="22" /></span>
            <span class="type-14 truncate text-neutral-12">{{ $t('case.hookUpgradeIdle') }}</span>
          </template>
        </component>
        <button v-if="isLg" type="button" class="kd-hook-card kd-act" :class="unsold.length ? 'kd-press is-live is-sell' : 'is-muted'" :disabled="!unsold.length" style="--i: 1" @click="sellAll">
          <span class="kd-hc-ic kd-sell-ic"><UiIcon name="wallet" :size="22" /></span>
          <span class="flex min-w-0 flex-col text-left">
            <span class="type-12-caps text-neutral-11">{{ $t('wallet.sellAll') }}</span>
            <UiTextSwap :text="!unsold.length ? $t('wallet.sold') : $t('case.dropsShort', unsold.length)" class="type-14" />
          </span>
          <UiPrice v-if="unsold.length" :amount="unsoldTotal" size="m" tone="coin" class="ml-auto" />
        </button>
        <!-- this very roll: the ticket, a tap to the rolls and the verifier -->
        <button v-if="rolls?.length" type="button" class="kd-hook-card kd-act kd-check kd-press is-live" :aria-label="$t('case.checkRoll')" style="--i: 2" @click="emit('check')">
          <span class="kd-hc-ic kd-check-ic"><UiIcon name="shield-check" :size="22" /></span>
          <span class="flex min-w-0 flex-col text-left max-lg:hidden">
            <span class="type-12-caps text-neutral-11">{{ $t('case.checkRoll') }}</span>
            <span class="type-14 truncate tabular-nums">{{ rolls.length === 1 ? $t('case.ticketN', { n: spaced(rolls[0]!.ticket) }) : $t('case.ticketsN', { n: rolls.length }) }}</span>
          </span>
          <UiIcon name="chevron-right" :size="18" class="ml-auto shrink-0 text-neutral-10 max-lg:hidden" />
        </button>
      </div>

      <!-- Before a drop: what this case has paid lately -->
      <div v-else-if="top.length" key="top" class="kd-hook-card kd-top w-full justify-center">
        <span class="flex shrink-0 flex-col pr-1 max-sm:hidden">
          <span class="type-12-caps flex items-center gap-1.5 text-neutral-11"><UiIcon name="trophy" :size="14" class="text-coin" />{{ $t('case.topDrops') }}</span>
          <span class="type-12-regular text-neutral-11">{{ $t('case.topDropsWindow') }}</span>
        </span>
        <div class="scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto max-sm:-mr-2 max-sm:pr-2 mask-r-from-85% sm:mask-none">
          <div v-for="(d, i) in top" :key="i" class="kd-top-drop" :style="{ '--rc': RARITY_COLOR[d.item.rarity], '--i': i }" :title="`${d.item.weapon} | ${d.item.skin} · ${d.nickname} · ${timeAgo(d.at)}`">
            <ItemArt :image="d.item.image" :rarity="d.item.rarity" :size="34" class="w-12 shrink-0" />
            <span class="flex min-w-0 flex-col">
              <span class="kd-top-x tabular-nums">{{ xLabel(d.multiplier) }}</span>
              <span class="type-10-caps truncate normal-case text-neutral-11">{{ timeAgo(d.at) }}</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.kd-hook {
  min-height: 64px;
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-hook.is-resting {
  opacity: 0.4;
  pointer-events: none;
}
.kd-hook-card {
  display: flex;
  min-width: 0;
  height: 64px;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  padding: 0 16px 0 8px;
  border-radius: 16px;
  background: var(--color-neutral-2);
  transition: background-color var(--dur-slow) var(--ease-out);
}
.kd-hook-card.kd-top {
  padding: 0 8px 0 16px;
}
/* Desktop: three equal cards across the row. Phones: the upgrade card takes the width, the check is a square */
@media (width < 64rem) {
  .kd-act {
    flex: 1 1 auto;
  }
  .kd-act.kd-check {
    flex: 0 0 64px;
    justify-content: center;
    padding: 0;
  }
}
.kd-check-ic {
  background: rgb(18 183 106 / 0.14);
  color: var(--color-success);
}
.kd-hc-ic {
  display: grid;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 12px;
}
/* 48px tiles in a 64px card: 8px inset, 16 − 8 = 8 radius (concentric) */
.kd-top-drop {
  display: flex;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  padding-right: 10px;
  border-radius: 8px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--rc) 14%, var(--color-neutral-3)), var(--color-neutral-3) 70%);
}
.kd-top-x {
  font-size: 16px;
  line-height: 18px;
  font-weight: 800;
  background: linear-gradient(180deg, var(--color-gold-light), var(--color-brand-bright) 55%, var(--color-brand-base));
  background-clip: text;
  color: transparent;
}
.kd-sell-ic {
  background: rgb(253 176 34 / 0.14);
  color: var(--color-coin);
  transition:
    background-color var(--dur-slow) var(--ease-out),
    color var(--dur-slow) var(--ease-out);
}
.kd-hook-card.is-muted {
  background: rgb(255 255 255 / 0.02);
}
@media (hover: hover) {
  .kd-hook-card.is-live:hover {
    background: var(--color-neutral-3);
  }
}
.kd-hc-enter-active {
  transition: opacity var(--dur-slow) var(--ease-out);
}
/* the old state leaves in place, over the new one, and quicker than the new one arrives */
.kd-hc-leave-active {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  transition:
    opacity var(--dur-base) var(--ease-in),
    transform var(--dur-base) var(--ease-in);
}
.kd-hc-enter-from {
  opacity: 0;
}
.kd-hc-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
/* the new state's pieces rise in one after another: the cards 70 ms apart, the drops 40 ms apart along the strip */
.kd-hc-enter-active .kd-act,
.kd-hc-enter-active .kd-top-drop {
  animation: kd-hc-rise var(--dur-slow) var(--ease-spring) both;
  animation-delay: calc(80ms + var(--i, 0) * 70ms);
}
.kd-hc-enter-active .kd-top-drop {
  animation-delay: calc(60ms + var(--i, 0) * 40ms);
}
@keyframes kd-hc-rise {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .kd-hc-enter-active .kd-act,
  .kd-hc-enter-active .kd-top-drop {
    animation: none;
  }
}
</style>
