<script setup lang="ts">
import type { DailyStep, InventoryItem, OpenCaseResponse, RankStep, SellResponse } from '#shared/types/api'
import type { StageLayer, StageLoot } from '~/components/banner/Stage.vue'

/*
 * Bonuses: the welcome cases (three free opens for signing up), then the level program — a rank every 10 levels and
 * three rewards that all grow with the level and never run out:
 *   Daily case — free once every 24 h, one tier per rank;
 *   Level case — one for every new level, worth more each level, a big one on every new rank;
 *   Rakeback — a share of the house edge on every bet, higher every rank, claimed any time.
 * Promo code — one field. Every free case opens on the same reel as paid cases.
 * The page opens with a banner, like the home page and Provably Fair (no page bar): the chicken with a gift on the
 * BannerStage and the one thing on offer now — the welcome cases, the daily case, or when the next one comes —
 * with its button. Under it the level (what it is, how far the next one is, what it does for the daily case) and the
 * promo code side by side; then the free case on the reel the full width, and everything it holds.
 */
useHead({ title: 'Bonuses · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const { data, refresh, dailyReady, dailyIn, welcomeLeft, levelCount } = useBonuses()

const daily = computed(() => data.value?.daily ?? null)
const level = computed(() => data.value?.level ?? null)
const rank = computed(() => level.value?.ranks[level.value.rank] ?? null)
// guests get the ladder only
const { data: preview } = useLazyFetch<{ ladder: Array<Omit<DailyStep, 'items'>>; ranks: RankStep[] }>('/api/bonuses/preview', { key: 'bonus-preview', server: false })
const welcome = computed(() => (welcomeLeft.value > 0 ? (data.value?.welcome ?? null) : null))

// Which free case is on the reel: the one the player tapped Open on, else the welcome cases, the daily case when it is
// ready, a level case; the daily case (with its timer) when nothing is ready
type FreeSource = 'welcome' | 'daily' | 'level'
const readyOf = (s: FreeSource) => (s === 'welcome' ? !!welcome.value : s === 'level' ? levelCount.value > 0 : dailyReady.value)
const picked = ref<FreeSource | null>(null)
const source = computed<FreeSource>(() => {
  if (picked.value && readyOf(picked.value)) return picked.value
  return welcome.value ? 'welcome' : dailyReady.value ? 'daily' : levelCount.value ? 'level' : 'daily'
})
const caseOf = (s: FreeSource) => (s === 'welcome' ? welcome.value?.case : s === 'level' ? level.value?.levelCase : daily.value?.case) ?? null
const nextFree = computed(() => caseOf(source.value))
const freeReady = computed(() => readyOf(source.value))
const OPEN_URL: Record<FreeSource, string> = { welcome: '/api/bonuses/welcome/open', daily: '/api/bonuses/daily/open', level: '/api/bonuses/level/open' }

const phase = ref<'idle' | 'spinning' | 'result'>('idle')
// The case on the reel switches only between openings, so the last welcome drop stays on screen
const freeCase = shallowRef(nextFree.value)
// which kind of free case is on the reel now (the header names it; after a drop it stays until the next opening)
const reelSource = ref<FreeSource>(source.value)
watch([nextFree, phase], () => {
  if (phase.value === 'idle' || !freeCase.value) {
    freeCase.value = nextFree.value
    reelSource.value = source.value
  }
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
  reelSource.value = source.value
  phase.value = 'spinning'
  sold.value = []
  try {
    const res = await $fetch<OpenCaseResponse>(OPEN_URL[source.value], { method: 'POST' })
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
/** A reward card's Open: that case goes on the reel, which comes into view and spins */
async function openSource(s: FreeSource) {
  if (!session.user) return ui.openSignIn()
  picked.value = s
  await nextTick()
  reelEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  openFree()
}

// Rakeback: claimed into the balance in one tap
const claiming = ref(false)
async function claimRakeback() {
  if (claiming.value) return
  claiming.value = true
  try {
    const res = await $fetch<{ claimed: number; balance: number }>('/api/bonuses/rakeback/claim', { method: 'POST' })
    if (session.user) session.user.balance = res.balance
    toast.show(t('bonus.rakebackClaimed', { amount: formatCoins(res.claimed) }), 'success')
    refresh()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    claiming.value = false
  }
}
const pct = (bp: number) => `${+(bp / 100).toFixed(1)}%`
const rankName = (tier: number) => level.value?.ranks[tier]?.name ?? preview.value?.ranks[tier]?.name ?? ''

// The contents can show any tier: the player's own by default, the others to see what levels bring (locked ones
// say from which level). Tapping a step of the level's ladder opens its tier here too.
const isSm = useMediaQuery('(min-width: 640px)')
const viewTier = ref<number | null>(null)
watch(() => daily.value?.tier, () => (viewTier.value = null))
const shownTier = computed({ get: () => viewTier.value ?? daily.value?.tier ?? 0, set: (v: number) => (viewTier.value = v) })
const tierOptions = computed(() =>
  (daily.value?.ladder ?? []).map((st) => ({ value: st.tier, label: rankName(st.tier), icon: st.tier > daily.value!.tier ? 'lock' : undefined })),
)
const shownStep = computed(() => daily.value?.ladder?.find((st) => st.tier === shownTier.value) ?? null)
const contents = computed(() => (reelSource.value !== 'daily' || !shownStep.value || shownTier.value === daily.value?.tier ? freeCase.value?.items : shownStep.value.items) ?? [])
const contentsEl = useTemplateRef<HTMLElement>('contentsEl')
function peekTier(tier: number) {
  shownTier.value = tier
  contentsEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// the drop chances on the case's contents
const chance = (tickets: number) => {
  const p = tickets / 10_000
  return `${p >= 1 ? +p.toFixed(1) : +p.toPrecision(2)}%`
}

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
  if (levelCount.value) return { title: t('bonus.levelReadyTitle', { n: levelCount.value }, levelCount.value), text: t('bonus.levelReadyText') }
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
      class="relative isolate flex min-h-80 flex-col overflow-hidden rounded-5xl px-5 pt-6 pb-6 lg:h-80 lg:min-h-0 lg:overflow-visible lg:rounded-[32px] lg:p-10"
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
          :bubble="$t(bubble)"
          :bubble-at="{ x: 470, y: 10 }"
          :poke-label="$t('bonus.pokeLabel')"
          @poke="onPoke"
        />
      </div>
      <div class="relative z-10 flex flex-col justify-between gap-5 sm:max-w-[52%] lg:justify-center lg:gap-10 lg:h-full lg:w-[600px] lg:max-w-none">
        <div class="flex flex-col gap-2">
          <p class="type-12-caps lg:type-16-caps text-coin lg:font-bold">{{ $t('bonus.title') }}</p>
          <h1 class="text-[28px] leading-8 font-extrabold uppercase tabular-nums lg:type-48-caps">{{ offer.title }}</h1>
          <p class="type-14-regular text-neutral-13 lg:type-16-medium">{{ offer.text }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton v-if="!session.user" size="l" icon="sign-in" class="max-sm:h-10 max-sm:px-4" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
          <UiButton v-else-if="freeReady" size="l" icon="bonuses" class="max-sm:h-10 max-sm:px-4" :loading="phase === 'spinning'" @click="openFromBanner">
            {{ source === 'welcome' && welcome ? $t('welcome.openFree', { n: welcome.left }) : $t('bonus.openFree') }}
          </UiButton>
          <!-- phones: a short word, so the icon is never alone -->
          <UiButton v-if="session.user" variant="ghost" size="l" icon="sparkle" class="max-sm:h-10 max-sm:px-3" @click="toPromo"><span class="sm:hidden">{{ $t('bonus.promoShort') }}</span><span class="max-sm:hidden">{{ $t('bonus.promo') }}</span></UiButton>
        </div>
      </div>
    </section>

    <!-- Guests: what signing in starts — the daily case's ladder, standing on its first step -->
    <section v-if="!session.user && preview?.ladder?.length" class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-5">
      <span class="type-16-caps">{{ $t('bonus.levelsGive') }}</span>
      <BonusLadder :ladder="preview.ladder" :ranks="preview.ranks" :tier="0" @pick="ui.openSignIn()" />
      <p class="type-12-regular text-neutral-11">{{ $t('bonus.guestLadder') }}</p>
    </section>

    <!-- The level program: who you are (level, rank, how far the next level is) over the ranks' ladder, then the three
         rewards side by side — the daily case, the level cases, rakeback — then the promo code -->
    <section v-if="session.user && daily && level" class="grid gap-4">
      <div class="flex flex-col gap-5 rounded-5xl bg-neutral-2 p-5 lg:p-6">
        <div class="flex items-center gap-3">
          <UiAvatar :src="session.user.avatar" :size="44" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="type-16-caps">{{ $t('account.memberLevel', { level: session.user.level }) }} · <span class="text-coin">{{ rank?.name }}</span></span>
            <div class="flex items-center gap-2">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-neutral-5">
                <div class="bg-brand-gradient h-full rounded-full transition-[width] duration-700" :style="{ width: `${session.user.levelProgress}%` }" />
              </div>
              <span class="type-12-caps shrink-0 text-neutral-12 tabular-nums">{{ $t('account.levelNext', { n: session.user.level + 1 }) }}</span>
            </div>
          </div>
        </div>
        <BonusLadder :ladder="daily.ladder ?? []" :ranks="level.ranks" :tier="daily.tier" @pick="peekTier" />
        <p class="type-12-regular text-neutral-11">
          {{ $t('bonus.levelHow') }}{{ session.user.levelLeft != null ? ` ${$t('bonus.toNextLeft', { amount: formatCoins(session.user.levelLeft), n: session.user.level + 1 })}` : '' }}
        </p>
      </div>

      <!-- the three rewards, one card each: what it is, what is waiting, one button -->
      <div class="grid gap-3 lg:grid-cols-3 lg:gap-4">
        <div class="kd-reward flex flex-col gap-3 rounded-5xl bg-neutral-2 p-5">
          <div class="flex items-center gap-3">
            <img :src="daily.case.image" alt="" class="size-12 shrink-0 object-contain" />
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="type-16-caps">{{ $t('bonus.dailyShort') }}</span>
              <span class="type-12-regular text-neutral-11">{{ $t('bonus.dailyRank', { rank: rank?.name }) }}</span>
            </div>
            <UiPrice :amount="daily.case.price" tone="coin" class="ml-auto shrink-0" />
          </div>
          <UiButton v-if="dailyReady" size="m" block class="mt-auto" @click="openSource('daily')">{{ $t('bonus.openFree') }}</UiButton>
          <div v-else class="mt-auto flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-3">
            <UiIcon name="history" :size="16" class="text-neutral-11" /><span class="type-14 tabular-nums">{{ dailyIn }}</span>
          </div>
        </div>
        <div class="kd-reward flex flex-col gap-3 rounded-5xl bg-neutral-2 p-5" :class="levelCount > 0 && 'is-ready'">
          <div class="flex items-center gap-3">
            <span class="kd-reward-badge grid size-12 shrink-0 place-items-center rounded-2xl"><UiLevelBadge :level="level.levelCases[0]?.level ?? level.next.level" /></span>
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="type-16-caps">{{ $t('bonus.levelCase') }}</span>
              <span class="type-12-regular text-neutral-11">
                {{ levelCount ? $t('bonus.levelCasesReady', { n: levelCount }, levelCount) : $t('bonus.levelCaseNext', { n: level.next.level }) }}
              </span>
            </div>
            <UiPrice :amount="level.levelCases[0]?.price ?? level.next.price" tone="coin" class="ml-auto shrink-0" />
          </div>
          <UiButton v-if="levelCount" size="m" block class="mt-auto" @click="openSource('level')">{{ $t('bonus.openFree') }}</UiButton>
          <p v-else class="type-12-regular mt-auto text-neutral-11">{{ level.next.big ? $t('bonus.levelCaseBig') : $t('bonus.levelCaseHow') }}</p>
        </div>
        <div class="kd-reward flex flex-col gap-3 rounded-5xl bg-neutral-2 p-5" :class="level.rakeback.pending >= 1 && 'is-ready'">
          <div class="flex items-center gap-3">
            <span class="kd-reward-badge grid size-12 shrink-0 place-items-center rounded-2xl text-success"><UiIcon name="refresh" :size="24" /></span>
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="type-16-caps">{{ $t('bonus.rakeback') }}</span>
              <span class="type-12-regular text-neutral-11">{{ $t('bonus.rakebackHow', { pct: pct(level.rakeback.rateBp) }) }}</span>
            </div>
            <UiPrice :amount="level.rakeback.pending" tone="success" class="ml-auto shrink-0" />
          </div>
          <UiButton size="m" variant="fair" block class="mt-auto" :disabled="level.rakeback.pending < 1" :loading="claiming" @click="claimRakeback">{{ $t('bonus.claim') }}</UiButton>
        </div>
      </div>
      <!-- the promo code sits as tall as it needs: its words and the field side by side on desktop, no empty middle -->
      <div ref="promoEl" class="scroll-mt-24 flex flex-col gap-3 rounded-5xl bg-neutral-2 p-5 lg:flex-row lg:items-center lg:gap-6">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="type-16-caps">{{ $t('bonus.promo') }}</span>
          <p class="type-12-regular text-neutral-11">{{ $t('bonus.promoText') }}</p>
        </div>
        <BonusPromo bare class="lg:w-[460px]" />
      </div>
    </section>

    <!-- The free case on the reel, the full width, and everything it holds -->
    <section v-if="session.user && daily && freeCase" class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <img :src="freeCase.image" alt="" class="size-12 object-contain" />
        <div class="flex flex-col gap-0.5">
          <h2 class="type-16-caps lg:type-20-caps">{{ reelSource === 'welcome' ? $t('welcome.name') : reelSource === 'level' ? freeCase.name : $t('bonus.dailyShort') }}</h2>
          <span class="type-12-caps text-coin">
            {{ reelSource === 'welcome' && welcome ? $t('welcome.left', { n: welcome.left, total: welcome.total }) : reelSource === 'level' ? $t('bonus.levelCasesReady', { n: levelCount }, levelCount) : $t('bonus.dailyRank', { rank: rank?.name }) }}
          </span>
        </div>
      </div>
      <div ref="reelEl" class="flex scroll-mt-24 flex-col gap-4">
        <CaseReel ref="reel" :key="freeCase.slug" :data="freeCase" :count="1" :phase="phase" :results="results" :sold-uids="sold" @sell="sell" />
        <div class="flex justify-center">
          <UiButton v-if="freeReady || phase === 'spinning'" size="l" class="w-full lg:w-72" :loading="phase === 'spinning'" @click="openFree">
            <span>{{ phase === 'spinning' ? $t('case.opening') : source === 'welcome' && welcome ? $t('welcome.openFree', { n: welcome.left }) : $t('bonus.openFree') }}</span>
            <span v-if="phase !== 'spinning'" class="kd-shine" />
          </UiButton>
          <div v-else class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-3 lg:w-72">
            <UiIcon name="history" :size="18" class="text-neutral-11" />
            <span class="type-16-caps tabular-nums">{{ dailyIn }}</span>
          </div>
        </div>
      </div>
      <!-- the contents, by tier: the switch shows that the case changes with the level and what each tier holds -->
      <div ref="contentsEl" class="flex scroll-mt-24 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 class="type-20-caps flex-1 text-neutral-15">{{ $t('case.contents') }}</h2>
          <UiSegmented v-if="reelSource === 'daily' && tierOptions.length" v-model="shownTier" :options="tierOptions" size="s" class="max-sm:w-full" :block="!isSm" />
        </div>
        <!-- what the shown tier is to the player, in one line -->
        <p v-if="reelSource === 'daily' && shownStep" class="type-14-regular flex items-center gap-2 text-neutral-12">
          <template v-if="shownStep.tier === daily.tier">
            <UiIcon name="check-circle" :size="18" class="shrink-0 text-success" />{{ $t('bonus.tierYours') }}
          </template>
          <template v-else-if="shownStep.tier > daily.tier">
            <UiIcon name="lock" :size="18" class="shrink-0 text-neutral-11" />{{ $t('bonus.tierLocked', { n: shownStep.fromLevel, left: shownStep.fromLevel - session.user.level, amount: formatCoins(shownStep.value) }, shownStep.fromLevel - session.user.level) }}
          </template>
          <template v-else>
            <UiIcon name="check-circle" :size="18" class="shrink-0 text-neutral-11" />{{ $t('bonus.tierPassed') }}
          </template>
        </p>
        <TransitionGroup tag="div" name="kd-tier" class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6 lg:gap-3">
          <ItemDropCard v-for="it in contents" :key="`${shownTier}-${it.id}`" :item="it" :compact="!isSm" :chance="chance(it.tickets)" />
        </TransitionGroup>
      </div>
    </section>

    <div v-else-if="session.user" class="grid gap-4 lg:grid-cols-2">
      <span class="kd-skeleton h-44 rounded-5xl" />
      <span class="kd-skeleton h-44 rounded-5xl" />
      <span class="kd-skeleton h-[278px] rounded-5xl lg:col-span-2" />
    </div>
  </div>
</template>

<style scoped>
/* a reward with something waiting gets the brand edge, like the player's rank on the ladder */
.kd-reward.is-ready {
  box-shadow: inset 0 0 0 1.5px var(--color-brand-base);
}
.kd-reward-badge {
  background: var(--color-neutral-3);
}
/* switching tiers: the new contents rise in, the old ones step out of the grid at once (no height jump) */
.kd-tier-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-tier-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.kd-tier-leave-active {
  display: none;
}
.kd-bonus-ground {
  background:
    radial-gradient(55% 90% at 74% 55%, rgb(255 170 40 / 0.34), transparent 70%),
    radial-gradient(40% 60% at 66% 100%, rgb(255 210 110 / 0.2), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #2a1d07 100%);
}
</style>
