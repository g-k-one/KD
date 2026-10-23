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
/** Skins leave one at a time: withdraw works only with exactly one picked */
const canWithdraw = computed(() => selectedItems.value.length === 1)
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

/** The stats as small label | number cards (csgogem's profile) */
const statCards = computed(() => [
  { key: 'played', icon: 'wallet', label: t('account.statWagered'), price: stats.value.wagered },
  { key: 'cases', icon: 'cases', label: t('account.statCases'), value: String(stats.value.cases) },
  { key: 'ups', icon: 'upgrade', label: t('account.statUpgrades'), value: stats.value.upgrades },
  { key: 'topx', icon: 'fire', label: t('account.statTopX'), value: stats.value.topX ? `x${stats.value.topX.toFixed(stats.value.topX >= 10 ? 0 : 2)}` : '—', coin: true },
  { key: 'best', icon: 'trophy', label: t('account.statBest'), price: stats.value.best?.payout ?? 0, title: stats.value.best?.title },
  { key: 'skins', icon: 'inventory', label: t('account.skinsValue'), price: session.user?.skinsValue ?? 0 },
])

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
      <div class="flex flex-col gap-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <!-- Side nav (desktop): the sections as a list, csgogem's way; phones keep the tabs -->
        <nav class="flex flex-col gap-1 max-lg:hidden lg:sticky lg:top-24">
          <button
            v-for="n in NAV"
            :key="n.value"
            type="button"
            class="type-14-caps flex h-11 items-center gap-3 rounded-xl px-3 text-left transition-colors"
            :class="tab === n.value ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-11 hover:text-neutral-13'"
            @click="tab = n.value"
          >
            <UiIcon :name="n.icon" :size="18" />
            <span class="flex-1">{{ n.label }}</span>
            <span v-if="n.count" class="type-12 rounded-md bg-neutral-4 px-1.5 text-neutral-13">{{ n.count }}</span>
          </button>
        </nav>

        <div class="flex min-w-0 flex-col gap-4 lg:gap-6">
          <!-- Overview: who, the level's progress, the balance and Deposit -->
          <section class="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl bg-neutral-2 p-4 lg:flex-nowrap lg:px-6">
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <UiAvatar :src="session.user.avatar" :size="56" />
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <div class="flex items-center gap-2">
                  <h1 class="type-20-caps truncate">{{ session.user.nickname }}</h1>
                  <UiLevelBadge :level="session.user.level" />
                </div>
                <div class="flex items-center gap-3">
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-5">
                    <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
                  </div>
                  <span class="type-12 shrink-0 text-neutral-11 tabular-nums">{{ $t('profile.level', { from: session.user.level, to: session.user.level + 1 }) }} · {{ session.user.levelProgress }}%</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-4 max-lg:w-full max-lg:justify-between">
              <div class="flex flex-col">
                <span class="type-10-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
                <UiPrice :amount="session.user.balance" size="l" />
              </div>
              <UiButton icon="plus" size="m" to="/deposit" class="shrink-0">{{ $t('wallet.deposit') }}</UiButton>
            </div>
          </section>

          <!-- Stats, csgogem's way: small cards, the label on the left, the number on the right -->
          <dl class="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <div v-for="s in statCards" :key="s.key" class="flex min-w-0 flex-col items-start gap-1 rounded-2xl bg-neutral-2 px-3 py-2.5 sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-0" :title="s.title">
              <dt class="type-12-caps flex min-w-0 items-center gap-2 text-neutral-11"><UiIcon :name="s.icon" :size="16" class="shrink-0" /><span class="truncate">{{ s.label }}</span></dt>
              <dd class="type-14 shrink-0 tabular-nums" :class="s.coin && 'text-coin'">
                <UiPrice v-if="s.price != null" :amount="s.price" size="s" tone="coin" />
                <template v-else>{{ s.value }}</template>
              </dd>
            </div>
          </dl>

          <UiTabs v-model="tab" :tabs="NAV" class="lg:hidden" />

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
            <UiButton variant="light" size="m" class="shrink-0 max-sm:hidden" @click="sellEverything">
              {{ $t('account.sellAll') }}
              <UiPrice :amount="session.user.skinsValue" size="s" tone="inverse" />
            </UiButton>
          </div>
          <p v-if="inventory.length && !selected.length" class="type-12-regular -mt-1 text-neutral-11">{{ $t('account.pickHint') }}</p>
          <div v-if="loading" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <span v-for="n in 12" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl" />
          </div>
          <div v-else-if="inventory.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
              <!-- skins leave one at a time -->
              <UiButton variant="secondary" size="m" icon="steam" :disabled="!canWithdraw" :title="canWithdraw ? undefined : $t('account.withdrawOne')" @click="withdrawOpen = true">{{ $t('withdraw.short') }}</UiButton>
              <UiButton variant="light" size="m" @click="sellOpen = true">
                {{ $t('account.sellSelected') }}
                <UiPrice :amount="selectedValue" size="s" tone="inverse" />
              </UiButton>
            </div>
          </Transition>
          <WalletWithdrawModal v-model="withdrawOpen" :items="selectedItems.slice(0, 1)" @done="onWithdrawn" />
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
      </div>
    </template>
  </div>
</template>

<style scoped>
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
