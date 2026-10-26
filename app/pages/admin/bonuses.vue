<script setup lang="ts">
import type { AdminBonuses, AdminPromo } from '#shared/types/api'

// Admin · bonuses: the daily case (cooldown, tiers by level, each tier's worth and skins), the welcome cases
// (how many, worth, skins) and the promo codes (coins on Bonuses, or a bonus % on a deposit). PUT /api/admin/bonuses.
useHead({ title: 'Bonuses · Admin · KurwaDROP' })

const { draft, dirty, saving, save, discard } = useAdminDraft<AdminBonuses>(
  async () => (await $fetch<{ bonuses: AdminBonuses }>('/api/admin/bonuses')).bonuses,
  async (bonuses) => (await $fetch<{ bonuses: AdminBonuses }>('/api/admin/bonuses', { method: 'PUT', body: { bonuses } })).bonuses,
  () => refreshNuxtData('bonuses'),
)

/** Which levels land on a tier: one tier per rank, a rank every `per` levels (the last one keeps the rest) */
function tierLevels(k: number) {
  const d = draft.value!.daily
  const per = d.levelsPerTier
  const last = d.tiers.length - 1
  const from = k === 0 ? 1 : k * per
  if (k === last) return k === 0 ? 'Every level' : `Level ${from}+`
  return `Levels ${from}–${(k + 1) * per - 1}`
}
function addTier() {
  const tiers = draft.value!.daily.tiers
  const last = tiers[tiers.length - 1]!
  tiers.push({ price: last.price * 2, items: [...last.items] })
}
const removeTier = (k: number) => draft.value!.daily.tiers.splice(k, 1)

const KINDS = [
  { value: 'coins' as const, label: 'Coins' },
  { value: 'deposit' as const, label: 'Deposit %' },
]
function setKind(p: AdminPromo, kind: AdminPromo['kind']) {
  if (p.kind === kind) return
  p.kind = kind
  // 5 coins or +5%: a sane start either way
  p.value = 500
}
const addPromo = () => draft.value!.promos.push({ code: '', kind: 'coins', value: 500 })
</script>

<template>
  <div>
    <AdminHead title="Bonuses" hint="The free daily case, the welcome cases for new players, and promo codes." />

    <div v-if="draft" class="flex flex-col gap-4 lg:gap-5">
      <AdminPanel title="Daily case" icon="bonuses" hint="Free once per cooldown; every tier pays back its worth on average (RTP 100%)">
        <div class="grid grid-cols-2 gap-3 sm:max-w-md">
          <AdminField label="Cooldown">
            <UiInput v-model.number="draft.daily.cooldownHours" lazy align="right" inputmode="numeric">
              <template #trailing><span class="type-14 shrink-0 text-neutral-11">h</span></template>
            </UiInput>
          </AdminField>
          <AdminField label="Levels per rank"><UiInput v-model.number="draft.daily.levelsPerTier" lazy align="right" inputmode="numeric" /></AdminField>
        </div>
        <div v-for="(t, k) in draft.daily.tiers" :key="k" class="flex flex-col gap-3 border-t border-neutral-4 pt-4">
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="type-14-caps">Tier {{ k + 1 }}</span>
              <span class="type-12-regular text-neutral-11">{{ tierLevels(k) }}</span>
            </div>
            <AdminField label="Worth" class="w-40"><AdminCoinInput v-model="t.price" size="s" /></AdminField>
            <UiButton variant="ghost" size="s" icon="x" icon-only :aria-label="`Remove tier ${k + 1}`" :disabled="draft.daily.tiers.length <= 1" @click="removeTier(k)" />
          </div>
          <AdminContents v-model="t.items" :case-price="t.price" />
        </div>
        <UiButton variant="secondary" size="s" icon="plus" class="self-start" @click="addTier">Add tier</UiButton>
      </AdminPanel>

      <AdminPanel title="Welcome cases" icon="sparkle" hint="Free cases a new player opens from Bonuses (RTP 100%)">
        <div class="grid grid-cols-2 gap-3 sm:max-w-md">
          <AdminField label="Cases"><UiInput v-model.number="draft.welcome.total" lazy align="right" inputmode="numeric" /></AdminField>
          <AdminField label="Worth"><AdminCoinInput v-model="draft.welcome.price" /></AdminField>
        </div>
        <AdminContents v-model="draft.welcome.items" :case-price="draft.welcome.price" />
      </AdminPanel>

      <AdminPanel title="Promo codes" icon="diamond" body="list" hint="Coins: credited on Bonuses. Deposit %: added to a deposit">
        <div v-for="(p, k) in draft.promos" :key="k" class="flex flex-wrap items-center gap-2 rounded-[14px] bg-neutral-3 p-1.5">
          <UiInput v-model="p.code" size="s" uppercase lazy placeholder="CODE" class="min-w-32 flex-1" />
          <UiSegmented :model-value="p.kind" :options="KINDS" size="s" @update:model-value="setKind(p, $event)" />
          <AdminCoinInput v-if="p.kind === 'coins'" v-model="p.value" size="s" class="w-32" />
          <AdminPercentInput v-else v-model="p.value" size="s" class="w-32" />
          <UiButton variant="ghost" size="s" icon="x" icon-only :aria-label="`Remove ${p.code || 'code'}`" @click="draft.promos.splice(k, 1)" />
        </div>
        <UiButton variant="secondary" icon="plus" class="mt-2 self-start" @click="addPromo">Add code</UiButton>
      </AdminPanel>
    </div>
    <span v-else class="kd-skeleton block h-96 rounded-5xl" />

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
