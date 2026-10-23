<script setup lang="ts">
import type { InventoryItem, OpenCaseResponse, SellResponse } from '#shared/types/api'

/*
 * Bonuses, kept to what the brief needs until the client's wireframes arrive:
 *   Welcome cases — three free opens for signing up, then
 *   Daily case — free once every 24 h, opened on the same reel as paid cases; it gets better every 5 levels.
 *   Promo code — one field.
 * Race, season pass, missions, chains, rakeback and level rewards were cut on 2026-10-23 (docs/ux-research-v3.md).
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
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <UiPageBar :title="$t('bonus.title')" :left="[{ label: $t('case.allCases'), icon: 'arrow-left', to: '/' }]" />

    <div v-if="!session.user" class="flex flex-col items-center gap-4 rounded-5xl bg-neutral-2 py-16 text-center">
      <p class="type-14-regular text-neutral-12">{{ $t('bonus.signIn') }}</p>
      <UiButton icon="sign-in" @click="ui.openSignIn()">{{ $t('auth.signInToPlay') }}</UiButton>
    </div>

    <!-- The free case on the reel, its contents and the promo code beside it -->
    <section v-else-if="daily && freeCase" class="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
      <div class="flex flex-col gap-4">
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
        <BonusPromo />
      </div>
    </section>

    <div v-else class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <span class="kd-skeleton h-[278px] rounded-5xl" />
      <span class="kd-skeleton h-[278px] rounded-5xl" />
    </div>
  </div>
</template>
