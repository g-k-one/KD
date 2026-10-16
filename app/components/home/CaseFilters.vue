<script setup lang="ts">
import type { RiskLevel } from '#shared/types/api'
import { PRICE_RANGES, RISK_LEVELS, type CaseSort, type PriceRange } from '~/composables/useCaseFilters'

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
  <div
    class="grid grid-cols-2 gap-x-3 gap-y-4 rounded-5xl border border-neutral-4 bg-neutral-2 px-4 pt-3 pb-4 lg:flex lg:items-end lg:gap-6"
  >
    <UiSelect v-model="price" :options="priceOptions" :label="$t('filters.price')" menu-width="fixed" class="lg:w-52.5" />

    <UiSelect
      v-model:values="risks"
      multiple
      :options="riskOptions"
      :label="$t('filters.volatility')"
      :placeholder="$t('filters.allLevels')"
      class="lg:w-52.5"
    >
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

    <label
      class="type-14 col-span-2 flex h-10 cursor-pointer items-center gap-2.5 lg:col-auto"
      :class="!session.user && 'cursor-not-allowed opacity-40'"
    >
      <UiToggle v-model="affordable" :label="$t('filters.affordable')" :disabled="!session.user" :class="!session.user && 'pointer-events-none'" />
      {{ $t('filters.affordable') }}
    </label>

    <div class="hidden flex-1 lg:block" />

    <UiSelect v-model="sort" :options="sortOptions" :label="$t('filters.sort')" class="col-span-2 lg:col-auto lg:w-52.5" />
  </div>
</template>
