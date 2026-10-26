<script setup lang="ts">
// Figma "OpenControls" (desktop) and "Mobile/OpenControls". One panel across the content width.
// Desktop: one row — amount on the left, the main button (56px, like the upgrade's) dead centre, Fast ·
// KURWADROP on the right. Phones: the same pieces stacked — amount, main button, the two chips under it
// (as the upgrade stacks Reset · Fast under its button).
// One spot for the repeated action (docs/motion.md → "One thumb"): the main button never moves and changes role —
// Open → Skip (while the reel spins) → Open again — so open, skip, open again is tap, tap, tap in one place.
// "Sell all" gets a slot of its own (desktop: the middle card of the row under the dock, right below the main
// button; phones: a row that unfolds under the button), so its arrival never pushes the main button.
// The page decides what the main button says (open · sign in · top up the shortfall). The demo spin is on the
// reel's stage (CaseReel), not here. Labels change at once (no letter-by-letter swap: rapid taps made the text
// jitter), and every control in the block is 48px high (56px main button on desktop).
const count = defineModel<1 | 2 | 3 | 4 | 5>('count', { required: true })
const fast = defineModel<boolean>('fast', { required: true })
const kurwadrop = defineModel<boolean>('kurwadrop', { required: true })

const props = defineProps<{
  /** Main button text and the amount on it (the price, or the shortfall when short) */
  label: string
  amount: number
  /** The amount is a shortfall: shown as "+ amount" */
  short?: boolean
  phase: 'idle' | 'spinning' | 'result'
  unsoldTotal: number
}>()
const emit = defineEmits<{ open: []; skip: []; sellAll: [] }>()
const main = () => (props.phase === 'spinning' ? emit('skip') : emit('open'))
const showSell = computed(() => props.phase === 'result' && props.unsoldTotal > 0)

const sellAll = () => emit('sellAll')

const COUNT_OPTIONS = ([1, 2, 3, 4, 5] as const).map((n) => ({ value: n, label: `×${n}` }))
</script>

<template>
  <div class="kd-dock flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
    <!-- Amount: the kit's segmented control -->
    <UiSegmented v-model="count" :options="COUNT_OPTIONS" :disabled="phase === 'spinning'" block class="mb-1 lg:mb-0 lg:w-60" />

    <div class="flex flex-col">
      <UiButton size="l" class="kd-main w-full lg:h-14 lg:w-80" :variant="phase === 'spinning' ? 'secondary' : 'primary'" @click="main">
        <span>{{ label }}</span>
        <span v-if="phase !== 'spinning'" class="btn-value">
          <span v-if="short" class="type-14">+</span>
          <UiPrice :amount="amount" size="m" tone="inverse" />
        </span>
        <UiIcon v-else name="chevron-right" :size="18" class="kd-skip-icon" />
        <span v-if="phase === 'idle'" class="kd-shine" />
      </UiButton>
      <!-- Phones: Sell all unfolds under the main button instead of squeezing it -->
      <div class="kd-unfold lg:hidden" :class="showSell && 'is-open'">
        <div class="min-h-0">
          <UiButton variant="secondary" size="l" class="mt-2 w-full" :tabindex="showSell ? 0 : -1" @click="sellAll">
            <span>{{ $t('wallet.sellAll') }}</span>
            <span class="btn-value"><UiPrice :amount="unsoldTotal" size="m" /></span>
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Switches (pressed = tinted fill, the hint lives in the tooltip): phones, two equal chips under the main
         button; desktop, the right end of the row -->
    <div class="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
      <UiChip size="m" tone="coin" icon="fast" class="!h-12 w-full lg:w-auto lg:px-4" :active="fast" @click="fast = !fast">{{ $t('upgrade.fast') }}</UiChip>
      <UiTooltip :text="$t('case.kurwaHint')" class="min-w-0">
        <!-- a chicken head in the same line weight as Fast's bolt -->
        <UiChip size="m" tone="gold" icon="kurwa" class="!h-12 w-full min-w-0 lg:px-4" :active="kurwadrop" @click="kurwadrop = !kurwadrop">
          <span :class="kurwadrop && 'kd-kurwa-word'">{{ $t('case.kurwadrop') }}</span>
        </UiChip>
      </UiTooltip>
    </div>
  </div>
</template>

<style scoped>
.kd-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
/* Desktop: the 48px controls sit centred on the 56px Open button, so 16px above them; the sides match it */
@media (min-width: 64rem) {
  .kd-dock {
    padding-inline: 16px;
  }
}
.kd-kurwa-word {
  background: linear-gradient(90deg, var(--color-gold), var(--color-gold-light) 45%, var(--color-item-gold));
  background-clip: text;
  color: transparent;
}
.kd-skip-icon {
  animation: kd-skip-nudge 900ms ease-in-out infinite;
}
@keyframes kd-skip-nudge {
  50% {
    transform: translateX(3px);
  }
}
/* Height animates from 0 with grid rows, so nothing below jumps */
.kd-unfold {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out);
}
.kd-unfold.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}
.kd-unfold > div {
  overflow: hidden;
}
/* Phones only (a scoped display rule beats the lg:hidden utility) */
@media (min-width: 64rem) {
  .kd-unfold {
    display: none;
  }
}
</style>
