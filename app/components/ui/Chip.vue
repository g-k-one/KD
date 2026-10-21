<script setup lang="ts">
// Figma "Chip": presets, multipliers, filters. Sizes match buttons (S 32 / M 40 / L 48).
// Tone colours the border by risk; active = tinted fill + 1px border.
withDefaults(
  defineProps<{
    active?: boolean
    tone?: 'none' | 'success' | 'warning' | 'danger'
    size?: 's' | 'm' | 'l'
    disabled?: boolean
  }>(),
  { tone: 'none', size: 's' },
)
</script>

<template>
  <button
    type="button"
    class="kd-chip kd-press inline-flex shrink-0 items-center justify-center whitespace-nowrap uppercase disabled:pointer-events-none disabled:opacity-40"
    :class="{
      's': 'type-12 h-8 rounded-md px-3',
      'm': 'type-14 h-10 rounded-lg px-3',
      'l': 'h-12 rounded-[10px] px-3 text-base leading-6 font-bold tracking-[0.02em]',
    }[size]"
    :data-tone="tone === 'none' ? undefined : tone"
    :aria-pressed="active"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
