<script setup lang="ts">
// Mobile bottom sheet: slides up from the bottom edge, drag handle on top, actions pinned to the bottom. Pull it down to
// close (the handle, the header, or the content at its top); the header with the cross stays put while the content scrolls.
const open = defineModel<boolean>({ required: true })
defineProps<{ title?: string }>()

const panel = useTemplateRef<HTMLElement>('panel')
const scrim = useTemplateRef<HTMLElement>('scrim')
useSheetDrag(panel, () => (open.value = false), { scrim })

// the page lock, Escape for the topmost only, focus kept inside and handed back on close
useOverlay(() => open.value, () => (open.value = false), { panel })
</script>

<template>
  <Teleport to="body">
    <Transition name="kd-sheet">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-end">
        <div ref="scrim" class="kd-sheet-scrim absolute inset-0 bg-black-60" @click="open = false" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="kd-sheet-panel relative outline-none flex max-h-[85dvh] w-full flex-col rounded-t-5xl border-t border-neutral-5 bg-neutral-2 pb-[env(safe-area-inset-bottom)]"
        >
          <span class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-7" />
          <div class="flex items-center justify-between px-4 pt-2 pb-3">
            <h2 class="type-16-caps">{{ title }}</h2>
            <UiButton variant="ghost" size="s" icon="close" icon-only :aria-label="$t('common.close')" @click="open = false" />
          </div>
          <div class="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
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
