<script setup lang="ts">
import type { InventoryItem } from '#shared/types/api'

/*
 * Preview before confirm (docs/ux-research-v3.md → D4, Phantom's "what leaves, what arrives"): the skins that go,
 * the coins that come, one button. A tray on phones (UiModal rises from the bottom), a card on desktop. One skin is
 * shown big, as in Withdraw.
 */
const open = defineModel<boolean>({ required: true })
/** inline: a step of the inventory's window; the secondary button goes back to it */
const props = defineProps<{ items: InventoryItem[]; loading?: boolean; inline?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()

const SHOWN = 8
const total = computed(() => props.items.reduce((a, i) => a + i.price, 0))
const shown = computed(() => props.items.slice(0, SHOWN))
const more = computed(() => Math.max(0, props.items.length - SHOWN))
</script>

<template>
  <UiModal v-model="open" :inline="inline" :title="$t('sell.title', { n: items.length }, items.length)" :width="520">
    <WalletSkinHero v-if="items.length === 1" :item="items[0]!" />
    <div v-else class="flex flex-col gap-2">
      <span class="type-12-caps text-neutral-11">{{ $t('sell.give') }}</span>
      <div class="grid grid-cols-4 gap-2">
        <div v-for="it in shown" :key="it.uid" class="flex flex-col items-center gap-1 rounded-2xl bg-neutral-3 p-2">
          <ItemArt :image="it.image" :rarity="it.rarity" :size="44" class="w-full" />
          <UiPrice :amount="it.price" size="xs" />
        </div>
        <div v-if="more" class="type-14 grid place-items-center rounded-2xl bg-neutral-3 text-neutral-12">+{{ more }}</div>
      </div>
    </div>

    <!-- several skins: the sum of what they fetch; one skin's price is on the button -->
    <div v-if="items.length > 1" class="flex items-center justify-between rounded-2xl bg-neutral-3 px-4 py-3">
      <span class="type-12-caps text-neutral-11">{{ $t('sell.get') }}</span>
      <UiPrice :amount="total" size="xl" tone="success" />
    </div>

    <template #actions>
      <UiButton variant="secondary" size="l" class="flex-1" @click="open = false">{{ $t(inline ? 'common.back' : 'common.cancel') }}</UiButton>
      <UiButton size="l" class="flex-[2] max-sm:order-first max-sm:basis-full" :loading="loading" @click="emit('confirm')">
        {{ $t('wallet.sell') }}
        <span class="btn-value"><UiPrice :amount="total" size="m" tone="inverse" /></span>
      </UiButton>
    </template>
  </UiModal>
</template>
