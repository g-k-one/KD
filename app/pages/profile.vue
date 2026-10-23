<script setup lang="ts">
import type { HistoryEntry, HistoryGame, HistoryResponse, InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

// Profile: one header — who, the level, the money in one line and Deposit — with the stats as one line under it;
// tabs on top (Inventory · History · Settings) for every size; the money moves sit where they act: on the inventory
// (Sell all next to the search, Upgrade / Withdraw / Sell on the selection bar). History rows: Figma "Tables"
// (desktop) / "MobileHistoryRow" (mobile).
useHead({ title: 'Profile · KurwaDROP' })
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

type Tab = 'inventory' | 'history' | 'settings'
const tab = computed<Tab>({
  get: () => (['inventory', 'history', 'settings'].includes(String(route.query.tab)) ? (route.query.tab as Tab) : 'inventory'),
  set: (v) => router.replace({ query: { ...route.query, tab: v } }),
})

const inventory = ref<InventoryItem[]>([])
const history = ref<HistoryEntry[]>([])
// Client only: server-side $fetch would go out without the session cookie and get a 401
const loading = ref(true)
async function load() {
  if (import.meta.server) return
  if (!session.user) return (loading.value = false)
  try {
    const [inv, hist] = await Promise.all([$fetch<InventoryResponse>('/api/inventory'), $fetch<HistoryResponse>('/api/history')])
    inventory.value = inv.items
    history.value = hist.entries
  } catch {
    /* signed out meanwhile */
  } finally {
    loading.value = false
  }
}
watch(() => session.user?.id, load, { immediate: true })
watch(tab, load)

const NAV = computed(() => [
  { value: 'inventory' as const, label: t('account.inventory'), icon: 'inventory', count: inventory.value.length },
  { value: 'history' as const, label: t('account.history'), icon: 'history' },
  { value: 'settings' as const, label: t('account.settings'), icon: 'sliders' },
])

// --- Inventory ---------------------------------------------------------------
const selected = ref<string[]>([])
const selectedValue = computed(() => inventory.value.filter((i) => selected.value.includes(i.uid)).reduce((a, i) => a + i.price, 0))
// Search by weapon or skin, sort by price either way or by newest
const invQuery = ref('')
const invSort = ref<'priceDesc' | 'priceAsc' | 'newest'>('priceDesc')
const invSortOptions = computed(() => (['priceDesc', 'priceAsc', 'newest'] as const).map((v) => ({ value: v, label: t(`filters.sortOptions.${v}`) })))
const sortedInventory = computed(() => {
  const q = invQuery.value.trim().toLowerCase()
  const list = inventory.value.filter((i) => !q || `${i.weapon} ${i.skin}`.toLowerCase().includes(q))
  if (invSort.value === 'newest') return list.sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt))
  return list.sort((a, b) => (invSort.value === 'priceAsc' ? a.price - b.price : b.price - a.price))
})
const selectAll = () => (selected.value = sortedInventory.value.map((i) => i.uid))
function toggle(uid: string) {
  selected.value = selected.value.includes(uid) ? selected.value.filter((u) => u !== uid) : [...selected.value, uid]
}
const selling = ref(false)
// Selling goes through a preview (what leaves, what arrives) before anything happens
const sellOpen = ref(false)
async function sellSelected() {
  selling.value = true
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids: selected.value } })
    if (session.user) session.user.balance = res.balance
    toast.show(`${t('wallet.sold')} · ${formatCoins(selectedValue.value)}`, 'success')
    selected.value = []
    sellOpen.value = false
    await load()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    selling.value = false
  }
}

// Withdraw the selected skins to Steam (one trade offer)
const withdrawOpen = ref(false)
const selectedItems = computed(() => inventory.value.filter((i) => selected.value.includes(i.uid)))
/** Withdraw takes the picked skins, or all of them when none is picked */
const withdrawItems = computed(() => (selected.value.length ? selectedItems.value : inventory.value))
async function onWithdrawn() {
  selected.value = []
  await load()
}

// --- History -----------------------------------------------------------------
const gameFilter = ref<HistoryGame | 'all'>('all')
const filteredHistory = computed(() => history.value.filter((h) => gameFilter.value === 'all' || h.game === gameFilter.value))
const GAME_ICON: Record<HistoryGame, string> = { case: 'cases', upgrade: 'upgrade', deposit: 'plus', sell: 'wallet', withdraw: 'steam' }
const when = (iso: string) =>
  new Date(iso).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const mult = (h: HistoryEntry) => (h.bet > 0 ? `${(h.payout / h.bet).toFixed(2)}x` : '—')

// --- Stats (from the history the profile already loads) ------------------------------
const stats = computed(() => {
  const cases = history.value.filter((h) => h.game === 'case')
  const ups = history.value.filter((h) => h.game === 'upgrade')
  const wins = ups.filter((h) => h.status === 'won')
  const played = [...cases, ...ups]
  const best = played.reduce<HistoryEntry | null>((b, h) => (!b || h.payout > b.payout ? h : b), null)
  const topX = played.reduce((m, h) => (h.bet > 0 ? Math.max(m, h.payout / h.bet) : m), 0)
  return {
    cases: cases.length,
    upgrades: `${wins.length} / ${ups.length}`,
    best,
    topX,
    wagered: played.reduce((a, h) => a + h.bet, 0),
  }
})

// the sell preview lives on the inventory tab, so selling everything goes there first
function sellEverything() {
  tab.value = 'inventory'
  selected.value = inventory.value.map((i) => i.uid)
  sellOpen.value = true
}

// --- Steam trade link (settings) --------------------------------------------------------
const TRADE_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]{6,}$/
const tradeLink = ref('')
watch(() => session.user?.tradeUrl, (v) => (tradeLink.value = v ?? ''), { immediate: true })
const tradeValid = computed(() => TRADE_RE.test(tradeLink.value.trim()))
const tradeSaving = ref(false)
async function saveTrade() {
  tradeSaving.value = true
  try {
    const res = await $fetch<{ tradeUrl: string }>('/api/me/trade-url', { method: 'PUT', body: { tradeUrl: tradeLink.value.trim() } })
    if (session.user) session.user.tradeUrl = res.tradeUrl
    toast.show(t('withdraw.saved'), 'success')
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    tradeSaving.value = false
  }
}

</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('account.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />
    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 px-6 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('account.signInHint') }}</p>
      <UiButton icon="sign-in" size="l" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <template v-else>
      <!-- One row: who and the level · the stats, big · the money and Deposit -->
      <section class="grid gap-4 rounded-5xl bg-neutral-2 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-8">
          <div class="flex min-w-0 items-center gap-4">
            <UiAvatar :src="session.user.avatar" :size="72" />
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <div class="flex items-center gap-2">
                <h1 class="type-20-caps truncate">{{ session.user.nickname }}</h1>
                <UiLevelBadge :level="session.user.level" />
              </div>
              <div class="flex max-w-80 flex-col gap-1">
                <div class="type-12 flex justify-between text-neutral-13">
                  <span>{{ $t('profile.level', { from: session.user.level, to: session.user.level + 1 }) }}</span>
                  <span>{{ session.user.levelProgress }}%</span>
                </div>
                <div class="h-1 overflow-hidden rounded-full bg-neutral-8">
                  <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
                </div>
              </div>
            </div>
          </div>
          <dl class="kd-stats grid grid-cols-3 border-neutral-4 max-lg:order-last max-lg:border-t max-lg:pt-4">
            <div class="kd-stat"><dt class="type-12-caps text-neutral-11">{{ $t('account.statCases') }}</dt><dd class="type-20-caps tabular-nums">{{ stats.cases }}</dd></div>
            <div class="kd-stat"><dt class="type-12-caps text-neutral-11">{{ $t('account.statTopX') }}</dt><dd class="type-20-caps text-coin tabular-nums">{{ stats.topX ? `x${stats.topX.toFixed(stats.topX >= 10 ? 0 : 2)}` : '—' }}</dd></div>
            <div class="kd-stat"><dt class="type-12-caps text-neutral-11">{{ $t('account.statBest') }}</dt>
              <dd v-if="stats.best" class="flex min-w-0 flex-col"><UiPrice :amount="stats.best.payout" size="l" tone="coin" /><span class="type-12-regular truncate text-neutral-11">{{ stats.best.title }}</span></dd>
              <dd v-else class="type-20-caps">—</dd>
            </div>
          </dl>
          <!-- the money in one line: balance · skins · Deposit -->
          <div class="flex flex-wrap items-center gap-3 rounded-3xl bg-neutral-3 p-2 pl-4 max-md:pt-3 md:flex-nowrap">
            <div class="flex min-w-0 flex-1 flex-col md:flex-none">
              <span class="type-10-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
              <UiPrice :amount="session.user.balance" size="l" />
            </div>
            <span class="h-10 w-px shrink-0 bg-neutral-5" />
            <div class="flex min-w-0 flex-1 flex-col md:flex-none">
              <span class="type-10-caps text-neutral-11">{{ $t('account.skinsValue') }}</span>
              <UiPrice :amount="session.user.skinsValue" size="l" tone="coin" />
            </div>
            <UiButton icon="plus" size="m" to="/deposit" class="shrink-0 max-md:-ml-2 max-md:basis-[calc(100%+8px)]">{{ $t('wallet.deposit') }}</UiButton>
          </div>
      </section>

      <div class="flex flex-col gap-4 lg:gap-6">
        <UiTabs v-model="tab" :tabs="NAV" />

        <!-- Inventory -->
        <section v-if="tab === 'inventory'" class="flex min-w-0 flex-col gap-4">
          <div v-if="inventory.length" class="flex items-center gap-2">
            <UiInput id="inv-search" v-model="invQuery" icon="search" clearable :placeholder="$t('upgrade.search')" class="min-w-0 flex-1" />
            <UiSelect v-model="invSort" :options="invSortOptions" menu-width="fixed" class="w-44 shrink-0 max-sm:hidden">
              <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
            </UiSelect>
            <!-- phones: one tap cycles the sort, the title says which -->
            <UiChip size="m" variant="field" icon="sort" class="w-10 shrink-0 justify-center px-0 sm:hidden" :title="invSortOptions.find((o) => o.value === invSort)?.label" @click="invSort = invSortOptions[(invSortOptions.findIndex((o) => o.value === invSort) + 1) % invSortOptions.length]!.value" />
            <UiChip size="m" variant="field" :active="!!selected.length" class="shrink-0" @click="selected.length ? (selected = []) : selectAll()">
              <UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" />
            </UiChip>
            <UiButton variant="secondary" size="m" icon="steam" class="shrink-0" @click="withdrawOpen = true">
              <UiTextSwap :text="selected.length ? $t('withdraw.send', { n: selected.length }) : $t('account.withdrawAll')" />
            </UiButton>
            <UiButton variant="light" size="m" class="shrink-0 max-sm:hidden" @click="sellEverything">
              {{ $t('account.sellAll') }}
              <UiPrice :amount="session.user.skinsValue" size="s" tone="inverse" />
            </UiButton>
          </div>
          <p v-if="inventory.length && !selected.length" class="type-12-regular -mt-1 text-neutral-11">{{ $t('account.pickHint') }}</p>
          <div v-if="loading" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <span v-for="n in 12" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl" />
          </div>
          <div v-else-if="inventory.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <ItemTile v-for="it in sortedInventory" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
          </div>
          <UiEmptyState v-else :text="$t('account.emptyInventory')">
            <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
          </UiEmptyState>

          <!-- Selection bar floats above the bottom nav on mobile -->
          <Transition name="kd-bar">
            <div
              v-if="selected.length"
              class="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 rounded-3xl border border-neutral-5 bg-neutral-3 p-3 shadow-elevation-2 lg:bottom-6"
            >
              <span class="type-14 flex-1">{{ $t('account.selected', { count: selected.length }) }}</span>
              <UiButton variant="ghost" size="m" @click="selected = []">{{ $t('account.clear') }}</UiButton>
              <UiButton variant="secondary" size="m" icon="upgrade" :to="`/upgrade?item=${selected.slice(0, 6).join(',')}`">{{ $t('account.upgradeThem') }}</UiButton>
              <UiButton variant="secondary" size="m" icon="steam" @click="withdrawOpen = true">{{ $t('withdraw.short') }}</UiButton>
              <UiButton variant="light" size="m" @click="sellOpen = true">
                {{ $t('account.sellSelected') }}
                <UiPrice :amount="selectedValue" size="s" tone="inverse" />
              </UiButton>
            </div>
          </Transition>
          <WalletWithdrawModal v-model="withdrawOpen" :items="withdrawItems" @done="onWithdrawn" />
          <WalletSellPreview v-model="sellOpen" :items="selectedItems" :loading="selling" @confirm="sellSelected" />
        </section>

        <!-- History -->
        <section v-else-if="tab === 'history'" class="flex min-w-0 flex-col gap-4">
          <div class="scrollbar-none flex gap-1 overflow-x-auto">
            <UiChip :active="gameFilter === 'all'" @click="gameFilter = 'all'">{{ $t('account.allGames') }}</UiChip>
            <UiChip v-for="g in (['case', 'upgrade', 'deposit', 'sell', 'withdraw'] as const)" :key="g" :active="gameFilter === g" @click="gameFilter = g">
              {{ $t(`account.games.${g}`) }}
            </UiChip>
          </div>

          <UiEmptyState v-if="!filteredHistory.length" :text="$t('account.emptyHistory')" />

          <!-- Desktop table -->
          <div v-else class="hidden overflow-hidden rounded-3xl bg-neutral-2 md:block">
            <table class="w-full text-left">
              <thead class="type-12-caps text-neutral-11">
                <tr class="border-b border-neutral-4">
                  <th class="px-4 py-3 font-semibold">{{ $t('account.date') }}</th>
                  <th class="px-4 py-3 font-semibold">{{ $t('account.game') }}</th>
                  <th class="px-4 py-3 font-semibold">{{ $t('account.bet') }}</th>
                  <th class="px-4 py-3 font-semibold">{{ $t('account.multiplier') }}</th>
                  <th class="px-4 py-3 font-semibold">{{ $t('account.payout') }}</th>
                  <th class="px-4 py-3 font-semibold">{{ $t('account.status') }}</th>
                </tr>
              </thead>
              <tbody class="type-14">
                <tr v-for="h in filteredHistory" :key="h.id" class="border-b border-neutral-4 last:border-0 hover:bg-neutral-3">
                  <td class="px-4 py-3 whitespace-nowrap text-neutral-13">{{ when(h.at) }}</td>
                  <td class="px-4 py-3">
                    <span class="flex items-center gap-2">
                      <UiIcon :name="GAME_ICON[h.game]" :size="16" class="text-neutral-11" />
                      <span class="truncate">{{ $t(`account.games.${h.game}`) }} · <span class="text-neutral-12">{{ h.title }}</span></span>
                    </span>
                  </td>
                  <td class="px-4 py-3"><UiPrice v-if="h.bet" :amount="h.bet" /><span v-else class="text-neutral-8">—</span></td>
                  <td class="px-4 py-3 text-neutral-13 tabular-nums">{{ mult(h) }}</td>
                  <td class="px-4 py-3"><UiPrice :amount="h.payout" :tone="h.status === 'lost' ? 'muted' : 'success'" /></td>
                  <td class="px-4 py-3">
                    <span
                      class="type-10-caps rounded-md border px-2 py-1"
                      :class="{ 'border-success bg-success-24 text-success': h.status === 'won', 'border-danger/60 bg-danger-24 text-danger': h.status === 'lost', 'border-neutral-7 text-neutral-12': h.status === 'done' }"
                    >
                      {{ $t(`account.${h.status}`) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile rows -->
          <ul v-if="filteredHistory.length" class="flex flex-col gap-2 md:hidden">
            <li v-for="h in filteredHistory" :key="h.id" class="flex items-center gap-3 rounded-2xl bg-neutral-2 p-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-4 text-neutral-13">
                <UiIcon :name="GAME_ICON[h.game]" :size="18" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="type-14 truncate">{{ $t(`account.games.${h.game}`) }} · {{ h.title }}</span>
                <span class="type-12-regular text-neutral-11">{{ when(h.at) }} · {{ mult(h) }}</span>
              </span>
              <span class="flex flex-col items-end">
                <UiPrice :amount="h.payout" :tone="h.status === 'lost' ? 'muted' : 'success'" />
                <UiPrice v-if="h.bet" :amount="h.bet" size="xs" tone="muted" />
              </span>
            </li>
          </ul>
        </section>

        <!-- Settings -->
        <section v-else class="flex max-w-lg flex-col gap-4">
          <form class="flex flex-col gap-3 rounded-5xl bg-neutral-2 p-4 lg:p-6" @submit.prevent="saveTrade">
            <span class="type-14-caps">{{ $t('withdraw.tradeLink') }}</span>
            <UiInput id="settings-trade" v-model="tradeLink" size="l" icon="steam" inputmode="url" clearable :error="!!tradeLink && !tradeValid" placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…" />
            <span class="type-12-regular text-neutral-11">
              {{ $t('withdraw.whereLink') }}
              <a href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url" target="_blank" rel="noopener" class="text-brand-light hover:underline">{{ $t('withdraw.openSteam') }}</a>
            </span>
            <UiButton type="submit" size="m" class="self-start" :loading="tradeSaving" :disabled="!tradeValid || tradeLink.trim() === session.user.tradeUrl">{{ $t('common.save') }}</UiButton>
          </form>
          <div class="rounded-5xl bg-neutral-2 p-4 lg:p-6">
            <LayoutSettingsPanel />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kd-stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}
@media (min-width: 64rem) {
  .kd-stat {
    padding: 0 24px;
  }
}
.kd-stat:first-child {
  padding-left: 0;
}
.kd-stat + .kd-stat {
  border-left: 1px solid var(--color-neutral-4);
}
.kd-bar-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-bar-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.kd-bar-enter-from,
.kd-bar-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
