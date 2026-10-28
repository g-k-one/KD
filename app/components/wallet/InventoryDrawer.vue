<script setup lang="ts">
import type { InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

/*
 * Inventory drawer (docs/ux-research-v3.md #2): opened from the balance chip in the header, over whatever page
 * the player is on — the loop open → sell / upgrade / withdraw never leaves the case. A tray on phones, a card on
 * desktop (UiModal). Nothing selected = the actions take every skin; tap skins to narrow it down.
 */
const ui = useUiStore()
const session = useSessionStore()
const toast = useToast()
const { t } = useI18n()

const open = computed({ get: () => ui.inventoryOpen, set: (v: boolean) => (ui.inventoryOpen = v) })
const items = ref<InventoryItem[]>([])
const loading = ref(false)
const selected = ref<string[]>([])

async function load() {
  loading.value = true
  try {
    items.value = (await $fetch<InventoryResponse>('/api/inventory')).items.slice().sort((a, b) => b.price - a.price)
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    loading.value = false
  }
}
watch(open, (v) => {
  if (!v) return
  selected.value = []
  load()
})

const sfx = useSfx()
function toggle(uid: string) {
  const on = selected.value.includes(uid)
  selected.value = on ? selected.value.filter((u) => u !== uid) : [...selected.value, uid]
  if (on) sfx.deselect()
  else sfx.select(selected.value.length)
}
// The actions work on the selection, or on everything when nothing is picked
const target = computed(() => (selected.value.length ? items.value.filter((i) => selected.value.includes(i.uid)) : items.value))
const total = computed(() => items.value.reduce((a, i) => a + i.price, 0))
const targetValue = computed(() => target.value.reduce((a, i) => a + i.price, 0))

const sellOpen = ref(false)
const selling = ref(false)
async function sell() {
  selling.value = true
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids: target.value.map((i) => i.uid) } })
    if (session.user) session.user.balance = res.balance
    sellOpen.value = false
    selected.value = []
    await load()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    selling.value = false
  }
}

const withdrawOpen = ref(false)
function onWithdrawn() {
  selected.value = []
  load()
}

// Upgrade takes up to six skins; the drawer closes as the page changes
const upgradeTo = computed(() => `/upgrade?item=${target.value.slice(0, 6).map((i) => i.uid).join(',')}`)
</script>

<template>
  <UiModal v-model="open" :title="$t('drawer.title')" :width="560">
    <div class="-mt-3 flex items-center justify-center gap-2">
      <span class="type-14-regular text-neutral-12">{{ $t('drawer.skins', { n: items.length }, items.length) }}</span>
      <UiPrice :amount="total" size="l" tone="coin" />
    </div>

    <div v-if="loading && !items.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <span v-for="n in 8" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl max-sm:aspect-[4/5]" />
    </div>
    <UiEmptyState v-else-if="!items.length" :text="$t('account.emptyInventory')" art="empty-inventory">
      <UiButton to="/" icon="cases" @click="open = false">{{ $t('account.openCases') }}</UiButton>
    </UiEmptyState>
    <div v-else class="grid max-h-[40dvh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      <ItemTile v-for="it in items" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
    </div>

    <template v-if="items.length" #actions>
      <div class="flex w-full flex-col gap-2">
        <span class="type-12-caps text-center text-neutral-11">
          {{ selected.length ? $t('drawer.selected', { n: selected.length }) : $t('drawer.all') }}
        </span>
        <!-- the same block as the case dock: the main action across, two equal ones under it -->
        <UiButton size="l" block @click="sellOpen = true">
          {{ $t('wallet.sell') }}
          <span class="btn-value"><UiPrice :amount="targetValue" size="m" tone="inverse" /></span>
        </UiButton>
        <div class="grid grid-cols-2 gap-2">
          <UiButton variant="secondary" size="l" icon="upgrade" :to="upgradeTo" @click="open = false">{{ $t('upgrade.upgrade') }}</UiButton>
          <UiButton variant="secondary" size="l" icon="steam" @click="withdrawOpen = true">{{ $t('withdraw.short') }}</UiButton>
        </div>
        <NuxtLink to="/profile?tab=inventory" class="type-12-caps text-center text-neutral-11 hover:text-neutral-15" @click="open = false">{{ $t('drawer.full') }}</NuxtLink>
      </div>
    </template>
  </UiModal>
  <WalletSellPreview v-model="sellOpen" :items="target" :loading="selling" @confirm="sell" />
  <WalletWithdrawModal v-model="withdrawOpen" :items="target" @done="onWithdrawn" />
</template>
