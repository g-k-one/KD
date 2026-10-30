<script setup lang="ts">
import type { CaseResponse, CasesResponse, InventoryItem, OpenCaseResponse, PfRoll, SeedPairPublic, SellResponse } from '#shared/types/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const sfx = useSfx()
const toast = useToast()
const isSm = useMediaQuery('(min-width: 640px)')
// The bar: two icons a side on phones — back · history · ‹ name › · share · fairness (the upgrade and PvP bars match)

// The page shows at once on a tap from elsewhere: its skeleton stands until the case comes in (the first load,
// rendered on the server, comes complete)
const req = useFetch<CaseResponse>(() => `/api/cases/${slug.value}`, { key: `case-${slug.value}`, lazy: true })
if (import.meta.server) await req
const { data, error } = req
const notFound = () => createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true })
if (error.value) throw notFound()
watch(error, (e) => e && showError(notFound()))
const cs = computed(() => data.value?.case)
useHead({ title: () => `${cs.value?.name ?? 'Case'} · KurwaDROP` })

const count = ref<1 | 2 | 3 | 4 | 5>(1)
const fast = ref(false)
// the open (or a sell) was sent and the server has not answered yet: the button shows it is working
const pending = ref(false)
const selling = ref(false)
const kurwadrop = ref(route.query.kurwa === '1')
// KURWADROP is free and changes no odds: it only stages top drops (chicken + respin)
const openPrice = computed(() => cs.value?.price ?? 0)
const phase = ref<'idle' | 'spinning' | 'result'>('idle')
const results = ref<InventoryItem[]>([])
const sold = ref<string[]>([])
const demo = ref(false)
// Last opening's provably-fair data, for "Check this roll"
const last = ref<{ rolls: PfRoll[]; kurwa: boolean[]; seed: SeedPairPublic | null }>({ rolls: [], kurwa: [], seed: null })
const rollsOpen = ref(false)
const recent = useRecentCases()
const shareOpen = ref(false)
const shareItem = shallowRef<InventoryItem | null>(null)
const reel = useTemplateRef<{ spin: (w: InventoryItem[], fast: boolean, kurwa?: boolean[]) => Promise<void>; skip: () => void }>('reel')

// One spot, one key: the main button (and Space on desktop) opens, skips the spin, opens again
const mainAction = () => (phase.value === 'spinning' ? reel.value?.skip() : open())
onKeyStroke(' ', (e) => {
  const el = e.target as HTMLElement | null
  if (el?.closest('input, textarea, button, a, [role=dialog]')) return
  e.preventDefault()
  mainAction()
})

watch(count, () => {
  if (phase.value === 'result') phase.value = 'idle'
  results.value = []
})

// What the main button says: open, sign in (guests), or top up the shortfall (GGDrop) — the tap does the same
const total = computed(() => openPrice.value * count.value)
const shortBy = computed(() => (session.user ? Math.max(0, total.value - session.user.balance) : 0))
const cta = computed(() => {
  // waiting for the server there is nothing to skip yet
  if (pending.value) return { label: t('case.opening'), amount: total.value, short: false }
  if (phase.value === 'spinning') return { label: t('case.skip'), amount: total.value, short: false }
  if (!session.user) return { label: t('case.signInToOpen'), amount: total.value, short: false }
  if (shortBy.value > 0) return { label: t('case.topUp'), amount: shortBy.value, short: true }
  // the same words before and after a drop: the button that opens again should not change its text
  return { label: t('case.open', { count: count.value }), amount: total.value, short: false }
})

// Neighbour cases in home order (wraps around), so the next case is one tap away
const { data: list } = useFetch<CasesResponse>('/api/cases', { key: 'cases', lazy: true, server: false })
const order = computed(() => [...new Map((list.value?.sections ?? []).flatMap((s) => s.cases).map((c) => [c.slug, c])).values()])
const neighbour = (step: number) => {
  const all = order.value
  const i = all.findIndex((c) => c.slug === slug.value)
  return i < 0 || all.length < 2 ? null : all[(i + step + all.length) % all.length]!
}
const prevCase = computed(() => neighbour(-1))
const nextCase = computed(() => neighbour(1))
const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest('input, textarea, [role=dialog]')
onKeyStroke(['ArrowLeft', 'ArrowRight'], (e) => {
  const to = e.key === 'ArrowLeft' ? prevCase.value : nextCase.value
  if (!to || typing(e) || phase.value === 'spinning') return
  navigateTo(`/case/${to.slug}`)
})

const unsoldTotal = computed(() =>
  demo.value ? 0 : results.value.filter((r) => !sold.value.includes(r.uid)).reduce((a, r) => a + r.price, 0),
)

async function open(asDemo = false) {
  if (phase.value === 'spinning') return
  if (!asDemo && !session.user) return ui.openSignIn()
  if (!asDemo && session.user && session.user.balance < openPrice.value * count.value) {
    // Top up over the case instead of leaving it
    return ui.openDeposit(openPrice.value * count.value - session.user.balance)
  }
  // the launch sounds on the press, before anything is drawn (the reel would play it a frame later)
  sfx.riser()
  phase.value = 'spinning'
  demo.value = asDemo
  sold.value = []
  results.value = []
  pending.value = true
  try {
    const res = await $fetch<OpenCaseResponse>(`/api/cases/${slug.value}/open`, {
      method: 'POST',
      body: { count: count.value, demo: asDemo, kurwadrop: kurwadrop.value },
    }).finally(() => (pending.value = false))
    if (!asDemo && session.user) session.user.balance = res.balance
    if (!asDemo) recent.add(slug.value)
    results.value = res.drops
    last.value = { rolls: res.rolls, kurwa: res.kurwa, seed: res.seed }
    await reel.value?.spin(res.drops, fast.value, res.kurwa)
    phase.value = 'result'
    if (asDemo) toast.show(t('case.demoBadge'))
    // Opening earns XP: pick up a level change (the layout celebrates it)
    else session.refresh()
  } catch (e) {
    phase.value = 'idle'
    toast.error(e, t('common.error'))
  }
}

async function sell(uids: string[]) {
  if (demo.value || !uids.length || selling.value) return
  selling.value = true
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids } }).finally(() => (selling.value = false))
    sold.value = [...sold.value, ...res.sold]
    if (session.user) session.user.balance = res.balance
  } catch (e) {
    toast.error(e, t('common.error'))
  }
}

// Mobile: when the controls scroll away, a compact Open bar sticks above the tab bar
const controlsEl = useTemplateRef<HTMLElement>('controlsEl')
const controlsVisible = ref(true)
useIntersectionObserver(controlsEl, ([e]) => (controlsVisible.value = !!e?.isIntersecting))

async function share() {
  try {
    await navigator.clipboard.writeText(location.href)
    toast.show(t('case.copied'), 'success')
  } catch {
    toast.show(location.href)
  }
}

const unsold = computed(() => (demo.value ? [] : results.value.filter((r) => !sold.value.includes(r.uid))))

const reelSection = useTemplateRef<HTMLElement>('reelSection')
const scrollToReel = () => reelSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })

// "Try free" on a home card lands here with ?demo=1: the demo spin starts once the reel is up
onMounted(() => {
  if (route.query.demo !== '1') return
  navigateTo({ query: { ...route.query, demo: undefined } }, { replace: true })
  setTimeout(() => {
    scrollToReel()
    open(true)
  }, 400)
})

const chance = (tickets: number) => {
  const p = tickets / 10_000
  return `${p >= 1 ? +p.toFixed(1) : +p.toPrecision(2)}%`
}

// The odds grid: every few seconds one random item shows how often it dropped today, then hides again
const flashId = ref<string | null>(null)
if (import.meta.client) {
  useIntervalFn(() => {
    const items = (cs.value?.items ?? []).filter((x) => x.drops24h > 0)
    if (!items.length) return
    flashId.value = items[Math.floor(Math.random() * items.length)]!.id
    setTimeout(() => (flashId.value = null), 2200)
  }, 5000)
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <CasePageSkeleton v-if="!cs" />
    <template v-else>
      <div class="flex flex-col gap-4">
        <!-- two a side, as on the upgrade and PvP bars: back and history, share and fairness -->
        <UiPageBar
          fixed-sides
          :left="[
            { label: $t('case.allCases'), icon: 'arrow-left', to: '/' },
            { label: $t('upgrade.history'), icon: 'history', to: '/profile?tab=history&game=case' },
          ]"
          :right="[
            { label: $t('case.share'), icon: 'share', onClick: share },
            { label: $t('case.fairness'), icon: 'shield', to: '/fairness' },
          ]"
        >
          <!-- Phones: the arrows sit at the ends of the centre, the name between them; desktop: a fixed-width name
               between the arrows. Either way the arrows stay put from case to case. -->
          <div class="flex w-full min-w-0 items-center gap-0.5 md:w-auto md:gap-3">
            <NuxtLink
              v-if="prevCase"
              :to="`/case/${prevCase.slug}`"
              :aria-label="$t('case.prevCase', { name: prevCase.name })"
              :title="prevCase.name"
              class="kd-press kd-nb kd-hit relative grid size-6 shrink-0 place-items-center rounded-md text-neutral-12 hover:text-neutral-15 md:size-8 md:rounded-lg"
            >
              <UiIcon name="chevron-left" :size="18" />
            </NuxtLink>
            <h1 class="type-14-caps md:type-20-caps min-w-0 flex-1 truncate text-center md:w-60 md:flex-none" :title="cs.name">{{ cs.name }}</h1>
            <NuxtLink
              v-if="nextCase"
              :to="`/case/${nextCase.slug}`"
              :aria-label="$t('case.nextCase', { name: nextCase.name })"
              :title="nextCase.name"
              class="kd-press kd-nb kd-hit relative grid size-6 shrink-0 place-items-center rounded-md text-neutral-12 hover:text-neutral-15 md:size-8 md:rounded-lg"
            >
              <UiIcon name="chevron-right" :size="18" />
            </NuxtLink>
          </div>
        </UiPageBar>
      </div>

      <!-- one stage: the odds, the reel, the controls and the next hook, one step apart (12 px phones, 24 desktop; on
           desktop the controls sit 12 px under the reel they drive), its top pulled up to the bar's 16 px instead of the page gap -->
      <section ref="reelSection" class="-mt-2 flex scroll-mt-24 flex-col gap-3 lg:-mt-6 lg:gap-6">
        <CaseTransparency :data="cs" />
        <CaseReel
          ref="reel"
          :data="cs"
          :count="count"
          :phase="phase"
          :results="results"
          :sold-uids="sold"
          :demo="demo"
          :kurwadrop="kurwadrop"
          :fast="fast"
          @sell="(uid) => sell([uid])"
          try-free
          @demo="open(true)"
          @share="(it) => ((shareItem = it), (shareOpen = true))"
        />
        <CaseOpenControls
          ref="controlsEl"
          class="lg:-mt-3"
          v-model:count="count"
          v-model:fast="fast"
          v-model:kurwadrop="kurwadrop"
          :label="cta.label"
          :amount="cta.amount"
          :short="cta.short"
          :phase="phase"
          :unsold-total="unsoldTotal"
          :pending="pending"
          :selling="selling"
          @open="open()"
          @skip="reel?.skip()"
          @sell-all="sell(results.filter((r) => !sold.includes(r.uid)).map((r) => r.uid))"
        />
        <!-- Always there with a fixed height: a result only changes what the cards say -->
        <CaseNextHook
          v-if="!demo"
          :data="cs"
          :unsold="unsold"
          :count="count"
          :phase="phase"
          :rolls="last.rolls"
          @sell-all="sell(results.filter((r) => !sold.includes(r.uid)).map((r) => r.uid))"
          @check="rollsOpen = true"
        />
      </section>

      <CaseShareDrop v-model="shareOpen" :item="shareItem" :case-price="cs.price" :slug="cs.slug" />

      <CaseRollsModal v-model="rollsOpen" :data="cs" :drops="results" :rolls="last.rolls" :kurwa="last.kurwa" :seed="last.seed" />

      <Transition name="kd-sticky">
        <div
          v-if="!controlsVisible"
          class="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-neutral-5 bg-neutral-2 px-4 py-3 lg:hidden"
        >
          <img :src="cs.image" alt="" class="size-10 object-contain" />
          <span class="type-12-caps min-w-0 flex-1 truncate">{{ cs.name }} · x{{ count }}</span>
          <UiButton :variant="phase === 'spinning' ? 'secondary' : 'primary'" class="min-w-36 shrink-0" @click="phase === 'spinning' ? reel?.skip() : (open(), scrollToReel())">
            <span>{{ cta.label }}</span>
            <span v-if="phase !== 'spinning'" class="btn-value">
              <span v-if="cta.short" class="type-14">+</span>
              <UiPrice :amount="cta.amount" size="m" tone="inverse" />
            </span>
          </UiButton>
        </div>
      </Transition>

      <section class="flex flex-col gap-4">
        <UiSectionHeader :title="$t('case.contents')">
          <template #actions>
            <span class="type-12-caps flex shrink-0 items-center gap-3 text-neutral-11 tabular-nums">
              <span class="lg:hidden">{{ $t('case.opens', { n: shortCount(cs.opens) }) }}</span>
              <span class="max-lg:hidden">{{ $t('case.opens', { n: formatCount(cs.opens) }) }}</span>
              <span class="h-3 w-px bg-neutral-5 max-lg:hidden" />
              <span class="max-lg:hidden">{{ $t('case.skins', { n: cs.items.length }, cs.items.length) }}</span>
            </span>
          </template>
        </UiSectionHeader>
        <!-- phones: three compact cards a row, so a case's contents is a short scroll -->
        <div class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6 lg:gap-3">
          <ItemDropCard v-for="it in cs.items" :key="it.id" :item="it" :compact="!isSm" :chance="chance(it.tickets)" :range="[it.ticketFrom, it.ticketTo]" :drops="it.drops24h" :flash="flashId === it.id" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.kd-hook-enter-active,
.kd-hook-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    max-height var(--dur-slow) var(--ease-out);
  max-height: 320px;
  overflow: hidden;
}
.kd-hook-enter-from,
.kd-hook-leave-to {
  opacity: 0;
  max-height: 0;
}
.kd-sticky-enter-active {
  transition:
    transform var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out);
}
.kd-sticky-leave-active {
  transition:
    transform var(--dur-base) var(--ease-in),
    opacity var(--dur-fast) var(--ease-in);
}
.kd-sticky-enter-from,
.kd-sticky-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
