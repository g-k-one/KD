<script setup lang="ts">
// Mobile bottom sheet: slides up from the bottom edge, drag handle on top, actions pinned to the bottom.
const open = defineModel<boolean>({ required: true })
defineProps<{ title?: string }>()

const lock = useScrollLock(import.meta.client ? document.body : null)
const sfx = useSfx()
watch(open, (v) => {
  lock.value = v
  if (v) sfx.open()
  else sfx.close()
})
onKeyStroke('Escape', () => open.value && (open.value = false))
onBeforeUnmount(() => (lock.value = false))
</script>

<template>
  <Teleport to="body">
    <Transition name="kd-sheet">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-end">
        <div class="kd-sheet-scrim absolute inset-0 bg-black-60" @click="open = false" />
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="kd-sheet-panel relative flex max-h-[85dvh] w-full flex-col rounded-t-5xl border-t border-neutral-5 bg-neutral-2 pb-[env(safe-area-inset-bottom)]"
        >
          <span class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-7" />
          <div class="flex items-center justify-between px-4 pt-2 pb-3">
            <h2 class="type-16-caps">{{ title }}</h2>
            <UiButton variant="ghost" size="s" icon="close" icon-only :aria-label="$t('common.close')" @click="open = false" />
          </div>
          <div class="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
            <slot />
          </div>
          <div v-if="$slots.actions" class="flex gap-2 border-t border-neutral-4 p-4">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.kd-sheet-enter-active .kd-sheet-scrim,
.kd-sheet-leave-active .kd-sheet-scrim {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-sheet-enter-active .kd-sheet-panel {
  transition: transform var(--dur-slow) var(--ease-out);
}
.kd-sheet-leave-active .kd-sheet-panel {
  transition: transform var(--dur-base) var(--ease-in);
}
.kd-sheet-enter-active,
.kd-sheet-leave-active {
  transition: opacity var(--dur-slow);
}
.kd-sheet-enter-from .kd-sheet-scrim,
.kd-sheet-leave-to .kd-sheet-scrim {
  opacity: 0;
}
.kd-sheet-enter-from .kd-sheet-panel,
.kd-sheet-leave-to .kd-sheet-panel {
  transform: translateY(100%);
}
</style>
