<script setup lang="ts">
// How it works: a battle in four plain steps, as the upgrade explains itself. The lobby's bar and the room's open the same one.
const open = defineModel<boolean>({ required: true })
const HOW = [
  { icon: 'cases', n: 1 },
  { icon: 'pvp', n: 2 },
  { icon: 'crown', n: 3 },
  { icon: 'shield-check', n: 4 },
]
</script>

<template>
  <UiModal v-model="open" :title="$t('pvp.howTitle')" :width="520">
    <ol class="flex flex-col gap-3">
      <li v-for="st in HOW" :key="st.n" class="flex gap-3 rounded-2xl bg-neutral-3 p-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-4 text-brand-light"><UiIcon :name="st.icon" :size="20" /></span>
        <span class="flex min-w-0 flex-col gap-1">
          <span class="type-14-caps">{{ st.n }}. {{ $t(`pvp.how${st.n}t`) }}</span>
          <span class="type-14-regular text-neutral-12">{{ $t(`pvp.how${st.n}`) }}</span>
        </span>
      </li>
    </ol>
    <div class="mt-4 flex items-center justify-between gap-3">
      <span class="type-12-regular text-neutral-11">{{ $t('pvp.howFair') }}</span>
      <UiButton variant="fair" size="s" icon="shield-check" to="/fairness" class="shrink-0" @click="open = false">{{ $t('case.fairness') }}</UiButton>
    </div>
  </UiModal>
</template>
