<script setup lang="ts">
import type { AdminCase, AdminCaseInput, CaseTag, HomeCardKind, RiskLevel } from '#shared/types/api'

// Admin · one case: name, price, risk, tag; limited stock; its home card; its pictures (square, full card, wide,
// tall); odds (auto from the target RTP, or each skin's chance by hand) and contents. One draft, one Save
// (PUT /api/admin/cases/:slug).
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const toast = useToast()

const { saved, draft, dirty, saving, save, discard } = useAdminDraft<AdminCase>(
  async () => (await $fetch<{ case: AdminCase }>(`/api/admin/cases/${slug.value}`)).case,
  async (c) => {
    // a picture taken away goes as null; pictures left as they were go as they are
    const art = { wide: c.art.wide ?? null, tall: c.art.tall ?? null, full: c.art.full ?? null }
    const body: AdminCaseInput = { ...c, art, items: c.items.map((i) => ({ id: i.id, tickets: i.tickets })) }
    return (await $fetch<{ case: AdminCase }>(`/api/admin/cases/${slug.value}`, { method: 'PUT', body: { case: body } })).case
  },
  () => refreshNuxtData('cases'),
)
useHead({ title: () => `${saved.value?.name ?? 'Case'} · Admin · KurwaDROP` })

const RISKS: Array<{ value: RiskLevel; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'extreme', label: 'Extreme' },
]
const TAGS: Array<{ value: CaseTag | 'none'; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'hot', label: 'Hot' },
]
const ODDS = [
  { value: 'auto' as const, label: 'Auto', title: 'Solved from the target RTP' },
  { value: 'manual' as const, label: 'Manual', title: 'Each chance by hand' },
]
const NO_ART = 'No art for this case yet'
const cards = computed(() => {
  const art = draft.value?.art ?? {}
  return [
    { value: 'standard' as HomeCardKind, label: 'Card', title: 'Plain card' },
    { value: 'full' as HomeCardKind, label: 'Full', title: art.full ? 'Full scene' : NO_ART, disabled: !art.full },
    { value: 'wide' as HomeCardKind, label: '2×1', title: art.wide ? 'Wide 2×1 (desktop)' : NO_ART, disabled: !art.wide },
    { value: 'tall' as HomeCardKind, label: '1×2', title: art.tall ? 'Tall 1×2 (desktop, rows of 6+)' : NO_ART, disabled: !art.tall },
  ]
})

const tag = computed({
  get: () => draft.value?.tag ?? 'none',
  set: (v: CaseTag | 'none') => draft.value && (draft.value.tag = v === 'none' ? null : v),
})
const limitedOn = computed({
  get: () => !!draft.value?.limited,
  set: (on: boolean) => {
    if (!draft.value) return
    draft.value.limited = on ? (saved.value?.limited ?? { total: 500, left: 500 }) : null
  },
})
const endsAtText = computed({
  get: () => draft.value?.endsAt ?? '',
  set: (v: string) => draft.value && (draft.value.endsAt = v.trim() || null),
})
/** Auto odds go stale once the price, RTP or contents change: the solver runs on save */
const stale = computed(() => {
  const d = draft.value
  const s = saved.value
  if (!d || !s || d.odds !== 'auto') return false
  return d.price !== s.price || d.targetRtp !== s.targetRtp || d.odds !== s.odds || d.items.map((i) => i.id).join() !== s.items.map((i) => i.id).join()
})
const rtpOff = computed(() => !!saved.value && saved.value.odds === 'auto' && Math.abs(saved.value.rtp - saved.value.targetRtp) > 50)

async function duplicate() {
  try {
    const res = await $fetch<{ case: AdminCase }>(`/api/admin/cases/${slug.value}/duplicate`, { method: 'POST' })
    refreshNuxtData('cases')
    toast.show(`${res.case.name} added`, 'success')
    await navigateTo(`/admin/cases/${res.case.slug}`)
  } catch (e) {
    toast.error(e, 'Could not duplicate')
  }
}
</script>

<template>
  <div>
    <AdminHead :title="saved?.name ?? 'Case'" :hint="saved ? (saved.copyOf ? `Copy of ${saved.copyOf} · /case/${saved.slug}` : `/case/${saved.slug}`) : undefined">
      <template #before>
        <NuxtLink to="/admin/cases" class="type-12-caps flex items-center gap-1 text-neutral-11 hover:text-neutral-15"><UiIcon name="chevron-left" :size="16" />All cases</NuxtLink>
      </template>
      <UiButton variant="secondary" size="s" icon="eye" :to="`/case/${slug}`">Case page</UiButton>
      <UiButton variant="secondary" size="s" icon="copy" :disabled="dirty" :title="dirty ? 'Save first' : undefined" @click="duplicate">Duplicate</UiButton>
    </AdminHead>

    <div v-if="draft" class="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:items-start">
      <div class="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5 xl:flex xl:flex-col">
        <AdminPanel title="Case" icon="cases">
          <div class="flex items-center gap-3">
            <img :src="draft.image" alt="" class="size-16 shrink-0 object-contain" />
            <AdminField label="Name" class="flex-1"><UiInput v-model="draft.name" lazy /></AdminField>
          </div>
          <AdminField label="Price"><AdminCoinInput v-model="draft.price" /></AdminField>
          <AdminField label="Risk"><UiSegmented v-model="draft.risk" :options="RISKS" size="s" block /></AdminField>
          <AdminField label="Tag" hint="The badge on its card"><UiSegmented v-model="tag" :options="TAGS" size="s" block /></AdminField>
        </AdminPanel>

        <AdminPanel title="Limited stock" icon="fire" hint="Every open spends one; at 0 it is sold out">
          <template #actions><UiToggle v-model="limitedOn" label="Limited stock" /></template>
          <div v-if="draft.limited" class="grid grid-cols-2 gap-3">
            <AdminField label="Total"><UiInput v-model.number="draft.limited.total" lazy align="right" inputmode="numeric" /></AdminField>
            <AdminField label="Left"><UiInput v-model.number="draft.limited.left" lazy align="right" inputmode="numeric" /></AdminField>
          </div>
          <p v-else class="type-14-regular text-neutral-11">Unlimited</p>
        </AdminPanel>

        <AdminPanel title="Limited time" icon="history" hint="It can be opened until then; empty keeps it on for good">
          <AdminField label="Ends at" hint="UTC, like 2026-11-11T18:00:00Z"><UiInput v-model="endsAtText" lazy clearable placeholder="No end" @clear="endsAtText = ''" /></AdminField>
        </AdminPanel>

        <AdminPanel title="Card on home" icon="view-grid" hint="The same in every row; 2×1 and 1×2 show on desktop">
          <UiSegmented v-model="draft.card" :options="cards" size="s" block />
        </AdminPanel>
      </div>

      <div class="flex min-w-0 flex-col gap-4 lg:gap-5">
        <AdminPanel title="Pictures" icon="image" hint="One picture per place it shows. Tap a picture to upload a new one.">
          <AdminCaseArt v-model="draft" />
        </AdminPanel>

        <AdminPanel title="Odds and contents" icon="sliders">
          <AdminField label="Odds"><UiSegmented v-model="draft.odds" :options="ODDS" size="s" block /></AdminField>
          <div class="grid grid-cols-2 items-end gap-3">
            <AdminField v-if="draft.odds === 'auto'" label="Target RTP"><AdminPercentInput v-model="draft.targetRtp" /></AdminField>
            <div class="col-start-2 flex h-10 flex-col items-end justify-center">
              <span class="type-10-caps text-neutral-11">Real RTP</span>
              <span class="type-16-caps tabular-nums" :class="rtpOff ? 'text-warning' : ''">{{ ((saved?.rtp ?? 0) / 100).toFixed(2) }}%</span>
            </div>
          </div>
          <p class="type-12-regular text-neutral-11">
            <template v-if="draft.odds === 'auto'">The chances are solved so the case pays the target RTP: cheap skins often, top skins rarely.</template>
            <template v-else>Each skin's chance as you set it; the RTP follows from them and the price.</template>
            <span v-if="rtpOff" class="text-warning"> These skins can't reach the target at this price: cheaper or pricier ones get it closer.</span>
          </p>
          <AdminContents v-model="draft.items" :odds="draft.odds" :case-price="draft.price" :stale="stale" />
        </AdminPanel>
      </div>
    </div>
    <div v-else class="grid gap-4 xl:grid-cols-[340px_1fr]">
      <span class="kd-skeleton h-96 rounded-5xl" />
      <span class="kd-skeleton h-96 rounded-5xl" />
    </div>

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
