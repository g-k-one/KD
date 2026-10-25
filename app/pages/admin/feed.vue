<script setup lang="ts">
import type { AdminBigWinInput, AdminCase, AdminFeed, AdminUsers, BigWin, Item } from '#shared/types/api'

// Admin · live feed and big wins. The feed: paused or not, how often a random drop comes, how many of them are
// upgrade and PvP wins (PUT /api/admin/feed, one Save). Big wins: today's list as home's "Big wins today" takes it
// (top 6), seeded wins added or removed at once (POST / DELETE /api/admin/big-wins).
useHead({ title: 'Feed & big wins · Admin · KurwaDROP' })
const toast = useToast()

const { draft, dirty, saving, save, discard } = useAdminDraft<AdminFeed>(
  async () => (await $fetch<{ feed: AdminFeed }>('/api/admin/feed')).feed,
  async (feed) => (await $fetch<{ feed: AdminFeed }>('/api/admin/feed', { method: 'PUT', body: { feed } })).feed,
)
const caseShare = computed(() => (draft.value ? Math.max(0, 10_000 - draft.value.upgradeShareBp - draft.value.pvpShareBp) / 100 : 0))

// --- Big wins ---
const wins = ref<BigWin[] | null>(null)
const sources = ref<Array<{ value: string; label: string }>>([])
const players = ref<Array<{ value: string; label: string }>>([])
onMounted(async () => {
  try {
    const [w, c, u] = await Promise.all([
      $fetch<{ wins: BigWin[] }>('/api/admin/big-wins'),
      $fetch<{ cases: AdminCase[] }>('/api/admin/cases'),
      $fetch<{ users: AdminUsers }>('/api/admin/users'),
    ])
    wins.value = w.wins
    sources.value = [{ value: 'upgrade', label: 'Upgrade' }, { value: 'pvp', label: 'PvP battle' }, ...c.cases.map((x) => ({ value: x.slug, label: x.name }))]
    players.value = [...u.users.players, u.users.player].map((p) => ({ value: p.nickname, label: `${p.nickname} · lvl ${p.level}` }))
    form.value.nickname = players.value[0]?.value ?? ''
  } catch (e) {
    toast.error(e, 'Could not load the big wins')
  }
})

const form = ref<Omit<AdminBigWinInput, 'itemId'> & { item: Item | null }>({ nickname: '', item: null, source: 'upgrade', multiplier: 250, hoursAgo: 1 })
const picking = ref(false)
const adding = ref(false)
async function add() {
  if (!form.value.item) return toast.show('Pick a skin first', 'danger')
  adding.value = true
  try {
    const { item, ...rest } = form.value
    wins.value = (await $fetch<{ wins: BigWin[] }>('/api/admin/big-wins', { method: 'POST', body: { win: { ...rest, itemId: item.id } } })).wins
    refreshNuxtData()
    toast.show('Big win added', 'success')
  } catch (e) {
    toast.error(e, 'Could not add')
  } finally {
    adding.value = false
  }
}
async function remove(w: BigWin) {
  try {
    wins.value = (await $fetch<{ wins: BigWin[] }>(`/api/admin/big-wins/${w.id}`, { method: 'DELETE' })).wins
    refreshNuxtData()
  } catch (e) {
    toast.error(e, 'Could not remove')
  }
}
const ago = (at: string) => {
  const h = (Date.now() - Date.parse(at)) / 3600_000
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m ago` : `${Math.floor(h)}h ago`
}
</script>

<template>
  <div>
    <AdminHead title="Feed & big wins" hint="The live drop strip on top of every page, and the day's big wins on home." />

    <div class="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:items-start">
      <div class="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5 xl:flex xl:flex-col">
        <AdminPanel title="Live feed" icon="live" hint="Players' own drops always show">
          <template v-if="draft">
            <template v-if="!draft.paused">
              <AdminField label="New drop per poll" hint="The chance a poll brings a random drop"><AdminPercentInput v-model="draft.rateBp" /></AdminField>
              <div class="grid grid-cols-2 gap-3">
                <AdminField label="Upgrade wins"><AdminPercentInput v-model="draft.upgradeShareBp" /></AdminField>
                <AdminField label="PvP wins"><AdminPercentInput v-model="draft.pvpShareBp" /></AdminField>
              </div>
              <p class="type-12-regular text-neutral-11">Case drops: the other {{ caseShare.toFixed(2) }}%</p>
            </template>
            <p v-else class="type-14-regular text-neutral-11">Paused: no random drops</p>
          </template>
          <template #actions><UiToggle v-if="draft" :model-value="!draft.paused" label="Random drops" @update:model-value="draft.paused = !$event" /></template>
        </AdminPanel>

        <AdminPanel title="Add a big win" icon="plus" hint="A seeded win: it joins today's list and its case's top drops">
          <div class="grid gap-2 sm:grid-cols-2">
            <UiSelect v-model="form.nickname" :options="players" placeholder="Player" />
            <UiSelect v-model="form.source" :options="sources" placeholder="Won in" />
          </div>
          <UiButton variant="secondary" :icon="form.item ? undefined : 'plus'" class="min-w-0" @click="picking = true">
            <span class="truncate">{{ form.item ? `${form.item.weapon} | ${form.item.skin}` : 'Pick a skin' }}</span>
          </UiButton>
          <div class="grid grid-cols-2 gap-2">
            <UiInput v-model.number="form.multiplier" lazy align="right" inputmode="numeric">
              <template #leading><span class="type-14 shrink-0 text-neutral-11">×</span></template>
            </UiInput>
            <UiInput v-model.number="form.hoursAgo" lazy align="right" inputmode="decimal">
              <template #trailing><span class="type-14 shrink-0 text-neutral-11">h ago</span></template>
            </UiInput>
          </div>
          <UiButton icon="plus" :loading="adding" class="self-start" @click="add">Add win</UiButton>
        </AdminPanel>
      </div>

      <AdminPanel :title="`Big wins today${wins ? ` (${wins.length})` : ''}`" icon="trophy" body="list" hint="Best first; home shows the top 6">
        <template v-if="wins">
          <div v-for="(w, k) in wins" :key="w.id" class="flex h-14 items-center gap-3 rounded-2xl py-1.5 pr-1.5 pl-2" :class="k < 6 ? 'bg-neutral-3' : 'bg-neutral-3 opacity-64'">
            <ItemArt :image="w.item.image" :rarity="w.item.rarity" :size="40" class="w-11 shrink-0" />
            <span class="type-16-caps w-16 shrink-0 text-coin tabular-nums">×{{ w.multiplier }}</span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="type-14 truncate">{{ w.item.weapon }} | {{ w.item.skin }}</span>
              <span class="type-12-regular truncate text-neutral-11">{{ w.caseName }} · {{ w.nickname }} · {{ ago(w.at) }}</span>
            </span>
            <UiPrice :amount="w.item.price" size="s" class="shrink-0 max-sm:hidden" />
            <UiButton variant="ghost" size="s" icon="x" icon-only :aria-label="`Remove ${w.item.skin} win`" @click="remove(w)" />
          </div>
        </template>
        <template v-else>
          <span v-for="n in 6" :key="n" class="kd-skeleton h-14 rounded-2xl" />
        </template>
      </AdminPanel>
    </div>

    <AdminSkinPicker v-model="picking" title="Pick the skin" :multiple="false" @pick="form.item = $event" />
    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
