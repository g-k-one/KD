<script setup lang="ts">
import type { CaseSummary, HomeCardKind } from '#shared/types/api'

// Editing the home layout (prototype): laid over a case card, it picks the card's kind. A kind needs its art,
// so the ones this case has no art for are off; in a themed row the scene sets the look, so the whole picker is.
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
  <div class="kd-kind absolute inset-0 z-[4] flex justify-center rounded-5xl pt-2" :title="themed ? 'The row scene sets the look here' : undefined" @click.prevent.stop>
    <UiSegmented v-model="kind" size="s" :options="options" :disabled="themed" class="h-max" />
  </div>
</template>

<style scoped>
.kd-kind {
  background: rgb(12 13 16 / 0.32);
  outline: 1px dashed var(--color-white-12);
  outline-offset: -1px;
}
</style>
