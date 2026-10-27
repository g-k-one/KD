<script setup lang="ts">
import { targetPriceFor, upgradeChanceBp, upgradeKeep } from '#shared/upgrade'
import type { ForgeHandle } from '~/composables/useForge'
import type { CasesResponse, InventoryItem, InventoryResponse, Item, MarketResponse, Rarity, UpgradeResponse } from '#shared/types/api'

useHead({ title: 'Upgrade · KurwaDROP' })
const { t } = useI18n()
const route = useRoute()
// Came from a case (its drop → Upgrade): the page bar leads back to that case
const { data: casesList } = useFetch<CasesResponse>('/api/cases', { key: 'cases', lazy: true, server: false })
const backCase = computed(() => {
  const slug = typeof route.query.from === 'string' ? route.query.from : ''
  if (!slug) return null
  const c = (casesList.value?.sections ?? []).flatMap((s) => s.cases).find((x) => x.slug === slug)
  return { slug, name: c?.name }
})
const barLeft = computed(() => [
  // the same bar as PvP's: back (to the case it came from, else all cases) and its own history
  backCase.value ? { label: backCase.value.name ?? t('upgrade.backToCase'), icon: 'arrow-left', to: `/case/${backCase.value.slug}` } : { label: t('case.allCases'), icon: 'arrow-left', to: '/' },
  { label: t('upgrade.history'), icon: 'history', to: '/profile?tab=history&game=upgrade' },
])
// the right side: what an upgrade is (a modal, in four steps), then the fairness page
const howOpen = ref(false)
const barRight = computed(() => [
  { label: t('upgrade.howItWorks'), icon: 'info', onClick: () => (howOpen.value = true) },
  { label: t('case.fairness'), icon: 'shield', to: '/fairness' },
])
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
  // Arriving from a case result (?item=uid,uid&target=id): those skins are already in the stake
  const fromCase = String(route.query.item ?? '').split(',').filter((uid) => inventory.value.some((i) => i.uid === uid))
  if (fromCase.length && !selected.value.length) selected.value = fromCase
  const wanted = market.value?.items.find((i) => i.id === route.query.target)
  if (wanted && !target.value) target.value = wanted
}
watch(() => session.user?.id, loadInventory, { immediate: true })

// --- Selection --------------------------------------------------------------
const selected = ref<string[]>([])
const extra = ref(0) // coin cents from balance
const target = ref<Item | null>(null)
const prefs = usePersisted('kd_upgrade', { fast: false })
/** Nonce of the last roll, for the dial's "Verify roll" */
const lastNonce = ref<number | null>(null)
const fast = computed({ get: () => !!prefs.value.fast, set: (v: boolean) => (prefs.value = { ...prefs.value, fast: v }) })
const isLg = useMediaQuery('(min-width: 1024px)')
const panelTab = ref<'mine' | 'desired'>('mine')

const selectedItems = computed(() => inventory.value.filter((i) => selected.value.includes(i.uid)))
const inputValue = computed(() => selectedItems.value.reduce((a, i) => a + i.price, 0) + extra.value)
// Same formula and numbers as the backend (shared/upgrade.ts, the admin's rules): 5% house edge, capped at 80%
const rules = useGameRules()
const howSteps = computed(() => {
  const r = rules.value.upgrade
  return [
    { icon: 'plus', title: t('upgrade.how1t'), text: t('upgrade.how1') },
    { icon: 'target-up', title: t('upgrade.how2t'), text: t('upgrade.how2') },
    { icon: 'upgrade', title: t('upgrade.how3t'), text: t('upgrade.how3', { keep: 100 - r.edgeBp / 100, max: r.maxChanceBp / 100 }) },
    { icon: 'shield-check', title: t('upgrade.how4t'), text: t('upgrade.how4') },
  ]
})
const chance = computed(() => (target.value ? upgradeChanceBp(inputValue.value, target.value.price, rules.value.upgrade) : 0))

/** An upgrade takes at most 6 pieces (an admin setting); balance coins count as one */
const MAX_PIECES = computed(() => rules.value.upgrade.maxItems)
const skinSlots = computed(() => MAX_PIECES.value - (extra.value > 0 ? 1 : 0))
function toggle(uid: string) {
  if (state.value === 'spinning') return
  resetResult()
  if (selected.value.includes(uid)) return sfx.deselect(), (selected.value = selected.value.filter((u) => u !== uid))
  if (selected.value.length >= skinSlots.value) return sfx.denied(), toast.show(t('upgrade.maxPieces', { n: MAX_PIECES.value }))
  selected.value = [...selected.value, uid]
  sfx.select(selected.value.length)
}

const balance = computed(() => session.user?.balance ?? 0)
function allSkins() {
  resetResult()
  // the most valuable skins that fit
  selected.value = [...inventory.value].sort((a, b) => b.price - a.price).slice(0, skinSlots.value).map((i) => i.uid)
  if (selected.value.length) sfx.select(selected.value.length)
}
function clearSkins() {
  resetResult()
  if (selected.value.length) sfx.deselect()
  selected.value = []
}
// The controls change the balance part through this, so a new stake clears the last result
// the same coins as a typed amount, for the phone sheet's header (skins and coins picked in one place)
const extraText = computed({
  get: () => (extraModel.value ? (extraModel.value / 100).toFixed(2) : ''),
  set: (v: string) => {
    const n = Math.round(Number.parseFloat(v.replace(',', '.')) * 100)
    extraModel.value = Number.isFinite(n) ? Math.min(Math.max(0, n), balance.value) : 0
  },
})
const extraModel = computed({
  get: () => extra.value,
  set: (v: number) => {
    resetResult()
    // coins need a free slot
    if (v > 0 && !extra.value && selected.value.length >= MAX_PIECES.value) return sfx.denied(), toast.show(t('upgrade.maxPieces', { n: MAX_PIECES.value }))
    extra.value = v
  },
})

/** Picks the market item closest to a value (the chance bar and the × / % fields aim through this). */
function pickTarget(value: number) {
  const items = (market.value?.items ?? []).filter((i) => i.price > inputValue.value)
  if (!items.length) return
  target.value = items.reduce((best, i) => (Math.abs(i.price - value) < Math.abs(best.price - value) ? i : best))
  resetResult()
}
const marketPrices = computed(() => (market.value?.items ?? []).map((i) => i.price))
/** ↺ in the controls: empty the stake, the balance part and the target */
function resetAll() {
  resetResult()
  selected.value = []
  extra.value = 0
  target.value = null
  aimed.value = null
}

// Chance bar: aim at a chance, the closest skin becomes the target and the tiles near it light up
const aimed = ref<number | null>(null)
function aim(c: number) {
  aimed.value = c
  if (inputValue.value > 0) pickTarget(targetPriceFor(inputValue.value, c, rules.value.upgrade))
}
// Nothing is pinned: whatever the player set last leads. Aimed at a chance → a new stake re-picks the skin
// for that chance; picked a skin by hand → the chance follows the stake. A stake with no target and no aim yet
// starts at 50%, so the dial and the target show something to play right away.
watch(inputValue, (v) => {
  if (v <= 0 || state.value !== 'idle') return
  if (aimed.value == null && !target.value) return aim(50)
  if (aimed.value != null) pickTarget(targetPriceFor(v, aimed.value, rules.value.upgrade))
})
const tileChance = (price: number) => (inputValue.value > 0 && price > inputValue.value ? Math.min(rules.value.upgrade.maxChanceBp / 100, (inputValue.value / price) * upgradeKeep(rules.value.upgrade) * 100) : null)
const tileHint = (price: number) => {
  const c = tileChance(price)
  return c == null ? undefined : `${c >= 10 ? c.toFixed(0) : c.toFixed(1)}%`
}
const isNear = (price: number) => {
  const c = tileChance(price)
  return c != null && aimed.value != null && Math.abs(c - aimed.value) <= 5
}

// Phones: both pickers live in one bottom sheet, opened from the mini cards
const sheetOpen = ref(false)
const sheetLock = useScrollLock(import.meta.client ? document.body : null)
watch(sheetOpen, (v) => (sheetLock.value = v && !isLg.value))
function openSheet(tab: 'mine' | 'desired') {
  panelTab.value = tab
  sheetOpen.value = true
}
/** The quiet CTA's next step: phones open the picker in its sheet, desktop brings the pickers into view */
const panels = useTemplateRef<HTMLElement>('panels')
function pick(what: 'stake' | 'target') {
  if (!isLg.value) return openSheet(what === 'stake' ? 'mine' : 'desired')
  panels.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function pickTargetTile(it: Item) {
  // An upgrade only goes up: skins worth no more than the stake are not targets
  if (inputValue.value && it.price <= inputValue.value) return sfx.denied(), toast.show(t('upgrade.targetTooCheap'))
  aimed.value = null
  target.value = target.value?.id === it.id ? null : it
  if (target.value) sfx.pick()
  else sfx.deselect()
  resetResult()
  if (!isLg.value && target.value) sheetOpen.value = false
}
const historyVersion = ref(0)
/** The skin just won, offered on the CTA until the player builds a new stake */
const won = ref<InventoryItem | null>(null)
/** The result is in but the spent stake is still on screen (its exit plays): the controls already show what comes next */
const settling = ref(false)
watch(inputValue, (v) => v > 0 && (won.value = null))
function upgradeWin() {
  const w = won.value
  if (!w) return
  won.value = null
  resetResult()
  if (aimed.value == null) target.value = null
  selected.value = [w.uid]
}
/** Phones: the card that is the player's next step glows */
const nextStep = computed(() => (!session.user || state.value !== 'idle' ? null : !inputValue.value ? 'stake' : !target.value ? 'target' : null))

// --- Market filters -----------------------------------------------------------
const search = ref('')
const searchOpen = ref(false)
const priceFrom = ref('')
const priceTo = ref('')
const rarities = ref<Rarity[]>([])
const sortDesc = ref(true)
const invSortDesc = ref(true)
const page = ref(0)
// a page of skins: three rows of five on desktop, three rows of three on phones (the sheet shows its pager without a scroll)
const PAGE = computed(() => (isLg.value ? 15 : 9))
watch(PAGE, () => ((page.value = 0), (invPage.value = 0)))

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
const pages = computed(() => Math.max(1, Math.ceil(filteredMarket.value.length / PAGE.value)))
const marketPage = computed(() => filteredMarket.value.slice(page.value * PAGE.value, page.value * PAGE.value + PAGE.value))
watch([search, priceFrom, priceTo, rarities, sortDesc], () => (page.value = 0))
// The target's own page: a skin aimed with the chance bar (or a multiplier) shows among its neighbours in price when
// the list comes into view — on phones as the Desired sheet opens, on desktop at once
function showTarget() {
  const i = target.value ? filteredMarket.value.findIndex((x) => x.id === target.value!.id) : -1
  if (i >= 0) page.value = Math.floor(i / PAGE.value)
}
watch(() => target.value?.id, showTarget)
watch([panelTab, sheetOpen], () => panelTab.value === 'desired' && sheetOpen.value && showTarget())
function resetMarketFilters() {
  search.value = ''
  priceFrom.value = ''
  priceTo.value = ''
  rarities.value = []
  searchOpen.value = false
}

const sortedInventory = computed(() => [...inventory.value].sort((a, b) => (invSortDesc.value ? b.price - a.price : a.price - b.price)))
// My skins page by page too, like the market (15 a page; the empty slots fill the last page)
const invPage = ref(0)
const invPages = computed(() => Math.max(1, Math.ceil(sortedInventory.value.length / PAGE.value)))
const inventoryPage = computed(() => sortedInventory.value.slice(invPage.value * PAGE.value, invPage.value * PAGE.value + PAGE.value))
watch([invPages, invSortDesc], () => (invPage.value = Math.min(invPage.value, invPages.value - 1)))
const inventoryTotal = computed(() => inventory.value.reduce((a, i) => a + i.price, 0))

const rarityOptions = computed(() => RARITIES.map((r) => ({ value: r, label: r[0]!.toUpperCase() + r.slice(1), swatch: RARITY_COLOR[r] })))

// --- Spin -----------------------------------------------------------------------
const state = ref<'idle' | 'spinning' | 'win' | 'lose'>('idle')
// While a result is on screen the dial keeps the chance that was played, not the cleared selection
const playedChance = ref(0)
const shownChance = computed(() => (state.value === 'win' || state.value === 'lose' ? playedChance.value : chance.value))
const gauge = useTemplateRef<{ spin: (roll: number, fast: boolean) => Promise<void>; reset: () => void; skip: () => void }>('gauge')
const sfx = useSfx()
const haptics = useHaptics()

// Suspense (docs/motion.md → Upgrade): the scene darkens, Forge draws light into the dial while it turns,
// the result lands with a shockwave (won) or a collapse (lost), and a close call gets its own plate.
const fxHost = useTemplateRef<HTMLElement>('fxHost')
const fxDial = useTemplateRef<HTMLElement>('fxDial')
const fx = useForge(fxHost)
// The target card gets its own light: an aura in its rarity while the dial turns,
// the jackpot burst when it is won, a collapse when it is lost
// The aura while it turns and the rank reveal go behind the target's skin and scroll with it: the target card's own
// layer (desktop), a layer in the mini card (phones). A fixed top canvas left the glow hanging on scroll.
const targetCard = useTemplateRef<{ rank: (r: Rarity, s: number) => ReturnType<typeof rarityRank>; aura: (s: number, color: string) => ReturnType<typeof fxMini.at> }>('targetCard')
const miniFx = useTemplateRef<HTMLElement>('miniFx')
const fxMini = useForge(miniFx)
let aura: ForgeHandle | null = null
// the won skin gets its rank reveal (docs/motion.md → rarity steps); the handle goes with the next stake
let beam: Awaited<ReturnType<typeof rarityRank>> = null
function stopBeam() {
  beam?.stop()
  beam = null
}
onBeforeUnmount(stopBeam)
const targetEl = () => document.querySelector<HTMLElement>(isLg.value ? '.kd-target' : '.kd-mini-target')

function resetResult() {
  stopBeam()
  if (state.value === 'win' || state.value === 'lose') {
    state.value = 'idle'
    gauge.value?.reset()
  }
}

// the upgrade was sent and the server has not answered yet: the button shows it is working
const pending = ref(false)
async function runUpgrade() {
  if (!session.user) return ui.openSignIn()
  if (!target.value) return sfx.denied(), toast.show(t('upgrade.chooseTarget'))
  if (chance.value < rules.value.upgrade.minChanceBp) return toast.show(t('upgrade.chanceTooLow', { n: rules.value.upgrade.minChanceBp / 100 }), 'danger')
  if (target.value.price <= inputValue.value) return toast.show(t('upgrade.targetTooCheap'), 'danger')
  state.value = 'spinning'
  // the breath before the pointer runs, as before a case's reel
  sfx.riser()
  playedChance.value = chance.value
  // No particles around the dial while it turns (they distracted from the pointer); light comes only at the result
  // while it turns, the target burns in its rarity's colour (kdFlame, as on the home page's big wins)
  const color = RARITY_HEX[target.value.rarity]
  const auraShot = isLg.value ? targetCard.value?.aura(0.95, color) : fxMini.at('kdFlame', targetEl()?.querySelector<HTMLElement>('.kd-art img') ?? targetEl(), 0.9, true, { sizeEl: targetEl(), color, lift: 0.2 })
  auraShot?.then((h) => {
    if (state.value !== 'spinning') return h?.kill()
    aura = h
  })
  pending.value = true
  try {
    const res = await $fetch<UpgradeResponse>('/api/upgrade', {
      method: 'POST',
      body: { itemUids: selected.value, balanceAmount: extra.value, targetItemId: target.value.id },
    }).finally(() => (pending.value = false))
    session.user.balance = res.balance
    lastNonce.value = res.nonce
    await gauge.value?.spin(res.roll, fast.value)
    aura?.stop()
    aura = null
    state.value = res.win ? 'win' : 'lose'
    settling.value = true
    // a win gets its beat around the dial; a loss stays one quiet fade of the dial and the target together
    if (res.win) fx.at('kdWin', fxDial.value, 1.2)
    // The target gets light only when it is won, graded by its rarity like a case drop: the rank reveal (more
    // layers the rarer) and, for gold, the gold burst. A loss stays quiet there (the dial already collapses)
    if (res.win) {
      const el = targetEl()
      const rarity = target.value.rarity
      const scale = isLg.value ? 1.6 : 1.1
      const shot = isLg.value ? targetCard.value?.rank(rarity, scale) : rarityRank(fxMini, el?.querySelector<HTMLElement>('.kd-art img') ?? el, rarity, scale)
      shot?.then((h) => (state.value === 'win' ? (beam = h) : h?.kill()))
    }
    if (res.win) {
      sfx.reveal(Math.max(2, RARITY_TIER[target.value?.rarity ?? 'covert']))
      haptics.rare()
    } else {
      sfx.lose()
      haptics.lose()
    }
    // No toast: the dial already says it. The stake clears as soon as its own animation has played (spent
    // pieces slide out / lost ones sink grey); the verdict stays on the dial until the player changes something
    await new Promise((r) => setTimeout(r, fast.value ? 350 : 700))
    extra.value = 0
    historyVersion.value++
    session.refresh()
    await loadInventory()
    // The stake is spent either way. Won: the result stays on screen and the orange button offers
    // "Upgrade the win" — one tap puts the new skin into the stake (never automatically).
    selected.value = []
    won.value = res.win && res.item && inventory.value.some((i) => i.uid === res.item!.uid) ? res.item : null
    settling.value = false
  } catch (e) {
    settling.value = false
    aura?.kill()
    aura = null
    state.value = 'idle'
    toast.error(e, t('common.error'))
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <!-- the logo in the middle, as on the case page: players record short videos of this screen -->
    <UiPageBar logo :left="barLeft" :right="barRight" />

    <!-- How it works: an upgrade in four plain steps, with the real numbers it plays by -->
    <UiModal v-model="howOpen" :title="$t('upgrade.howTitle')" :width="520">
      <ol class="flex flex-col gap-3">
        <li v-for="(st, i) in howSteps" :key="i" class="flex gap-3 rounded-2xl bg-neutral-3 p-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-4 text-brand-light"><UiIcon :name="st.icon" :size="20" /></span>
          <span class="flex min-w-0 flex-col gap-1">
            <span class="type-14-caps">{{ i + 1 }}. {{ st.title }}</span>
            <span class="type-14-regular text-neutral-12">{{ st.text }}</span>
          </span>
        </li>
      </ol>
      <div class="mt-4 flex items-center justify-between gap-3">
        <span class="type-12-regular text-neutral-11">{{ $t('upgrade.howFair') }}</span>
        <UiButton variant="fair" size="s" icon="shield-check" to="/fairness" class="shrink-0" @click="howOpen = false">{{ $t('case.fairness') }}</UiButton>
      </div>
    </UiModal>


    <!-- The scene dims around the dial while it turns -->
    <Transition name="kd-vignette">
      <div v-if="state === 'spinning'" class="kd-vignette pointer-events-none fixed inset-0 z-[25]" />
    </Transition>

    <!-- Stake · Gauge · Target. Phones: the two cards side by side (what goes in → what comes out), big
         enough to read and to tap, the dial under them; the pickers open in a sheet from the cards and the
         card that is the next step glows. -->
    <section class="grid grid-cols-2 items-center gap-2 lg:grid-cols-[400px_1fr_400px] lg:grid-rows-[auto_auto] lg:items-stretch lg:gap-x-4 lg:gap-y-3">
      <button type="button" class="kd-mini kd-press lg:hidden" :class="[state !== 'idle' && `is-${state}`, nextStep === 'stake' && 'is-next']" :disabled="state === 'spinning'" @click="openSheet('mine')">
        <template v-if="selectedItems.length || extra">
          <!-- a fan of what is in: the skins a touch smaller, the coins a size under them (their picture fills its square) -->
          <span class="flex h-16 items-center -space-x-6">
            <ItemArt v-for="it in selectedItems.slice(0, 3)" :key="it.uid" float :image="it.image" :rarity="it.rarity" :size="46" class="kd-mini-art w-14" />
            <UiCoinStack v-if="extra && selectedItems.length < 3" :size="selectedItems.length ? 24 : 34" :amount="extra" class="kd-mini-art" />
          </span>
          <UiPrice :amount="inputValue" size="m" />
          <span class="type-10-caps text-neutral-11">{{ $t('upgrade.pieces', { n: selectedItems.length + (extra ? 1 : 0) }) }}</span>
        </template>
        <template v-else>
          <span class="kd-mini-plus"><UiIcon name="plus" :size="24" /></span>
          <span class="type-14 text-neutral-15">{{ $t('upgrade.addSkins') }}</span>
          <span class="type-12-regular -mt-1 text-neutral-11">{{ $t('upgrade.addSkinsHint') }}</span>
        </template>
      </button>

      <!-- Desktop: the column dissolves into the grid, so the cards share row 1 and the panels share row 2 -->
      <div class="max-lg:hidden lg:contents">
      <UpgradeStake
        class="lg:col-start-1 lg:row-start-1"
        :items="selectedItems"
        :coins="extra"
        :total="inputValue"
        :state="state"
        :disabled="state === 'spinning' || !session.user"
        @remove="toggle"
        @clear-coins="(extra = 0), resetResult()"
      />
        <UpgradeControls
          :pending="pending"
          class="lg:col-start-1 lg:row-start-2"
          part="balance"
          v-model:extra="extraModel"
          v-model:fast="fast"
          :chance="shownChance"
          :input="settling ? 0 : inputValue"
          :balance="balance"
          :target="target"
          :prices="marketPrices"
          :state="state"
          :signed-in="!!session.user"
          @aim="aim"
          :again="won ?? (settling && state === 'win' ? target : null)"
          :settling="settling"
      @upgrade="runUpgrade"
      @again="upgradeWin"
      @skip="gauge?.skip()"
          @reset="resetAll"
          @pick="pick"
        />
      </div>

      <div class="relative z-[26] flex flex-col items-center max-lg:order-3 max-lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <!-- Forge layer behind the dial, wider than it so rings and sparks have room -->
        <div ref="fxHost" class="pointer-events-none absolute -inset-x-10 -inset-y-10 lg:-inset-20" />
        <div ref="fxDial" class="pointer-events-none absolute top-0 left-1/2 aspect-square w-full max-w-[216px] -translate-x-1/2 lg:-top-3 lg:max-w-80" />
        <!-- -mt-3 (was -6) and 320px (was 352): the logo above gets air from the "100", the button below keeps its gap -->
        <UpgradeGauge ref="gauge" :chance="shownChance" :state="state" :nonce="lastNonce" class="relative z-[2] max-lg:max-w-[216px] lg:-mt-3" />
        <UpgradeControls
          :pending="pending"
          class="relative z-[3] mt-5 w-full max-w-80 max-lg:hidden lg:mt-auto"
          part="cta"
          v-model:extra="extraModel"
          v-model:fast="fast"
          :chance="shownChance"
          :input="settling ? 0 : inputValue"
          :balance="balance"
          :target="target"
          :prices="marketPrices"
          :state="state"
          :signed-in="!!session.user"
          @aim="aim"
          :again="won ?? (settling && state === 'win' ? target : null)"
          :settling="settling"
      @upgrade="runUpgrade"
      @again="upgradeWin"
      @skip="gauge?.skip()"
          @reset="resetAll"
          @pick="pick"
        />
      </div>

      <button type="button" class="kd-mini kd-mini-target kd-press max-lg:order-2 lg:hidden" :class="[state !== 'idle' && `is-${state}`, nextStep === 'target' && 'is-next']" :disabled="state === 'spinning'" @click="openSheet('desired')">
        <span ref="miniFx" class="pointer-events-none absolute inset-0" />
        <template v-if="target">
          <ItemArt morph float :image="target.image" :rarity="target.rarity" :size="60" class="kd-mini-art h-16 w-full" />
          <UiPrice :amount="target.price" size="m" />
          <UiTextSwap :text="target.skin" class="type-10-caps max-w-full truncate" :style="{ color: RARITY_COLOR[target.rarity] }" />
        </template>
        <template v-else>
          <span class="kd-mini-plus"><UiIcon name="target-up" :size="28" class="kd-ico-target" /></span>
          <span class="type-14 text-neutral-15">{{ $t('upgrade.pickTarget') }}</span>
          <span class="type-12-regular -mt-1 text-neutral-11">{{ $t('upgrade.pickTargetHint') }}</span>
        </template>
      </button>
      <div class="max-lg:hidden lg:contents">
        <UpgradeTarget ref="targetCard" class="lg:col-start-3 lg:row-start-1" :item="target" :state="state" @clear="(target = null), resetResult()" />
        <UpgradeControls
          :pending="pending"
          class="lg:col-start-3 lg:row-start-2"
          part="chance"
          v-model:extra="extraModel"
          v-model:fast="fast"
          :chance="shownChance"
          :input="settling ? 0 : inputValue"
          :balance="balance"
          :target="target"
          :prices="marketPrices"
          :state="state"
          :signed-in="!!session.user"
          @aim="aim"
          :again="won ?? (settling && state === 'win' ? target : null)"
          :settling="settling"
      @upgrade="runUpgrade"
      @again="upgradeWin"
      @skip="gauge?.skip()"
          @reset="resetAll"
          @pick="pick"
        />
      </div>

    </section>

    <!-- -mt-4: the page's 24 px gap down to 8, the same air under the dial as over it -->
    <UpgradeControls
      :pending="pending"
      class="-mt-4 lg:hidden"
      v-model:extra="extraModel"
      v-model:fast="fast"
      :chance="shownChance"
      :input="settling ? 0 : inputValue"
      :balance="balance"
      :target="target"
      :prices="marketPrices"
      :state="state"
      :signed-in="!!session.user"
      @aim="aim"
      :again="won ?? (settling && state === 'win' ? target : null)"
      :settling="settling"
      @upgrade="runUpgrade"
      @again="upgradeWin"
      @skip="gauge?.skip()"
      @reset="resetAll"
      @pick="pick"
    />

    <!-- Panels: side by side on desktop, switchable tabs on mobile -->
    <Transition name="kd-scrim">
      <div v-if="sheetOpen && !isLg" class="fixed inset-0 z-[59] bg-black-60" @click="sheetOpen = false" />
    </Transition>
    <div ref="panels" class="kd-panels flex scroll-mt-24 flex-col gap-4" :class="sheetOpen && 'is-open'">
    <div class="flex items-center gap-2 lg:hidden">
    <UiTabs
      v-model="panelTab"
      class="min-w-0 flex-1"
      :tabs="[
        { value: 'mine', label: $t('upgrade.tabMySkins'), count: inventory.length },
        { value: 'desired', label: $t('upgrade.tabDesired') },
      ]"
    />
    <UiButton variant="ghost" size="s" icon="close" icon-only :aria-label="$t('common.close')" @click="sheetOpen = false" />
    </div>
    <section class="kd-dimmable -mt-2 grid gap-4 lg:mt-0 lg:grid-cols-2 lg:gap-5" :class="state === 'spinning' && 'is-dimmed'">
      <div class="flex flex-col rounded-5xl bg-neutral-2 lg:pb-4" :class="panelTab !== 'mine' && 'max-lg:hidden'">
        <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <!-- phones: the sheet's tab already names the panel, so the header keeps only its tools -->
          <UiIcon name="inventory" :size="isLg ? 24 : 20" class="text-neutral-13 max-lg:hidden" />
          <span class="type-14 lg:type-16-medium max-lg:hidden">{{ $t('upgrade.mySkins') }} ({{ inventory.length }})</span>
          <!-- nothing to count or sort with fewer than two skins: no "0", no sort arrows -->
          <UiPrice v-if="inventory.length" :amount="inventoryTotal" size="m" tone="coin" class="opacity-64 max-lg:hidden" />
          <!-- phones: coins from the balance go into the stake here, next to the skins (the sheet's footer sums both) -->
          <UiInput
            v-if="session.user && !isLg"
            id="sheet-extra"
            v-model="extraText"
            size="s"
            coin
            clearable
            lazy
            inputmode="decimal"
            :placeholder="$t('upgrade.fromBalance')"
            :disabled="state === 'spinning'"
            class="min-w-0 flex-1"
            @clear="extraModel = 0"
          />
          <!-- Select all and the sort arrows: one height, side by side -->
          <UiButton v-if="inventory.length" variant="ghost" :size="isLg ? 'm' : 's'" class="ml-auto" :disabled="state === 'spinning'" @click="selected.length ? clearSkins() : allSkins()"><UiTextSwap :text="selected.length ? $t('upgrade.clearAll') : $t('upgrade.selectAll')" /></UiButton>
          <UiButton v-if="inventory.length > 1" variant="ghost" :size="isLg ? 'm' : 's'" icon-only :aria-label="$t(invSortDesc ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="invSortDesc = !invSortDesc">
            <UiSortArrows :desc="invSortDesc" />
          </UiButton>
        </div>
        <div v-if="session.user && inventoryLoading" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
          <span v-for="n in PAGE" :key="n" class="kd-skeleton aspect-[164/128] rounded-2xl max-sm:aspect-[4/5] lg:aspect-auto lg:h-[105px]" :style="{ animationDelay: `${n * 40}ms` }" />
        </div>
        <!-- nothing to stake yet: one big step, open a case (no second, small "open cases" line under it) -->
        <UiEmptyState v-else-if="session.user && !inventory.length" :text="$t('account.emptyInventory')" class="flex-1 justify-center">
          <UiButton size="l" icon="cases" to="/" class="w-full max-w-72">{{ $t('account.openCases') }}</UiButton>
        </UiEmptyState>
        <div v-else-if="session.user" class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4">
          <template v-for="n in PAGE" :key="n">
            <ItemTile
              :item="inventoryPage[n - 1]"
              :selected="!!inventoryPage[n - 1] && selected.includes(inventoryPage[n - 1]!.uid)"
              :disabled="state === 'spinning'"
              @toggle="toggle(inventoryPage[n - 1]!.uid)"
            />
          </template>
        </div>
        <UiEmptyState v-else :text="$t('upgrade.signInText')" mood="laugh" class="flex-1 justify-center">
          <UiButton size="l" icon="sign-in" class="w-full max-w-72" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
        </UiEmptyState>
        <UiPager v-if="session.user && invPages > 1" v-model="invPage" :pages="invPages" class="mt-auto h-12 lg:h-10" />
        <NuxtLink v-else-if="session.user && inventory.length" to="/" class="kd-press type-12-caps mt-auto flex h-12 items-center lg:h-10 justify-center gap-2 text-neutral-12 hover:text-neutral-15">
          <UiIcon name="cases" :size="16" />
          {{ $t('upgrade.openCases') }}
        </NuxtLink>
      </div>

      <div class="flex flex-col rounded-5xl bg-neutral-2 lg:pb-4" :class="panelTab !== 'desired' && 'max-lg:hidden'">
        <div class="flex h-14 items-center gap-2 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
          <UiIcon name="gem" :size="isLg ? 24 : 20" class="text-neutral-13 max-lg:hidden lg:mr-1" />
          <span class="type-14 lg:type-16-medium mr-1 whitespace-nowrap max-lg:hidden">{{ $t('upgrade.desiredSkin') }}</span>
          <UiButton variant="ghost" :size="isLg ? 'm' : 's'" icon-only :aria-label="$t(sortDesc ? 'upgrade.sortDesc' : 'upgrade.sortAsc')" @click="sortDesc = !sortDesc">
            <UiSortArrows :desc="sortDesc" />
          </UiButton>
          <Transition name="kd-search" mode="out-in">
            <UiInput v-if="searchOpen" id="market-search" key="s" v-model="search" icon="search" clearable :placeholder="$t('upgrade.search')" class="min-w-0 flex-1" @keydown.esc="searchOpen = false" />
            <div v-else key="f" class="flex min-w-0 flex-1 items-center gap-2">
              <UiInput id="price-from" v-model="priceFrom" coin inputmode="decimal" :placeholder="$t('upgrade.from')" class="hidden w-24 sm:flex" />
              <UiInput id="price-to" v-model="priceTo" coin inputmode="decimal" :placeholder="$t('upgrade.to')" class="hidden w-24 sm:flex" />
              <UiSelect v-model:values="rarities" multiple :options="rarityOptions" class="kd-rarity-select min-w-20" menu-width="fixed">
                <template #leading>
                  <!-- The trigger shows the choice: every colour dimmed = all rarities, otherwise just the picked ones -->
                  <TransitionGroup tag="span" name="kd-rdot" class="flex items-center gap-0.5">
                    <span
                      v-for="r in rarities.length ? rarities : RARITIES"
                      :key="r"
                      class="shrink-0 rounded-full"
                      :class="rarities.length ? 'size-1.5' : 'size-1.5 opacity-45'"
                      :style="{ background: RARITY_COLOR[r] }"
                    />
                  </TransitionGroup>
                </template>
              </UiSelect>
            </div>
          </Transition>
          <UiButton variant="ghost" :size="isLg ? 'm' : 's'" :icon="searchOpen ? 'close' : 'search'" icon-only :aria-label="$t(searchOpen ? 'common.close' : 'upgrade.search')" @click="searchOpen = !searchOpen" />
        </div>
        <!-- Always a full page of slots (empty ones on the last page), so paging never changes the height -->
        <div class="relative">
        <TransitionGroup tag="div" name="kd-grid" class="relative grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:p-4" :class="market && !filteredMarket.length && 'opacity-30'">
          <template v-for="n in PAGE" :key="marketPage[n - 1]?.id ?? `empty-${n}`">
            <ItemTile
              v-if="marketPage[n - 1]"
              :item="marketPage[n - 1]"
              :selected="target?.id === marketPage[n - 1]!.id"
              :hint="tileHint(marketPage[n - 1]!.price)"
              :near="isNear(marketPage[n - 1]!.price)"
              :class="!!inputValue && marketPage[n - 1]!.price <= inputValue && 'opacity-35'"
              @toggle="pickTargetTile(marketPage[n - 1]!)"
            />
            <ItemTile v-else :item="undefined" />
          </template>
        </TransitionGroup>
        <!-- the filters found nothing: say so over the empty slots (the panel keeps its height) and undo them in a tap -->
        <div v-if="market && !filteredMarket.length" class="absolute inset-0 grid place-items-center p-4">
          <UiEmptyState :text="$t('upgrade.noMatch')" class="bg-transparent py-0 lg:py-0">
            <UiButton variant="secondary" size="m" icon="close" @click="resetMarketFilters">{{ $t('upgrade.resetFilters') }}</UiButton>
          </UiEmptyState>
        </div>
        </div>
        <UiPager v-model="page" :pages="pages" class="mt-auto h-12 lg:h-10" :class="!filteredMarket.length && 'invisible'" />
      </div>
    </section>
    <div class="sticky bottom-0 flex items-center gap-3 border-t border-neutral-4 bg-neutral-1 p-3 lg:hidden">
      <span class="type-12-caps text-neutral-11">{{ $t('upgrade.stakeTotal') }}</span>
      <UiPrice :amount="inputValue" size="s" />
      <UiButton size="m" class="ml-auto" @click="sheetOpen = false">{{ $t('upgrade.done') }}{{ target ? ` · ${(chance / 100).toFixed(1)}%` : '' }}</UiButton>
    </div>
    </div>

    <UpgradeHistory :version="historyVersion" />

  </div>
</template>

<style scoped>
.kd-vignette {
  background: radial-gradient(ellipse 60% 55% at 50% 42%, transparent 35%, rgb(5 6 8 / 0.78));
}
.kd-vignette-enter-active {
  transition: opacity 600ms var(--ease-out);
}
.kd-vignette-leave-active {
  transition: opacity 900ms var(--ease-in-out);
}
.kd-vignette-enter-from,
.kd-vignette-leave-to {
  opacity: 0;
}
.kd-mini {
  position: relative;
  display: flex;
  height: 120px;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 20px;
  background: var(--color-neutral-2);
  padding: 10px;
  transition:
    background-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    opacity var(--dur-slow) var(--ease-out),
    filter var(--dur-slow) var(--ease-out);
}
/* Phones only: a scoped display rule would beat the lg:hidden utility, so hide them here */
@media (min-width: 64rem) {
  .kd-mini {
    display: none;
  }
}
.kd-mini-plus {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 4px;
  place-items: center;
  border-radius: 9999px;
  background: var(--color-neutral-4);
  color: var(--color-neutral-12);
  transition:
    background-color var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out);
}
/* The next step: a soft brand glow breathing around the card, the plus lit */
.kd-mini.is-next {
  background: linear-gradient(180deg, rgb(255 95 31 / 0.1), var(--color-neutral-2) 70%);
  box-shadow: inset 0 0 0 1px rgb(255 95 31 / 0.16);
}
.kd-mini.is-next::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgb(255 95 31 / 0.3), 0 0 22px -6px rgb(255 95 31 / 0.55);
  opacity: 0;
  pointer-events: none;
  animation: kd-glow-pulse 2.2s ease-in-out infinite;
}
.kd-mini.is-next .kd-mini-plus {
  background: var(--color-brand-base);
  color: var(--color-neutral-1);
}
/* While the dial turns the pieces float in place */
.kd-mini.is-spinning .kd-mini-art {
  animation: kd-mini-float 1.4s var(--ease-in-out) infinite;
}
@keyframes kd-mini-float {
  50% {
    translate: 0 -3px;
  }
}
/* Won: the stake is spent (slides towards the target and fades), the target card washes green and
   pops; lost: everything goes grey and sinks */
.kd-mini:not(.kd-mini-target).is-win .kd-mini-art {
  animation: kd-mini-spent 650ms var(--ease-in) both;
}
@keyframes kd-mini-spent {
  to {
    translate: 36px 0;
    scale: 0.7;
    opacity: 0;
  }
}
.kd-mini-target.is-win {
  background: linear-gradient(180deg, rgb(18 183 106 / 0.22), var(--color-neutral-2) 80%);
}
.kd-mini-target.is-win .kd-mini-art {
  animation: kd-mini-pop 700ms var(--ease-spring) both;
}
@keyframes kd-mini-pop {
  35% {
    scale: 1.22;
  }
  100% {
    scale: 1.06;
  }
}
.kd-mini.is-lose {
  opacity: 0.55;
  filter: grayscale(1);
}
.kd-mini.is-lose .kd-mini-art {
  translate: 0 4px;
  transition: translate 500ms var(--ease-out);
}
.kd-mini-swap-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    scale var(--dur-slow) var(--ease-spring);
}
.kd-mini-swap-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
}
.kd-mini-swap-enter-from {
  opacity: 0;
  scale: 0.8;
}
.kd-mini-swap-leave-to {
  opacity: 0;
}
.kd-chance-slider {
  background:
    linear-gradient(90deg, var(--color-danger), var(--color-warning) 35%, var(--color-success) 70%) 0 / var(--p) 100% no-repeat,
    var(--color-neutral-6);
}
.kd-chance-slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.kd-chance-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: var(--color-neutral-15);
  box-shadow: 0 0 0 4px rgb(255 255 255 / 0.12);
}
.kd-chance-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 9999px;
  background: var(--color-neutral-15);
}
/* Phones: the pickers are a bottom sheet */
@media (max-width: 1023.98px) {
  .kd-panels {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 60;
    max-height: 86dvh;
    overflow-y: auto;
    border-radius: 24px 24px 0 0;
    border-top: 1px solid var(--color-neutral-5);
    background: var(--color-neutral-1);
    padding: 12px 16px 0;
    transform: translateY(105%);
    transition: transform var(--dur-base) var(--ease-in);
  }
  .kd-panels.is-open {
    transform: none;
    transition: transform var(--dur-slow) var(--ease-out);
  }
}
.kd-scrim-enter-active,
.kd-scrim-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-scrim-enter-from,
.kd-scrim-leave-to {
  opacity: 0;
}
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
/* the page's old tiles leave the layout at once: kept in the grid for their leave they doubled its height */
.kd-grid-leave-active {
  display: none;
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
.kd-rdot-enter-active,
.kd-rdot-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-base) var(--ease-spring);
}
.kd-rdot-enter-from,
.kd-rdot-leave-to {
  opacity: 0;
  scale: 0.3;
}
.kd-rdot-leave-active {
  position: absolute;
}
</style>
