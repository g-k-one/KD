<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'

const props = withDefaults(defineProps<{ level: RiskLevel; showLabel?: boolean }>(), { showLabel: false })

const RISK = {
  low: { bars: 1, bar: 'bg-success', text: 'text-success' },
  medium: { bars: 2, bar: 'bg-coin', text: 'text-coin' },
  high: { bars: 3, bar: 'bg-brand-light', text: 'text-brand-light' },
  extreme: { bars: 4, bar: 'bg-danger', text: 'text-danger' },
} as const

const spec = computed(() => RISK[props.level])
</script>

<template>
  <div class="flex w-full items-center gap-2" :aria-label="`${$t('risk.label')}: ${$t(`risk.${level}`)}`">
    <span v-if="showLabel" class="type-10-caps text-neutral-11">{{ $t('risk.label') }}</span>
    <div class="flex h-1 flex-1 items-center gap-0.5">
      <span
        v-for="i in 4"
        :key="i"
        class="h-full flex-1 rounded-full transition-colors duration-300"
        :class="i <= spec.bars ? spec.bar : 'bg-neutral-7'"
      />
    </div>
    <span v-if="showLabel" class="type-12" :class="spec.text">{{ $t(`risk.${level}`) }}</span>
  </div>
</template>
