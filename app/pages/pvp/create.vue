<script setup lang="ts">
import type { BattleMode, BattleResponse, CasesResponse } from '#shared/types/api'

// Figma "BattleCaseTile" picker: Default → Added (brand tint + counter). Summary sticks to the side
// on desktop and to the bottom on phones.
// Picking, the way battle sites do it: a tap anywhere on a case adds a round (the tile never changes its layout —
// a counter badge and a corner minus appear on it), and the rounds line up in a strip in the order they were added,
// which is the order they are played; any round comes out of the strip with one tap.
useHead({ title: 'Create PvP · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

const req = useFetch<CasesResponse>('/api/cases', { key: 'cases', lazy: true })
if (import.meta.server) await req
const { data } = req
// Every case on the site, once each (home lists some in several sections), cheapest first
const cases = computed(() => [...new Map((data.value?.sections ?? []).flatMap((sec) => sec.cases).map((c) => [c.slug, c])).values()].sort((a, b) => a.price - b.price))

const mode = ref<BattleMode>('classic')
const players = ref<2 | 3 | 4>(2)
// a team battle is always 2 vs 2
const size = computed(() => (mode.value === 'team' ? 4 : players.value))
const modeOptions = computed(() => (['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`) })))
const playerOptions = computed(() => ([2, 3, 4] as const).map((n) => ({ value: n, label: t(`pvp.modes.${n}`) })))
/** The rounds, in play order: a case slug per round */
const order = ref<string[]>([])
const qty = computed(() => order.value.reduce<Record<string, number>>((m, s) => ((m[s] = (m[s] ?? 0) + 1), m), {}))
const search = ref('')
// an admin setting (GET /api/rules)
const rules = useGameRules()
const MAX_ROUNDS = computed(() => rules.value.pvp.maxRounds)

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return cases.value.filter((c) => !q || c.name.toLowerCase().includes(q))
})
const rounds = computed(() => order.value.length)
const bySlug = computed(() => new Map(cases.value.map((c) => [c.slug, c])))
const cost = computed(() => order.value.reduce((a, s) => a + (bySlug.value.get(s)?.price ?? 0), 0))
// each round keeps a key of its own, so the strip animates the one that comes or goes, not the whole row
let nextKey = 0
const keys = ref<number[]>([])
const strip = computed(() => order.value.map((s, i) => ({ key: keys.value[i]!, case: bySlug.value.get(s)! })).filter((r) => r.case))

const haptics = useHaptics()
function add(slug: string) {
  if (rounds.value >= MAX_ROUNDS.value) return toast.show(t('pvp.maxRounds', { n: MAX_ROUNDS.value }))
  order.value = [...order.value, slug]
  keys.value = [...keys.value, nextKey++]
  haptics.tap()
}
/** One round less of this case: the last one added */
function removeOne(slug: string) {
  const i = order.value.lastIndexOf(slug)
  if (i >= 0) removeAt(i)
}
function removeAt(i: number) {
  order.value = order.value.filter((_, j) => j !== i)
  keys.value = keys.value.filter((_, j) => j !== i)
}
function clearRounds() {
  order.value = []
  keys.value = []
}

const creating = ref(false)
async function create() {
  if (!session.user) return ui.openSignIn()
  creating.value = true
  try {
    const res = await $fetch<BattleResponse>('/api/battles', {
      method: 'POST',
      // in play order: one entry per round
      body: { mode: mode.value, size: size.value, cases: order.value.map((slug) => ({ slug, qty: 1 })) },
    })
    if (res.balance != null) session.user.balance = res.balance
    await navigateTo(`/pvp/${res.battle.id}`)
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else {
      console.error('[pvp create]', e)
      // an error that is not the API's (the page after create failing to open) still says what it was
      toast.error(e, e instanceof Error && e.message ? e.message : t('common.error'))
    }
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 pb-44 lg:gap-6 lg:px-0 lg:pt-10 lg:pb-0">
    <!-- phones: pb-44 leaves room for the summary bar (rounds strip, totals, button), so the last cases scroll clear -->
    <!-- the same bar as the lobby's: back and the PvP history on the left -->
    <UiPageBar
      class="lg:-mb-2"
      :title="$t('pvp.create')"
      :left="[
        { label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' },
        { label: $t('upgrade.history'), icon: 'history', to: '/profile?tab=history&game=pvp' },
      ]"
    />

    <div class="grid items-start gap-4 lg:grid-cols-[1fr_340px] lg:gap-6">
      <div class="flex min-w-0 flex-col gap-4">
        <!-- The mode, in the case page's dock language: the kit's segmented controls, the rule spelled out -->
        <div class="kd-pvp-dock flex flex-col gap-3 lg:flex-row lg:items-center">
          <UiSegmented v-model="mode" :options="modeOptions" block class="lg:w-80" />
          <Transition name="kd-fade" mode="out-in">
            <UiSegmented v-if="mode !== 'team'" v-model="players" :options="playerOptions" block class="lg:w-80" />
            <span v-else class="type-12-caps flex h-12 items-center justify-center gap-2 rounded-2xl bg-neutral-3 px-4 text-neutral-13 lg:w-80">
              <UiIcon name="pvp" :size="16" />{{ $t('pvp.modes.4') }}
            </span>
          </Transition>
          <Transition name="kd-fade" mode="out-in">
            <span :key="mode" class="type-12-caps text-neutral-12 lg:flex-1 lg:text-right">{{ $t(`pvp.modeTip.${mode}`) }}</span>
          </Transition>
        </div>
        <!-- the cases, in the lobby's and the home page's card language: a section header, 24px cards -->
        <UiSectionHeader :title="$t('pvp.chooseCases')">
          <template #actions>
            <span class="type-12-caps text-neutral-11 tabular-nums">{{ rounds }} / {{ MAX_ROUNDS }}</span>
          </template>
        </UiSectionHeader>
        <UiInput id="pvp-search" v-model="search" icon="search" clearable size="l" :placeholder="$t('pvp.search')" />

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:gap-3">
          <div v-for="c in visible" :key="c.slug" class="relative">
            <button
              type="button"
              class="kd-ctile kd-press group flex w-full flex-col items-center gap-2 rounded-5xl border p-3 lg:p-4"
              :class="{ 'is-added': !!qty[c.slug] }"
              :aria-label="`${$t('pvp.add')} ${c.name}`"
              @click="add(c.slug)"
            >
              <img :src="c.image" :alt="c.name" class="kd-ctile-art h-28 w-full object-contain lg:h-36" />
              <span class="type-12-caps lg:type-14-caps w-full truncate text-center">{{ c.name }}</span>
              <UiPrice :amount="c.price" size="l" tone="coin" />
            </button>
            <!-- added: how many rounds of it, and a minus in the other corner -->
            <Transition name="kd-badge">
              <span v-if="qty[c.slug]" :key="qty[c.slug]" class="kd-ctile-count type-14-caps pointer-events-none absolute top-3 right-3 grid h-7 min-w-7 place-items-center rounded-full px-2 tabular-nums">×{{ qty[c.slug] }}</span>
            </Transition>
            <Transition name="kd-badge">
              <button
                v-if="qty[c.slug]"
                type="button"
                class="kd-press kd-hit absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-neutral-1/80 text-neutral-13 hover:text-neutral-15"
                :aria-label="$t('pvp.removeOne', { name: c.name })"
                @click="removeOne(c.slug)"
              >
                <UiIcon name="minus" :size="16" />
              </button>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <aside class="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 border-t border-neutral-5 bg-neutral-2 px-4 py-3 lg:sticky lg:gap-3 lg:top-24 lg:bottom-auto lg:rounded-5xl lg:border lg:border-neutral-4 lg:bg-neutral-2 lg:p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="type-16-caps max-lg:hidden">{{ $t('pvp.summary') }}</h2>
          <!-- phones keep the bar low: the round count stands here instead of the totals list -->
          <span class="type-12-caps text-neutral-11 tabular-nums lg:hidden">{{ $t('pvp.rounds') }} <span class="text-neutral-15">{{ rounds }} / {{ MAX_ROUNDS }}</span></span>
          <button v-if="rounds" type="button" class="type-12-caps kd-hit relative ml-auto text-neutral-11 hover:text-neutral-15" @click="clearRounds">{{ $t('pvp.clearRounds') }}</button>
        </div>
        <!-- the rounds in play order; a tap takes one out. Phones: one swipeable line over the button -->
        <TransitionGroup
          v-if="rounds"
          tag="ol"
          name="kd-round"
          class="scrollbar-none relative -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          <li v-for="(r, i) in strip" :key="r.key" class="shrink-0">
            <button type="button" class="kd-round kd-press relative block" :aria-label="$t('pvp.removeRound', { n: i + 1, name: r.case.name })" @click="removeAt(i)">
              <PvpCaseThumb :image="r.case.image" :name="r.case.name" size="s" />
              <span class="kd-round-n type-10-caps absolute top-0.5 left-1 tabular-nums">{{ i + 1 }}</span>
              <span class="kd-round-x absolute inset-0 grid place-items-center rounded-xl"><UiIcon name="close" :size="16" /></span>
            </button>
          </li>
        </TransitionGroup>
        <p v-else class="type-12-regular text-neutral-11">{{ $t('pvp.pickHint') }}</p>
        <dl class="type-14 flex gap-6 max-lg:hidden lg:flex-col lg:gap-2">
          <div class="flex flex-col lg:flex-row lg:justify-between">
            <dt class="type-12-caps text-neutral-11">{{ $t('pvp.rounds') }}</dt>
            <dd class="tabular-nums">{{ rounds }} / {{ MAX_ROUNDS }}</dd>
          </div>
          <div class="flex flex-col lg:flex-row lg:justify-between">
            <dt class="type-12-caps text-neutral-11">{{ $t('pvp.players') }}</dt>
            <dd>{{ $t(`pvp.modeName.${mode}`) }} · {{ $t(`pvp.modes.${size}`) }}</dd>
          </div>
          <div class="flex flex-col lg:flex-row lg:justify-between">
            <dt class="type-12-caps text-neutral-11">{{ $t('pvp.value') }}</dt>
            <dd><UiPrice :amount="cost * size" size="s" /></dd>
          </div>
        </dl>
        <!-- no rounds yet: grey, and it names the next step instead of "Create for 0" -->
        <UiButton size="l" block :disabled="!rounds" :loading="creating" @click="create">
          <template v-if="rounds">
            {{ $t('pvp.createFor') }}
            <span class="btn-value"><UiPrice :amount="cost" size="m" tone="inverse" /></span>
          </template>
          <template v-else>{{ $t('pvp.pickCase') }}</template>
        </UiButton>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.kd-pvp-dock {
  border-radius: 24px;
  background: var(--color-neutral-2);
  padding: 12px;
}
/* desktop: the docks' 16 px on all sides around the 48 px controls */
@media (min-width: 64rem) {
  .kd-pvp-dock {
    padding: 16px;
  }
}
.kd-fade-enter-active,
.kd-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.kd-fade-enter-from,
.kd-fade-leave-to {
  opacity: 0;
}
.kd-ctile {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
  transition:
    background-color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}
.kd-ctile-art {
  transition: transform var(--dur-slow) var(--ease-out);
}
@media (hover: hover) {
  .kd-ctile:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-ctile:hover .kd-ctile-art {
    transform: translateY(-4px) scale(1.04);
  }
}
.kd-ctile.is-added {
  background: linear-gradient(180deg, rgb(255 95 31 / 0.3), rgb(255 95 31 / 0.1));
  border-color: var(--color-brand-base);
}
.kd-ctile-count {
  color: var(--color-neutral-1);
  background: var(--color-brand-base);
  box-shadow: 0 4px 12px rgb(255 95 31 / 0.45);
}
/* a badge pops in, and pops again on every new count (keyed by it) */
.kd-badge-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-badge-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
}
.kd-badge-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.kd-badge-leave-to {
  opacity: 0;
}
/* a round: its number in the corner; on hover (or focus) a cross says a tap takes it out */
.kd-round-n {
  color: var(--color-neutral-12);
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
}
.kd-round-x {
  color: var(--color-neutral-15);
  background: rgb(12 13 16 / 0.7);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-round:hover .kd-round-x {
    opacity: 1;
  }
}
.kd-round:focus-visible .kd-round-x {
  opacity: 1;
}
/* the strip: a round comes in from below, goes out shrinking, the rest slide into place */
.kd-round-enter-active,
.kd-round-leave-active,
.kd-round-move {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-slow) var(--ease-spring);
}
.kd-round-leave-active {
  position: absolute;
}
.kd-round-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.8);
}
.kd-round-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
</style>
