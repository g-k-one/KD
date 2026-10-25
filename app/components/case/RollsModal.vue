<script setup lang="ts">
import type { CaseDetails, InventoryItem, PfRoll, SeedPairPublic } from '#shared/types/api'

// "Check this roll" (player audit D10): every ticket of the last opening, the range it fell into,
// and the seed pair it came from. The verifier opens with the client seed and nonce filled in.
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ data: CaseDetails; drops: InventoryItem[]; rolls: PfRoll[]; kurwa: boolean[]; seed: SeedPairPublic | null }>()

const spaced = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')
const rows = computed(() =>
  props.drops.map((d, i) => {
    const ci = props.data.items.find((x) => x.id === d.id)
    return { d, roll: props.rolls[i], kurwa: !!props.kurwa[i], range: ci ? `${spaced(ci.ticketFrom)}–${spaced(ci.ticketTo)}` : '—' }
  }),
)
// A plain button that closes and navigates: a click listener on a NuxtLink would replace its navigation
function toVerifier() {
  open.value = false
  navigateTo(`/fairness?verify=${props.rolls[0]?.nonce ?? 1}`)
}
const short = (s?: string) => (s ? `${s.slice(0, 12)}…${s.slice(-8)}` : '—')
</script>

<template>
  <UiModal v-model="open" :title="$t('case.rollsTitle')" :description="$t('case.rollsHint')" :width="560">
    <ul class="flex flex-col gap-2">
      <li v-for="(r, i) in rows" :key="i" class="flex items-center gap-3 rounded-2xl bg-neutral-3 p-2 pr-4">
        <ItemArt :image="r.d.image" :rarity="r.d.rarity" :size="40" class="w-14 shrink-0" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="type-14 truncate" :style="{ color: RARITY_COLOR[r.d.rarity] }">{{ r.d.weapon }} | {{ r.d.skin }}</span>
          <span class="type-12-regular text-neutral-11">
            {{ $t('case.range', { range: r.range }) }}<template v-if="r.kurwa"> · <UiIcon name="kurwa" :size="12" class="inline text-coin" /> {{ $t('case.kurwaRespin') }}</template>
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end">
          <span class="type-16-caps text-neutral-15 tabular-nums">{{ r.roll ? spaced(r.roll.ticket) : '—' }}</span>
          <span class="type-12-regular text-neutral-11">nonce {{ r.roll?.nonce }}</span>
        </span>
      </li>
    </ul>
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-success-24/40 p-3">
      <dt class="type-12-caps text-neutral-11">{{ $t('fair.clientSeed') }}</dt>
      <dd class="type-12 truncate font-mono">{{ seed?.clientSeed }}</dd>
      <dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeedHash') }}</dt>
      <dd class="type-12 truncate font-mono">{{ short(seed?.serverSeedHash) }}</dd>
    </dl>
    <template #actions>
      <UiButton variant="secondary" size="l" class="flex-1" @click="open = false">{{ $t('common.close') }}</UiButton>
      <UiButton variant="fair" size="l" icon="shield" class="flex-1" @click="toVerifier">{{ $t('case.openVerifier') }}</UiButton>
    </template>
  </UiModal>
</template>
