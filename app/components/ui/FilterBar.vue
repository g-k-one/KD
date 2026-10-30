<script setup lang="ts" generic="T extends string, S extends string = string">
import type { SelectOption } from './Select.vue'

// The head of a picking panel (the upgrade's skins, the PvP cases): its title, the sort arrows, a price range, a choice by
// colour and a search that opens in their place. One look and one way of working wherever a list is picked from.
// Sorting: the arrows flip the price, or, with sortOptions, a dropdown of orders (phones: its icon alone).
defineProps<{ icon: string; title: string; options: SelectOption<T>[]; sortOptions?: SelectOption<S>[] }>()
const desc = defineModel<boolean>('desc')
const sort = defineModel<S>('sort')
const search = defineModel<string>('search', { required: true })
const open = defineModel<boolean>('open', { required: true })
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
const values = defineModel<T[]>('values', { required: true })

const isLg = useMediaQuery('(min-width: 1024px)')
const isSm = useMediaQuery('(min-width: 640px)')
</script>

<template>
  <UiPanelHead :icon="icon" :title="title" lg-title class="kd-filter-row">
    <UiSelect v-if="sortOptions" v-model="sort" :options="sortOptions" menu-width="fit" class="kd-sort-select shrink-0 sm:w-44">
      <template #leading><UiIcon name="sort" :size="16" class="shrink-0 text-neutral-11" /></template>
    </UiSelect>
    <UiButton v-else variant="ghost" :size="isLg ? 'm' : 's'" icon-only :aria-label="$t(desc ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="desc = !desc">
      <UiSortArrows :desc="!!desc" />
    </UiButton>
    <Transition name="kd-search" mode="out-in">
      <UiInput v-if="open" id="market-search" key="s" v-model="search" icon="search" clearable :placeholder="$t('upgrade.search')" class="min-w-0 flex-1" @keydown.esc="open = false" />
      <div v-else key="f" class="kd-filter-row flex min-w-0 flex-1 items-center gap-2">
        <!-- the price range shares the line on every width: on phones the two fields split what the colours and search leave,
             without the coin (the placeholder and the prices around say it) -->
        <UiInput id="price-from" v-model="from" :coin="isSm" inputmode="decimal" :placeholder="$t('upgrade.from')" class="min-w-0 flex-1 sm:w-24 sm:flex-none" />
        <UiInput id="price-to" v-model="to" :coin="isSm" inputmode="decimal" :placeholder="$t('upgrade.to')" class="min-w-0 flex-1 sm:w-24 sm:flex-none" />
        <UiSelect v-model:values="values" multiple :options="options" class="kd-dots-select shrink-0 sm:min-w-20" menu-width="fixed">
          <template #leading>
            <!-- The trigger shows the choice: every colour dimmed = all of them, otherwise just the picked ones -->
            <TransitionGroup tag="span" name="kd-rdot" class="flex items-center gap-0.5">
              <span
                v-for="o in values.length ? options.filter((x) => values.includes(x.value)) : options"
                :key="o.value"
                class="size-1.5 shrink-0 rounded-full"
                :class="!values.length && 'opacity-45'"
                :style="{ background: o.swatch }"
              />
            </TransitionGroup>
          </template>
        </UiSelect>
      </div>
    </Transition>
    <UiButton variant="ghost" :size="isLg ? 'm' : 's'" :icon="open ? 'close' : 'search'" icon-only :aria-label="$t(open ? 'common.close' : 'upgrade.search')" @click="open = !open" />
  </UiPanelHead>
</template>

<style scoped>
.kd-search-enter-active,
.kd-search-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}
.kd-search-enter-from,
.kd-search-leave-to {
  opacity: 0;
  transform: translateX(6px);
}
:deep(.kd-dots-select button[aria-haspopup] .type-14) {
  display: none;
}
/* phones: the dots and the sort's icon alone in their fields (no chevron), so From and To get the room */
@media (max-width: 639.98px) {
  :deep(.kd-sort-select button[aria-haspopup]) {
    padding-inline: 10px;
  }
  :deep(.kd-sort-select button[aria-haspopup] > :nth-last-child(-n + 2)) {
    display: none;
  }
  :deep(.kd-dots-select button[aria-haspopup]) {
    padding-inline: 10px;
  }
  :deep(.kd-dots-select button[aria-haspopup] > :last-child) {
    display: none;
  }
}
/* the smallest phones: tighter gaps, so From fits whole */
@media (max-width: 359.98px) {
  .kd-filter-row {
    gap: 4px;
  }
}
.kd-rdot-enter-active,
.kd-rdot-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-rdot-enter-from,
.kd-rdot-leave-to {
  opacity: 0;
  scale: 0.3;
}
.kd-rdot-leave-active {
  position: absolute;
}
</style>
