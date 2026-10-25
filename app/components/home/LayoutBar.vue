<script setup lang="ts">
// Editing the home layout (prototype): a plate at the foot of the screen — what is being edited, the hidden rows
// to bring back, reset and done. Rows and cards are edited where they stand.
const { editing, layout, patchRow, reset } = useHomeLayout()
const hidden = computed(() => layout.value?.sections.filter((r) => r.hidden) ?? [])
</script>

<template>
  <div class="kd-layout-bar pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4">
    <div class="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-3xl border border-neutral-5 bg-neutral-2 py-2 pr-2 pl-4 shadow-[0_8px_24px_rgb(0_0_0/0.6)]">
      <UiIcon name="sliders" :size="18" class="text-brand-light" />
      <span class="type-14-caps mr-2">Home layout</span>
      <template v-if="hidden.length">
        <span class="type-12 text-neutral-11">Hidden:</span>
        <UiChip v-for="r in hidden" :key="r.id" icon="eye" :title="`Show ${r.title}`" @click="patchRow(r.id, { hidden: false })">{{ r.title }}</UiChip>
      </template>
      <UiButton size="s" variant="ghost" icon="refresh" @click="reset">Reset</UiButton>
      <UiButton size="s" icon="check" @click="editing = false">Done</UiButton>
    </div>
  </div>
</template>

<style scoped>
/* above the bottom nav on phones, at the foot on desktop */
.kd-layout-bar {
  bottom: calc(76px + env(safe-area-inset-bottom));
}
@media (min-width: 64rem) {
  .kd-layout-bar {
    bottom: 16px;
  }
}
</style>
