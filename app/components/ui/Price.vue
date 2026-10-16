<script setup lang="ts">
// Figma "Price": coin + amount. Sizes XS 10 · S 12 · M 14 · L 16 · XL 20 · XXL 28.
type Size = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'
type Tone = 'default' | 'coin' | 'success' | 'muted' | 'inverse'

const props = withDefaults(defineProps<{ amount: number; size?: Size; tone?: Tone }>(), {
  size: 'm',
  tone: 'default',
})

const spec = computed(
  () =>
    ({
      xs: { coin: 10, gap: 'gap-1', text: 'text-[10px] leading-3 font-semibold' },
      s: { coin: 12, gap: 'gap-1', text: 'type-12' },
      m: { coin: 16, gap: 'gap-1.5', text: 'type-14' },
      l: { coin: 20, gap: 'gap-2', text: 'type-16-caps' },
      xl: { coin: 24, gap: 'gap-2', text: 'text-xl leading-6 font-bold' },
      xxl: { coin: 28, gap: 'gap-2', text: 'type-28' },
    })[props.size],
)

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
    {{ formatCoins(amount) }}
  </span>
</template>
