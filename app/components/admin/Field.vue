<script setup lang="ts">
// A labelled admin field: the kit's field caption (UiSelect's), the control, an optional hint under it
defineProps<{ label: string; hint?: string }>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <span class="kd-field-label type-12-caps text-neutral-12">{{ label }}</span>
    <slot />
    <span v-if="hint" class="type-12-regular text-neutral-11">{{ hint }}</span>
  </div>
</template>
