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

// Settings open in a modal from the page bar; an old ?tab=settings link still opens them
const settingsOpen = ref(route.query.tab === 'settings')

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

const gameOptions = computed(() => [
  { value: 'all' as const, label: t('account.allGames') },
  ...(['case', 'upgrade', 'deposit', 'sell', 'withdraw'] as const).map((g) => ({ value: g, label: t(`account.games.${g}`) })),
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
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t('account.title')"
      :left="[
        { label: $t('case.allCases'), icon: 'arrow-left', to: '/' },
        ...(session.user ? [{ label: $t('account.settings'), icon: 'sliders', onClick: () => (settingsOpen = true) }] : []),
      ]"
    />
    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 px-6 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('account.signInHint') }}</p>
      <UiButton icon="sign-in" size="l" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <template v-else>
      <!-- The plate, as the case page's dock: who and the level · Deposit · the money -->
      <section class="kd-dock flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div class="flex min-w-0 items-center gap-3">
          <UiAvatar :src="session.user.avatar" :size="48" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center gap-2">
              <h1 class="type-16-caps truncate">{{ session.user.nickname }}</h1>
              <UiLevelBadge :level="session.user.level" />
            </div>
            <div class="flex max-w-56 items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-5">
                <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
              </div>
              <span class="type-12 shrink-0 text-neutral-11 tabular-nums">{{ session.user.levelProgress }}%</span>
            </div>
          </div>
        </div>
        <UiButton icon="plus" size="l" to="/deposit" class="w-full lg:h-14 lg:w-80">{{ $t('wallet.deposit') }}</UiButton>
        <div class="flex gap-2 lg:justify-end">
          <span class="kd-dock-stat max-lg:flex-1">
            <span class="type-12-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
            <UiPrice :amount="session.user.balance" size="m" />
          </span>
          <span class="kd-dock-stat max-lg:flex-1">
            <span class="type-12-caps text-neutral-11">{{ $t('account.skinsValue') }}</span>
            <UiPrice :amount="session.user.skinsValue" size="m" tone="coin" />
          </span>
        </div>
      </section>

      <!-- Two panels, the upgrade page's: my skins | game history -->
      <section class="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        <!-- My skins: the upgrade page's panel, tiles to pick; picked ones get the bar below -->
        <div class="flex min-w-0 flex-col rounded-5xl bg-neutral-2 lg:pb-4">
          <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
            <UiIcon name="inventory" :size="24" class="text-neutral-13" />
            <span class="type-14 lg:type-16-medium">{{ $t('upgrade.mySkins') }} ({{ inventory.length }})</span>
            <UiPrice :amount="session.user.skinsValue" size="m" tone="coin" class="opacity-64 max-sm:hidden" />
            <UiButton v-if="inventory.length" variant="ghost" size="s" class="ml-auto" @click="selected.length ? (selected = []) : selectAll()">
              <UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" />
            </UiButton>
            <UiButton variant="ghost" size="m" icon-only :class="!inventory.length && 'ml-auto'" :aria-label="$t(invSort === 'priceDesc' ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="invSort = invSort === 'priceDesc' ? 'priceAsc' : 'priceDesc'">
              <UiSortArrows :desc="invSort === 'priceDesc'" />
            </UiButton>
          </div>
          <div v-if="loading" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
            <span v-for="n in 15" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl lg:aspect-auto lg:h-[105px]" />
          </div>
          <template v-else-if="inventory.length">
            <div class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
              <ItemTile v-for="it in sortedInventory" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
            </div>
            <div class="flex items-center justify-between gap-3 px-4 pb-3 lg:px-6 lg:pb-0">
              <span class="type-12-regular text-neutral-11">{{ $t('account.pickHint') }}</span>
              <UiButton variant="secondary" size="s" class="shrink-0" @click="sellEverything">
                {{ $t('account.sellAll') }}
                <span class="btn-value"><UiPrice :amount="session.user.skinsValue" size="s" /></span>
              </UiButton>
            </div>
          </template>
          <UiEmptyState v-else :text="$t('account.emptyInventory')" class="m-3 lg:m-4">
            <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
          </UiEmptyState>
        </div>

        <!-- Game history: the same panel; what the player did, newest first -->
        <div class="flex min-w-0 flex-col rounded-5xl bg-neutral-2 lg:pb-4">
          <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
            <UiIcon name="history" :size="24" class="text-neutral-13" />
            <span class="type-14 lg:type-16-medium">{{ $t('account.history') }}</span>
            <UiSelect v-model="gameFilter" :options="gameOptions" menu-width="fixed" class="ml-auto w-36 lg:w-40" :active="gameFilter !== 'all'" />
          </div>
          <!-- the player's numbers, one quiet line -->
          <dl class="grid grid-cols-3 gap-2 p-3 lg:px-4">
            <div v-for="s in statCards.slice(1, 4)" :key="s.key" class="flex min-w-0 flex-col gap-1 rounded-2xl bg-neutral-3 px-3 py-2.5">
              <dt class="type-10-caps truncate text-neutral-11">{{ s.label }}</dt>
              <dd class="type-14 tabular-nums" :class="s.coin && 'text-coin'">
                <UiPrice v-if="s.price != null" :amount="s.price" size="s" tone="coin" />
                <template v-else>{{ s.value }}</template>
              </dd>
            </div>
          </dl>
          <UiEmptyState v-if="!filteredHistory.length" :text="$t('account.emptyHistory')" class="m-3 mt-0 lg:m-4 lg:mt-0" />
          <ul v-else class="kd-history flex flex-col gap-1 overflow-y-auto px-3 pb-3 lg:px-4 lg:pb-0">
            <li v-for="h in filteredHistory" :key="h.id" class="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-4 text-neutral-13">
                <UiIcon :name="GAME_ICON[h.game]" :size="18" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="type-14 truncate">{{ $t(`account.games.${h.game}`) }} · <span class="text-neutral-12">{{ h.title }}</span></span>
                <span class="type-12-regular text-neutral-11">{{ when(h.at) }} · {{ mult(h) }}</span>
              </span>
              <span class="flex flex-col items-end">
                <UiPrice :amount="h.payout" :tone="h.status === 'lost' ? 'muted' : 'success'" />
                <UiPrice v-if="h.bet" :amount="h.bet" size="xs" tone="muted" />
              </span>
            </li>
          </ul>
        </div>
      </section>

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

      <!-- Settings: the trade link and the app's settings, in a modal from the page bar -->
      <UiModal v-model="settingsOpen" :title="$t('account.settings')" :width="560">
        <div class="flex flex-col gap-4">
          <form class="flex flex-col gap-3" @submit.prevent="saveTrade">
            <span class="type-14-caps">{{ $t('withdraw.tradeLink') }}</span>
            <UiInput id="settings-trade" v-model="tradeLink" size="l" icon="steam" inputmode="url" clearable :error="!!tradeLink && !tradeValid" placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…" />
            <span class="type-12-regular text-neutral-11">
              {{ $t('withdraw.whereLink') }}
              <a href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url" target="_blank" rel="noopener" class="text-brand-light hover:underline">{{ $t('withdraw.openSteam') }}</a>
            </span>
            <UiButton type="submit" size="m" class="self-start" :loading="tradeSaving" :disabled="!tradeValid || tradeLink.trim() === session.user?.tradeUrl">{{ $t('common.save') }}</UiButton>
          </form>
          <div class="border-t border-neutral-4 pt-4">
            <LayoutSettingsPanel />
          </div>
        </div>
      </UiModal>
    </template>
  </div>
</template>

<style scoped>
/* the plate is the case page's dock: 24px radius, 12px padding; its chips are 48px high with a 12px radius */
.kd-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
@media (min-width: 64rem) {
  .kd-dock {
    padding-inline: 16px;
  }
}
.kd-dock-stat {
  display: inline-flex;
  height: 48px;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  background: var(--color-neutral-3);
  padding: 0 16px;
  white-space: nowrap;
}
/* phones: two chips share the width, so the label sits over the amount */
@media (max-width: 63.98rem) {
  .kd-dock-stat {
    height: auto;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 12px;
  }
}
/* the history scrolls inside its panel, so the two panels stay about the same height */
.kd-history {
  max-height: 520px;
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
