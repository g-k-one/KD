<script setup lang="ts">
import type { Rarity } from '#shared/types/api'

/*
 * Cross-cutting debug dock (prototype only). Lives on every page, bottom-left.
 * Queues forced outcomes in the mock backend and fires events, so every animation path
 * can be checked without waiting for luck:
 *   cases   — next drops by rarity, or the Golden Chicken (KURWADROP on)
 *   upgrade — win / lose / near-miss on either side of the chance line,  *             and a ready setup (your top skin aimed at about ×2) one tap away
 *   bonuses — several levels at once (the level-up plate), the daily case ready again
 *   PvP     — who takes the next battle that fills
 *   events  — balance credit, rare drop in the live feed, level up, reset
 * Toggle with the bug button or the backquote key.
 */
type Force = { cases: { rarity?: Rarity; kurwa?: boolean }[]; upgrade: string | null; battle: string | null }

const dock = usePersisted('kd_debug', { open: false })
const open = computed({ get: () => dock.value.open, set: (v: boolean) => (dock.value = { ...dock.value, open: v }) })
const session = useSessionStore()
const toast = useToast()
const force = ref<Force>({ cases: [], upgrade: null, battle: null })
const hero = useHeroVariant()
const HERO = [
  { v: 'card', label: 'Card' },
  { v: 'a', label: 'A · Full width' },
  { v: 'b', label: 'B · Carousel' },
  { v: 'c', label: 'C · Live wins' },
] as const

async function load() {
  force.value = await $fetch<Force>('/api/debug/force')
}
async function post(body: Record<string, unknown>) {
  force.value = await $fetch<Force>('/api/debug/force', { method: 'POST', body })
}
onMounted(() => watch(open, (o) => o && load(), { immediate: true }))
onKeyStroke('`', (e) => {
  if ((e.target as HTMLElement)?.closest('input, textarea')) return
  open.value = !open.value
})

const CASES: { label: string; rarity?: Rarity; kurwa?: boolean; color: string }[] = [
  { label: 'Mil-Spec', rarity: 'milspec', color: 'var(--color-item-milspec)' },
  { label: 'Restricted', rarity: 'restricted', color: 'var(--color-item-restricted)' },
  { label: 'Classified', rarity: 'classified', color: 'var(--color-item-classified)' },
  { label: 'Covert', rarity: 'covert', color: 'var(--color-item-covert)' },
  { label: 'Gold', rarity: 'gold', color: 'var(--color-item-gold)' },
  { label: 'Chicken', kurwa: true, color: 'var(--color-gold)' },
]
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

async function state(body: Record<string, unknown>, note: string) {
  const res = await $fetch<{ user: { balance: number; level: number; levelProgress: number } }>('/api/debug/state', { method: 'POST', body })
  if (session.user) Object.assign(session.user, res.user)
  toast.show(note)
}
const credit = () => state({ user: { balance: (session.user?.balance ?? 0) + 100_000 } }, '+1 000 coins')
const rareFeed = () => state({ pushDrop: 'gold' }, 'Gold drop queued in the live feed')
const levelUp = () =>
  state({ user: { level: (session.user?.level ?? 1) + 1, levelProgress: 5 } }, 'Level up')
const reset = () => state({ resetUser: true }, 'User reset')
const ui = useUiStore()
const sfx = useSfx()
const haptics = useHaptics()
const rich = () => state({ user: { balance: (session.user?.balance ?? 0) * 10 + 100_000 } }, 'Balance ×10')
const broke = () => state({ user: { balance: 0 } }, 'Balance 0 — try opening a case')
const invEmpty = async () => {
  await state({ inventory: 'empty' }, 'Inventory emptied')
  refreshNuxtData()
}
const invLoaded = async () => {
  await state({ inventory: 'loaded' }, '+12 skins')
  refreshNuxtData()
}
const burst = () => state({ feedBurst: 12 }, '12 drops queued in the feed')
async function newBattle(live: boolean) {
  const slugs = ['pierogi-pack', 'babcias-box', 'kurwa-classic']
  const res = await $fetch<{ battle: { id: string } }>('/api/battles', { method: 'POST', body: { size: 2, cases: slugs.map((slug) => ({ slug, qty: 1 })) } })
  if (live) await $fetch(`/api/battles/${res.battle.id}/bot`, { method: 'POST', body: {} })
  open.value = false
  await navigateTo(`/pvp/${res.battle.id}`)
}
// Home: edit the admin's home layout in place (rows, scenes, card kinds)
const homeLayout = useHomeLayout()
async function editHome() {
  homeLayout.editing.value = true
  open.value = false
  await navigateTo('/')
}
const testFeel = () => {
  sfx.reveal(4)
  haptics.jackpot()
}
// Cases: several forced drops at once
const queue = (entry: { rarity?: Rarity; kurwa?: boolean }, n: number) => post({ cases: Array.from({ length: n }, () => entry) })
// Upgrade: open the page with your most valuable skin aimed at about ×2
async function upgradeSetup(f: string | null) {
  await post({ upgrade: f })
  const inv = (await $fetch<{ items: { uid: string; price: number }[] }>('/api/inventory')).items.sort((a, b) => b.price - a.price)
  const market = (await $fetch<{ items: { id: string; price: number }[] }>('/api/market')).items
  const it = inv[0]
  if (!it) return toast.show('Inventory is empty — tap +12 skins first')
  const target = market.filter((m) => m.price > it.price * 1.8).sort((a, b) => a.price - b.price)[0]
  open.value = false
  await navigateTo(`/upgrade?item=${it.uid}${target ? `&target=${target.id}` : ''}`)
}
// Bonuses
const bonuses = async (body: Record<string, unknown>, note: string) => {
  await state(body, note)
  refreshNuxtData('bonuses')
}
const resetDaily = async () => {
  await state({ resetDaily: true }, 'Daily case ready')
  refreshNuxtData('bonuses')
}
</script>

<template>
  <!-- phones: a narrow tab on the screen's edge, so it sits in the side margin instead of over cards and buttons -->
  <div class="fixed top-[45%] right-0 z-[65] lg:top-auto lg:right-auto lg:bottom-4 lg:left-4">
    <button
      type="button"
      class="kd-press grid h-10 w-6 place-items-center rounded-l-xl border border-r-0 border-neutral-6 bg-neutral-3 text-lg opacity-80 shadow-elevation-2 lg:size-10 lg:rounded-full lg:border-r lg:opacity-100"
      :aria-expanded="open"
      aria-label="Debug"
      @click="open = !open"
    >
      <UiIcon name="settings" :size="16" />
    </button>

    <Transition name="kd-dock">
      <div v-if="open" class="absolute right-0 bottom-12 flex max-h-[min(640px,calc(100dvh-140px))] max-lg:fixed max-lg:inset-x-3 max-lg:top-[132px] max-lg:bottom-auto max-lg:w-auto lg:left-0 lg:right-auto w-80 flex-col gap-4 overflow-y-auto rounded-3xl border border-neutral-5 bg-neutral-2 p-4 shadow-[0_8px_24px_rgb(0_0_0/0.6)]">
        <div class="flex items-center justify-between">
          <span class="type-16-caps">Debug</span>
          <button type="button" class="type-12-caps text-neutral-12 hover:text-neutral-15" @click="post({ clear: true })">Clear all</button>
        </div>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Admin</span>
          <div class="grid grid-cols-2 gap-1">
            <UiButton size="s" variant="secondary" icon="sliders" @click="editHome">Edit home layout</UiButton>
            <UiButton size="s" variant="secondary" icon="settings" to="/admin" @click="open = false">Admin panel</UiButton>
          </div>
          <p class="type-12-regular text-neutral-11">Home in place: rows, scenes, card kinds. The panel: every setting of the site.</p>
        </section>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Home banner</span>
          <div class="flex flex-wrap gap-1">
            <UiChip v-for="h in HERO" :key="h.v" :active="hero === h.v" @click="hero = h.v">{{ h.label }}</UiChip>
          </div>
          <p class="type-12-regular text-neutral-11">The card as it is, or full width: one scene edge to edge, the three banners on a carousel, the scene with real drops drifting behind.</p>
        </section>

        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="type-12-caps text-neutral-12">Next case drops</span>
            <span class="type-12 text-neutral-11">queued: {{ force.cases.length }}</span>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="c in CASES"
              :key="c.label"
              type="button"
              class="kd-press type-12 h-8 rounded-md border bg-neutral-4 px-1 hover:bg-neutral-6"
              :style="{ borderColor: c.color }"
              @click="post({ cases: [{ rarity: c.rarity, kurwa: c.kurwa }] })"
            >
              {{ c.label }}
            </button>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <UiButton size="s" variant="secondary" @click="queue({ kurwa: true }, 3)">Chicken ×3</UiButton>
            <UiButton size="s" variant="secondary" @click="queue({ rarity: 'gold' }, 5)">Gold ×5</UiButton>
            <UiButton size="s" variant="secondary" @click="queue({ rarity: 'covert' }, 5)">Covert ×5</UiButton>
          </div>
          <div v-if="force.cases.length" class="flex flex-wrap gap-1">
            <span v-for="(c, i) in force.cases" :key="i" class="type-10-caps rounded-sm bg-neutral-4 px-1.5 py-0.5 text-neutral-13">{{ c.kurwa ? 'chicken' : c.rarity }}</span>
          </div>
          <p class="type-12-regular text-neutral-11">Chicken needs KURWADROP on. One entry per opened case.</p>
        </section>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Next upgrade</span>
          <div class="flex flex-wrap gap-1">
            <UiChip v-for="u in UPGRADE" :key="u.label" :active="force.upgrade === u.v" @click="post({ upgrade: u.v })">{{ u.label }}</UiChip>
          </div>
          <div class="grid grid-cols-2 gap-1">
            <UiButton size="s" variant="secondary" @click="upgradeSetup('near-lose')">Setup · near lose</UiButton>
            <UiButton size="s" variant="secondary" @click="upgradeSetup('near-win')">Setup · near win</UiButton>
            <UiButton size="s" variant="secondary" @click="upgradeSetup(null)">Setup · auto</UiButton>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Bonuses</span>
          <div class="grid grid-cols-2 gap-1">
            <UiButton size="s" variant="secondary" @click="bonuses({ levels: 5 }, '+5 levels')">+5 levels</UiButton>
            <UiButton size="s" variant="secondary" @click="resetDaily">Daily ready</UiButton>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Next PvP</span>
          <div class="flex flex-wrap gap-1">
            <UiChip v-for="b in BATTLE" :key="b.label" :active="force.battle === b.v" @click="post({ battle: b.v })">{{ b.label }}</UiChip>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <span class="type-12-caps text-neutral-12">Events</span>
          <div class="grid grid-cols-2 gap-1">
            <UiButton size="s" variant="secondary" @click="credit">+1 000 coins</UiButton>
            <UiButton size="s" variant="secondary" @click="rareFeed">Gold in feed</UiButton>
            <UiButton size="s" variant="secondary" @click="levelUp">Level up</UiButton>
            <UiButton size="s" variant="secondary" @click="resetDaily">Daily ready</UiButton>
            <UiButton size="s" variant="secondary" @click="rich">Balance ×10</UiButton>
            <UiButton size="s" variant="secondary" @click="broke">Balance 0</UiButton>
            <UiButton size="s" variant="secondary" @click="invLoaded">+12 skins</UiButton>
            <UiButton size="s" variant="secondary" @click="invEmpty">Empty inventory</UiButton>
            <UiButton size="s" variant="secondary" @click="burst">Feed burst</UiButton>
            <UiButton size="s" variant="secondary" @click="ui.openDeposit(2500)">Quick deposit</UiButton>
            <UiButton size="s" variant="secondary" @click="newBattle(false)">PvP: waiting</UiButton>
            <UiButton size="s" variant="secondary" @click="newBattle(true)">PvP: live now</UiButton>
            <UiButton size="s" variant="secondary" @click="testFeel">Sound + buzz</UiButton>
            <UiButton size="s" variant="secondary" @click="reset">Reset user</UiButton>
          </div>
          <div class="flex gap-4">
            <NuxtLink to="/debug" class="type-12 text-brand-light hover:underline" @click.capture="open = false">Full debug page →</NuxtLink>
            <NuxtLink to="/fx" class="type-12 text-brand-light hover:underline" @click.capture="open = false">Forge FX →</NuxtLink>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.kd-dock-enter-active,
.kd-dock-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-dock-enter-from,
.kd-dock-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  transform-origin: bottom left;
}
</style>
