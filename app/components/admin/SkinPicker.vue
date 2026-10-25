<script setup lang="ts">
import type { Item, MarketResponse } from '#shared/types/api'

// Picks skins from the market (every skin once) for an admin list: search by weapon or skin, priciest first.
// Stays open, so several skins go in one go; the ones already in the list are marked.
const open = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{ taken?: string[]; title?: string; multiple?: boolean }>(), { taken: () => [], title: 'Add skins', multiple: true })
const emit = defineEmits<{ pick: [item: Item] }>()

const { data } = useFetch<MarketResponse>('/api/market', { key: 'market', lazy: true, server: false })
const q = ref('')
const LIMIT = 60
const found = computed(() => {
  const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const all = data.value?.items ?? []
  return all.filter((i) => words.every((w) => `${i.weapon} ${i.skin}`.toLowerCase().includes(w)))
})
// desktop: type right away (phones keep the keyboard down until the field is tapped)
const wrap = useTemplateRef<HTMLElement>('wrap')
watch(open, (v) => {
  if (v && window.matchMedia('(hover: hover)').matches) setTimeout(() => wrap.value?.querySelector('input')?.focus(), 60)
})
function pick(item: Item) {
  emit('pick', item)
  if (!props.multiple) open.value = false
}
</script>

<template>
  <UiModal v-model="open" :title="title" :width="560">
    <div ref="wrap"><UiInput v-model="q" icon="search" clearable placeholder="AK-47, Doppler, gloves…" /></div>
    <div class="-mx-2 flex flex-col gap-0.5">
      <button
        v-for="it in found.slice(0, LIMIT)"
        :key="it.id"
        type="button"
        class="kd-press flex h-14 items-center gap-3 rounded-2xl px-2 text-left hover:bg-white-4 disabled:opacity-48"
        :disabled="taken.includes(it.id)"
        @click="pick(it)"
      >
        <ItemArt :image="it.image" :rarity="it.rarity" :size="44" class="w-12 shrink-0" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="type-14 truncate">{{ it.weapon }} | {{ it.skin }}</span>
          <span class="type-12-regular text-neutral-11">{{ it.statTrak ? 'StatTrak · ' : '' }}{{ it.wear }}</span>
        </span>
        <UiIcon v-if="taken.includes(it.id)" name="check" :size="18" class="text-success shrink-0" />
        <UiPrice v-else :amount="it.price" size="s" class="shrink-0" />
      </button>
      <p v-if="found.length > LIMIT" class="type-12-regular px-2 pt-2 text-neutral-11">{{ found.length - LIMIT }} more: narrow the search</p>
      <p v-if="data && !found.length" class="type-14-regular px-2 py-6 text-center text-neutral-11">No skins match</p>
    </div>
    <template #actions>
      <UiButton variant="secondary" size="l" block @click="open = false">Done</UiButton>
    </template>
  </UiModal>
</template>
