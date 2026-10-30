<script setup lang="ts">
// Figma "Overlays → Modal": optional media, title, description, content slot, actions, close.
// Phones: a tray (Family) — it rises from the bottom with a handle, and when its content changes (a step, an
// error, a result) the height glides to the new size instead of jumping. Pull it down to close (anywhere while its
// content is at the top); the cross sits on the panel, outside the scroll, so it never rides away with the content.
// inline: a step of another modal, no panel of its own: modals never stack, a flow changes what one panel shows.
// label: the panel's name when its title is drawn by the step inside.
const open = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{ title?: string; description?: string; width?: number; inline?: boolean; label?: string }>(), { width: 480 })

const panel = useTemplateRef<HTMLElement>('panel')
const body = useTemplateRef<HTMLElement>('body')
const scroller = useTemplateRef<HTMLElement>('scroller')
const scrim = useTemplateRef<HTMLElement>('scrim')
useSheetDrag(panel, () => (open.value = false), { scrim, enabled: () => !window.matchMedia('(min-width: 640px)').matches })
let lastH = 0
let glide: Animation | null = null
useResizeObserver(body, () => {
  const el = panel.value
  if (!el) return
  // a new size mid-glide carries on from where the panel is; the content does not scroll while the panel catches up
  const from = glide?.playState === 'running' ? el.offsetHeight : lastH
  glide?.cancel()
  if (scroller.value) scroller.value.style.overflowY = ''
  const h = el.offsetHeight
  if (from && Math.abs(h - from) > 2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (scroller.value) scroller.value.style.overflowY = 'hidden'
    glide = el.animate([{ height: `${from}px` }, { height: `${h}px` }], { duration: 280, easing: EASE_OUT })
    glide.onfinish = () => scroller.value && (scroller.value.style.overflowY = '')
  }
  lastH = h
})
// the page lock, Escape for the topmost only, focus kept inside and handed back on close
useOverlay(() => open.value && !props.inline, () => (open.value = false), { panel })
watch(open, () => (lastH = 0))
</script>

<template>
  <UiModalBody v-if="inline" :title="title" :description="description">
    <template v-for="(_, name) in $slots" #[name]><slot :name="name" /></template>
  </UiModalBody>
  <Teleport v-else to="body">
    <Transition name="kd-modal">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-end justify-center sm:items-start sm:p-4 sm:pt-[10vh]">
        <div ref="scrim" class="kd-modal-overlay absolute inset-0 bg-black-60 backdrop-blur-[2px]" @click="open = false" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title ?? label"
          tabindex="-1"
          class="kd-modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-5xl border border-neutral-5 bg-neutral-2 shadow-[0_24px_64px_rgb(12_13_16/0.48)] outline-none sm:max-h-[calc(90dvh-16px)] sm:rounded-5xl"
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
          <!-- no scrollbar: its width would squeeze the content, and tiles sized by their width would change the height again -->
          <div ref="scroller" class="scrollbar-none flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain p-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:p-8">
            <span class="mx-auto -mt-3 -mb-2 h-1 w-10 shrink-0 rounded-full bg-neutral-7 sm:hidden" aria-hidden="true" />
            <div ref="body">
              <UiModalBody :title="title" :description="description">
                <template v-for="(_, name) in $slots" #[name]><slot :name="name" /></template>
              </UiModalBody>
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
