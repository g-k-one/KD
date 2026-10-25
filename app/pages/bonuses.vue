<script setup lang="ts">
import type { InventoryItem, OpenCaseResponse, SellResponse } from '#shared/types/api'
import type { StageLayer, StageLoot } from '~/components/banner/Stage.vue'

/*
 * Bonuses, kept to what the brief needs until the client's wireframes arrive:
 *   Welcome cases — three free opens for signing up, then
 *   Daily case — free once every 24 h, opened on the same reel as paid cases; it gets better every 5 levels.
 *   Promo code — one field.
 * Race, season pass, missions, chains, rakeback and level rewards were cut on 2026-10-23 (docs/ux-research-v3.md).
 * The page opens with a banner, like the home page and Provably Fair (no page bar): the chicken with a gift on the
 * BannerStage and the one thing on offer now — the welcome cases, the daily case, or when the next one comes —
 * with its button; the bonuses themselves follow under it.
 */
useHead({ title: 'Bonuses · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const { data, refresh, dailyReady, dailyIn, welcomeLeft } = useBonuses()

const daily = computed(() => data.value?.daily ?? null)
// Welcome cases come first on the same reel; once they are used up the daily case takes the spot
const welcome = computed(() => (welcomeLeft.value > 0 ? (data.value?.welcome ?? null) : null))
const nextFree = computed(() => welcome.value?.case ?? daily.value?.case ?? null)
const freeReady = computed(() => !!welcome.value || dailyReady.value)

const phase = ref<'idle' | 'spinning' | 'result'>('idle')
// The case on the reel switches only between openings, so the last welcome drop stays on screen
const freeCase = shallowRef(nextFree.value)
watch([nextFree, phase], () => {
  if (phase.value === 'idle' || !freeCase.value) freeCase.value = nextFree.value
})
const results = ref<InventoryItem[]>([])
const sold = ref<string[]>([])
const reel = useTemplateRef<{ spin: (w: InventoryItem[], fast: boolean, kurwa?: boolean[]) => Promise<void> }>('reel')

async function openFree() {
  if (!session.user) return ui.openSignIn()
  if (!freeReady.value || phase.value === 'spinning') return
  if (freeCase.value?.slug !== nextFree.value?.slug) {
    freeCase.value = nextFree.value
    await nextTick()
  }
  phase.value = 'spinning'
  sold.value = []
  try {
    const res = await $fetch<OpenCaseResponse>(welcome.value ? '/api/bonuses/welcome/open' : '/api/bonuses/daily/open', { method: 'POST' })
    results.value = res.drops
    await reel.value?.spin(res.drops, false)
    phase.value = 'result'
    refresh()
  } catch (e) {
    phase.value = 'idle'
    toast.error(e, t('common.error'))
  }
}

async function sell(uid: string) {
  try {
    const res = await $fetch<SellResponse>('/api/inventory/sell', { method: 'POST', body: { uids: [uid] } })
    sold.value = [...sold.value, ...res.sold]
    if (session.user) session.user.balance = res.balance
  } catch (e) {
    toast.error(e, t('common.error'))
  }
}
const tierNames = ['I', 'II', 'III', 'IV']

// --- Banner -----------------------------------------------------------------------------------------------------
const { onMove, onLeave, vars } = usePointerTilt()
const stage = useTemplateRef<{ burst: () => void }>('stage')
const reelEl = useTemplateRef<HTMLElement>('reelEl')
const promoEl = useTemplateRef<HTMLElement>('promoEl')
/** What the banner offers: the welcome cases first, then the daily case, else when it comes */
const offer = computed(() => {
  if (!session.user) return { title: t('welcome.guestTitle'), text: t('welcome.guestText') }
  if (welcome.value) return { title: t('welcome.userTitle', { n: welcome.value.left }, welcome.value.left), text: t('welcome.userText') }
  if (dailyReady.value) return { title: t('bonus.dailyReadyTitle'), text: t('bonus.dailyText') }
  return { title: t('bonus.nextIn', { t: dailyIn.value }), text: t('bonus.dailyText') }
})
/** The banner's button opens the free case right on the reel below, brought into view first */
function openFromBanner() {
  if (!session.user) return ui.openSignIn()
  reelEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  openFree()
}
const toPromo = () => promoEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })

const MASCOT: StageLayer = { src: '/img/hero/bonus-chicken.webp', x: 250, y: 20, w: 290, d: 0.6 }
// the skins this free case really holds, then gifts and coins
const loot = computed<StageLoot[]>(() => {
  const skins = (freeCase.value?.items ?? []).slice(0, 3)
  const SKIN_AT = [
    { x: 40, y: 40, w: 170, r: -18, d: 1.3, bx: -28, by: -16 },
    { x: 10, y: 220, w: 150, r: 12, d: 1.6, bx: -30, by: 12 },
    { x: 470, y: 250, w: 140, r: -10, d: 1.4, bx: 28, by: 12 },
  ]
  return [
    ...skins.map((it, i) => ({ src: it.image, ...SKIN_AT[i]! })),
    { src: '/img/hero/bonus-gift.webp', x: 180, y: 290, w: 84, r: -12, d: 1.8, bx: -18, by: 14 },
    { src: '/img/hero/bonus-gift.webp', x: 520, y: 40, w: 64, r: 16, d: 2, bx: 20, by: -14 },
    { src: '/img/coins/coin.webp', x: 200, y: 150, w: 44, r: -24, d: 1.9, bx: -20, by: -10 },
    { src: '/img/coins/coin.webp', x: 560, y: 180, w: 36, r: 20, d: 2.1, bx: 22, by: -6 },
    { src: '/img/coins/coin.webp', x: 120, y: 340, w: 40, r: 30, d: 1.7, bx: -16, by: 14 },
  ]
})
const pokes = ref(0)
function onPoke(n: number) {
  pokes.value = Math.min(n, 5)
  if (n === 5) stage.value?.burst()
}
const bubble = computed(() => (pokes.value >= 5 ? 'bonus.pokeDone' : `bonus.poke${pokes.value}`))
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <!-- no page bar: the banner opens the page, like the home page's and Provably Fair's -->
    <section
      class="relative isolate flex min-h-80 flex-col overflow-hidden rounded-5xl px-5 pt-6 pb-6 lg:h-81 lg:overflow-visible lg:px-10 lg:pt-8 lg:pb-10"
      :style="vars"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
      <!-- the ground: near-black, a pool of gold light where the gift opens -->
      <span class="kd-bonus-ground pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" aria-hidden="true" />
      <div class="relative -mx-5 -mt-6 mb-2 h-44 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[50%] lg:w-[620px]">
        <BannerStage
          ref="stage"
          :mascot="MASCOT"
          :loot="loot"
          :rays="{ x: 330, y: 150, color: 'rgb(255 205 90 / 0.16)' }"
          :bubble="$t(bubble)"
          :bubble-at="{ x: 470, y: 10 }"
          :poke-label="$t('bonus.pokeLabel')"
          @poke="onPoke"
        />
      </div>
      <div class="relative z-10 flex flex-col justify-between gap-5 sm:max-w-[52%] lg:h-full lg:w-[600px] lg:max-w-none">
        <div class="flex flex-col gap-2">
          <p class="type-12-caps lg:type-16-caps text-coin lg:font-bold">{{ $t('bonus.title') }}</p>
          <h1 class="text-[28px] leading-8 font-extrabold uppercase tabular-nums lg:type-48-caps">{{ offer.title }}</h1>
          <p class="type-14-regular text-neutral-13 lg:type-16-medium">{{ offer.text }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton v-if="!session.user" size="l" icon="sign-in" class="max-sm:h-10 max-sm:px-4" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
          <UiButton v-else-if="freeReady" size="l" icon="bonuses" class="max-sm:h-10 max-sm:px-4" :loading="phase === 'spinning'" @click="openFromBanner">
            {{ welcome ? $t('welcome.openFree', { n: welcome.left }) : $t('bonus.openFree') }}
          </UiButton>
          <!-- phones: the icon alone, the main button takes the width -->
          <UiButton v-if="session.user" variant="ghost" size="l" icon="sparkle" class="max-sm:h-10 max-sm:px-3" :aria-label="$t('bonus.promo')" @click="toPromo"><span class="max-sm:hidden">{{ $t('bonus.promo') }}</span></UiButton>
        </div>
      </div>
    </section>

    <!-- The free case on the reel, its contents and the promo code beside it -->
    <section v-if="session.user && daily && freeCase" class="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
      <div ref="reelEl" class="flex scroll-mt-24 flex-col gap-4">
        <CaseReel ref="reel" :key="freeCase.slug" :data="freeCase" :count="1" :phase="phase" :results="results" :sold-uids="sold" @sell="sell" />
        <div class="flex justify-center">
          <UiButton v-if="freeReady || phase === 'spinning'" size="l" class="w-full lg:w-72" :loading="phase === 'spinning'" @click="openFree">
            <span>{{ phase === 'spinning' ? $t('case.opening') : welcome ? $t('welcome.openFree', { n: welcome.left }) : $t('bonus.openFree') }}</span>
            <span v-if="phase !== 'spinning'" class="kd-shine" />
          </UiButton>
          <div v-else class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-3 lg:w-72">
            <UiIcon name="history" :size="18" class="text-neutral-11" />
            <span class="type-16-caps tabular-nums">{{ dailyIn }}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <aside class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-5">
          <div class="flex items-center gap-3">
            <img :src="freeCase.image" alt="" class="size-14 object-contain" />
            <div class="flex flex-col gap-0.5">
              <span class="type-16-caps">{{ welcome ? $t('welcome.name') : $t('bonus.dailyShort') }}</span>
              <span class="type-12-caps text-coin">{{ welcome ? $t('welcome.left', { n: welcome.left, total: welcome.total }) : $t('bonus.tier', { tier: tierNames[daily.tier] }) }}</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="it in freeCase.items.slice(0, 6)" :key="it.id" class="group flex flex-col items-center gap-1 rounded-2xl bg-neutral-3 p-2">
              <ItemArt :image="it.image" :rarity="it.rarity" :size="44" class="w-full" />
              <UiPrice :amount="it.price" size="xs" />
            </div>
          </div>
        </aside>
        <div ref="promoEl" class="scroll-mt-24"><BonusPromo /></div>
      </div>
    </section>

    <div v-else-if="session.user" class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <span class="kd-skeleton h-[278px] rounded-5xl" />
      <span class="kd-skeleton h-[278px] rounded-5xl" />
    </div>
  </div>
</template>

<style scoped>
.kd-bonus-ground {
  background:
    radial-gradient(55% 90% at 74% 55%, rgb(255 170 40 / 0.34), transparent 70%),
    radial-gradient(40% 60% at 66% 100%, rgb(255 210 110 / 0.2), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #2a1d07 100%);
}
</style>
