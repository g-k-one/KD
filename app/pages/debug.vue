<script setup lang="ts">
import type { Rarity, RiskLevel, User } from '#shared/types/api'

// Internal QA page: mock backend state, UI kit, tokens, viewport. Not linked from the UI.
useHead({ title: 'Debug · KurwaDROP' })

const session = useSessionStore()
const settingsStore = useSettingsStore()
const { refresh: refreshFeed } = useLiveFeed()

const feedPaused = ref(false)
const balanceInput = ref('')
const apiOut = ref('')

async function setState(body: Record<string, unknown>) {
  const res = await $fetch<{ user: User; feedPaused: boolean }>('/api/debug/state', { method: 'POST', body })
  feedPaused.value = res.feedPaused
  if (session.user) session.user = res.user
}

const addBalance = (cents: number) => setState({ user: { balance: Math.max(0, (session.user?.balance ?? 0) + cents) } })
function applyBalance() {
  const n = Number.parseFloat(balanceInput.value.replace(',', '.'))
  if (Number.isFinite(n)) setState({ user: { balance: Math.round(n * 100) } })
}
async function pushDrop(r: Rarity) {
  await setState({ pushDrop: r })
  await refreshFeed()
}

const ENDPOINTS = ['/api/me', '/api/cases', '/api/feed']
async function callApi(url: string) {
  apiOut.value = JSON.stringify(await $fetch(url), null, 2)
}

// Viewport
const { width, height } = useWindowSize()
const breakpoint = computed(() => {
  const w = width.value
  if (w >= 1536) return '2xl'
  if (w >= 1280) return 'xl'
  if (w >= 1024) return 'lg (desktop layout)'
  if (w >= 768) return 'md'
  if (w >= 640) return 'sm'
  return 'base (mobile)'
})

// UI kit
const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'light', 'success', 'gold'] as const
const PRICE_SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'] as const
const PRICE_TONES = ['default', 'coin', 'success', 'muted'] as const
const RISKS: RiskLevel[] = ['low', 'medium', 'high', 'extreme']
const toggleDemo = ref(true)
const sliderDemo = ref(40)

const TOKENS = [
  'neutral-1', 'neutral-2', 'neutral-3', 'neutral-4', 'neutral-5', 'neutral-6', 'neutral-7', 'neutral-8',
  'neutral-10', 'neutral-11', 'neutral-12', 'neutral-13', 'neutral-14', 'neutral-15',
  'brand-base', 'brand-light', 'brand-bright', 'coin', 'success', 'danger',
]
const TYPE_STYLES = [
  'type-48-caps', 'type-28', 'type-20-caps', 'type-16-caps', 'type-16-medium', 'type-14-caps', 'type-14', 'type-14-regular',
  'type-12-caps', 'type-12', 'type-12-regular', 'type-10-caps',
]
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-6 lg:px-0">
    <div class="flex items-center gap-3">
      <h1 class="type-20-caps flex-1">Debug</h1>
      <span class="type-12 rounded-md bg-neutral-4 px-2 py-1 text-neutral-12">{{ width }}×{{ height }} · {{ breakpoint }}</span>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Session -->
      <section class="dbg-card">
        <h2 class="type-14-caps">Session (mock)</h2>
        <div class="flex flex-wrap gap-2">
          <UiButton v-if="!session.user" size="s" @click="session.login()">Log in as demo user</UiButton>
          <UiButton v-else size="s" variant="secondary" @click="session.logout()">Log out</UiButton>
          <UiButton size="s" variant="secondary" @click="setState({ resetUser: true })">Reset user</UiButton>
        </div>
        <template v-if="session.user">
          <div class="type-12-regular text-neutral-12">Balance: <UiPrice :amount="session.user.balance" size="s" tone="coin" /></div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="addBalance(100)">+1</UiButton>
            <UiButton size="s" variant="secondary" @click="addBalance(10000)">+100</UiButton>
            <UiButton size="s" variant="secondary" @click="addBalance(1000000)">+10 000</UiButton>
            <UiButton size="s" variant="secondary" @click="setState({ user: { balance: 0 } })">Set 0</UiButton>
          </div>
          <form class="flex gap-2" @submit.prevent="applyBalance">
            <input v-model="balanceInput" class="dbg-input" placeholder="Balance in coins, e.g. 125.40" inputmode="decimal" />
            <UiButton size="s" type="submit">Set</UiButton>
          </form>
          <div class="flex flex-wrap items-center gap-2">
            <span class="type-12-regular text-neutral-12">Level</span>
            <UiButton v-for="l in [1, 12, 50, 99]" :key="l" size="s" variant="ghost" @click="setState({ user: { level: l } })">{{ l }}</UiButton>
          </div>
        </template>
      </section>

      <!-- Feed -->
      <section class="dbg-card">
        <h2 class="type-14-caps">Live feed</h2>
        <div class="flex flex-wrap gap-2">
          <UiButton size="s" variant="secondary" @click="setState({ feedPaused: !feedPaused })">
            {{ feedPaused ? 'Resume random drops' : 'Pause random drops' }}
          </UiButton>
        </div>
        <span class="type-12-regular text-neutral-12">Push a drop of rarity:</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="r in RARITIES"
            :key="r"
            type="button"
            class="type-12-caps h-8 rounded-md px-3 text-neutral-1"
            :style="{ background: RARITY_COLOR[r] }"
            @click="pushDrop(r)"
          >
            {{ r }}
          </button>
        </div>
      </section>

      <!-- Settings -->
      <section class="dbg-card">
        <h2 class="type-14-caps">Settings cookie</h2>
        <pre class="dbg-pre">{{ settingsStore.settings }}</pre>
        <UiButton size="s" variant="secondary" @click="settingsStore.reset()">Reset settings</UiButton>
      </section>

      <!-- API -->
      <section class="dbg-card">
        <h2 class="type-14-caps">API</h2>
        <div class="flex flex-wrap gap-2">
          <UiButton v-for="e in ENDPOINTS" :key="e" size="s" variant="secondary" @click="callApi(e)">GET {{ e }}</UiButton>
        </div>
        <pre v-if="apiOut" class="dbg-pre max-h-64">{{ apiOut }}</pre>
      </section>
    </div>

    <!-- UI kit -->
    <section class="dbg-card">
      <h2 class="type-14-caps">Buttons</h2>
      <div v-for="size in (['s', 'm', 'l'] as const)" :key="size" class="flex flex-wrap items-center gap-2">
        <UiButton v-for="v in BUTTON_VARIANTS" :key="v" :variant="v" :size="size" icon="plus">{{ v }}</UiButton>
        <UiButton :size="size" icon="plus" icon-only aria-label="icon only" />
        <UiButton :size="size" disabled>disabled</UiButton>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="dbg-card">
        <h2 class="type-14-caps">Price</h2>
        <div v-for="tone in PRICE_TONES" :key="tone" class="flex flex-wrap items-center gap-4">
          <UiPrice v-for="s in PRICE_SIZES" :key="s" :amount="312540" :size="s" :tone="tone" />
        </div>
        <div class="bg-brand-gradient flex gap-4 rounded-lg p-2">
          <UiPrice :amount="1250" size="l" tone="inverse" />
          <UiPrice :amount="500000" size="m" tone="inverse" />
        </div>
      </section>

      <section class="dbg-card">
        <h2 class="type-14-caps">Risk · Toggle · Slider · Avatar</h2>
        <div v-for="r in RISKS" :key="r" class="grid grid-cols-2 gap-4">
          <UiRiskMeter :level="r" />
          <UiRiskMeter :level="r" show-label />
        </div>
        <div class="flex items-center gap-4">
          <UiToggle v-model="toggleDemo" label="demo" />
          <UiSlider v-model="sliderDemo" label="demo" class="max-w-60" />
          <UiAvatar src="/img/brand/avatar.png" :level="12" />
          <UiAvatar src="/img/brand/avatar.png" :size="48" />
        </div>
      </section>
    </div>

    <section class="dbg-card">
      <h2 class="type-14-caps">Color tokens</h2>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        <div v-for="t in TOKENS" :key="t" class="flex flex-col gap-1">
          <span class="h-10 rounded-lg border border-neutral-5" :style="{ background: `var(--color-${t})` }" />
          <span class="type-12-regular text-neutral-12">{{ t }}</span>
        </div>
        <div v-for="r in RARITIES" :key="r" class="flex flex-col gap-1">
          <span class="h-10 rounded-lg" :style="{ background: rarityGlow(r, 40) }" />
          <span class="type-12-regular text-neutral-12">item-{{ r }}</span>
        </div>
      </div>
    </section>

    <section class="dbg-card">
      <h2 class="type-14-caps">Typography</h2>
      <div v-for="t in TYPE_STYLES" :key="t" class="flex items-baseline gap-4 overflow-hidden">
        <span class="type-12-regular w-32 shrink-0 text-neutral-11">{{ t }}</span>
        <span :class="t" class="truncate">Kurwa drop 1234</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
@reference '~/assets/css/main.css';

.dbg-card {
  @apply flex flex-col gap-3 rounded-3xl border border-neutral-4 bg-neutral-2 p-4;
}
.dbg-pre {
  @apply overflow-auto rounded-lg bg-neutral-1 p-3 font-mono text-xs leading-5 text-neutral-13;
}
.dbg-input {
  @apply h-8 min-w-0 flex-1 rounded-md border border-neutral-4 bg-neutral-1 px-3 text-sm outline-none focus:border-brand-base;
}
</style>
