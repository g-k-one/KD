<script setup lang="ts">
import type { HistoryEntry, HistoryGame, HistoryResponse, InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

// Figma "Account" side navigation + "Tables" history rows (desktop) / "MobileHistoryRow" (mobile).
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

// --- Wallet row (#16, Phantom): the balance with today's result, then the four money actions -------------------
// Result of the last 24 h: what cases and upgrades paid minus what they cost
const day = computed(() => {
  const since = Date.now() - 86_400_000
  return history.value.filter((h) => (h.game === 'case' || h.game === 'upgrade') && Date.parse(h.at) >= since).reduce((a, h) => a + h.payout - h.bet, 0)
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

const maskedSteamId = computed(() => (session.user ? `${session.user.steamId.slice(0, 4)}…${session.user.steamId.slice(-4)}` : ''))
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('account.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />
    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 px-6 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('account.signInHint') }}</p>
      <UiButton icon="sign-in" size="l" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <template v-else>
      <!-- Profile summary -->
      <section class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-4 md:flex-row md:items-center md:gap-6 md:p-6">
        <div class="flex min-w-0 flex-1 items-center gap-4">
          <UiAvatar :src="session.user.avatar" :size="72" />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex items-center gap-2">
              <h1 class="type-20-caps truncate">{{ session.user.nickname }}</h1>
              <UiLevelBadge :level="session.user.level" />
            </div>
            <span class="type-12-regular text-neutral-11">{{ $t('profile.steamId', { id: maskedSteamId }) }}</span>
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
        <div class="flex flex-col gap-2 md:w-[440px] md:shrink-0">
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 px-4 py-3">
              <span class="type-12-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
              <UiPrice :amount="session.user.balance" size="l" />
              <span class="type-12 tabular-nums" :class="day > 0 ? 'text-success' : day < 0 ? 'text-danger' : 'text-neutral-10'">
                {{ day > 0 ? '+' : day < 0 ? '−' : '' }}{{ formatCoins(Math.abs(day)) }} · {{ $t('account.day') }}
              </span>
            </div>
            <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 px-4 py-3">
              <span class="type-12-caps text-neutral-11">{{ $t('account.skinsValue') }}</span>
              <UiPrice :amount="session.user.skinsValue" size="l" tone="coin" />
              <span class="type-12 text-neutral-10">{{ $t('account.skinsCount', { n: inventory.length }, inventory.length) }}</span>
            </div>
          </div>
          <!-- the four money moves, one tap each -->
          <div class="grid grid-cols-4 gap-2">
            <NuxtLink to="/deposit" class="kd-act type-10-caps is-main kd-press"><UiIcon name="plus" :size="20" />{{ $t('wallet.deposit') }}</NuxtLink>
            <button type="button" class="kd-act type-10-caps kd-press" @click="ui.inventoryOpen = true"><UiIcon name="steam" :size="20" />{{ $t('withdraw.short') }}</button>
            <NuxtLink to="/upgrade" class="kd-act type-10-caps kd-press"><UiIcon name="upgrade" :size="20" />{{ $t('upgrade.upgrade') }}</NuxtLink>
            <button type="button" class="kd-act type-10-caps kd-press" :disabled="!inventory.length" @click="sellEverything"><UiIcon name="wallet" :size="20" />{{ $t('account.sellAll') }}</button>
          </div>
        </div>
      </section>

      <!-- Stats -->
      <section class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div class="kd-stat"><span class="type-10-caps text-neutral-11">{{ $t('account.statCases') }}</span><span class="type-20-caps tabular-nums">{{ stats.cases }}</span></div>
        <div class="kd-stat"><span class="type-10-caps text-neutral-11">{{ $t('account.statUpgrades') }}</span><span class="type-20-caps tabular-nums">{{ stats.upgrades }}</span></div>
        <div class="kd-stat"><span class="type-10-caps text-neutral-11">{{ $t('account.statWagered') }}</span><UiPrice :amount="stats.wagered" size="l" /></div>
        <div class="kd-stat"><span class="type-10-caps text-neutral-11">{{ $t('account.statTopX') }}</span><span class="type-20-caps text-coin tabular-nums">{{ stats.topX ? `x${stats.topX.toFixed(stats.topX >= 10 ? 0 : 2)}` : '—' }}</span></div>
        <div class="kd-stat max-sm:col-span-2"><span class="type-10-caps text-neutral-11">{{ $t('account.statBest') }}</span>
          <span v-if="stats.best" class="flex min-w-0 flex-col"><UiPrice :amount="stats.best.payout" size="l" tone="coin" /><span class="type-12-regular truncate text-neutral-11">{{ stats.best.title }}</span></span>
          <span v-else class="type-20-caps">—</span>
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-6">
        <!-- Account nav: side list on desktop (Figma "Account"), tabs on mobile -->
        <nav class="hidden flex-col gap-1 lg:flex">
          <button
            v-for="n in NAV"
            :key="n.value"
            type="button"
            class="kd-press type-14-caps flex h-12 items-center gap-3 rounded-lg px-3 text-left"
            :class="tab === n.value ? 'bg-neutral-3 text-neutral-15' : 'text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15'"
            @click="tab = n.value"
          >
            <UiIcon :name="n.icon" :size="20" :class="tab === n.value && 'text-brand-light'" />
            <span class="flex-1">{{ n.label }}</span>
            <span v-if="n.count" class="type-12 text-neutral-11">{{ n.count }}</span>
          </button>
          <NuxtLink to="/fairness" class="kd-press type-14-caps flex h-12 items-center gap-3 rounded-lg px-3 text-neutral-12 hover:bg-neutral-3 hover:text-neutral-15">
            <UiIcon name="shield" :size="20" />
            {{ $t('account.fairness') }}
          </NuxtLink>
        </nav>
        <UiTabs v-model="tab" :tabs="NAV" class="lg:hidden" />

        <!-- Inventory -->
        <section v-if="tab === 'inventory'" class="flex min-w-0 flex-col gap-4">
          <div v-if="inventory.length" class="flex items-center gap-2">
            <UiInput id="inv-search" v-model="invQuery" icon="search" clearable :placeholder="$t('upgrade.search')" class="min-w-0 flex-1" />
            <UiSelect v-model="invSort" :options="invSortOptions" menu-width="fixed" class="w-44 shrink-0 max-sm:hidden">
              <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
            </UiSelect>
            <!-- phones: one tap cycles the sort, the title says which -->
            <UiChip size="l" variant="field" icon="sort" class="w-12 shrink-0 justify-center px-0 sm:hidden" :title="invSortOptions.find((o) => o.value === invSort)?.label" @click="invSort = invSortOptions[(invSortOptions.findIndex((o) => o.value === invSort) + 1) % invSortOptions.length]!.value" />
            <UiChip size="l" variant="field" :active="!!selected.length" class="shrink-0" @click="selected.length ? (selected = []) : selectAll()">
              <UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" />
            </UiChip>
          </div>
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
              <UiButton variant="ghost" size="s" @click="selected = []">{{ $t('account.clear') }}</UiButton>
              <UiButton variant="secondary" size="m" icon="upgrade" :to="`/upgrade?item=${selected.slice(0, 6).join(',')}`">{{ $t('account.upgradeThem') }}</UiButton>
              <UiButton variant="secondary" size="m" icon="steam" @click="withdrawOpen = true">{{ $t('withdraw.short') }}</UiButton>
              <UiButton variant="light" size="m" @click="sellOpen = true">
                {{ $t('account.sellSelected') }}
                <UiPrice :amount="selectedValue" size="s" tone="inverse" />
              </UiButton>
            </div>
          </Transition>
          <WalletWithdrawModal v-model="withdrawOpen" :items="selectedItems" @done="onWithdrawn" />
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
.kd-act {
  display: flex;
  height: 64px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 12px;
  background: var(--color-neutral-3);
  color: var(--color-neutral-14);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-act.is-main {
  background: var(--color-brand-base);
  color: var(--color-neutral-15);
}
.kd-act:disabled {
  opacity: 0.4;
}
@media (hover: hover) {
  .kd-act:not(.is-main):not(:disabled):hover {
    background: var(--color-neutral-4);
  }
}
.kd-stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  border-radius: 16px;
  background: var(--color-neutral-2);
  padding: 12px 14px;
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
