<script setup lang="ts">
// Figma "Price": coin + amount. Sizes XS 10 · S 12 · M 14 · L 16 · XL 20 · XXL 28.
type Size = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'
type Tone = 'default' | 'coin' | 'success' | 'muted' | 'inverse'

/** compact: from 1 000 coins on, the amount shortens to 12.9k / 1.2M (tight tiles).
 *  countUp: on mount the amount runs up from zero (a drop's price as it lands, CSGOGem) */
const props = withDefaults(defineProps<{ amount: number; size?: Size; tone?: Tone; compact?: boolean; countUp?: boolean }>(), {
  size: 'm',
  tone: 'default',
})

const shown = ref(props.amount)
let raf = 0
onMounted(() => {
  if (!props.countUp || props.amount <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const from = performance.now()
  const ms = 900
  const step = (now: number) => {
    const p = Math.min(1, (now - from) / ms)
    // ease-out cubic: fast at first, settles on the real amount
    shown.value = Math.round(props.amount * (1 - (1 - p) ** 3))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  shown.value = 0
  raf = requestAnimationFrame(step)
})
watch(
  () => props.amount,
  (v) => {
    cancelAnimationFrame(raf)
    shown.value = v
  },
)
onBeforeUnmount(() => cancelAnimationFrame(raf))

const spec = computed(
  () =>
    ({
      xs: { coin: 10, gap: 'gap-1', text: 'text-[10px] leading-3 font-semibold' },
      s: { coin: 12, gap: 'gap-1', text: 'type-12' },
      m: { coin: 16, gap: 'gap-1.5', text: 'type-14' },
      l: { coin: 20, gap: 'gap-2', text: 'type-16-caps' },
      xl: { coin: 24, gap: 'gap-2', text: 'text-xl leading-6 font-bold' },
      xxl: { coin: 28, gap: 'gap-3', text: 'type-28' },
    })[props.size],
)

/** Cents → "12.9k" (3 significant digits), "1.23M"; below 1 000 coins the full amount */
function shortCoins(cents: number) {
  const c = cents / 100
  if (c < 1000) return formatCoins(cents)
  const [v, unit] = c >= 1e6 ? [c / 1e6, 'M'] : [c / 1e3, 'k']
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2).replace(/\.?0+$/, '')}${unit}`
}
const toneClass = computed(
  () =>
    ({
      default: 'text-neutral-15',
      coin: 'text-coin',
      success: 'text-success',
      muted: 'text-neutral-11',
      inverse: 'text-neutral-1',
    })[props.tone],
)
</script>

<template>
  <span class="inline-flex items-center whitespace-nowrap tabular-nums" :class="[spec.gap, spec.text, toneClass]">
    <UiCoin :size="spec.coin" :inverse="tone === 'inverse'" />
    {{ compact ? shortCoins(shown) : formatCoins(shown) }}
  </span>
</template>
