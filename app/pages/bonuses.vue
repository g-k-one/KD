<script setup lang="ts">
import type { ClaimLevelResponse, InventoryItem, LevelReward, OpenCaseResponse, PassResponse, SellResponse } from '#shared/types/api'

/*
 * Bonuses (player audit D5 + D6): the reason to come back tomorrow.
 *   Daily case — free once every 24 h, opened on the same reel as paid cases; it gets better every 5 levels.
 *   Level rewards — every level pays coins, every 5th also upgrades the daily case. Claim with a coin burst.
 *   Rakeback — a share of every coin played comes back; the share grows every 10 levels.
 *   Daily missions — three small goals a day with a coin reward each.
 *   Promo code — one field.
 * XP = coins played (cases, upgrades, battles), 25 coins a level.
 */
useHead({ title: 'Bonuses · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()
const sfx = useSfx()
const fx = useForge()
const { data, refresh, dailyReady, dailyIn, welcomeLeft } = useBonuses()

const daily = computed(() => data.value?.daily ?? null)
// Season pass: its own endpoint, refreshed with the bonuses (both move when the player plays)
const { data: pass, refresh: refreshPass } = useFetch<PassResponse>('/api/pass', { key: 'pass', server: false, lazy: true })
watch(data, () => session.user && refreshPass())
// Welcome cases (C3) come first on the same reel; once they are used up the daily case takes the spot
const welcome = computed(() => (welcomeLeft.value > 0 ? (data.value?.welcome ?? null) : null))
const nextFree = computed(() => welcome.value?.case ?? daily.value?.case ?? null)
const freeReady = computed(() => !!welcome.value || dailyReady.value)
const levels = computed(() => data.value?.levels ?? [])

// --- Daily case on the shared reel ------------------------------------------------
const phase = ref<'idle' | 'spinning' | 'result'>('idle')
// The case on the reel switches only between openings, so the last welcome drop stays on screen
const freeCase = shallowRef(nextFree.value)
watch([nextFree, phase], () => {
  if (phase.value === 'idle' || !freeCase.value) freeCase.value = nextFree.value
})
const results = ref<InventoryItem[]>([])
const sold = ref<string[]>([])
const reel = useTemplateRef<{ spin: (w: InventoryItem[], fast: boolean, kurwa?: boolean[]) => Promise<void> }>('reel')

async function openDaily() {
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

// --- Level rewards ------------------------------------------------------------------
const road = useTemplateRef<{ nodes: Record<number, HTMLElement> }>('road')
const claiming = ref<number | null>(null)
async function claim(r: LevelReward) {
  claiming.value = r.level
  try {
    const res = await $fetch<ClaimLevelResponse>(`/api/bonuses/levels/${r.level}/claim`, { method: 'POST' })
    if (session.user) session.user.balance = res.balance
    // useFetch data is a shallow ref in Nuxt 4: replace the object, a nested assignment would not re-render
    if (data.value) data.value = { ...data.value, levels: res.levels }
    fx.at('kdJackpot', road.value?.nodes[r.level], 1.2)
    sfx.reveal(2)
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    claiming.value = null
  }
}
// Several levels waiting: take them all in one go, one after another so every card gets its burst
const claimableList = computed(() => (data.value?.levels ?? []).filter((l) => l.status === 'claimable'))
const claimingAll = ref(false)
async function claimAll() {
  claimingAll.value = true
  for (const r of claimableList.value.slice()) {
    await claim(r)
    await new Promise((res) => setTimeout(res, 180))
  }
  claimingAll.value = false
}
// The hero tiles jump to their sections
const sections = { daily: useTemplateRef<HTMLElement>('secDaily'), missions: useTemplateRef<HTMLElement>('secMissions'), rakeback: useTemplateRef<HTMLElement>('secRakeback') }
const go = (k: keyof typeof sections) => sections[k].value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const tierNames = ['I', 'II', 'III', 'IV']
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('bonus.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />

    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('bonus.signIn') }}</p>
      <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <template v-else-if="daily && data">
      <BonusHero :data="data" :level="session.user.level" :progress="session.user.levelProgress" :daily-ready="dailyReady" :daily-in="dailyIn" @go="go" />

      <!-- Weekly race and the season pass: the reasons to come back this week and this month -->
      <div id="race" class="scroll-mt-24">
        <BonusRace />
      </div>
      <BonusPass v-if="pass" :data="pass" @update="(p) => (pass = p)" />

      <!-- Level rewards: a road, tap a gold node to claim -->
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-3">
          <h2 class="type-20-caps">{{ $t('bonus.levels') }}</h2>
          <UiButton v-if="claimableList.length > 1" variant="gold" size="m" icon="bonuses" :loading="claimingAll" @click="claimAll">
            {{ $t('bonus.claimAll', { n: claimableList.length }) }}
          </UiButton>
        </div>
        <BonusLevelRoad ref="road" :levels="levels" :level="session.user.level" :progress="session.user.levelProgress" :claiming="claiming" @claim="claim" />
      </section>

      <!-- Daily case -->
      <section ref="secDaily" class="grid scroll-mt-24 gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
        <div class="flex flex-col gap-4">
          <CaseReel ref="reel" :key="freeCase!.slug" :data="freeCase!" :count="1" :phase="phase" :results="results" :sold-uids="sold" @sell="sell" />
          <div class="flex justify-center">
            <UiButton v-if="freeReady || phase === 'spinning'" size="l" class="w-full lg:w-72" :loading="phase === 'spinning'" @click="openDaily">
              <span>{{ phase === 'spinning' ? $t('case.opening') : welcome ? $t('welcome.openFree', { n: welcome.left }) : $t('bonus.openFree') }}</span>
              <span v-if="phase !== 'spinning'" class="kd-shine" />
            </UiButton>
            <div v-else class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-3 lg:w-72">
              <UiIcon name="history" :size="18" class="text-neutral-11" />
              <span class="type-16-caps tabular-nums">{{ dailyIn }}</span>
            </div>
          </div>
        </div>
        <aside class="flex flex-col gap-4 rounded-5xl bg-neutral-2 p-5">
          <div class="flex items-center gap-3">
            <img :src="freeCase!.image" alt="" class="size-14 object-contain" />
            <div class="flex flex-col gap-0.5">
              <span class="type-16-caps">{{ welcome ? $t('welcome.name') : $t('bonus.dailyShort') }}</span>
              <span class="type-12-caps text-coin">{{ welcome ? $t('welcome.left', { n: welcome.left, total: welcome.total }) : $t('bonus.tier', { tier: tierNames[daily.tier] }) }}</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="it in freeCase!.items.slice(0, 6)" :key="it.id" class="group flex flex-col items-center gap-1 rounded-2xl bg-neutral-3 p-2">
              <ItemArt :image="it.image" :rarity="it.rarity" :size="44" class="w-full" />
              <UiPrice :amount="it.price" size="xs" />
            </div>
          </div>
        </aside>
      </section>

      <div ref="secMissions" class="scroll-mt-24">
        <BonusMissions :missions="data.missions" :reset-at="data.missionsResetAt" @update="(b) => (data = b)" />
      </div>

      <!-- Rakeback · promo code -->
      <section ref="secRakeback" class="grid scroll-mt-24 gap-4 lg:grid-cols-2 lg:gap-6">
        <BonusRakeback :info="data.rakeback" @update="(b) => (data = b)" />
        <BonusPromo />
      </section>
    </template>

    <div v-else class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <span class="kd-skeleton h-[278px] rounded-5xl" />
      <span class="kd-skeleton h-[278px] rounded-5xl" />
    </div>
  </div>
</template>
