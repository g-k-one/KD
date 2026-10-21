<script setup lang="ts">
// Figma "Overlays → Modal": optional media, title, description, content slot, actions, close.
const open = defineModel<boolean>({ required: true })
withDefaults(defineProps<{ title?: string; description?: string; width?: number }>(), { width: 480 })

const panel = useTemplateRef<HTMLElement>('panel')
const lock = useScrollLock(import.meta.client ? document.body : null)
watch(open, (v) => {
  lock.value = v
  if (v) nextTick(() => panel.value?.focus())
})
onKeyStroke('Escape', () => open.value && (open.value = false))
onBeforeUnmount(() => (lock.value = false))
</script>

<template>
  <Teleport to="body">
    <Transition name="kd-modal">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-end justify-center sm:items-start sm:p-4 sm:pt-[10vh]">
        <div class="kd-modal-overlay absolute inset-0 bg-black-60 backdrop-blur-[2px]" @click="open = false" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="kd-modal-panel relative flex max-h-[92dvh] w-full flex-col gap-6 overflow-y-auto rounded-t-5xl border border-neutral-5 bg-neutral-2 p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_24px_64px_rgb(12_13_16/0.48)] outline-none sm:rounded-5xl sm:p-8"
          :style="{ maxWidth: `${width}px` }"
        >
          <button
            type="button"
            class="kd-press absolute top-[15px] right-[15px] grid size-10 place-items-center rounded-lg text-neutral-12 hover:bg-white-4 hover:text-neutral-15"
            :aria-label="$t('common.close')"
            @click="open = false"
          >
            <UiIcon name="close" :size="20" />
          </button>
          <slot name="media" />
          <div v-if="title || description" class="flex flex-col gap-6 text-center">
            <h2 v-if="title" class="type-20-caps">{{ title }}</h2>
            <p v-if="description" class="type-14-regular text-neutral-12">{{ description }}</p>
          </div>
          <slot />
          <div v-if="$slots.actions" class="flex gap-2">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.kd-modal-enter-active .kd-modal-overlay,
.kd-modal-leave-active .kd-modal-overlay {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-modal-enter-active .kd-modal-panel {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-modal-leave-active .kd-modal-panel {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-modal-enter-active,
.kd-modal-leave-active {
  transition: opacity var(--dur-slow);
}
.kd-modal-enter-from .kd-modal-overlay,
.kd-modal-leave-to .kd-modal-overlay {
  opacity: 0;
}
.kd-modal-enter-from .kd-modal-panel,
.kd-modal-leave-to .kd-modal-panel {
  opacity: 0;
  transform: translateY(24px) scale(0.98);
}
@media (min-width: 640px) {
  .kd-modal-enter-from .kd-modal-panel {
    transform: translateY(12px) scale(0.96);
  }
}
</style>
