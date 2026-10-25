<script setup lang="ts">
import type { AdminCase } from '#shared/types/api'

// Admin · cases: every case in one list — price, real RTP, risk, tag, stock, home card. A row opens its editor;
// Duplicate makes a copy with the same art and contents, and copies can be deleted.
useHead({ title: 'Cases · Admin · KurwaDROP' })
const toast = useToast()
const cases = ref<AdminCase[] | null>(null)
const busy = ref<string | null>(null)

async function load() {
  try {
    cases.value = (await $fetch<{ cases: AdminCase[] }>('/api/admin/cases')).cases
  } catch (e) {
    toast.error(e, 'Could not load the cases')
  }
}
onMounted(load)

async function duplicate(c: AdminCase) {
  busy.value = c.slug
  try {
    const res = await $fetch<{ case: AdminCase }>(`/api/admin/cases/${c.slug}/duplicate`, { method: 'POST' })
    await load()
    refreshNuxtData('cases')
    toast.show(`${res.case.name} added`, 'success')
  } catch (e) {
    toast.error(e, 'Could not duplicate')
  } finally {
    busy.value = null
  }
}
async function remove(c: AdminCase) {
  if (!window.confirm(`Delete ${c.name}?`)) return
  busy.value = c.slug
  try {
    await $fetch(`/api/admin/cases/${c.slug}`, { method: 'DELETE' })
    await load()
    refreshNuxtData('cases')
    toast.show(`${c.name} deleted`)
  } catch (e) {
    toast.error(e, 'Could not delete')
  } finally {
    busy.value = null
  }
}

const CARD: Record<AdminCase['card'], string> = { standard: 'Card', full: 'Full', wide: '2×1', tall: '1×2' }
const RISK: Record<AdminCase['risk'], string> = { low: 'Low', medium: 'Medium', high: 'High', extreme: 'Extreme' }
const rtpTone = (c: AdminCase) => (Math.abs(c.rtp - c.targetRtp) > 50 && c.odds === 'auto' ? 'text-warning' : 'text-neutral-15')
</script>

<template>
  <div>
    <AdminHead title="Cases" hint="Price, RTP, odds and contents of every case. Duplicate one to make a new case with its art." />

    <AdminPanel :title="`All cases${cases ? ` (${cases.length})` : ''}`" icon="cases" body="list">
      <!-- column titles (desktop) -->
      <div class="type-10-caps hidden items-center lg:grid-cols-[48px_minmax(0,1fr)_88px_72px_80px_76px] xl:grid-cols-[48px_minmax(0,1fr)_88px_72px_72px_80px_56px_76px] gap-3 px-2 pb-1 text-neutral-11 lg:grid">
        <span />
        <span>Case</span>
        <span class="text-right">Price</span>
        <span class="text-right">RTP</span>
        <span class="hidden xl:block">Risk</span>
        <span>Stock</span>
        <span class="hidden xl:block">Card</span>
        <span />
      </div>
      <template v-if="cases">
        <div
          v-for="c in cases"
          :key="c.slug"
          class="kd-admin-row relative grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-neutral-3 py-1.5 pr-1.5 pl-2 lg:grid-cols-[48px_minmax(0,1fr)_88px_72px_80px_76px] xl:grid-cols-[48px_minmax(0,1fr)_88px_72px_72px_80px_56px_76px]"
        >
          <NuxtLink :to="`/admin/cases/${c.slug}`" class="absolute inset-0 rounded-2xl" :aria-label="`Edit ${c.name}`" />
          <img :src="c.image" alt="" class="size-12 object-contain" loading="lazy" />
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="flex min-w-0 items-center gap-2">
              <span class="type-14-caps truncate">{{ c.name }}</span>
              <span v-if="c.tag" class="type-10-caps shrink-0 rounded-sm px-1.5 py-0.5" :class="c.tag === 'hot' ? 'bg-danger-24 text-danger' : 'bg-success-24 text-success'">{{ c.tag }}</span>
            </span>
            <span class="type-12-regular truncate text-neutral-11 max-lg:hidden">
              {{ c.copyOf ? `Copy of ${c.copyOf}` : c.slug }} · {{ c.items.length }} skins · {{ c.odds === 'manual' ? 'manual odds' : 'auto odds' }}
            </span>
            <!-- phones: the numbers the columns show on desktop -->
            <span class="type-12-regular flex min-w-0 items-center gap-1.5 text-neutral-11 lg:hidden">
              <UiPrice :amount="c.price" size="xs" class="shrink-0" />
              <span class="truncate">· RTP {{ (c.rtp / 100).toFixed(2) }}%{{ c.limited ? ` · ${c.limited.left} left` : '' }}{{ c.copyOf ? ' · copy' : '' }}</span>
            </span>
          </div>
          <span class="hidden justify-end lg:flex"><UiPrice :amount="c.price" size="s" /></span>
          <span class="type-14 hidden text-right tabular-nums lg:block" :class="rtpTone(c)">{{ (c.rtp / 100).toFixed(2) }}%</span>
          <span class="type-12 hidden text-neutral-12 xl:block">{{ RISK[c.risk] }}</span>
          <span class="type-12 hidden tabular-nums lg:block" :class="c.limited && !c.limited.left ? 'text-danger' : 'text-neutral-12'">{{ c.limited ? `${c.limited.left} / ${c.limited.total}` : '—' }}</span>
          <span class="type-12 hidden text-neutral-12 xl:block">{{ CARD[c.card] }}</span>
          <div class="relative flex justify-end gap-1">
            <UiButton variant="ghost" size="s" icon="copy" icon-only :aria-label="`Duplicate ${c.name}`" title="Duplicate" :loading="busy === c.slug" @click="duplicate(c)" />
            <UiButton v-if="c.copyOf" variant="ghost" size="s" icon="x" icon-only :aria-label="`Delete ${c.name}`" title="Delete copy" :disabled="busy === c.slug" @click="remove(c)" />
            <UiIcon v-else name="chevron-right" :size="18" class="m-1.5 text-neutral-11 max-lg:hidden" />
          </div>
        </div>
      </template>
      <template v-else>
        <span v-for="n in 8" :key="n" class="kd-skeleton h-15 rounded-2xl" />
      </template>
    </AdminPanel>
  </div>
</template>

<style scoped>
@media (hover: hover) {
  .kd-admin-row:hover {
    background: var(--color-neutral-4);
  }
}
</style>
