<script setup lang="ts">
import type { Rarity, User } from '#shared/types/api'

/*
 * Internal QA page (prototype only, not linked from the UI). Tabs:
 *   State  — the mock backend: session, balance, level, inventory, bonuses, feed, forced outcomes, API
 *   Kit    — every ui/* component in its states, with playgrounds
 *   Items  — ItemArt knobs and reveal, tiles, drop cards, case / PvP cards, big wins
 *   Games  — the upgrade dial driven by hand, chicken moods, sounds, haptics
 *   FX     — kd* Forge effects on a stage, FxFire, FxBurst
 *   Skeletons — the loading skeletons as each page shows them (case page, home catalog, battle room, drop cards)
 *   Tokens — colors, rarities, type scale, radii, motion
 * The floating dock (bottom-left, backquote key) has the same forces on every page.
 */
useHead({ title: 'Debug · KurwaDROP' })

type Tab = 'state' | 'kit' | 'items' | 'games' | 'fx' | 'skeletons' | 'tokens'
const prefs = usePersisted('kd_debug_page', { tab: 'state' as Tab })
const tab = computed({ get: () => prefs.value.tab, set: (v: Tab) => (prefs.value = { ...prefs.value, tab: v }) })
const TABS: { value: Tab; label: string }[] = [
  { value: 'state', label: 'State' },
  { value: 'kit', label: 'UI kit' },
  { value: 'items', label: 'Items' },
  { value: 'games', label: 'Games' },
  { value: 'fx', label: 'FX' },
  { value: 'skeletons', label: 'Skeletons' },
  { value: 'tokens', label: 'Tokens' },
]

const session = useSessionStore()
const settingsStore = useSettingsStore()
const ui = useUiStore()
const toast = useToast()
const { refresh: refreshFeed } = useLiveFeed()

// --- Mock state ------------------------------------------------------------------------------
const feedPaused = ref(false)
const balanceInput = ref('')
const nickInput = ref('')
const progress = ref(50)
const apiOut = ref('')

async function setState(body: Record<string, unknown>, note?: string) {
  const res = await $fetch<{ user: User; feedPaused: boolean }>('/api/debug/state', { method: 'POST', body })
  feedPaused.value = res.feedPaused
  if (session.user) session.user = { ...session.user, ...res.user }
  if (note) toast.show(note)
}
const addBalance = (cents: number) => setState({ user: { balance: Math.max(0, (session.user?.balance ?? 0) + cents) } })
function applyBalance() {
  const n = Number.parseFloat(balanceInput.value.replace(',', '.'))
  if (Number.isFinite(n)) setState({ user: { balance: Math.round(n * 100) } }, 'Balance set')
}
const applyNick = () => nickInput.value.trim() && setState({ user: { nickname: nickInput.value.trim() } }, 'Nickname set')
const applyProgress = () => setState({ user: { levelProgress: progress.value } })
async function refreshing(body: Record<string, unknown>, note: string, key?: string) {
  await setState(body, note)
  key ? refreshNuxtData(key) : refreshNuxtData()
}
async function pushDrop(r: Rarity) {
  await setState({ pushDrop: r })
  await refreshFeed()
}

// --- Forced outcomes (same endpoint as the dock) -------------------------------------------------
type Force = { cases: { rarity?: Rarity; kurwa?: boolean }[]; upgrade: string | null; battle: string | null }
const force = ref<Force>({ cases: [], upgrade: null, battle: null })
const loadForce = async () => (force.value = await $fetch<Force>('/api/debug/force'))
const post = async (body: Record<string, unknown>) => (force.value = await $fetch<Force>('/api/debug/force', { method: 'POST', body }))
const queue = (entry: { rarity?: Rarity; kurwa?: boolean }, n: number) => post({ cases: Array.from({ length: n }, () => entry) })
onMounted(loadForce)
const UPGRADE = [
  { v: null, label: 'Auto' },
  { v: 'win', label: 'Win' },
  { v: 'lose', label: 'Lose' },
  { v: 'edge-win', label: 'Edge win' },
  { v: 'edge-lose', label: 'Edge lose' },
  { v: 'near-win', label: 'Near win' },
  { v: 'near-lose', label: 'Near lose' },
]
const BATTLE = [
  { v: null, label: 'Auto' },
  { v: 'you', label: 'You win' },
  { v: 'other', label: 'You lose' },
]
async function newBattle(size: number, live: boolean) {
  const slugs = ['pierogi-pack', 'babcias-box', 'kurwa-classic']
  const res = await $fetch<{ battle: { id: string } }>('/api/battles', { method: 'POST', body: { size, cases: slugs.map((slug) => ({ slug, qty: 1 })) } })
  if (live) await $fetch(`/api/battles/${res.battle.id}/bot`, { method: 'POST', body: {} })
  await navigateTo(`/pvp/${res.battle.id}`)
}

const ENDPOINTS = ['/api/me', '/api/cases', '/api/cases/warsaw-nights', '/api/feed', '/api/wins/today', '/api/inventory', '/api/market', '/api/history', '/api/battles', '/api/bonuses', '/api/seeds', '/api/deposit/methods', '/api/debug/force']
async function callApi(url: string) {
  try {
    apiOut.value = JSON.stringify(await $fetch(url), null, 2)
  } catch (e) {
    apiOut.value = String((e as Error).message)
  }
}
function wipeStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('kd_'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {}
  toast.show('Local prefs cleared — reload to see defaults')
}

// --- Viewport ----------------------------------------------------------------------------------
const { width, height } = useWindowSize()
const breakpoint = computed(() => {
  const w = width.value
  if (w >= 1536) return '2xl'
  if (w >= 1280) return 'xl'
  if (w >= 1024) return 'lg · desktop'
  if (w >= 768) return 'md'
  if (w >= 640) return 'sm'
  return 'base · mobile'
})

// --- Tokens ------------------------------------------------------------------------------------
const NEUTRALS = Array.from({ length: 15 }, (_, i) => `neutral-${i + 1}`)
const ACCENTS = ['brand-base', 'brand-light', 'brand-bright', 'coin', 'success', 'danger', 'warning']
const TYPE_STYLES = [
  'type-48-caps', 'type-28', 'type-20-caps', 'type-16-caps', 'type-16-medium', 'type-14-caps', 'type-14', 'type-14-regular',
  'type-12-caps', 'type-12', 'type-12-regular', 'type-10-caps',
]
const RADII = [['rounded-md', 6], ['rounded-lg', 8], ['rounded-xl', 12], ['rounded-2xl', 16], ['rounded-3xl', 24], ['rounded-5xl', 40]] as const
const MOTION = ['--dur-fast', '--dur-base', '--dur-slow']
const EASES = ['--ease-out', '--ease-in', '--ease-in-out', '--ease-spring']
const motionKey = ref(0)
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-6 lg:px-0">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="type-20-caps flex-1">Debug</h1>
      <span class="type-12 rounded-md bg-neutral-4 px-2 py-1 text-neutral-12">{{ width }}×{{ height }} · {{ breakpoint }}</span>
      <span v-if="session.user" class="type-12 flex items-center gap-2 rounded-md bg-neutral-4 px-2 py-1 text-neutral-12">
        {{ session.user.nickname }} · lvl {{ session.user.level }} · <UiPrice :amount="session.user.balance" size="s" tone="coin" />
      </span>
    </div>
    <div class="sticky top-[calc(60px+env(safe-area-inset-top))] z-20 -mx-4 bg-neutral-1 px-4 lg:top-0 lg:mx-0 lg:px-0">
      <UiTabs v-model="tab" :tabs="TABS" />
    </div>

    <!-- STATE -->
    <template v-if="tab === 'state'">
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="dbg-card">
          <h2 class="dbg-h">Session</h2>
          <div class="flex flex-wrap gap-2">
            <UiButton v-if="!session.user" size="s" icon="sign-in" @click="session.login()">Log in as demo user</UiButton>
            <UiButton v-else size="s" variant="secondary" icon="logout" @click="session.logout()">Log out</UiButton>
            <UiButton size="s" variant="secondary" icon="refresh" @click="refreshing({ resetUser: true }, 'User reset')">Reset user</UiButton>
            <UiButton size="s" variant="ghost" @click="ui.openSignIn()">Sign-in modal</UiButton>
            <UiButton size="s" variant="ghost" @click="ui.openDeposit()">Deposit modal</UiButton>
          </div>
          <template v-if="session.user">
            <div class="flex flex-wrap gap-2">
              <UiButton v-for="c in [100, 10000, 100000, 1000000]" :key="c" size="s" variant="secondary" @click="addBalance(c)">+{{ (c / 100).toLocaleString('en-US') }}</UiButton>
              <UiButton size="s" variant="secondary" @click="setState({ user: { balance: (session.user?.balance ?? 0) * 10 } })">×10</UiButton>
              <UiButton size="s" variant="danger" @click="setState({ user: { balance: 0 } }, 'Broke')">Set 0</UiButton>
            </div>
            <form class="flex gap-2" @submit.prevent="applyBalance">
              <UiInput v-model="balanceInput" size="s" coin placeholder="Balance in coins" inputmode="decimal" class="flex-1" />
              <UiButton size="s" type="submit">Set</UiButton>
            </form>
            <form class="flex gap-2" @submit.prevent="applyNick">
              <UiInput v-model="nickInput" size="s" icon="user" placeholder="Nickname" class="flex-1" />
              <UiButton size="s" type="submit">Set</UiButton>
            </form>
          </template>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Level · Bonuses</h2>
          <div class="flex flex-wrap items-center gap-2">
            <span class="dbg-note">Level</span>
            <UiButton v-for="l in [1, 5, 12, 27, 50, 99]" :key="l" size="s" variant="ghost" @click="setState({ user: { level: l } })">{{ l }}</UiButton>
            <UiButton size="s" variant="secondary" @click="setState({ user: { level: (session.user?.level ?? 1) + 1, levelProgress: 5 } }, 'Level up')">Level up</UiButton>
          </div>
          <div class="flex items-end gap-2">
            <UiSlider v-model="progress" label="Level progress %" class="flex-1" />
            <UiButton size="s" variant="secondary" @click="applyProgress">Apply</UiButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="refreshing({ levels: 1 }, '+1 level', 'bonuses')">+1 level</UiButton>
            <UiButton size="s" variant="secondary" @click="refreshing({ levels: 5 }, '+5 levels', 'bonuses')">+5 levels</UiButton>
            <UiButton size="s" variant="secondary" @click="refreshing({ resetDaily: true }, 'Daily case ready', 'bonuses')">Daily ready</UiButton>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Inventory</h2>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="refreshing({ inventory: 'loaded' }, '+12 skins')">+12 skins</UiButton>
            <UiButton size="s" variant="danger" @click="refreshing({ inventory: 'empty' }, 'Inventory emptied')">Empty</UiButton>
            <UiButton size="s" variant="ghost" to="/inventory">Open inventory</UiButton>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Live feed</h2>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="setState({ feedPaused: !feedPaused })">{{ feedPaused ? 'Resume random drops' : 'Pause random drops' }}</UiButton>
            <UiButton size="s" variant="secondary" @click="setState({ feedBurst: 12 }, '12 drops queued')">Burst ×12</UiButton>
            <UiButton size="s" variant="secondary" @click="setState({ feedBurst: 30 }, '30 drops queued')">Burst ×30</UiButton>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="r in RARITIES" :key="r" type="button" class="kd-press type-12-caps h-8 rounded-md px-3 text-neutral-1" :style="{ background: RARITY_COLOR[r] }" @click="pushDrop(r)">{{ r }}</button>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Next case drops <span class="dbg-note">{{ force.cases.length }} queued</span></h2>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="r in RARITIES" :key="r" type="button" class="kd-press type-12-caps h-8 rounded-md px-3 text-neutral-1" :style="{ background: RARITY_COLOR[r] }" @click="post({ cases: [{ rarity: r }] })">{{ r }}</button>
            <UiChip size="m" tone="gold" icon="chicken" @click="post({ cases: [{ kurwa: true }] })">Chicken</UiChip>
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="queue({ kurwa: true }, 3)">Chicken ×3</UiButton>
            <UiButton size="s" variant="secondary" @click="queue({ rarity: 'gold' }, 5)">Gold ×5</UiButton>
            <UiButton size="s" variant="secondary" @click="queue({ rarity: 'covert' }, 5)">Covert ×5</UiButton>
            <UiButton size="s" variant="secondary" @click="queue({ rarity: 'industrial' }, 5)">Commons ×5</UiButton>
            <UiButton size="s" variant="ghost" icon="close" @click="post({ clear: true })">Clear all forces</UiButton>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Upgrade · PvP</h2>
          <div class="flex flex-wrap gap-1.5">
            <UiChip v-for="u in UPGRADE" :key="u.label" :active="force.upgrade === u.v" @click="post({ upgrade: u.v })">{{ u.label }}</UiChip>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UiChip v-for="b in BATTLE" :key="b.label" :active="force.battle === b.v" @click="post({ battle: b.v })">{{ b.label }}</UiChip>
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton v-for="s in [2, 3, 4]" :key="s" size="s" variant="secondary" icon="pvp" @click="newBattle(s, false)">Open {{ s }}p</UiButton>
            <UiButton size="s" icon="live" @click="newBattle(2, true)">Live 1v1 vs bot</UiButton>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">Settings · Local prefs</h2>
          <pre class="dbg-pre">{{ settingsStore.settings }}</pre>
          <div class="flex flex-wrap gap-2">
            <UiButton size="s" variant="secondary" @click="settingsStore.reset()">Reset settings</UiButton>
            <UiButton size="s" variant="danger" @click="wipeStorage">Clear kd_* storage</UiButton>
          </div>
        </section>

        <section class="dbg-card">
          <h2 class="dbg-h">API</h2>
          <div class="flex flex-wrap gap-1.5">
            <UiChip v-for="e in ENDPOINTS" :key="e" size="s" @click="callApi(e)">{{ e.replace('/api', '') }}</UiChip>
          </div>
          <pre v-if="apiOut" class="dbg-pre max-h-80">{{ apiOut }}</pre>
        </section>
      </div>
    </template>

    <DebugKit v-else-if="tab === 'kit'" />
    <DebugItems v-else-if="tab === 'items'" />
    <DebugGames v-else-if="tab === 'games'" />
    <DebugFx v-else-if="tab === 'fx'" />
    <DebugSkeletons v-else-if="tab === 'skeletons'" />

    <!-- TOKENS -->
    <template v-else>
      <section class="dbg-card">
        <h2 class="dbg-h">Colors</h2>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          <div v-for="t in [...NEUTRALS, ...ACCENTS]" :key="t" class="flex flex-col gap-1">
            <span class="h-10 rounded-lg" :style="{ background: `var(--color-${t})` }" />
            <span class="type-12-regular text-neutral-12">{{ t }}</span>
          </div>
        </div>
        <h3 class="type-12-caps text-neutral-11">Rarity</h3>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          <div v-for="r in RARITIES" :key="r" class="flex flex-col gap-1">
            <span class="h-10 rounded-lg" :style="{ background: RARITY_COLOR[r] }" />
            <span class="h-10 rounded-lg" :style="{ background: rarityGlow(r, 40) }" />
            <span class="type-12-regular text-neutral-12">{{ r }} · tier {{ RARITY_TIER[r] }}</span>
          </div>
        </div>
      </section>

      <section class="dbg-card">
        <h2 class="dbg-h">Typography</h2>
        <div v-for="t in TYPE_STYLES" :key="t" class="flex items-baseline gap-4 overflow-hidden">
          <span class="type-12-regular w-32 shrink-0 text-neutral-11">{{ t }}</span>
          <span :class="t" class="truncate">Kurwa drop 1234</span>
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="dbg-card">
          <h2 class="dbg-h">Radii <span class="dbg-note">outer = inner + gap</span></h2>
          <div class="flex flex-wrap items-end gap-3">
            <div v-for="[c, px] in RADII" :key="c" class="flex flex-col items-center gap-1">
              <span class="size-16 bg-neutral-5" :class="c" />
              <span class="dbg-note">{{ c }} · {{ px }}</span>
            </div>
          </div>
          <div class="w-fit rounded-3xl bg-neutral-4 p-2">
            <div class="rounded-2xl bg-neutral-6 p-2"><div class="rounded-lg bg-neutral-8 px-4 py-2 type-12">24 = 16 + 8 = 8 + 8 + 8</div></div>
          </div>
        </section>
        <section class="dbg-card">
          <h2 class="dbg-h">Motion <UiButton size="s" variant="ghost" icon="refresh" @click="motionKey++">Replay</UiButton></h2>
          <div v-for="d in MOTION" :key="d + motionKey" class="flex items-center gap-3">
            <span class="dbg-note w-24">{{ d }}</span>
            <span class="dbg-dot" :style="{ animationDuration: `var(${d})` }" />
          </div>
          <div v-for="e in EASES" :key="e + motionKey" class="flex items-center gap-3">
            <span class="dbg-note w-24">{{ e }}</span>
            <span class="dbg-dot" :style="{ animationTimingFunction: `var(${e})`, animationDuration: '900ms' }" />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style>

/* Shared by the debug/* components (unscoped on purpose) */
.dbg-card {
  @apply flex min-w-0 flex-col gap-3 overflow-hidden rounded-3xl bg-neutral-2 p-4;
}
.dbg-h {
  @apply type-14-caps flex flex-wrap items-center gap-2;
}
.dbg-note {
  @apply type-12-regular normal-case text-neutral-11;
}
.dbg-pre {
  @apply overflow-auto rounded-lg bg-neutral-1 p-3 font-mono text-xs leading-5 text-neutral-13;
}
/* Preview on the left, knobs on the right; stacked on phones */
.dbg-play {
  @apply flex flex-col gap-4 lg:flex-row;
}
.dbg-knobs {
  @apply flex flex-col gap-3 lg:w-96 lg:shrink-0;
}
.dbg-dot {
  @apply relative h-3 flex-1 rounded-full bg-neutral-4;
}
.dbg-dot::after {
  content: '';
  @apply absolute top-0 left-0 size-3 rounded-full bg-brand-base;
  animation-name: dbg-slide;
  animation-duration: inherit;
  animation-timing-function: inherit;
  animation-fill-mode: both;
}
@keyframes dbg-slide {
  to {
    left: calc(100% - 12px);
  }
}
</style>
