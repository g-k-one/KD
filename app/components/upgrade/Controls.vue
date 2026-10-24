<script setup lang="ts">
import type { Item } from '#shared/types/api'
import { UPGRADE_MAX_PCT } from '#shared/upgrade'

/*
 * The upgrade's control panel, after Stake Dice / Limbo (docs/ux-audit-v2.md), sized so the whole game
 * fits on one phone screen:
 *   CTA      — "Upgrade · 68.9%" (the result is a skin, never coins back), ↺ reset, ⚡ fast spin
 *   Chance   — one 1–80% bar (the cap, shared/upgrade.ts). Only the span the stake can reach is lit (the rest is shaded); dragging aims at the closest skin and
 *              the thumb settles on its real chance when let go. Under the bar ×10 · ×5 · ×3 · ×2 · ×1.5
 *              sit at their chances and aim there on tap — the scale explains itself.
 *   Balance  — the same kind of bar as the chance: 0 … the whole balance on a square-root scale (small
 *              amounts get most of the travel), presets 10% · 25% · ½ · Max under it, an exact amount in the field
 * part: 'all' on phones (stacked under the dial); desktop places each part in its column —
 * balance under the stake card, CTA under the dial, chance under the target card — so nothing sits in a
 * row of its own and the pickers start on the first screen.
 */
const props = defineProps<{
  /** Real chance of the current stake → target, basis points */
  chance: number
  input: number
  balance: number
  target: Item | null
  /** Market prices, for the reachable-skin dots */
  prices: number[]
  state: 'idle' | 'spinning' | 'win' | 'lose'
  signedIn: boolean
  part?: 'all' | 'cta' | 'chance' | 'balance'
  /** The skin just won: with an empty stake the CTA offers to upgrade it */
  again?: Item | null
  /** The result is in, the spent stake still leaving: the CTA already reads as what comes next, taps wait */
  settling?: boolean
}>()
const is = (p: 'cta' | 'chance' | 'balance') => !props.part || props.part === 'all' || props.part === p
const extra = defineModel<number>('extra', { required: true })
const fast = defineModel<boolean>('fast', { required: true })
const emit = defineEmits<{ aim: [chancePct: number]; upgrade: []; reset: []; again: []; skip: [] }>()
const offerAgain = computed(() => !!props.again && !props.input && props.state !== 'spinning')
// one spot, like the case page: Upgrade → Skip while the dial turns → Upgrade again
const onCta = () => (props.settling ? undefined : busy.value ? emit('skip') : offerAgain.value ? emit('again') : emit('upgrade'))

const busy = computed(() => props.state === 'spinning')
const real = computed(() => props.chance / 100)
const MIN = 1
const MAX = UPGRADE_MAX_PCT
const pos = (c: number) => ((Math.min(MAX, Math.max(MIN, c)) - MIN) / (MAX - MIN)) * 100

// --- Chance bar ---------------------------------------------------------------
const bar = useTemplateRef<HTMLElement>('bar')
const dragging = ref<number | null>(null)
const shown = computed(() => dragging.value ?? (props.target ? real.value : 0))
/** Chances of every skin the stake can reach (upgrade targets must cost more than the stake) */
const dots = computed(() =>
  props.input ? props.prices.filter((p) => p > props.input).map((p) => Math.max(MIN, Math.min(MAX, (props.input / p) * 95))) : [],
)
const reachable = computed(() => dots.value.length > 0)
/** The lit span of the bar: from the cheapest reachable chance to the best one */
const span = computed(() => (reachable.value ? { from: pos(Math.min(...dots.value)), to: pos(Math.max(...dots.value)) } : { from: 0, to: 0 }))
const PRESETS = [10, 5, 3, 2, 1.5].map((m) => ({ m, c: 95 / m }))

let lastAim = 0
const valueAt = (x: number) => {
  const r = bar.value!.getBoundingClientRect()
  return MIN + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (MAX - MIN)
}
function onDown(e: PointerEvent) {
  if (busy.value || !reachable.value) return
  bar.value!.setPointerCapture(e.pointerId)
  drag(e.clientX)
}
function onMove(e: PointerEvent) {
  if (bar.value?.hasPointerCapture(e.pointerId)) drag(e.clientX)
}
function drag(x: number) {
  const v = valueAt(x)
  dragging.value = v
  // Re-aim while dragging (throttled) so the target card follows the finger
  const now = performance.now()
  if (now - lastAim > 80) {
    lastAim = now
    emit('aim', v)
  }
}
function onUp(e: PointerEvent) {
  if (dragging.value != null) emit('aim', dragging.value)
  dragging.value = null
  bar.value?.releasePointerCapture?.(e.pointerId)
}
function onKey(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
  if (!step || busy.value || !reachable.value) return
  e.preventDefault()
  emit('aim', Math.min(MAX, Math.max(MIN, (shown.value || 50) + step * 5)))
}

const multiplier = computed(() => (props.target && props.input ? props.target.price / props.input : 0))
const tone = computed(() => (shown.value >= 60 ? 'success' : shown.value >= 30 ? 'warning' : 'danger'))
const hint = computed(() => {
  if (!props.signedIn) return null
  if (!props.input) return 'upgrade.hintStake'
  if (!reachable.value) return 'upgrade.hintTooMuch'
  return null
})

// --- Balance ------------------------------------------------------------------
const extraText = computed({
  get: () => (extra.value ? (extra.value / 100).toFixed(2) : ''),
  set: (v: string) => {
    const n = Math.round(Number.parseFloat(v.replace(',', '.')) * 100)
    extra.value = Number.isFinite(n) ? Math.min(Math.max(0, n), props.balance) : 0
  },
})
// Bar position (0–100) ↔ coin cents, square-root scale
const balPos = (cents: number) => (props.balance > 0 ? Math.sqrt(Math.min(1, cents / props.balance)) * 100 : 0)
const balAt = (p: number) => {
  const v = (Math.max(0, Math.min(100, p)) / 100) ** 2 * props.balance
  // round to whole coins above 10 coins, to cents below
  return v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v)
}
const balBar = useTemplateRef<HTMLElement>('balBar')
const balDrag = ref<number | null>(null)
const balShown = computed(() => balDrag.value ?? balPos(extra.value))
const balOff = computed(() => busy.value || !props.signedIn || props.balance <= 0)
const balPct = (x: number) => {
  const r = balBar.value!.getBoundingClientRect()
  return Math.min(1, Math.max(0, (x - r.left) / r.width)) * 100
}
let lastBal = 0
function balSet(x: number) {
  balDrag.value = balPct(x)
  const now = performance.now()
  if (now - lastBal > 60) {
    lastBal = now
    extra.value = balAt(balDrag.value)
  }
}
function onBalDown(e: PointerEvent) {
  if (balOff.value) return
  balBar.value!.setPointerCapture(e.pointerId)
  balSet(e.clientX)
}
function onBalMove(e: PointerEvent) {
  if (balBar.value?.hasPointerCapture(e.pointerId)) balSet(e.clientX)
}
function onBalUp(e: PointerEvent) {
  if (balDrag.value != null) extra.value = balAt(balDrag.value)
  balDrag.value = null
  balBar.value?.releasePointerCapture?.(e.pointerId)
}
const BAL_PRESETS = [
  { label: '10%', f: 0.1 },
  { label: '25%', f: 0.25 },
  { label: '½', f: 0.5 },
  { label: 'Max', f: 1 },
]
const setShare = (f: number) => (extra.value = f === 1 ? props.balance : Math.round(props.balance * f))
const canReset = computed(() => !!(props.input || props.target))
</script>

<template>
  <section class="kd-controls grid grid-cols-[minmax(0,1fr)] gap-2" :class="busy && 'is-busy'">
    <!-- CTA, then Reset · Fast as two equal chips under it (the case page's dock has the same block) -->
    <div v-if="is('cta')" class="flex flex-wrap gap-2" :class="part !== 'cta' && 'kd-cta-dock max-lg:order-last'">
      <UiButton size="l" class="kd-cta h-12 min-w-0 basis-full lg:h-14" :variant="busy ? 'secondary' : 'primary'" @click="onCta">
        <template v-if="offerAgain && again">
          <UiIcon name="upgrade" :size="20" />
          <span>{{ $t('upgrade.upgradeWin') }}</span>
          <span class="btn-value"><UiPrice :amount="again.price" size="m" tone="inverse" /></span>
        </template>
        <template v-else-if="!busy && target && input">
          <UiIcon name="upgrade" :size="20" />
          <span>{{ $t('upgrade.upgrade') }}</span>
          <!-- the chance, not coins: an upgrade pays out a skin, never change -->
          <span class="btn-value type-14 tabular-nums">{{ real.toFixed(real < 10 ? 2 : 1) }}%</span>
        </template>
        <template v-else-if="busy">
          <span>{{ $t('case.skip') }}</span>
          <UiIcon name="chevron-right" :size="18" class="kd-skip-icon" />
        </template>
        <span v-else>{{ !signedIn ? $t('auth.signInToPlay') : !input ? $t('upgrade.addToUpgrade') : $t('upgrade.chooseTarget') }}</span>
      </UiButton>
      <UiChip size="m" icon="refresh" class="kd-tool" :disabled="busy || !canReset" @click="emit('reset')">
        <span class="truncate">{{ $t('upgrade.reset') }}</span>
      </UiChip>
      <UiChip size="m" tone="coin" icon="fast" class="kd-tool" :active="fast" @click="fast = !fast">
        <span class="truncate">{{ $t('upgrade.fast') }}</span>
      </UiChip>
    </div>

    <!-- Chance -->
    <div v-if="is('chance')" class="kd-panel flex flex-col justify-between gap-2">
      <div class="flex items-baseline justify-between gap-2">
        <span class="type-14-caps lg:type-12-caps text-neutral-11">{{ $t('upgrade.chance') }}</span>
        <span class="flex items-baseline gap-2 tabular-nums">
          <span v-if="multiplier" class="type-14 text-neutral-12">×{{ multiplier.toFixed(2) }}</span>
          <span class="type-20-caps" :class="shown ? `text-${tone}` : 'text-neutral-10'">{{ shown ? `${shown.toFixed(shown < 10 ? 2 : 1)}%` : '—' }}</span>
        </span>
      </div>
      <div
        ref="bar"
        class="kd-bar relative h-9 touch-none select-none"
        :class="[!reachable && 'is-off', dragging != null && 'is-dragging']"
        role="slider"
        tabindex="0"
        :aria-valuemin="MIN"
        :aria-valuemax="MAX"
        :aria-valuenow="Math.round(shown)"
        :aria-label="$t('upgrade.chance')"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @keydown="onKey"
      >
        <div class="kd-track absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full">
          <span class="kd-win-zone absolute inset-y-0 left-0" :style="{ width: `${pos(shown)}%` }" />
        </div>
        <!-- Outside the reachable span the bar is shaded: no skin sits there -->
        <template v-if="reachable">
          <!-- shaded = no skin on the market gives that chance with this stake (left: none pricier) -->
          <span class="kd-shade absolute top-1/2 left-0 grid place-items-center rounded-l-full" :style="{ width: `${span.from}%` }" :title="$t('upgrade.noPricier')">
            <span v-if="span.from > 28" class="type-10-caps pointer-events-none truncate px-2 text-neutral-11">{{ $t('upgrade.noPricier') }}</span>
          </span>
          <span class="kd-shade absolute top-1/2 right-0 rounded-r-full" :style="{ width: `${100 - span.to}%` }" />
        </template>
        <span v-if="reachable" class="kd-thumb absolute top-1/2" :style="{ left: `${pos(shown || 50)}%` }" />
        <span v-if="hint" class="type-12 pointer-events-none absolute inset-0 grid place-items-center text-neutral-13">{{ $t(hint) }}</span>
      </div>
      <div class="relative h-7 lg:h-6">
        <button
          v-for="p in PRESETS"
          :key="p.m"
          type="button"
          class="kd-press kd-preset kd-hit type-14 lg:type-12 absolute top-0 -translate-x-1/2 rounded-md px-1.5 py-0.5 tabular-nums"
          :class="{ 'is-on': !!multiplier && Math.abs(multiplier - p.m) < p.m * 0.08 }"
          :style="{ left: `${pos(p.c)}%` }"
          :disabled="busy || !reachable"
          @click="emit('aim', p.c)"
        >
          ×{{ p.m }}
        </button>
      </div>
    </div>

    <!-- Balance into the stake: same language as the chance bar -->
    <div v-if="is('balance')" class="kd-panel flex flex-col justify-between gap-2">
      <div class="flex items-center justify-between gap-2">
        <span class="type-14-caps lg:type-12-caps text-neutral-11">{{ $t('upgrade.fromBalance') }}</span>
        <UiInput id="upgrade-extra" v-model="extraText" size="s" coin clearable lazy align="right" inputmode="decimal" placeholder="0" :disabled="busy || !signedIn" class="w-36 lg:w-32" @clear="extra = 0" />
      </div>
      <div
        ref="balBar"
        class="kd-bar relative h-9 touch-none select-none"
        :class="[balOff && 'is-off', balDrag != null && 'is-dragging']"
        role="slider"
        tabindex="0"
        :aria-valuemin="0"
        :aria-valuemax="balance"
        :aria-valuenow="extra"
        :aria-label="$t('upgrade.fromBalance')"
        @pointerdown="onBalDown"
        @pointermove="onBalMove"
        @pointerup="onBalUp"
        @pointercancel="onBalUp"
      >
        <div class="kd-bal-track absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full">
          <span class="kd-bal-fill absolute inset-y-0 left-0" :style="{ width: `${balShown}%` }" />
        </div>
        <span v-if="!balOff" class="kd-thumb absolute top-1/2" :style="{ left: `${balShown}%` }" />
      </div>
      <div class="relative h-7 lg:h-6">
        <button
          v-for="p in BAL_PRESETS"
          :key="p.label"
          type="button"
          class="kd-press kd-preset type-14 lg:type-12 absolute top-0 rounded-md px-1.5 py-0.5 tabular-nums"
          :class="[{ 'is-on': !!extra && Math.abs(extra - (p.f === 1 ? balance : balance * p.f)) < balance * 0.01 }, p.f === 1 ? '-translate-x-full' : '-translate-x-1/2']"
          :style="{ left: `${p.f === 1 ? 100 : Math.sqrt(p.f) * 100}%` }"
          :disabled="balOff"
          @click="setShare(p.f)"
        >
          {{ p.f === 1 ? $t('upgrade.max') : p.label }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kd-skip-icon {
  animation: kd-skip-nudge 900ms ease-in-out infinite;
}
@keyframes kd-skip-nudge {
  50% {
    transform: translateX(3px);
  }
}
.kd-panel {
  border-radius: 16px;
  background: var(--color-neutral-2);
  padding: 10px 14px 12px;
}
/* A fixed-height pill, so the percentage never makes the button taller */
/* Phones: sticks above the bottom nav on a fade of the page ground */
@media (width < 64rem) {
  .kd-cta-dock {
    position: sticky;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    z-index: 20;
    margin-inline: -16px;
    padding: 16px 16px 8px;
    background: linear-gradient(transparent, var(--color-neutral-1) 16px);
  }
}
.kd-bal-track {
  background: var(--color-neutral-4);
}
.kd-bal-fill {
  background: linear-gradient(90deg, var(--color-gold-dark), var(--color-coin));
  box-shadow: 0 0 12px rgb(253 176 34 / 0.45);
  transition: width var(--dur-slow) var(--ease-out);
}
.kd-bar.is-dragging .kd-bal-fill {
  transition: none;
}
.kd-clear-enter-active,
.kd-clear-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-clear-enter-from,
.kd-clear-leave-to {
  opacity: 0;
  scale: 0.6;
}
.kd-tool {
  /* two equal columns under the CTA, whatever the labels; 48px like every control of the case page's dock */
  flex: 1 1 0;
  min-width: 0;
  height: 48px;
}
/* The bar: red track, green winning zone up to the thumb */
.kd-track {
  background: linear-gradient(90deg, #7a1d18, var(--color-danger));
}
.kd-win-zone {
  background: linear-gradient(90deg, #0b6b3f, var(--color-success));
  box-shadow: 0 0 14px rgb(18 183 106 / 0.6);
  transition: width var(--dur-slow) var(--ease-out);
}
.kd-bar.is-dragging .kd-win-zone,
.kd-bar.is-dragging .kd-thumb {
  transition: none;
}
.kd-shade {
  height: 12px;
  translate: 0 -50%;
  background: repeating-linear-gradient(-45deg, rgb(12 13 16 / 0.72) 0 3px, rgb(12 13 16 / 0.5) 3px 6px);
  pointer-events: none;
  transition: width var(--dur-slow) var(--ease-out);
}
.kd-thumb {
  width: 22px;
  height: 28px;
  margin-left: -11px;
  translate: 0 -50%;
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #d9dce2);
  box-shadow:
    0 2px 8px rgb(0 0 0 / 0.5),
    inset 0 -2px 0 rgb(0 0 0 / 0.12);
  transition:
    left var(--dur-slow) var(--ease-spring),
    scale var(--dur-fast) var(--ease-out);
  cursor: grab;
}
.kd-bar.is-dragging .kd-thumb {
  scale: 1.12;
  cursor: grabbing;
}
.kd-bar.is-off .kd-track {
  opacity: 0.25;
}
.kd-bar:focus-visible .kd-thumb {
  outline: 2px solid var(--color-brand-light);
  outline-offset: 2px;
}
.kd-preset {
  color: var(--color-neutral-11);
}
.kd-preset:hover {
  color: var(--color-neutral-15);
  background: var(--color-neutral-4);
}
.kd-preset.is-on {
  color: var(--color-neutral-1);
  background: var(--color-neutral-14);
}
.kd-preset:disabled {
  opacity: 0.35;
}
.kd-controls.is-busy .kd-panel {
  opacity: 0.35;
  filter: saturate(0.6);
  pointer-events: none;
  transition:
    opacity var(--dur-slow) var(--ease-out),
    filter var(--dur-slow) var(--ease-out);
}
</style>
