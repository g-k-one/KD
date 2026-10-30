<script setup lang="ts">
// A multi-line field: UiInput's look (hairline, focus in the brand's colour), grows by its corner.
defineProps<{ id?: string; rows?: number; placeholder?: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea :id="id" v-model="model" :rows="rows ?? 6" :placeholder="placeholder" class="kd-textarea type-14-regular placeholder:text-neutral-11" />
</template>

<style scoped>
.kd-textarea {
  width: 100%;
  resize: vertical;
  min-height: 136px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-xl);
  background: var(--color-neutral-1);
  padding: 12px 16px;
  outline: none;
  transition: border-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-textarea:hover {
    border-color: var(--color-neutral-6);
  }
}
.kd-textarea:focus {
  border-color: var(--color-brand-base);
}
</style>
