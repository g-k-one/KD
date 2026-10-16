<script setup lang="ts">
import { CURRENCIES, type DisplayCurrency } from '~/stores/settings'

const { locale, locales, setLocale } = useI18n()
const settingsStore = useSettingsStore()
const s = computed(() => settingsStore.settings)

const localeOptions = computed(() => locales.value.map((l) => ({ value: l.code, label: l.name ?? l.code })))
const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: c.label }))

const lang = computed({ get: () => locale.value, set: (v) => setLocale(v) })
const currency = computed({
  get: () => s.value.currency,
  set: (v: DisplayCurrency) => settingsStore.update({ currency: v }),
})
const sound = computed({ get: () => s.value.sound, set: (v) => settingsStore.update({ sound: v }) })
const volume = computed({ get: () => s.value.volume, set: (v) => settingsStore.update({ volume: v }) })
const streamer = computed({ get: () => s.value.streamerMode, set: (v) => settingsStore.update({ streamerMode: v }) })
</script>

<template>
  <div class="flex flex-col gap-4">
    <h3 class="type-16-caps text-neutral-15">{{ $t('settings.title') }}</h3>

    <UiSelect v-model="lang" :options="localeOptions" :label="$t('settings.language')">
      <template #leading>
        <img src="/img/brand/flag-en.svg" alt="" class="h-3.5 w-5 shrink-0" />
      </template>
    </UiSelect>

    <UiSelect v-model="currency" :options="currencyOptions" :label="$t('settings.currency')" />

    <div class="flex flex-col gap-1.5 rounded-xl bg-neutral-3 p-3">
      <div class="flex items-center gap-2">
        <UiIcon name="sound" :size="20" :class="sound ? 'text-brand-light' : 'text-neutral-12'" />
        <span class="type-14-caps flex-1">{{ $t('settings.sound') }}</span>
        <UiToggle v-model="sound" :label="$t('settings.sound')" />
      </div>
      <p class="type-12-regular text-neutral-12">{{ $t('settings.soundHint') }}</p>
      <UiSlider v-if="sound" v-model="volume" :label="$t('settings.volume')" />
    </div>

    <div class="flex flex-col gap-1.5 rounded-xl bg-neutral-3 p-3">
      <div class="flex items-center gap-2">
        <UiIcon name="streamer" :size="20" class="text-neutral-15" />
        <span class="type-14-caps flex-1">{{ $t('settings.streamerMode') }}</span>
        <UiToggle v-model="streamer" :label="$t('settings.streamerMode')" />
      </div>
      <p class="type-12-regular text-neutral-12">{{ $t('settings.streamerModeHint') }}</p>
    </div>
  </div>
</template>
