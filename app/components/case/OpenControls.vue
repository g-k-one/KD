<script setup lang="ts">
// Figma "OpenControls" (desktop) and "Mobile/OpenControls", laid out like the upgrade's centre column so both
// game screens share one control block: the main button (48px, 56px on desktop) with a row of two equal 40px
// chips under it (here Fast · KURWADROP, there Reset · Fast). The amount sits above it. Desktop: a centred
// 320px column; phones: the same stack across the width on a panel.
// One spot for the repeated action (docs/motion.md → "One thumb"): the main button never moves and changes role —
// Open → Skip (while the reel spins) → Open again — so open, skip, open again is tap, tap, tap in one place.
// "Sell all" gets a slot of its own (desktop: the middle card of the row under the dock, right below the main
// button; phones: a row that unfolds under the button), so its arrival never pushes the main button.
// The page decides what the main button says (open · sign in · top up the shortfall). The demo spin is on the
// reel's stage (CaseReel), not here.
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
  /** Sell all asks for a second tap (the drops are worth a lot) */
  confirmSell?: boolean
}>()
const emit = defineEmits<{ open: []; skip: []; sellAll: [] }>()
const main = () => (props.phase === 'spinning' ? emit('skip') : emit('open'))
const showSell = computed(() => props.phase === 'result' && props.unsoldTotal > 0)

const armed = ref(false)
let armTimer: ReturnType<typeof setTimeout> | undefined
function sellAll() {
  if (props.confirmSell && !armed.value) {
    armed.value = true
    clearTimeout(armTimer)
    armTimer = setTimeout(() => (armed.value = false), 3000)
    return
  }
  armed.value = false
  emit('sellAll')
}

const COUNT_OPTIONS = ([1, 2, 3, 4, 5] as const).map((n) => ({ value: n, label: `×${n}` }))
</script>

<template>
  <div class="kd-dock mx-auto flex w-full flex-col gap-2 lg:w-80">
    <!-- Amount: the kit's segmented control -->
    <UiSegmented v-model="count" :options="COUNT_OPTIONS" :disabled="phase === 'spinning'" block class="mb-1" />

    <div class="flex flex-col">
      <UiButton size="l" class="kd-main w-full lg:h-14" :variant="phase === 'spinning' ? 'secondary' : 'primary'" @click="main">
        <UiTextSwap :text="label" />
        <span v-if="phase !== 'spinning'" class="flex items-center gap-0.5">
          <span v-if="short" class="type-14">+</span>
          <UiPrice :amount="amount" size="m" tone="inverse" />
        </span>
        <UiIcon v-else name="chevron-right" :size="18" class="kd-skip-icon" />
        <span v-if="phase === 'idle'" class="kd-shine" />
      </UiButton>
      <!-- Phones: Sell all unfolds under the main button instead of squeezing it -->
      <div class="kd-unfold lg:hidden" :class="showSell && 'is-open'">
        <div class="min-h-0">
          <UiButton :variant="armed ? 'danger' : 'secondary'" size="l" class="mt-2 w-full" :tabindex="showSell ? 0 : -1" @click="sellAll">
            <UiTextSwap :text="armed ? $t('wallet.sureSell') : $t('wallet.sellAll')" />
            <UiPrice :amount="unsoldTotal" size="m" />
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Switches: two equal chips under the main button (pressed = tinted fill), the hint lives in the tooltip -->
    <div class="grid grid-cols-2 gap-2">
      <UiChip size="m" tone="coin" icon="fast" class="w-full" :active="fast" @click="fast = !fast">{{ $t('upgrade.fast') }}</UiChip>
      <UiTooltip :text="$t('case.kurwaHint')" class="min-w-0">
        <UiChip size="m" tone="gold" icon="chicken" class="w-full" :active="kurwadrop" @click="kurwadrop = !kurwadrop">
          <span :class="kurwadrop && 'kd-kurwa-word'">{{ $t('case.kurwadrop') }}</span>
        </UiChip>
      </UiTooltip>
    </div>
  </div>
</template>

<style scoped>
/* Phones: one panel around the stack; desktop: the column stands on the page, like the upgrade's */
@media (width < 64rem) {
  .kd-dock {
    border-radius: 24px;
    background: var(--color-neutral-2);
    padding: 12px;
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
/* Phones only (a scoped display rule beats Tailwind's lg:hidden) */
@media (min-width: 64rem) {
  .kd-unfold {
    display: none;
  }
}
</style>
