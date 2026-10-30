<script setup lang="ts">
import type { CaseSummary, HomeCardKind } from '#shared/types/api'

// Editing the home layout (prototype): laid over a case card, it picks the card's kind. A kind needs its art,
// so the ones this case has no art for are off; in a themed row the scene sets the look, and a note says so.
const props = defineProps<{ item: CaseSummary; themed?: boolean }>()
const { setCard } = useHomeLayout()

const kind = computed({
  get: () => props.item.card ?? 'standard',
  set: (k: HomeCardKind) => setCard(props.item.slug, k),
})
const NO_ART = 'No art for this case yet'
const options = computed(() => [
  { value: 'standard' as const, label: 'Card', title: 'Plain card' },
  { value: 'full' as const, label: 'Full', title: props.item.art?.full ? 'Full scene' : NO_ART, disabled: !props.item.art?.full },
  { value: 'wide' as const, label: '2×1', title: props.item.art?.wide ? 'Wide 2×1 (desktop)' : NO_ART, disabled: !props.item.art?.wide },
  { value: 'tall' as const, label: '1×2', title: props.item.art?.tall ? 'Tall 1×2 (desktop, rows of 6+)' : NO_ART, disabled: !props.item.art?.tall },
])
</script>

<template>
  <!-- covers the card so a tap edits instead of opening the case -->
  <div class="kd-kind absolute inset-0 z-[4] flex justify-center rounded-5xl pt-2" @click.prevent.stop>
    <!-- a themed row: say why there is nothing to pick here, instead of greying the picker out -->
    <span v-if="themed" class="kd-kind-note type-10-caps flex h-8 items-center gap-1 rounded-md px-2 text-neutral-13">
      <UiIcon name="info" :size="14" />The row scene sets the look
    </span>
    <UiSegmented v-else v-model="kind" size="s" :options="options" class="h-max" />
  </div>
</template>

<style scoped>
.kd-kind {
  background: rgb(var(--dark-rgb) / 0.32);
  outline: 1px dashed var(--color-white-12);
  outline-offset: -1px;
}
.kd-kind-note {
  background: rgb(var(--dark-rgb) / 0.82);
  box-shadow: inset 0 0 0 1px var(--color-neutral-6);
}
</style>
