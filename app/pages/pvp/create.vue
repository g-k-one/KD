<script setup lang="ts">
import type { BattleMode, BattleResponse, CasesResponse } from '#shared/types/api'

// Figma "BattleCaseTile" picker: Default → Added (brand tint + counter). Summary sticks to the side
// on desktop and to the bottom on phones.
useHead({ title: 'Create PvP · KurwaDROP' })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

const { data } = await useFetch<CasesResponse>('/api/cases', { key: 'cases' })
// Every case on the site, once each (home lists some in several sections), cheapest first
const cases = computed(() => [...new Map((data.value?.sections ?? []).flatMap((sec) => sec.cases).map((c) => [c.slug, c])).values()].sort((a, b) => a.price - b.price))

const mode = ref<BattleMode>('classic')
const players = ref<2 | 3 | 4>(2)
// a team battle is always 2 vs 2
const size = computed(() => (mode.value === 'team' ? 4 : players.value))
const modeOptions = computed(() => (['classic', 'crazy', 'team'] as const).map((m) => ({ value: m, label: t(`pvp.modeName.${m}`) })))
const playerOptions = computed(() => ([2, 3, 4] as const).map((n) => ({ value: n, label: t(`pvp.modes.${n}`) })))
const qty = ref<Record<string, number>>({})
const search = ref('')
const MAX_ROUNDS = 25

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return cases.value.filter((c) => !q || c.name.toLowerCase().includes(q))
})
const rounds = computed(() => Object.values(qty.value).reduce((a, n) => a + n, 0))
const cost = computed(() => cases.value.reduce((a, c) => a + (qty.value[c.slug] ?? 0) * c.price, 0))
const picked = computed(() => cases.value.filter((c) => qty.value[c.slug]))

function add(slug: string, d: number) {
  const next = Math.max(0, (qty.value[slug] ?? 0) + d)
  if (d > 0 && rounds.value >= MAX_ROUNDS) return toast.show(t('pvp.maxRounds'))
  qty.value = { ...qty.value, [slug]: next }
  if (!next) {
    const { [slug]: _, ...rest } = qty.value
    qty.value = rest
  }
}

const creating = ref(false)
async function create() {
  if (!session.user) return ui.openSignIn()
  creating.value = true
  try {
    const res = await $fetch<BattleResponse>('/api/battles', {
      method: 'POST',
      body: { mode: mode.value, size: size.value, cases: Object.entries(qty.value).map(([slug, n]) => ({ slug, qty: n })) },
    })
    if (res.balance != null) session.user.balance = res.balance
    await navigateTo(`/pvp/${res.battle.id}`)
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 402) ui.openDeposit()
    else toast.error(e, t('common.error'))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 pb-24 lg:gap-6 lg:px-0 lg:pt-10 lg:pb-0">
    <UiPageBar :title="$t('pvp.create')" :left="[{ label: $t('pvp.back'), icon: 'arrow-left', to: '/pvp' }]" />

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
            <span :key="mode" class="type-12-regular text-neutral-12 lg:flex-1 lg:text-right">{{ $t(`pvp.modeRule.${mode}`) }}</span>
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
          <div
            v-for="c in visible"
            :key="c.slug"
            class="kd-ctile group flex flex-col items-center gap-2 rounded-5xl border p-3 lg:p-4"
            :class="{ 'is-added': !!qty[c.slug] }"
          >
            <img :src="c.image" :alt="c.name" class="kd-ctile-art h-28 w-full object-contain lg:h-36" />
            <span class="type-12-caps lg:type-14-caps w-full truncate text-center">{{ c.name }}</span>
            <UiPrice :amount="c.price" size="l" tone="coin" />
            <div v-if="qty[c.slug]" class="flex w-full items-center justify-between gap-1">
              <UiButton variant="secondary" size="m" icon-only icon="minus" aria-label="−1" @click="add(c.slug, -1)" />
              <span :key="qty[c.slug]" class="kd-count type-16-caps tabular-nums">{{ qty[c.slug] }}</span>
              <UiButton size="m" icon-only icon="plus" :aria-label="$t('pvp.add')" @click="add(c.slug, 1)" />
            </div>
            <UiButton v-else variant="secondary" size="m" icon="plus" block @click="add(c.slug, 1)">{{ $t('pvp.add') }}</UiButton>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <aside class="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 border-t border-neutral-5 bg-neutral-2 p-4 lg:sticky lg:top-24 lg:bottom-auto lg:rounded-5xl lg:border lg:border-neutral-4 lg:bg-neutral-2 lg:p-5">
        <h2 class="type-16-caps hidden lg:block">{{ $t('pvp.summary') }}</h2>
        <div v-if="picked.length" class="scrollbar-none hidden flex-wrap gap-2 lg:flex">
          <PvpCaseThumb v-for="c in picked" :key="c.slug" :image="c.image" :name="c.name" :qty="qty[c.slug]" />
        </div>
        <dl class="type-14 flex gap-6 lg:flex-col lg:gap-2">
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
        <UiButton size="l" block :disabled="!rounds" :loading="creating" @click="create">
          {{ $t('pvp.createFor') }}
          <UiPrice :amount="cost" size="m" tone="inverse" />
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
.kd-count {
  animation: kd-count 300ms var(--ease-spring);
}
@keyframes kd-count {
  from {
    transform: scale(1.4);
  }
}
</style>
