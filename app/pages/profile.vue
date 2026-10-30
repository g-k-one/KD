<script setup lang="ts">
// Imported, not resolveComponent(): the static artifact build left that as a literal <nuxtlink> tag
import type { HistoryEntry, HistoryGame, HistoryQuery, HistoryResponse, HistoryStats, InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

// Profile: one header — who, the level (and what it takes to the next one), Deposit, the money. Under it the skins,
// and beside them the Steam trade link (where withdrawals go) with the player's numbers; the game history runs the
// full width below, each roll a tap away from its check on the Provably Fair page. Picking skins brings up a bar
// fixed to the screen's bottom edge: Upgrade / Withdraw / Sell. History rows: Figma "Tables" / "MobileHistoryRow".
useHead({ title: 'Profile · KurwaDROP' })
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

// Settings open in a modal from the page bar; an old ?tab=settings link still opens them
// ?tab=settings opens it once the page is up (a modal open in the server render would not match the client's)
const settingsOpen = ref(false)
// The account's id: what support asks for, a tap copies it
async function copyId() {
  try {
    await navigator.clipboard.writeText(session.user?.id ?? '')
    toast.show(t('account.idCopied'), 'success')
  } catch {
    toast.show(t('common.error'))
  }
}
onMounted(() => route.query.tab === 'settings' && (settingsOpen.value = true))

const inventory = ref<InventoryItem[]>([])
const history = ref<HistoryEntry[]>([])
const stats = ref<HistoryStats | null>(null)
// Client only: server-side $fetch would go out without the session cookie and get a 401
const loading = ref(true)
async function load() {
  if (import.meta.server) return
  if (!session.user) return (loading.value = false)
  try {
    const [inv, numbers] = await Promise.all([$fetch<InventoryResponse>('/api/inventory'), $fetch<HistoryStats>('/api/history/stats')])
    inventory.value = inv.items
    stats.value = numbers
    await loadHistory()
  } catch {
    /* signed out meanwhile */
  } finally {
    loading.value = false
  }
}
watch(() => session.user?.id, load, { immediate: true })
// ?tab=history (the menu's Game history, "All history" links): the history panel, brought into view once it has
// loaded and the router has done its own scroll to the top (it runs right after page:finish)
const historyEl = useTemplateRef<HTMLElement>('historyEl')
const pageReady = ref(false)
useNuxtApp().hooks.hookOnce('page:finish', () => void setTimeout(() => (pageReady.value = true), 50))
watch(
  () => [loading.value, pageReady.value, route.query.tab] as const,
  ([busy, ready, tab]) => !busy && ready && tab === 'history' && nextTick(() => historyEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })),
)

const gameOptions = computed(() => [
  { value: 'all' as const, label: t('account.allGames') },
  ...(['case', 'upgrade', 'pvp', 'deposit', 'sell', 'withdraw'] as const).map((g) => ({ value: g, label: t(`account.games.${g}`) })),
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
// Three rows of skins beside the right column, the rest behind "Show all": with a big inventory the history would sit far down the page
const isSm = useMediaQuery('(min-width: 40rem)')
const skinsCap = computed(() => (isSm.value ? 15 : 6))
const showAllSkins = ref(false)
const shownInventory = computed(() => (showAllSkins.value ? sortedInventory.value : sortedInventory.value.slice(0, skinsCap.value)))
const selectAll = () => (selected.value = sortedInventory.value.map((i) => i.uid))
const sfx = useSfx()
function toggle(uid: string) {
  const on = selected.value.includes(uid)
  selected.value = on ? selected.value.filter((u) => u !== uid) : [...selected.value, uid]
  if (on) sfx.deselect()
  else sfx.select(selected.value.length)
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
// PvP battles are case rows with a battle: their own filter, and Case keeps the plain openings. ?game= picks one (the
// upgrade and PvP bars link to their own history)
type GameFilter = HistoryGame | 'pvp' | 'all'
const FILTERS: GameFilter[] = ['all', 'case', 'upgrade', 'pvp', 'deposit', 'sell', 'withdraw']
const gameFilter = ref<GameFilter>(FILTERS.includes(route.query.game as GameFilter) ? (route.query.game as GameFilter) : 'all')
// and three more on top of the game: a skin or case by name, how far back, won or lost (rounds only: a payment has no
// profit). The server filters and sends a page at a time: the next one comes as the list nears its end, inside its panel
const historyQuery = ref('')
const PERIODS = { all: 0, day: 86_400_000, week: 7 * 86_400_000, month: 30 * 86_400_000 }
const period = ref<keyof typeof PERIODS>('all')
const periodOptions = computed(() => (Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((v) => ({ value: v, label: t(`account.periods.${v}`) })))
const outcome = ref<'all' | 'won' | 'lost'>('all')
const outcomeOptions = computed(() => (['all', 'won', 'lost'] as const).map((v) => ({ value: v, label: t(`account.outcomes.${v}`) })))
const historyNarrowed = computed(() => !!historyQuery.value.trim() || period.value !== 'all' || outcome.value !== 'all')
function clearHistoryFilters() {
  historyQuery.value = ''
  period.value = 'all'
  outcome.value = 'all'
}
const HISTORY_PAGE = 30
const historyName = refDebounced(historyQuery, 250)
const historyParams = computed<HistoryQuery>(() => ({
  limit: HISTORY_PAGE,
  game: gameFilter.value === 'all' ? undefined : gameFilter.value,
  period: period.value === 'all' ? undefined : period.value,
  outcome: outcome.value === 'all' ? undefined : outcome.value,
  q: historyName.value.trim() || undefined,
}))
const historyNext = ref<string | null>(null)
const historyBusy = ref(true)
const historyBox = useTemplateRef<HTMLElement>('historyBox')
const historyEnd = useTemplateRef<HTMLElement>('historyEnd')
// a newer request wins: a slow answer to the old filters must not land over the new ones
let historyAsk = 0
async function loadHistory(more = false) {
  const ask = ++historyAsk
  historyBusy.value = true
  try {
    const res = await $fetch<HistoryResponse>('/api/history', { query: { ...historyParams.value, cursor: more ? (historyNext.value ?? undefined) : undefined } })
    if (ask !== historyAsk) return
    history.value = more ? [...history.value, ...res.entries] : res.entries
    historyNext.value = res.nextCursor
    if (!more) historyBox.value?.scrollTo({ top: 0 })
  } catch {
    /* signed out meanwhile */
  } finally {
    if (ask === historyAsk) historyBusy.value = false
  }
}
watch(historyParams, () => loadHistory())
useIntersectionObserver(historyEnd, ([e]) => e?.isIntersecting && historyNext.value && !historyBusy.value && loadHistory(true), { root: historyBox, rootMargin: '240px' })

// --- Stats -------------------------------------------------------------------------
/** The player's numbers, a line each */
const statCards = computed(() => {
  const topX = stats.value?.topX ?? 0
  return [
    { key: 'cases', icon: 'cases', label: t('account.statCases'), value: String(stats.value?.cases ?? 0) },
    { key: 'ups', icon: 'upgrade', label: t('account.statUpgrades'), value: `${stats.value?.upgradesWon ?? 0} / ${stats.value?.upgrades ?? 0}` },
    { key: 'topx', icon: 'fire', label: t('account.statTopX'), value: topX ? `x${topX.toFixed(topX >= 10 ? 0 : 2)}` : '—', coin: true },
  ]
})

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
  <div class="kd-page kd-page-top gap-4 lg:gap-6">
    <UiPageBar
      class="lg:-mb-2"
      :title="$t('account.title')"
      :left="[
        { label: $t('case.allCases'), icon: 'arrow-left', to: '/' },
        ...(session.user ? [{ label: $t('account.settings'), icon: 'sliders', onClick: () => (settingsOpen = true) }] : []),
      ]"
      :right="session.user ? [{ label: $t('auth.logOut'), icon: 'logout', onClick: () => session.logout() }] : []"
    />
    <div v-if="!session.user" class="flex flex-col items-center gap-4 kd-panel px-6 py-16 text-center">
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
              <button type="button" class="kd-press kd-icon-nudge type-12 flex shrink-0 items-center gap-1 text-neutral-11 tabular-nums hover:text-neutral-15" :aria-label="$t('account.copyId')" @click="copyId">
                ID {{ session.user.id }}
                <UiIcon name="copy" :size="14" class="kd-icon" />
              </button>
            </div>
            <!-- this level, the way to the next one, the next one; what levels give is told on the Bonuses page -->
            <div class="flex max-w-72 items-center gap-2">
              <UiLevelBadge :level="session.user.level" />
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-5">
                <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
              </div>
              <span class="type-12-caps shrink-0 text-neutral-11 tabular-nums">{{ session.user.level + 1 }}</span>
            </div>
          </div>
        </div>
        <!-- Deposit looks the same everywhere: the main button -->
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

      <!-- The skins | the trade link and the player's numbers; the history full width below -->
      <!-- the two columns end on one line: the skins panel fills the row when it is the shorter one, the numbers' lines
           share a small difference the other way. Past the cap (all skins shown) the right column stays its own height,
           in view beside the list, so it never stretches into a hole -->
      <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
        <!-- My skins: the upgrade page's panel, tiles to pick; picked ones get the bar below -->
        <div class="flex min-w-0 flex-col kd-panel">
          <UiPanelHead icon="inventory" :title="`${$t('upgrade.mySkins')} (${inventory.length})`">
            <!-- Select all and the sort arrows: one height, side by side -->
            <UiButton v-if="inventory.length" variant="ghost" size="m" class="ml-auto" @click="selected.length ? (selected = []) : selectAll()">
              <UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" />
            </UiButton>
            <!-- nothing to sort with fewer than two skins -->
            <UiButton v-if="inventory.length > 1" variant="ghost" size="m" icon-only :aria-label="$t(invSort === 'priceDesc' ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="invSort = invSort === 'priceDesc' ? 'priceAsc' : 'priceDesc'">
              <UiSortArrows :desc="invSort === 'priceDesc'" />
            </UiButton>
          </UiPanelHead>
          <div v-if="loading" class="kd-item-grid">
            <span v-for="n in 15" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl max-sm:aspect-[4/5] lg:aspect-auto lg:h-[105px]" />
          </div>
          <template v-else-if="inventory.length">
            <div class="kd-item-grid">
              <ItemTile v-for="it in shownInventory" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
            </div>
            <UiButton v-if="sortedInventory.length > skinsCap" variant="ghost" size="s" :icon="showAllSkins ? 'chevron-up' : 'chevron-down'" class="mx-auto -mt-1 mb-3 lg:mb-4" @click="showAllSkins = !showAllSkins">
              {{ showAllSkins ? $t('account.skinsLess') : $t('account.skinsAll', { n: sortedInventory.length }) }}
            </UiButton>
          </template>
          <UiEmptyState v-else :text="$t('account.emptyInventory')" art="empty-inventory" class="m-3 lg:m-4">
            <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
          </UiEmptyState>
        </div>

        <!-- The right column: where withdrawals go, then the player's numbers -->
        <div class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:h-full lg:max-h-[500px] lg:gap-5 lg:self-start">
          <!-- the same panel as My skins: a header row over a hairline, then the field, where to find it, Save · Open in Steam -->
          <form class="flex flex-col kd-panel" @submit.prevent="saveTrade">
            <UiPanelHead icon="steam" :title="$t('withdraw.tradeLink')">
              <UiIcon v-if="session.user.tradeUrl && tradeValid" name="check-circle" :size="18" class="ml-auto text-success" />
            </UiPanelHead>
            <div class="flex flex-col gap-3 p-3 lg:px-6 lg:pb-6">
              <UiInput id="profile-trade" v-model="tradeLink" size="l" class="kd-private" inputmode="url" clearable :error="!!tradeLink && !tradeValid" :placeholder="$t('withdraw.linkPlaceholder')" />
              <span class="type-12-regular text-neutral-11">{{ $t('withdraw.whereLink') }}</span>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <UiButton type="submit" size="m" :loading="tradeSaving" :disabled="!tradeValid || tradeLink.trim() === session.user?.tradeUrl">{{ $t('common.save') }}</UiButton>
                <UiButton variant="secondary" size="m" icon="arrow-square-out" to="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url" target="_blank">{{ $t('withdraw.openSteam') }}</UiButton>
              </div>
            </div>
          </form>
          <!-- the player's numbers: a line each, what on the left, how much on the right, hairlines between -->
          <dl class="flex flex-col kd-panel px-4 py-2 lg:flex-1 lg:px-6">
            <div v-for="(s, i) in statCards" :key="s.key" class="flex min-h-14 flex-1 items-center gap-3" :class="i > 0 && 'border-t border-neutral-4'">
              <UiIcon :name="s.icon" :size="20" class="shrink-0 text-neutral-12" />
              <dt class="type-12-caps min-w-0 flex-1 truncate text-neutral-11">{{ s.label }}</dt>
              <dd class="type-20-caps tabular-nums" :class="s.coin && 'text-coin'">{{ s.value }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Game history, the full width: what the player did, newest first; a roll opens its check -->
      <section>
        <div ref="historyEl" class="flex min-w-0 scroll-mt-36 flex-col kd-panel">
          <!-- the title, then the filters: on one line on desktop, under it on phones -->
          <UiPanelHead icon="history" :title="$t('account.history')" class="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-5 max-lg:pt-5 max-lg:pb-3">
            <div class="grid grid-cols-2 gap-2 max-lg:w-full lg:ml-auto lg:flex">
              <UiInput v-model="historyQuery" icon="search" clearable inputmode="search" :placeholder="$t('account.historySearch')" class="lg:w-56" />
              <UiSelect v-model="period" :options="periodOptions" menu-width="fit" class="lg:w-36" :active="period !== 'all'" />
              <UiSelect v-model="outcome" :options="outcomeOptions" menu-width="fit" class="lg:w-32" :active="outcome !== 'all'" />
              <UiSelect v-model="gameFilter" :options="gameOptions" menu-width="fit" class="lg:w-36" :active="gameFilter !== 'all'" />
            </div>
          </UiPanelHead>
          <div v-if="!history.length && historyBusy" class="flex flex-col gap-2 p-3" aria-hidden="true">
            <span v-for="n in 6" :key="n" class="kd-skeleton h-[62px] rounded-xl" />
          </div>
          <UiEmptyState v-else-if="!history.length" :text="$t(`account.emptyHistory.${historyNarrowed ? 'narrowed' : gameFilter}`)" :art="historyNarrowed ? 'empty-search' : 'empty-history'" class="m-3">
            <UiButton v-if="historyNarrowed" variant="secondary" size="m" @click="clearHistoryFilters">{{ $t('account.clearFilters') }}</UiButton>
          </UiEmptyState>
          <!-- the table: game · drop · stake · payout · profit · time · check; a roll opens its check -->
          <!-- no top padding on desktop: the sticky headers stop at the panel's hairline, nothing shows over them -->
          <div v-else ref="historyBox" class="kd-history overflow-y-auto p-3 lg:pt-0" :class="historyBusy && !historyNext && 'is-busy'">
            <HistoryTable :entries="history" :link="(h) => (h.battleId ? `/pvp/${h.battleId}?check=1` : h.nonce ? `/fairness?roll=${h.id}` : undefined)" />
            <div ref="historyEnd" class="h-px" aria-hidden="true" />
            <span v-if="historyNext" class="kd-skeleton mt-2 block h-[62px] rounded-xl" aria-hidden="true" />
          </div>
        </div>
      </section>

      <!-- Selection bar: fixed to the screen's bottom edge (over the tab bar on phones) while skins are picked -->
      <Transition name="kd-bar">
        <div
          v-if="selected.length"
          class="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-[760px] grid-cols-2 items-center gap-2 rounded-4xl border border-neutral-5 bg-neutral-3 p-3 shadow-elevation-2 lg:bottom-6 lg:flex"
        >
          <span class="type-14 flex-1 max-lg:pl-1 lg:pl-4">{{ $t('account.selected', { count: selected.length }) }}</span>
          <UiButton variant="ghost" size="m" class="max-lg:justify-self-end" @click="selected = []">{{ $t('account.clear') }}</UiButton>
          <UiButton variant="secondary" size="m" icon="upgrade" :to="`/upgrade?item=${selected.slice(0, 6).join(',')}`">{{ $t('account.upgradeThem') }}</UiButton>
          <!-- skins leave one at a time: the button asks for that, as in the inventory window -->
          <UiButton variant="secondary" size="m" icon="steam" :disabled="!canWithdraw" @click="withdrawOpen = true"><UiTextSwap :text="canWithdraw ? $t('withdraw.short') : $t('withdraw.pickOne')" /></UiButton>
          <UiButton variant="light" size="m" class="max-lg:col-span-2" @click="sellOpen = true">
            {{ $t('account.sellSelected') }}
            <span class="btn-value"><UiPrice :amount="selectedValue" size="s" tone="inverse" /></span>
          </UiButton>
        </div>
      </Transition>
      <WalletWithdrawModal v-model="withdrawOpen" :item="selectedItems[0]" @done="onWithdrawn" />
      <WalletSellPreview v-model="sellOpen" :items="selectedItems" :loading="selling" @confirm="sellSelected" />

      <!-- Settings: the app's settings (sound, vibration…), in a modal from the page bar; the trade link has its card -->
      <UiModal v-model="settingsOpen" :title="$t('account.settings')" :width="560">
        <LayoutSettingsPanel />
      </UiModal>
    </template>
  </div>
</template>

<style scoped>
.kd-hrow.is-roll {
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-hrow-check {
  color: var(--color-neutral-10);
  transition:
    color var(--dur-base) var(--ease-out),
    background-color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-hrow.is-roll:hover {
    background: var(--color-neutral-3);
  }
  .kd-hrow.is-roll:hover .kd-hrow-check {
    color: var(--color-success);
    background: rgb(var(--success-rgb) / 0.12);
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
  transition: opacity var(--dur-base) var(--ease-out);
}
/* new filters: the old lines stay in place, dimmed, until the answer comes */
.kd-history.is-busy {
  opacity: 0.6;
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
