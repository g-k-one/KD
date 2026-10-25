<script setup lang="ts">
// The admin's save bar: rises from the bottom once a section has changes, stays until saved or discarded.
// One place for Save on every section, on phones and desktop alike.
defineProps<{ dirty: boolean; saving?: boolean }>()
defineEmits<{ save: []; discard: [] }>()
</script>

<template>
  <Transition name="kd-save">
    <div v-if="dirty" class="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:px-6 lg:pb-6">
      <div class="kd-save-bar mx-auto flex max-w-[720px] items-center gap-2 rounded-3xl border border-neutral-5 bg-neutral-3 p-2 pl-4">
        <UiIcon name="info" :size="18" class="shrink-0 text-brand-light" />
        <span class="type-12-caps min-w-0 flex-1 truncate">Unsaved changes</span>
        <UiButton variant="secondary" :disabled="saving" @click="$emit('discard')">Discard</UiButton>
        <UiButton icon="check" :loading="saving" @click="$emit('save')">Save</UiButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.kd-save-bar {
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
}
.kd-save-enter-active,
.kd-save-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-save-enter-from,
.kd-save-leave-to {
  opacity: 0;
  transform: translateY(24px);
}
</style>
