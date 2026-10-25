<script setup lang="ts" generic="T extends Item & { tickets?: number }">
import type { Item } from '#shared/types/api'
import { PF_TICKETS } from '#shared/utils/pf'

// What a case holds, in the admin: skins priciest first, each with its chance, and a picker to add more.
// odds: manual — every chance is a field (tickets out of 1 000 000, shown as %); auto — the chances the solver
// gave at the last save (stale once the list or the RTP changed); none — no odds (bonus cases solve their own).
const rows = defineModel<T[]>({ required: true })
const props = withDefaults(defineProps<{ odds?: 'manual' | 'auto' | 'none'; casePrice?: number; stale?: boolean }>(), { odds: 'none', casePrice: 0 })

const picking = ref(false)
const sorted = computed(() => [...rows.value].sort((a, b) => b.price - a.price))
const total = computed(() => rows.value.reduce((a, r) => a + (r.tickets ?? 0), 0))
/** What the table pays once the backend scales the chances to 100% */
const rtp = computed(() => (total.value && props.casePrice ? rows.value.reduce((a, r) => a + r.price * (r.tickets ?? 0), 0) / total.value / props.casePrice : 0))
const pct = (t: number, of = PF_TICKETS) => `${+((t / of) * 100).toFixed(t / of < 0.001 ? 4 : 2)}%`

function add(item: Item) {
  // a new skin in manual odds starts at 1%
  rows.value = [...rows.value, { ...item, tickets: props.odds === 'manual' ? PF_TICKETS / 100 : 0 } as unknown as T]
}
const remove = (id: string) => (rows.value = rows.value.filter((r) => r.id !== id))
function setTickets(id: string, tickets: number) {
  rows.value = rows.value.map((r) => (r.id === id ? { ...r, tickets } : r))
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div v-for="r in sorted" :key="r.id" class="flex h-14 items-center gap-2 rounded-2xl bg-neutral-3 py-1.5 pr-1.5 pl-2 lg:gap-3">
      <ItemArt :image="r.image" :rarity="r.rarity" :size="40" class="w-11 shrink-0" />
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="type-14 truncate">{{ r.weapon }} | {{ r.skin }}</span>
        <span class="type-12-regular truncate text-neutral-11">
          {{ r.statTrak ? 'StatTrak · ' : '' }}{{ r.wear }}<template v-if="casePrice"> · ×{{ +(r.price / casePrice).toFixed(r.price < casePrice ? 2 : 1) }}</template>
        </span>
      </span>
      <UiPrice :amount="r.price" size="s" class="shrink-0 max-sm:hidden" />
      <AdminPercentInput v-if="odds === 'manual'" :model-value="r.tickets ?? 0" :per1="PF_TICKETS / 100" size="s" class="w-28 shrink-0" @update:model-value="setTickets(r.id, $event)" />
      <span v-else-if="odds === 'auto'" class="type-14 w-20 shrink-0 text-right tabular-nums transition-opacity" :class="stale && 'opacity-40'">{{ r.tickets ? pct(r.tickets) : '—' }}</span>
      <UiButton variant="ghost" size="s" icon="x" icon-only :aria-label="`Remove ${r.skin}`" :disabled="rows.length <= 2" @click="remove(r.id)" />
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
      <UiButton variant="secondary" size="s" icon="plus" @click="picking = true">Add skins</UiButton>
      <span class="type-12-regular text-neutral-11">{{ rows.length }} skins · a case needs 2 or more</span>
      <template v-if="odds === 'manual'">
        <span class="type-12 ml-auto tabular-nums" :class="total === PF_TICKETS ? 'text-neutral-12' : 'text-warning'">
          Adds up to {{ pct(total) }}{{ total === PF_TICKETS ? '' : ' · saving scales it to 100%' }}
        </span>
        <span v-if="casePrice" class="type-12-caps tabular-nums">RTP {{ (rtp * 100).toFixed(2) }}%</span>
      </template>
      <span v-else-if="odds === 'auto' && stale" class="type-12 ml-auto text-warning">Chances update on save</span>
    </div>

    <AdminSkinPicker v-model="picking" :taken="rows.map((r) => r.id)" @pick="add" />
  </div>
</template>
