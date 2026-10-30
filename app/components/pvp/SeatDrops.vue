<script setup lang="ts">
import type { Item } from '#shared/types/api'

// A seat's drops, round by round: nothing before the first one, no empty slots ahead. The block's height follows its
// content, so a new row opens smoothly instead of pushing the page. lost: the drops step back, they go to the winner.
// tight: the team seats' 4 px on phones.
const props = defineProps<{ items: Item[]; lost?: boolean; tight?: boolean }>()

const inner = useTemplateRef<HTMLElement>('inner')
// unset until it is measured: a battle opened midway shows its drops at once
const height = ref<number | null>(null)
useResizeObserver(inner, () => (height.value = inner.value?.offsetHeight ?? 0))
</script>

<template>
  <div class="kd-seat-fold" :style="height === null ? undefined : { height: `${height}px` }">
    <div ref="inner">
      <TransitionGroup
        v-if="items.length"
        tag="div"
        name="kd-drop"
        class="kd-seat-drops grid min-w-0 grid-cols-[repeat(auto-fill,minmax(76px,1fr))] content-start gap-2 pt-2 sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] lg:gap-3 lg:pt-3"
        :class="[props.lost && 'is-lost', tight && 'max-md:gap-1 max-md:pt-1']"
      >
        <div v-for="(item, i) in items" :key="i" class="h-25 lg:h-[105px]">
          <ItemTile :item="item" readonly class="!aspect-auto !h-full" />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
/* clipped downwards only, while it opens: the tiles' spring stays whole at the sides */
.kd-seat-fold {
  overflow-x: visible;
  overflow-y: clip;
  overflow-clip-margin: 8px;
  transition: height var(--dur-slow) var(--ease-out);
}
.kd-seat-drops {
  transition: opacity var(--dur-slow) var(--ease-out);
}
.kd-seat-drops.is-lost {
  opacity: 0.4;
}
.kd-drop-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform 520ms var(--ease-spring);
}
.kd-drop-enter-from {
  opacity: 0;
  transform: translateY(-14px) scale(0.86);
}
</style>
