<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'
import { PRICE_RANGES, RISK_LEVELS, type CaseSort, type PriceRange } from '~/composables/useCaseFilters'

// Figma "CaseFilters". Desktop: labelled fields in one row. Mobile: the same four controls
// in a tight 2×2 grid without captions, so every option stays one tap away.
const price = defineModel<PriceRange>('price', { required: true })
const risks = defineModel<RiskLevel[]>('risks', { required: true })
const affordable = defineModel<boolean>('affordable', { required: true })
const sort = defineModel<CaseSort>('sort', { required: true })

const { t } = useI18n()
const session = useSessionStore()

const RISK_SWATCH: Record<RiskLevel, string> = {
  low: 'var(--color-success)',
  medium: 'var(--color-coin)',
  high: 'var(--color-brand-light)',
  extreme: 'var(--color-danger)',
}

const priceOptions = computed(() =>
  PRICE_RANGES.map((r) => ({ value: r, label: r === 'any' ? t('filters.any') : r.replace('-', '–'), coin: r !== 'any' })),
)
const riskOptions = computed(() => RISK_LEVELS.map((r) => ({ value: r, label: t(`risk.${r}`), swatch: RISK_SWATCH[r] })))
const sortOptions = computed(() =>
  (['default', 'priceAsc', 'priceDesc', 'newest'] as const).map((s) => ({ value: s, label: t(`filters.sortOptions.${s}`) })),
)
</script>

<template>
  <div class="rounded-3xl border border-neutral-4 bg-neutral-2 p-2 lg:rounded-5xl lg:px-4 lg:pt-3 lg:pb-4">
    <!-- Mobile -->
    <div class="grid grid-cols-2 gap-2 lg:hidden">
      <UiSelect v-model="price" :options="priceOptions" menu-width="fixed">
        <template #leading><UiCoin :size="16" /></template>
      </UiSelect>
      <UiSelect v-model:values="risks" multiple :options="riskOptions" :placeholder="$t('filters.allLevels')" menu-width="fixed" class="kd-menu-right">
        <template #leading>
          <span class="grid h-4.5 shrink-0 grid-cols-4 gap-0.5">
            <span
              v-for="r in RISK_LEVELS"
              :key="r"
              class="w-1.5 rounded-full"
              :style="{ background: RISK_SWATCH[r], opacity: risks.length && !risks.includes(r) ? 0.25 : 1 }"
            />
          </span>
        </template>
      </UiSelect>
      <UiSelect v-model="sort" :options="sortOptions" menu-width="fixed">
        <template #leading><UiIcon name="sort" :size="16" class="text-neutral-11" /></template>
      </UiSelect>
      <label
        class="type-12 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-4 bg-neutral-1 px-3"
        :class="!session.user && 'opacity-40'"
      >
        <UiToggle v-model="affordable" :label="$t('filters.affordable')" :disabled="!session.user" />
        <span class="leading-tight">{{ $t('filters.affordableShort') }}</span>
      </label>
    </div>

    <!-- Desktop -->
    <div class="hidden items-end gap-6 lg:flex">
      <UiSelect v-model="price" :options="priceOptions" :label="$t('filters.price')" menu-width="fixed" class="w-52.5" />
      <UiSelect v-model:values="risks" multiple :options="riskOptions" :label="$t('filters.volatility')" :placeholder="$t('filters.allLevels')" class="w-52.5">
        <template #leading>
          <span class="grid h-4.5 shrink-0 grid-cols-4 gap-0.5">
            <span
              v-for="r in RISK_LEVELS"
              :key="r"
              class="w-1.5 rounded-full"
              :style="{ background: RISK_SWATCH[r], opacity: risks.length && !risks.includes(r) ? 0.25 : 1 }"
            />
          </span>
        </template>
      </UiSelect>
      <label class="type-14 flex h-10 cursor-pointer items-center gap-2.5" :class="!session.user && 'cursor-not-allowed opacity-40'">
        <UiToggle v-model="affordable" :label="$t('filters.affordable')" :disabled="!session.user" />
        {{ $t('filters.affordable') }}
      </label>
      <div class="flex-1" />
      <UiSelect v-model="sort" :options="sortOptions" :label="$t('filters.sort')" class="w-52.5" />
    </div>
  </div>
</template>

<style scoped>
/* Right-column menus open towards the left edge so they never overflow the screen */
:deep(.kd-menu-right > ul) {
  left: auto;
  right: 0;
}
</style>
