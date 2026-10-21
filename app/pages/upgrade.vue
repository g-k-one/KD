<script setup lang="ts">
import type { InventoryItem, InventoryResponse, Item, MarketResponse, Rarity, UpgradeResponse } from '#shared/types/api'
import type { UpgradePrefs } from '~/components/upgrade/SettingsModal.vue'

useHead({ title: 'Upgrade · KurwaDROP' })
const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

// --- Data -----------------------------------------------------------------
const { data: market } = await useFetch<MarketResponse>('/api/market', { key: 'market' })
const inventory = ref<InventoryItem[]>([])
// Client only: server-side $fetch would go out without the session cookie and get a 401
const inventoryLoading = ref(true)
async function loadInventory() {
  if (import.meta.server) return
  if (!session.user) {
    inventoryLoading.value = false
    return (inventory.value = [])
  }
  try {
    inventory.value = (await $fetch<InventoryResponse>('/api/inventory')).items
  } catch {
    inventory.value = []
    return
  } finally {
    inventoryLoading.value = false
  }
  // Arriving from a case result (?item=uid): that skin is already in the stake
  const fromCase = String(route.query.item ?? '')
  if (fromCase && inventory.value.some((i) => i.uid === fromCase) && !selected.value.includes(fromCase)) selected.value = [fromCase]
}
watch(() => session.user?.id, loadInventory, { immediate: true })

// --- Selection --------------------------------------------------------------
const selected = ref<string[]>([])
const extra = ref(0) // coin cents from balance
const target = ref<Item | null>(null)
const prefs = usePersisted<UpgradePrefs>('kd_upgrade', { multipliers: [2, 4, 8], chances: [35, 55, 75], fast: false })
const settingsOpen = ref(false)
const isLg = useMediaQuery('(min-width: 1024px)')
const panelTab = ref<'mine' | 'desired'>('mine')

const selectedItems = computed(() => inventory.value.filter((i) => selected.value.includes(i.uid)))
const inputValue = computed(() => selectedItems.value.reduce((a, i) => a + i.price, 0) + extra.value)
// Same formula as the backend: 5% house edge, capped at 95%
const chance = computed(() => (target.value ? Math.min(9500, Math.floor((inputValue.value / target.value.price) * 9500)) : 0))

function toggle(uid: string) {
  if (state.value === 'spinning') return
  resetResult()
  selected.value = selected.value.includes(uid) ? selected.value.filter((u) => u !== uid) : [...selected.value, uid]
}

const balance = computed(() => session.user?.balance ?? 0)
const extraInput = computed({
  get: () => (extra.value ? (extra.value / 100).toFixed(2) : ''),
  set: (v: string) => {
    const n = Math.round(Number.parseFloat(v.replace(',', '.')) * 100)
    extra.value = Number.isFinite(n) ? Math.min(Math.max(0, n), balance.value) : 0
  },
})

const FRACTIONS = [
  { label: '1/10', value: 0.1, pct: 10, tone: 'success' },
  { label: '1/5', value: 0.2, pct: 20, tone: 'warning' },
  { label: '1/3', value: 1 / 3, pct: 33, tone: 'danger' },
] as const
// The last fraction preset stays highlighted until the stake is changed by hand
const activeFraction = ref<string | null>(null)
function addFraction(f: number, label: string) {
  resetResult()
  extra.value = Math.floor(balance.value * f)
  activeFraction.value = label
}
watch(extra, (v) => {
  const f = FRACTIONS.find((x) => x.label === activeFraction.value)
  if (f && v !== Math.floor(balance.value * f.value)) activeFraction.value = null
})
function allSkins() {
  resetResult()
  selected.value = inventory.value.map((i) => i.uid)
}
function allBalance() {
  resetResult()
  extra.value = balance.value
}
/** Adds just enough balance for the maximum 95% chance (or all balance if that is not enough). */
function maxChance() {
  if (!target.value) return toast.show(t('upgrade.chooseTarget'))
  resetResult()
  const skins = selectedItems.value.reduce((a, i) => a + i.price, 0)
  extra.value = Math.min(balance.value, Math.max(0, target.value.price - skins))
}

/** Picks the market item closest to a value (used by ×N and N% presets). */
function pickTarget(value: number) {
  const items = (market.value?.items ?? []).filter((i) => i.price > inputValue.value)
  if (!items.length) return
  target.value = items.reduce((best, i) => (Math.abs(i.price - value) < Math.abs(best.price - value) ? i : best))
  resetResult()
}
const byMultiplier = (m: number) => inputValue.value > 0 && pickTarget(inputValue.value * m)
const byChance = (c: number) => inputValue.value > 0 && pickTarget((inputValue.value * 9500) / (c * 100))

// --- Market filters -----------------------------------------------------------
const search = ref('')
const searchOpen = ref(false)
const priceFrom = ref('')
const priceTo = ref('')
const rarities = ref<Rarity[]>([])
const sortDesc = ref(true)
const invSortDesc = ref(true)
const page = ref(0)
const PAGE = 15

const filteredMarket = computed(() => {
  const from = Number.parseFloat(priceFrom.value) * 100 || 0
  const to = Number.parseFloat(priceTo.value) * 100 || Number.POSITIVE_INFINITY
  const q = search.value.trim().toLowerCase()
  return (market.value?.items ?? [])
    .filter((i) => i.price >= from && i.price <= to)
    .filter((i) => !rarities.value.length || rarities.value.includes(i.rarity))
    .filter((i) => !q || `${i.weapon} ${i.skin}`.toLowerCase().includes(q))
    .sort((a, b) => (sortDesc.value ? b.price - a.price : a.price - b.price))
})
const pages = computed(() => Math.max(1, Math.ceil(filteredMarket.value.length / PAGE)))
const marketPage = computed(() => filteredMarket.value.slice(page.value * PAGE, page.value * PAGE + PAGE))
watch([search, priceFrom, priceTo, rarities, sortDesc], () => (page.value = 0))

const sortedInventory = computed(() => [...inventory.value].sort((a, b) => (invSortDesc.value ? b.price - a.price : a.price - b.price)))
const inventorySlots = computed(() => Math.max(15, Math.ceil(sortedInventory.value.length / 5) * 5))
const inventoryTotal = computed(() => inventory.value.reduce((a, i) => a + i.price, 0))

const rarityOptions = computed(() => RARITIES.map((r) => ({ value: r, label: r, swatch: RARITY_COLOR[r] })))

// --- Spin -----------------------------------------------------------------------
const state = ref<'idle' | 'spinning' | 'win' | 'lose'>('idle')
// While a result is on screen the dial keeps the chance that was played, not the cleared selection
const playedChance = ref(0)
const shownChance = computed(() => (state.value === 'win' || state.value === 'lose' ? playedChance.value : chance.value))
const gauge = useTemplateRef<{ spin: (roll: number, fast: boolean) => Promise<void>; reset: () => void }>('gauge')
const sfx = useSfx()

function resetResult() {
  if (state.value === 'win' || state.value === 'lose') {
    state.value = 'idle'
    gauge.value?.reset()
  }
}

async function runUpgrade() {
  if (!session.user) return ui.openSignIn()
  if (!target.value) return toast.show(t('upgrade.chooseTarget'))
  if (chance.value < 100) return toast.show(t('upgrade.chanceTooLow'), 'danger')
  state.value = 'spinning'
  playedChance.value = chance.value
  try {
    const res = await $fetch<UpgradeResponse>('/api/upgrade', {
      method: 'POST',
      body: { itemUids: selected.value, balanceAmount: extra.value, targetItemId: target.value.id },
    })
    session.user.balance = res.balance
    await gauge.value?.spin(res.roll, prefs.value.fast)
    state.value = res.win ? 'win' : 'lose'
    if (res.win) sfx.reveal(Math.max(2, RARITY_TIER[target.value?.rarity ?? 'covert']))
    else sfx.lose()
    toast.show(
      `${res.win ? t('upgrade.win') : t('upgrade.lose')} · ${t('upgrade.rolled', { roll: res.roll.toFixed(2), chance: (res.chance / 100).toFixed(2) })}`,
      res.win ? 'success' : 'danger',
    )
    // Let the result breathe before the stake empties out
    await new Promise((r) => setTimeout(r, prefs.value.fast ? 500 : 1100))
    selected.value = []
    extra.value = 0
    await loadInventory()
  } catch (e) {
    state.value = 'idle'
    toast.error(e, t('common.error'))
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <UiPageBar
      logo
      :left="[{ label: $t('upgrade.history'), icon: 'history', to: '/history' }]"
      :right="[
        { label: $t('upgrade.howItWorks'), icon: 'info', to: '/fairness' },
        { label: $t('upgrade.fairness'), icon: 'shield', to: '/fairness' },
      ]"
    />

    <!-- Stake · Gauge · Target -->
    <section class="grid items-center gap-4 lg:grid-cols-[400px_1fr_400px]">
      <UpgradeStake
        v-model:extra="extraInput"
        :items="selectedItems"
        :coins="extra"
        :total="inputValue"
        :state="state"
        :disabled="state === 'spinning' || !session.user"
        @remove="toggle"
        @clear-coins="(extra = 0), resetResult()"
      />

      <div class="flex justify-center px-6 lg:px-0">
        <UpgradeGauge ref="gauge" :chance="shownChance" :state="state" />
      </div>

      <UpgradeTarget :item="target" :state="state" @clear="(target = null), resetResult()" />
    </section>

    <!-- Controls -->
    <section class="kd-dimmable grid gap-3 lg:min-h-15 lg:grid-cols-[400px_1fr_400px] lg:items-center lg:gap-4" :class="state === 'spinning' && 'is-dimmed'">
      <div class="grid grid-cols-3 gap-1 lg:flex">
        <UiTooltip v-for="f in FRACTIONS" :key="f.label" :text="$t('upgrade.tipFraction', { pct: f.pct })" class="lg:flex-1">
          <UiChip size="l" :tone="f.tone" class="w-full" :active="activeFraction === f.label" @click="addFraction(f.value, f.label)">{{ f.label }}</UiChip>
        </UiTooltip>
        <UiTooltip :text="$t('upgrade.tipAllSkins')">
          <UiChip size="l" class="type-12-caps w-full !leading-4 lg:w-auto" @click="allSkins">
            <span class="whitespace-normal" v-html="$t('upgrade.allSkins').replace(' ', '<br>')" />
          </UiChip>
        </UiTooltip>
        <UiTooltip :text="$t('upgrade.tipAllBalance')">
          <UiChip size="l" class="type-12-caps w-full !leading-4 lg:w-auto" @click="allBalance">
            <span class="whitespace-normal" v-html="$t('upgrade.allBalance').replace(' ', '<br>')" />
          </UiChip>
        </UiTooltip>
        <UiTooltip :text="$t('upgrade.tipMax')">
          <UiChip size="l" class="w-full lg:w-auto" @click="maxChance">{{ $t('upgrade.max') }}</UiChip>
        </UiTooltip>
      </div>
      <UiButton size="l" icon="upgrade" class="order-first lg:order-none lg:mx-auto lg:w-60" :loading="state === 'spinning'" @click="runUpgrade">
        {{ selectedItems.length || extra ? $t('upgrade.upgrade') : $t('upgrade.addToUpgrade') }}
      </UiButton>
      <div class="grid grid-cols-7 items-center gap-1 lg:flex lg:justify-end">
        <UiChip v-for="m in prefs.multipliers" :key="`m${m}`" size="l" class="!px-1 lg:flex-1 lg:!px-3" @click="byMultiplier(m)">×{{ m }}</UiChip>
        <UiChip
          v-for="(c, i) in prefs.chances"
          :key="`c${c}`"
          size="l"
          class="!px-1 lg:flex-1 lg:!px-3"
          :tone="(['danger', 'warning', 'success'] as const)[i]"
          :active="!!target && Math.abs(chance / 100 - c) < 1"
          @click="byChance(c)"
        >
          {{ c }}%
        </UiChip>
        <UiButton variant="ghost" size="l" icon="sliders" icon-only :aria-label="$t('upgrade.settings')" @click="settingsOpen = true" />
      </div>
    </section>

    <!-- Panels: side by side on desktop, switchable tabs on mobile -->
    <UiTabs
      v-model="panelTab"
      class="lg:hidden"
      :tabs="[
        { value: 'mine', label: $t('upgrade.tabMySkins'), count: inventory.length },
        { value: 'desired', label: $t('upgrade.tabDesired') },
      ]"
    />
    <section class="kd-dimmable -mt-2 grid gap-4 lg:mt-0 lg:grid-cols-2 lg:gap-5" :class="state === 'spinning' && 'is-dimmed'">
      <div class="flex flex-col rounded-5xl bg-neutral-2 lg:pb-4" :class="panelTab !== 'mine' && 'max-lg:hidden'">
        <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <UiIcon name="inventory" :size="isLg ? 24 : 20" class="text-neutral-13" />
          <span class="type-14 lg:type-16-medium">{{ $t('upgrade.mySkins') }} ({{ inventory.length }})</span>
          <UiPrice :amount="inventoryTotal" :size="isLg ? 'm' : 's'" tone="coin" class="opacity-64" />
          <button type="button" class="kd-press ml-auto grid size-8 place-items-center rounded-md lg:size-10 text-neutral-11 hover:text-neutral-15" @click="invSortDesc = !invSortDesc">
            <UiIcon name="sort" :size="18" />
          </button>
        </div>
        <div v-if="session.user && inventoryLoading" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
          <span v-for="n in 15" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl lg:aspect-auto lg:h-[105px]" :style="{ animationDelay: `${n * 40}ms` }" />
        </div>
        <div v-else-if="session.user" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
          <template v-for="n in inventorySlots" :key="n">
            <ItemTile
              :item="sortedInventory[n - 1]"
              :selected="!!sortedInventory[n - 1] && selected.includes(sortedInventory[n - 1]!.uid)"
              :disabled="state === 'spinning'"
              @toggle="toggle(sortedInventory[n - 1]!.uid)"
            />
          </template>
        </div>
        <div v-else class="flex flex-1 flex-col items-center justify-center gap-4 p-10">
          <span class="type-14-regular text-neutral-12">{{ $t('auth.required') }}</span>
          <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
        </div>
        <NuxtLink to="/" class="kd-press type-12-caps mt-auto flex h-12 items-center lg:h-10 justify-center gap-2 text-neutral-12 hover:text-neutral-15">
          <UiIcon name="cases" :size="16" />
          {{ $t('upgrade.openCases') }}
        </NuxtLink>
      </div>

      <div class="flex flex-col rounded-5xl bg-neutral-2 lg:pb-4" :class="panelTab !== 'desired' && 'max-lg:hidden'">
        <div class="flex h-14 items-center gap-2 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <UiIcon name="diamond" :size="isLg ? 24 : 20" class="text-neutral-13 lg:mr-1" />
          <span class="type-14 lg:type-16-medium mr-1 whitespace-nowrap">{{ $t('upgrade.desiredSkin') }}</span>
          <button type="button" class="kd-press grid size-8 shrink-0 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 lg:size-10" @click="sortDesc = !sortDesc">
            <UiIcon name="sort" :size="18" />
          </button>
          <Transition name="kd-search" mode="out-in">
            <label v-if="searchOpen" key="s" class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-neutral-4 bg-neutral-1 px-3 focus-within:border-brand-base">
              <UiIcon name="search" :size="16" class="text-neutral-11" />
              <input id="market-search" v-model="search" :placeholder="$t('upgrade.search')" class="type-14 w-full min-w-0 bg-transparent outline-none" @keydown.esc="searchOpen = false" />
            </label>
            <div v-else key="f" class="flex min-w-0 flex-1 items-center gap-2">
              <label class="hidden h-9 w-24 items-center gap-1.5 rounded-lg bg-neutral-1 px-2 sm:flex lg:h-10">
                <UiCoin :size="14" />
                <input id="price-from" v-model="priceFrom" inputmode="decimal" :placeholder="$t('upgrade.from')" class="type-12 w-full min-w-0 bg-transparent outline-none" />
              </label>
              <label class="hidden h-9 w-24 items-center gap-1.5 rounded-lg bg-neutral-1 px-2 sm:flex lg:h-10">
                <UiCoin :size="14" />
                <input id="price-to" v-model="priceTo" inputmode="decimal" :placeholder="$t('upgrade.to')" class="type-12 w-full min-w-0 bg-transparent outline-none" />
              </label>
              <UiSelect v-model:values="rarities" multiple :options="rarityOptions" class="kd-rarity-select w-20" menu-width="fixed">
                <template #leading>
                  <span class="grid grid-cols-3 gap-0.5">
                    <span v-for="r in RARITIES" :key="r" class="size-1.5 rounded-full" :style="{ background: RARITY_COLOR[r] }" />
                  </span>
                </template>
              </UiSelect>
            </div>
          </Transition>
          <button type="button" class="kd-press grid size-8 shrink-0 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 lg:size-10" @click="searchOpen = !searchOpen">
            <UiIcon :name="searchOpen ? 'close' : 'search'" :size="18" />
          </button>
        </div>
        <TransitionGroup tag="div" name="kd-grid" class="relative grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
          <ItemTile
            v-for="it in marketPage"
            :key="it.id"
            :item="it"
            :selected="target?.id === it.id"
            @toggle="(target = target?.id === it.id ? null : it), resetResult()"
          />
        </TransitionGroup>
        <div class="mt-auto flex h-12 items-center justify-center gap-4 lg:h-10">
          <button type="button" class="kd-press grid size-8 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 disabled:opacity-30" :disabled="page === 0" @click="page--">
            <UiIcon name="chevron-left" :size="18" />
          </button>
          <span class="type-12 text-neutral-11 tabular-nums">{{ page + 1 }} / {{ pages }}</span>
          <button type="button" class="kd-press grid size-8 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 disabled:opacity-30" :disabled="page >= pages - 1" @click="page++">
            <UiIcon name="chevron-right" :size="18" />
          </button>
        </div>
      </div>
    </section>

    <UpgradeSettingsModal v-model="settingsOpen" v-model:prefs="prefs" />
  </div>
</template>

<style scoped>
/* While the pointer turns everything but the dial steps back */
.kd-dimmable {
  transition: opacity var(--dur-slow) var(--ease-out), filter var(--dur-slow) var(--ease-out);
}
.kd-dimmable.is-dimmed {
  opacity: 0.35;
  filter: saturate(0.6);
  pointer-events: none;
}
.kd-grid-enter-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-grid-enter-from {
  opacity: 0;
}
.kd-search-enter-active,
.kd-search-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}
.kd-search-enter-from,
.kd-search-leave-to {
  opacity: 0;
  transform: translateX(6px);
}
:deep(.kd-rarity-select button[aria-haspopup] .type-14) {
  display: none;
}
</style>
