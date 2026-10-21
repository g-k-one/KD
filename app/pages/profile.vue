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
const sortedInventory = computed(() => [...inventory.value].sort((a, b) => b.price - a.price))
function toggle(uid: string) {
  selected.value = selected.value.includes(uid) ? selected.value.filter((u) => u !== uid) : [...selected.value, uid]
}
const selling = ref(false)
async function sellSelected() {
  selling.value = true
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids: selected.value } })
    if (session.user) session.user.balance = res.balance
    toast.show(`${t('wallet.sold')} · ${formatCoins(selectedValue.value)}`, 'success')
    selected.value = []
    await load()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    selling.value = false
  }
}

// --- History -----------------------------------------------------------------
const gameFilter = ref<HistoryGame | 'all'>('all')
const filteredHistory = computed(() => history.value.filter((h) => gameFilter.value === 'all' || h.game === gameFilter.value))
const GAME_ICON: Record<HistoryGame, string> = { case: 'cases', upgrade: 'upgrade', deposit: 'plus', sell: 'wallet' }
const when = (iso: string) =>
  new Date(iso).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const mult = (h: HistoryEntry) => (h.bet > 0 ? `${(h.payout / h.bet).toFixed(2)}x` : '—')

const maskedSteamId = computed(() => (session.user ? `${session.user.steamId.slice(0, 4)}…${session.user.steamId.slice(-4)}` : ''))
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl border border-neutral-4 bg-neutral-2 px-6 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('account.signInHint') }}</p>
      <UiButton icon="sign-in" size="l" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <template v-else>
      <!-- Profile summary -->
      <section class="flex flex-col gap-4 rounded-5xl border border-neutral-4 bg-neutral-2 p-4 md:flex-row md:items-center md:gap-6 md:p-6">
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
        <div class="grid grid-cols-2 gap-2 md:flex md:gap-3">
          <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 px-4 py-3">
            <span class="type-12-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
            <UiPrice :amount="session.user.balance" size="l" />
          </div>
          <div class="flex flex-col gap-1 rounded-2xl bg-neutral-3 px-4 py-3">
            <span class="type-12-caps text-neutral-11">{{ $t('account.skinsValue') }}</span>
            <UiPrice :amount="session.user.skinsValue" size="l" tone="coin" />
          </div>
          <UiButton size="l" icon="plus" to="/deposit" class="col-span-2 md:col-auto md:self-center">{{ $t('wallet.deposit') }}</UiButton>
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
          <div v-if="loading" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <span v-for="n in 12" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl" />
          </div>
          <div v-else-if="inventory.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <ItemTile v-for="it in sortedInventory" :key="it.uid" :item="it" :selected="selected.includes(it.uid)" @toggle="toggle(it.uid)" />
          </div>
          <div v-else class="flex flex-col items-center gap-4 rounded-5xl border border-dashed border-neutral-7 px-6 py-16 text-center">
            <UiIcon name="pistol" :size="48" class="text-neutral-8" />
            <p class="type-14-regular max-w-72 text-neutral-12">{{ $t('account.emptyInventory') }}</p>
            <UiButton to="/" icon="cases">{{ $t('account.openCases') }}</UiButton>
          </div>

          <!-- Selection bar floats above the bottom nav on mobile -->
          <Transition name="kd-bar">
            <div
              v-if="selected.length"
              class="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 rounded-3xl border border-neutral-5 bg-neutral-3/95 p-3 shadow-elevation-2 backdrop-blur lg:bottom-6"
            >
              <span class="type-14 flex-1">{{ $t('account.selected', { count: selected.length }) }}</span>
              <UiButton variant="ghost" size="s" @click="selected = []">{{ $t('account.clear') }}</UiButton>
              <UiButton variant="secondary" size="m" icon="upgrade" to="/upgrade">{{ $t('account.upgradeThem') }}</UiButton>
              <UiButton variant="light" size="m" :loading="selling" @click="sellSelected">
                {{ $t('account.sellSelected') }}
                <UiPrice :amount="selectedValue" size="s" tone="inverse" />
              </UiButton>
            </div>
          </Transition>
        </section>

        <!-- History -->
        <section v-else-if="tab === 'history'" class="flex min-w-0 flex-col gap-4">
          <div class="scrollbar-none flex gap-1 overflow-x-auto">
            <UiChip :active="gameFilter === 'all'" @click="gameFilter = 'all'">{{ $t('account.allGames') }}</UiChip>
            <UiChip v-for="g in (['case', 'upgrade', 'deposit', 'sell'] as const)" :key="g" :active="gameFilter === g" @click="gameFilter = g">
              {{ $t(`account.games.${g}`) }}
            </UiChip>
          </div>

          <p v-if="!filteredHistory.length" class="type-14-regular rounded-3xl border border-neutral-4 px-6 py-12 text-center text-neutral-12">{{ $t('account.emptyHistory') }}</p>

          <!-- Desktop table -->
          <div v-else class="hidden overflow-hidden rounded-3xl border border-neutral-4 bg-neutral-2 md:block">
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
        <section v-else class="max-w-lg rounded-5xl border border-neutral-4 bg-neutral-2 p-4 lg:p-6">
          <LayoutSettingsPanel />
        </section>
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
