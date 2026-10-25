<script setup lang="ts">
import type { GameRules } from '#shared/types/api'
import { upgradeChanceBp } from '#shared/upgrade'

// Admin · upgrade and PvP: the upgrade's house edge, chance cap and floor, pieces per stake; PvP round time,
// round cap and bot names. PUT /api/admin/games; the site reads the same numbers from GET /api/rules.
useHead({ title: 'Upgrade & PvP · Admin · KurwaDROP' })
const rules = useGameRules()

const { draft, dirty, saving, save, discard } = useAdminDraft<GameRules>(
  async () => (await $fetch<{ games: GameRules }>('/api/admin/games')).games,
  async (games) => (await $fetch<{ games: GameRules }>('/api/admin/games', { method: 'PUT', body: { games } })).games,
  (games) => (rules.value = games),
)

/** What a player sees with these numbers: a 100-coin stake on a skin worth 2× and 10× */
const example = computed(() => {
  if (!draft.value) return []
  return [2, 10].map((x) => ({ x, chance: upgradeChanceBp(10_000, 10_000 * x, draft.value!.upgrade) / 100 }))
})
const roundSeconds = computed({
  get: () => (draft.value ? draft.value.pvp.roundMs / 1000 : 0),
  set: (s: number) => draft.value && (draft.value.pvp.roundMs = Math.round(s * 1000)),
})
</script>

<template>
  <div>
    <AdminHead title="Upgrade & PvP" hint="The odds and limits of the games. The site shows chances with the same numbers." />

    <div v-if="draft" class="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
      <AdminPanel title="Upgrade" icon="m-upgrade" hint="Chance = stake ÷ target × (100% − edge)">
        <div class="grid grid-cols-2 gap-3">
          <AdminField label="House edge"><AdminPercentInput v-model="draft.upgrade.edgeBp" /></AdminField>
          <AdminField label="Max chance"><AdminPercentInput v-model="draft.upgrade.maxChanceBp" /></AdminField>
          <AdminField label="Min chance" hint="Below it, no upgrade"><AdminPercentInput v-model="draft.upgrade.minChanceBp" /></AdminField>
          <AdminField label="Pieces per stake" hint="Balance counts as one"><UiInput v-model.number="draft.upgrade.maxItems" lazy align="right" inputmode="numeric" /></AdminField>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-for="e in example" :key="e.x" class="type-12 flex items-center gap-2 rounded-lg bg-neutral-3 px-3 py-2">
            <span class="text-neutral-11">×{{ e.x }} target</span>
            <span class="type-12-caps tabular-nums">{{ e.chance.toFixed(2) }}%</span>
          </span>
        </div>
      </AdminPanel>

      <AdminPanel title="PvP battles" icon="m-pvp">
        <div class="grid grid-cols-2 gap-3">
          <AdminField label="Round time">
            <UiInput v-model.number="roundSeconds" lazy align="right" inputmode="decimal">
              <template #trailing><span class="type-14 shrink-0 text-neutral-11">s</span></template>
            </UiInput>
          </AdminField>
          <AdminField label="Max rounds"><UiInput v-model.number="draft.pvp.maxRounds" lazy align="right" inputmode="numeric" /></AdminField>
        </div>
        <AdminField label="Bot names" hint="A bot called into a seat takes the next name">
          <div class="flex flex-col gap-2">
            <div v-for="(_, k) in draft.pvp.botNames" :key="k" class="flex items-center gap-2">
              <UiInput v-model="draft.pvp.botNames[k]" lazy class="flex-1" />
              <UiButton variant="ghost" icon="x" icon-only :aria-label="`Remove ${draft.pvp.botNames[k]}`" :disabled="draft.pvp.botNames.length <= 1" @click="draft.pvp.botNames.splice(k, 1)" />
            </div>
            <UiButton variant="secondary" size="s" icon="plus" class="self-start" @click="draft.pvp.botNames.push(`Bot ${draft.pvp.botNames.length + 1}`)">Add bot</UiButton>
          </div>
        </AdminField>
      </AdminPanel>
    </div>
    <span v-else class="kd-skeleton block h-96 rounded-5xl" />

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
