<script setup lang="ts">
import type { InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

/*
 * Inventory drawer (docs/ux-research-v3.md #2): opened from the balance chip in the header, over whatever page
 * the player is on — the loop open → sell / upgrade / withdraw never leaves the case. A tray on phones, a card on
 * desktop (UiModal). Nothing selected = the actions take every skin; tap skins to narrow it down. Sell and Withdraw are
 * steps of this one window, not modals over it: the content changes, the height glides, Back returns to the skins.
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
const step = ref<'list' | 'sell' | 'withdraw'>('list')
watch(open, (v) => {
  if (!v) return
  step.value = 'list'
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

const selling = ref(false)
async function sell() {
  selling.value = true
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids: target.value.map((i) => i.uid) } })
    if (session.user) session.user.balance = res.balance
    step.value = 'list'
    selected.value = []
    await load()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    selling.value = false
  }
}

function onWithdrawn() {
  selected.value = []
  load()
}

// Upgrade takes up to six skins; the drawer closes as the page changes
const upgradeTo = computed(() => `/upgrade?item=${target.value.slice(0, 6).map((i) => i.uid).join(',')}`)
</script>

<template>
  <UiModal v-model="open" :label="$t('drawer.title')" :width="560">
    <Transition :name="step === 'list' ? 'kd-step-back' : 'kd-step'" mode="out-in">
      <UiModal v-if="step === 'list'" key="list" :model-value="true" inline :title="$t('drawer.title')">
        <!-- the total leads to the full inventory -->
        <NuxtLink to="/profile?tab=inventory" :aria-label="$t('drawer.full')" class="kd-press kd-icon-nudge -mt-3 flex items-center justify-center gap-2 text-neutral-12 hover:text-neutral-15" @click="open = false">
          <span class="type-14-regular">{{ $t('drawer.skins', { n: items.length }, items.length) }}</span>
          <UiPrice :amount="total" size="l" tone="coin" />
          <UiIcon name="chevron-right" :size="16" class="kd-icon" />
        </NuxtLink>

        <div v-if="loading && !items.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <span v-for="n in 8" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl max-sm:aspect-[4/5]" />
        </div>
        <UiEmptyState v-else-if="!items.length" :text="$t('account.emptyInventory')" art="empty-inventory">
          <UiButton to="/" icon="cases" @click="open = false">{{ $t('account.openCases') }}</UiButton>
        </UiEmptyState>
        <div v-else class="scrollbar-none grid max-h-[48dvh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          <ItemTile v-for="it in items" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
        </div>

        <template v-if="items.length" #actions>
          <div class="flex w-full flex-col gap-2">
            <!-- the same block as the case dock: the main action across, two equal ones under it. Its label tells what
                 the actions take: every skin, or the picked ones -->
            <UiButton size="l" block @click="step = 'sell'">
              <UiTextSwap :text="selected.length ? $t('drawer.sellSome', { n: selected.length }) : $t('drawer.sellAll')" />
              <span class="btn-value"><UiPrice :amount="targetValue" size="m" tone="inverse" /></span>
            </UiButton>
            <div class="grid grid-cols-2 gap-2">
              <UiButton variant="secondary" size="l" icon="upgrade" :to="upgradeTo" @click="open = false">{{ $t('upgrade.upgrade') }}</UiButton>
              <UiButton variant="secondary" size="l" icon="steam" @click="step = 'withdraw'">{{ $t('withdraw.short') }}</UiButton>
            </div>
          </div>
        </template>
      </UiModal>
      <WalletSellPreview v-else-if="step === 'sell'" key="sell" :model-value="true" inline :items="target" :loading="selling" @update:model-value="step = 'list'" @confirm="sell" />
      <WalletWithdrawModal v-else key="withdraw" :model-value="true" inline :items="target" @update:model-value="step = 'list'" @done="onWithdrawn" />
    </Transition>
  </UiModal>
</template>

<style scoped>
/* a step comes in from the right and goes back the way it came */
.kd-step-enter-active,
.kd-step-back-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-step-leave-active,
.kd-step-back-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-step-enter-from,
.kd-step-back-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.kd-step-leave-to,
.kd-step-back-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
