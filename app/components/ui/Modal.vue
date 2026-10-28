<script setup lang="ts">
// Figma "Overlays → Modal": optional media, title, description, content slot, actions, close.
// Phones: a tray (Family) — it rises from the bottom with a handle, and when its content changes (a step, an
// error, a result) the height glides to the new size instead of jumping. Pull it down to close (anywhere while its
// content is at the top); the cross sits on the panel, outside the scroll, so it never rides away with the content.
const open = defineModel<boolean>({ required: true })
withDefaults(defineProps<{ title?: string; description?: string; width?: number }>(), { width: 480 })

const panel = useTemplateRef<HTMLElement>('panel')
const body = useTemplateRef<HTMLElement>('body')
const scrim = useTemplateRef<HTMLElement>('scrim')
useSheetDrag(panel, () => (open.value = false), { scrim, enabled: () => !window.matchMedia('(min-width: 640px)').matches })
let lastH = 0
useResizeObserver(body, () => {
  const el = panel.value
  if (!el) return
  const h = el.offsetHeight
  if (lastH && Math.abs(h - lastH) > 2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.animate([{ height: `${lastH}px` }, { height: `${h}px` }], { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  }
  lastH = h
})
const lock = useScrollLock(import.meta.client ? document.body : null)
watch(open, (v) => {
  lock.value = v
  lastH = 0
  if (v) nextTick(() => panel.value?.focus())
})
onKeyStroke('Escape', () => open.value && (open.value = false))
onBeforeUnmount(() => (lock.value = false))
</script>

<template>
  <Teleport to="body">
    <Transition name="kd-modal">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-end justify-center sm:items-start sm:p-4 sm:pt-[10vh]">
        <div ref="scrim" class="kd-modal-overlay absolute inset-0 bg-black-60 backdrop-blur-[2px]" @click="open = false" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="kd-modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-5xl border border-neutral-5 bg-neutral-2 shadow-[0_24px_64px_rgb(12_13_16/0.48)] outline-none sm:rounded-5xl"
          :style="{ maxWidth: `${width}px` }"
        >
          <button
            type="button"
            class="kd-press absolute top-[15px] right-[15px] z-[1] grid size-10 place-items-center rounded-lg text-neutral-12 hover:bg-white-4 hover:text-neutral-15"
            :aria-label="$t('common.close')"
            @click="open = false"
          >
            <UiIcon name="close" :size="20" />
          </button>
          <div class="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain p-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:p-8">
            <span class="mx-auto -mt-3 -mb-2 h-1 w-10 shrink-0 rounded-full bg-neutral-7 sm:hidden" aria-hidden="true" />
            <div ref="body" class="flex flex-col gap-6">
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
