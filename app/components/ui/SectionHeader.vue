<script setup lang="ts">
defineProps<{ title: string; collapsed?: boolean; collapsible?: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <div class="flex h-8 items-center gap-2">
    <h2 class="type-20-caps flex-1 truncate text-neutral-15">{{ title }}</h2>
    <slot name="actions" />
    <button
      v-if="collapsible"
      type="button"
      class="type-12-caps flex items-center gap-1 text-neutral-12 hover:text-neutral-15 active:opacity-80"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      {{ collapsed ? $t('cases.show') : $t('cases.hide') }}
      <UiIcon name="chevron-up" :size="16" class="transition-transform" :class="collapsed && 'rotate-180'" />
    </button>
  </div>
</template>
