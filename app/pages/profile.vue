<script setup lang="ts">
// Imported, not resolveComponent(): the static artifact build left that as a literal <nuxtlink> tag
import { NuxtLink } from '#components'
import type { HistoryEntry, HistoryGame, HistoryResponse, InventoryItem, InventoryResponse, SellResponse } from '#shared/types/api'

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
// Two rows of skins, the rest behind "Show all": with a big inventory the history would sit far down the page
const isSm = useMediaQuery('(min-width: 40rem)')
const skinsCap = computed(() => (isSm.value ? 10 : 6))
const showAllSkins = ref(false)
const shownInventory = computed(() => (showAllSkins.value ? sortedInventory.value : sortedInventory.value.slice(0, skinsCap.value)))
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
// short, so a phone row never cuts it: "12m ago" within a day, then the date alone
const when = (iso: string) =>
  Date.now() - Date.parse(iso) < 86_400_000 ? timeAgo(iso) : new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
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
      :right="session.user ? [{ label: $t('auth.logOut'), icon: 'logout', onClick: () => session.logout() }] : []"
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
            <!-- the bar and where it leads; what levels give is told on the Bonuses page -->
            <div class="flex max-w-72 items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-5">
                <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
              </div>
              <span class="type-12-caps shrink-0 text-neutral-12 tabular-nums">{{ $t('account.levelNext', { n: session.user.level + 1 }) }}</span>
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
      <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-5">
        <!-- My skins: the upgrade page's panel, tiles to pick; picked ones get the bar below -->
        <div class="flex min-w-0 flex-col rounded-5xl bg-neutral-2 lg:pb-4">
          <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
            <UiIcon name="inventory" :size="24" class="text-neutral-13" />
            <span class="type-14 lg:type-16-medium">{{ $t('upgrade.mySkins') }} ({{ inventory.length }})</span>
            <!-- Select all and the sort arrows: one height, side by side -->
            <UiButton v-if="inventory.length" variant="ghost" size="m" class="ml-auto" @click="selected.length ? (selected = []) : selectAll()">
              <UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" />
            </UiButton>
            <!-- nothing to sort with fewer than two skins -->
            <UiButton v-if="inventory.length > 1" variant="ghost" size="m" icon-only :aria-label="$t(invSort === 'priceDesc' ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="invSort = invSort === 'priceDesc' ? 'priceAsc' : 'priceDesc'">
              <UiSortArrows :desc="invSort === 'priceDesc'" />
            </UiButton>
          </div>
          <div v-if="loading" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
            <span v-for="n in 15" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl lg:aspect-auto lg:h-[105px]" />
          </div>
          <template v-else-if="inventory.length">
            <div class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
              <ItemTile v-for="it in shownInventory" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
            </div>
            <UiButton v-if="sortedInventory.length > skinsCap" variant="ghost" size="s" :icon="showAllSkins ? 'chevron-up' : 'chevron-down'" class="mx-auto -mt-1 mb-2" @click="showAllSkins = !showAllSkins">
              {{ showAllSkins ? $t('account.skinsLess') : $t('account.skinsAll', { n: sortedInventory.length }) }}
            </UiButton>
            <p v-if="!selected.length" class="type-12-regular px-4 pb-3 text-neutral-11 lg:px-6 lg:pb-0">{{ $t('account.pickHint') }}</p>
          </template>
          <UiEmptyState v-else :text="$t('account.emptyInventory')" class="m-3 lg:m-4">
            <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
          </UiEmptyState>
        </div>

        <!-- The right column: where withdrawals go, then the player's numbers -->
        <div class="flex min-w-0 flex-col gap-4 lg:gap-5">
          <form class="flex flex-col gap-3 rounded-5xl bg-neutral-2 p-4 lg:p-6" @submit.prevent="saveTrade">
            <div class="flex items-center gap-3">
              <UiIcon name="steam" :size="24" class="text-neutral-13" />
              <span class="type-14 lg:type-16-medium">{{ $t('withdraw.tradeLink') }}</span>
              <UiIcon v-if="session.user.tradeUrl && tradeValid" name="check-circle" :size="18" class="ml-auto text-success" />
            </div>
            <UiInput id="profile-trade" v-model="tradeLink" size="l" icon="steam" inputmode="url" clearable :error="!!tradeLink && !tradeValid" placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…" />
            <span class="type-12-regular text-neutral-11">
              {{ $t('withdraw.whereLink') }}
              <a href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url" target="_blank" rel="noopener" class="text-brand-light hover:underline">{{ $t('withdraw.openSteam') }}</a>
            </span>
            <UiButton type="submit" size="m" class="self-start" :loading="tradeSaving" :disabled="!tradeValid || tradeLink.trim() === session.user?.tradeUrl">{{ $t('common.save') }}</UiButton>
          </form>
          <dl class="grid grid-cols-3 gap-2 rounded-5xl bg-neutral-2 p-3 lg:p-4">
            <div v-for="s in statCards.slice(1, 4)" :key="s.key" class="flex min-w-0 flex-col gap-1 rounded-2xl bg-neutral-3 px-3 py-2.5">
              <dt class="type-10-caps leading-tight text-neutral-11">{{ s.label }}</dt>
              <dd class="type-14 tabular-nums" :class="s.coin && 'text-coin'">
                <UiPrice v-if="s.price != null" :amount="s.price" size="s" tone="coin" />
                <template v-else>{{ s.value }}</template>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Game history, the full width: what the player did, newest first; a roll opens its check -->
      <section>
        <div ref="historyEl" class="flex min-w-0 scroll-mt-36 flex-col rounded-5xl bg-neutral-2 lg:pb-4">
          <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
            <UiIcon name="history" :size="24" class="text-neutral-13" />
            <span class="type-14 lg:type-16-medium">{{ $t('account.history') }}</span>
            <UiSelect v-model="gameFilter" :options="gameOptions" menu-width="fixed" class="ml-auto w-36 lg:w-40" :active="gameFilter !== 'all'" />
          </div>
          <UiEmptyState v-if="!filteredHistory.length" :text="$t('account.emptyHistory')" class="m-3 mt-0 lg:m-4 lg:mt-0" />
          <ul v-else class="kd-history flex flex-col gap-1 overflow-y-auto px-3 pt-3 pb-3 lg:px-4 lg:pb-0">
            <li v-for="h in filteredHistory" :key="h.id">
              <!-- a roll (case, upgrade) is a link to its check on the Provably Fair page -->
              <component
                :is="h.nonce ? NuxtLink : 'div'"
                :to="h.nonce ? `/fairness?roll=${h.id}` : undefined"
                class="kd-hrow grid grid-cols-[40px_minmax(0,1fr)_44px_76px_24px] items-center gap-2.5 rounded-2xl px-1.5 py-2 lg:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_160px_32px] lg:gap-4 lg:px-3 lg:py-3"
                :class="h.nonce && 'kd-press is-roll'"
              >
                <!-- what it was: the case itself, else the game's sign -->
                <span class="grid size-10 place-items-center rounded-xl bg-neutral-3 text-neutral-13 lg:size-12">
                  <img v-if="h.caseImage" :src="h.caseImage" alt="" class="size-9 object-contain lg:size-10" loading="lazy" />
                  <UiIcon v-else :name="GAME_ICON[h.game]" :size="18" />
                </span>
                <span class="flex min-w-0 flex-col gap-0.5 lg:gap-1">
                  <!-- phones: the name on top, the game and the time under it; desktop: game · name, then time · stake · × -->
                  <span class="type-14 truncate"><span class="max-lg:hidden">{{ $t(`account.games.${h.game}`) }} · </span><span class="lg:text-neutral-12">{{ h.title }}</span></span>
                  <span class="type-12-regular truncate text-neutral-11">
                    <span class="lg:hidden">{{ $t(`account.games.${h.game}`) }} · </span>{{ when(h.at) }}<span v-if="h.bet" class="max-lg:hidden"> · {{ $t('account.stakeOf', { amount: formatCoins(h.bet) }) }} · {{ mult(h) }}</span>
                  </span>
                </span>
                <!-- what went in and what came out (shared with the Provably Fair page's rolls) -->
                <HistoryItems :entry="h" />
                <!-- one amount: what came out (green when it beat the stake) -->
                <UiPrice :amount="h.payout" :tone="h.status === 'lost' ? 'muted' : 'success'" class="justify-self-end" />
                <!-- the check, its own quiet column so every row lines up -->
                <span class="kd-hrow-check grid size-7 place-items-center justify-self-end rounded-lg lg:size-8" :aria-label="h.nonce ? $t('fair.check') : undefined">
                  <UiIcon v-if="h.nonce" name="shield-check" :size="18" />
                </span>
              </component>
            </li>
          </ul>
        </div>
      </section>

      <!-- Selection bar: fixed to the screen's bottom edge (over the tab bar on phones) while skins are picked -->
      <Transition name="kd-bar">
        <div
          v-if="selected.length"
          class="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[760px] flex-wrap items-center gap-2 rounded-3xl border border-neutral-5 bg-neutral-3 p-3 shadow-elevation-2 lg:bottom-6"
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
    background: rgb(18 183 106 / 0.12);
  }
}
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
