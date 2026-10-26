<script setup lang="ts">
// Fills the free spot in a battles grid with the next thing to do: start your own. Built like a battle card (title
// and a line on top, cases fanned in the middle, empty seats, the button where Join sits), so the row reads as one.
const FAN = ['/img/cases/zloty-rush.webp', '/img/cases/kurwa-chicken.webp', '/img/cases/vodka-drop.webp']
</script>

<template>
  <NuxtLink to="/pvp/create" class="kd-create kd-press flex min-w-0 flex-col gap-3 rounded-5xl bg-neutral-2 p-4">
    <div class="flex items-center justify-between gap-2">
      <span class="type-16-caps">{{ $t('pvp.newBattle') }}</span>
      <span class="type-12-caps text-neutral-11">{{ $t('pvp.yourRules') }}</span>
    </div>
    <!-- the cases, fanned and quiet: any of them could be yours -->
    <div class="kd-create-fan relative flex h-32 items-center justify-center lg:h-36">
      <img v-for="(src, i) in FAN" :key="src" :src="src" alt="" draggable="false" class="kd-create-case size-28 object-contain lg:size-32" :style="{ '--i': i - 1, zIndex: 3 - Math.abs(i - 1) * 2 }" />
      <span class="kd-create-plus absolute grid size-14 place-items-center rounded-full text-neutral-1"><UiIcon name="plus" :size="28" /></span>
    </div>
    <span class="type-12-regular text-center text-neutral-11">{{ $t('pvp.createTileText') }}</span>
    <span class="kd-btn kd-btn-primary type-14-caps mt-auto flex h-10 items-center justify-center gap-2 rounded-lg">
      <UiIcon name="plus" :size="16" />{{ $t('pvp.create') }}
    </span>
  </NuxtLink>
</template>

<style scoped>
.kd-create {
  transition: background-color var(--dur-base) var(--ease-out);
}
/* the battle card's fan: the middle case in front, the others turned out to the sides */
.kd-create-case {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: calc(-50% + var(--i) * 38%) -50%;
  rotate: calc(var(--i) * 10deg);
  scale: calc(1 - max(var(--i), -1 * var(--i)) * 0.12);
  /* darkened, not faded: faded pictures would show through each other where they overlap */
  filter: brightness(0.4) saturate(0.4);
  transition: filter var(--dur-slow) var(--ease-out);
}
.kd-create-plus {
  z-index: 5;
  background: linear-gradient(135deg, var(--color-brand-bright), var(--color-brand-base));
  box-shadow: var(--shadow-inner-primary);
  transition: transform var(--dur-base) var(--ease-spring);
}
@media (hover: hover) {
  .kd-create:hover {
    background: var(--color-neutral-3);
  }
  .kd-create:hover .kd-create-case {
    filter: brightness(0.6) saturate(0.8);
  }
  .kd-create:hover .kd-create-plus {
    transform: scale(1.08);
  }
}
</style>
