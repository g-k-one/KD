<script setup lang="ts">
import type { Rarity } from '#shared/types/api'

/*
 * Cross-cutting debug dock (prototype only). Lives on every page, bottom-left.
 * Queues forced outcomes in the mock backend and fires events, so every animation path
 * can be checked without waiting for luck:
 *   cases   — next drops by rarity, or the Golden Chicken (KURWADROP on)
 *   upgrade — win / lose / near-miss on either side of the chance line
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
  { label: '🐔 Chicken', kurwa: true, color: '#f5c649' },
]
const UPGRADE = [
  { v: null, label: 'Auto' },
  { v: 'win', label: 'Win' },
  { v: 'lose', label: 'Lose' },
  { v: 'edge-win', label: 'Edge win' },
  { v: 'edge-lose', label: 'Edge lose' },
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
</script>

<template>
  <div class="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 z-[65] lg:bottom-4 lg:left-4">
    <button
      type="button"
      class="kd-press grid size-10 place-items-center rounded-full border border-neutral-6 bg-neutral-3 text-lg shadow-elevation-2"
      :aria-expanded="open"
      aria-label="Debug"
      @click="open = !open"
    >
      🐞
    </button>

    <Transition name="kd-dock">
      <div v-if="open" class="absolute bottom-12 left-0 flex w-80 flex-col gap-4 rounded-3xl border border-neutral-5 bg-neutral-2 p-4 shadow-[0_8px_24px_rgb(0_0_0/0.6)]">
        <div class="flex items-center justify-between">
          <span class="type-16-caps">Debug</span>
          <button type="button" class="type-12-caps text-neutral-12 hover:text-neutral-15" @click="post({ clear: true })">Clear all</button>
        </div>

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
            <UiButton size="s" variant="secondary" @click="reset">Reset user</UiButton>
          </div>
          <NuxtLink to="/debug" class="type-12 text-brand-light hover:underline" @click="open = false">Full debug page →</NuxtLink>
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
