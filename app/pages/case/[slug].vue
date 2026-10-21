<script setup lang="ts">
import type { CaseResponse, InventoryItem, OpenCaseResponse, SellResponse } from '#shared/types/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

const { data, error } = await useFetch<CaseResponse>(() => `/api/cases/${slug.value}`, { key: `case-${slug.value}` })
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true })
const cs = computed(() => data.value!.case)
useHead({ title: () => `${cs.value.name} · KurwaDROP` })

const count = ref<1 | 2 | 3 | 4 | 5>(1)
const fast = ref(false)
const kurwadrop = ref(false)
// KURWADROP costs a bit more: priced so the case keeps its RTP
const openPrice = computed(() => (kurwadrop.value ? cs.value.kurwadrop.price : cs.value.price))
const phase = ref<'idle' | 'spinning' | 'result'>('idle')
const results = ref<InventoryItem[]>([])
const sold = ref<string[]>([])
const demo = ref(false)
const reel = useTemplateRef<{ spin: (w: InventoryItem[], fast: boolean, kurwa?: boolean[]) => Promise<void> }>('reel')

watch(count, () => {
  if (phase.value === 'result') phase.value = 'idle'
  results.value = []
})

const unsoldTotal = computed(() =>
  demo.value ? 0 : results.value.filter((r) => !sold.value.includes(r.uid)).reduce((a, r) => a + r.price, 0),
)

async function open(asDemo = false) {
  if (phase.value === 'spinning') return
  if (!asDemo && !session.user) return ui.openSignIn()
  if (!asDemo && session.user && session.user.balance < openPrice.value * count.value) {
    toast.show(t('wallet.notEnough'), 'danger')
    return navigateTo('/deposit')
  }
  phase.value = 'spinning'
  demo.value = asDemo
  sold.value = []
  results.value = []
  try {
    const res = await $fetch<OpenCaseResponse>(`/api/cases/${slug.value}/open`, {
      method: 'POST',
      body: { count: count.value, demo: asDemo, kurwadrop: kurwadrop.value },
    })
    if (!asDemo && session.user) session.user.balance = res.balance
    results.value = res.drops
    await reel.value?.spin(res.drops, fast.value, res.kurwa)
    phase.value = 'result'
    if (asDemo) toast.show(t('case.demoBadge'))
  } catch (e) {
    phase.value = 'idle'
    toast.error(e, t('common.error'))
  }
}

async function sell(uids: string[]) {
  if (demo.value || !uids.length) return
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids } })
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

const reelSection = useTemplateRef<HTMLElement>('reelSection')
const scrollToReel = () => reelSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })

const chance = (tickets: number) => {
  const p = tickets / 10_000
  return `${p >= 1 ? +p.toFixed(1) : +p.toPrecision(2)}%`
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <div class="flex flex-col gap-4">
      <UiPageBar
        :title="cs.name"
        :left="[
          { label: $t('case.allCases'), icon: 'arrow-left', to: '/' },
          { label: $t('case.share'), icon: 'share', onClick: share },
        ]"
        :right="[
          { label: $t('case.demoSpin'), icon: 'demo', onClick: () => open(true) },
          { label: $t('case.fairness'), icon: 'shield', to: '/fairness' },
        ]"
      />
      <CaseTransparency :data="cs" />
    </div>

    <section ref="reelSection" class="flex scroll-mt-24 flex-col gap-4">
      <CaseReel ref="reel" :data="cs" :count="count" :phase="phase" :results="results" :sold-uids="sold" :demo="demo" :kurwadrop="kurwadrop" @sell="(uid) => sell([uid])" />
      <CaseOpenControls
        ref="controlsEl"
        v-model:count="count"
        v-model:fast="fast"
        v-model:kurwadrop="kurwadrop"
        :price="openPrice"
        :phase="phase"
        :unsold-total="unsoldTotal"
        @open="open()"
        @sell-all="sell(results.filter((r) => !sold.includes(r.uid)).map((r) => r.uid))"
      />
    </section>

    <Transition name="kd-sticky">
      <div
        v-if="!controlsVisible"
        class="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-neutral-5 bg-neutral-2/95 px-4 py-3 backdrop-blur lg:hidden"
      >
        <img :src="cs.image" alt="" class="size-10 object-contain" />
        <span class="type-12-caps min-w-0 flex-1 truncate">{{ cs.name }} · x{{ count }}</span>
        <UiButton :loading="phase === 'spinning'" @click="open(); scrollToReel()">
          {{ $t('case.open', { count }) }}
          <UiPrice :amount="openPrice * count" size="s" tone="inverse" />
        </UiButton>
      </div>
    </Transition>

    <section class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-3">
        <ItemDropCard v-for="it in cs.items" :key="it.id" :item="it" :chance="chance(it.tickets)" :range="[it.ticketFrom, it.ticketTo]" />
      </div>
    </section>
  </div>
</template>

<style scoped>
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
