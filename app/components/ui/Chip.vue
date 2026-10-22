<script setup lang="ts">
// Figma "Chip": presets, multipliers, filters, on/off switches. Sizes match buttons (S 32 / M 40 / L 48).
// Tone colours the border by risk (success/warning/danger); coin and gold only tint the pressed state
// (the ⚡ fast and the KURWADROP switches). Active = tinted fill + soft inner rim. Optional leading icon.
withDefaults(
  defineProps<{
    active?: boolean
    tone?: 'none' | 'success' | 'warning' | 'danger' | 'coin' | 'gold'
    size?: 's' | 'm' | 'l'
    disabled?: boolean
    icon?: string
    /** field: looks like UiInput / UiSelect (for switches that sit in a row of fields, e.g. filters) */
    variant?: 'solid' | 'field'
  }>(),
  { tone: 'none', size: 's' },
)
</script>

<template>
  <button
    type="button"
    class="kd-chip kd-press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap disabled:pointer-events-none disabled:opacity-40"
    :class="{
      's': 'type-12 h-8 rounded-md px-3',
      'm': 'type-14 h-10 rounded-lg px-3',
      'l': 'h-12 rounded-[10px] px-3 text-base leading-6 font-bold tracking-[0.02em]',
    }[size]"
    :data-tone="tone === 'none' ? undefined : tone"
    :data-variant="variant === 'field' ? 'field' : undefined"
    :aria-pressed="active"
    :disabled="disabled"
  >
    <UiIcon v-if="icon" :name="icon" :size="size === 's' ? 14 : size === 'm' ? 16 : 18" class="kd-chip-icon shrink-0" />
    <slot />
  </button>
</template>
