<script setup lang="ts">
const PLAY = [
  { key: 'cases', to: '/' },
  { key: 'upgrade', to: '/upgrade' },
  { key: 'bonuses', to: '/bonuses' },
  { key: 'pvp', to: '/pvp' },
]
const INFO = [
  { key: 'faq', to: '/faq' },
  { key: 'provablyFair', to: '/fairness' },
  { key: 'contact', to: '/contact' },
]
const SOCIAL = [
  { key: 'discord', label: 'Discord', hover: 'hover:bg-[#5865f2]' },
  { key: 'x', label: 'X', hover: 'hover:bg-neutral-15 hover:text-neutral-1' },
  { key: 'telegram', label: 'Telegram', hover: 'hover:bg-[#229ed9]' },
  { key: 'kick', label: 'Kick', hover: 'hover:bg-[#53fc18] hover:text-neutral-1' },
]
const PAYMENTS = ['visa', 'mastercard', 'applepay', 'googlepay', 'blik', 'crypto', 'skrill']
const year = new Date().getFullYear()

const { locale, locales, setLocale } = useI18n()
const localeOptions = computed(() => locales.value.map((l) => ({ value: l.code, label: l.name ?? l.code })))
const lang = computed({ get: () => locale.value, set: (v) => setLocale(v) })

const columns = computed(() => [
  { title: 'footer.play', links: PLAY },
  { title: 'footer.info', links: INFO },
  { title: 'footer.legal', links: LEGAL_NAV },
])
</script>

<template>
  <footer class="kd-footer border-t border-neutral-4 bg-neutral-2">
    <div class="mx-auto flex max-w-content flex-col gap-8 px-4 pt-10 pb-8 lg:gap-10 lg:px-0 lg:pt-14 lg:pb-10">
      <div class="flex flex-col gap-10 lg:flex-row lg:gap-24">
        <div class="flex max-w-105 flex-col gap-5">
          <UiLogo muted :height="56" />
          <p class="type-14-regular text-neutral-10">{{ $t('footer.about') }}</p>
          <div class="flex gap-2">
            <a
              v-for="s in SOCIAL"
              :key="s.key"
              href="#"
              class="grid size-10 place-items-center rounded-lg bg-neutral-6 text-neutral-12 transition-colors hover:text-neutral-15 active:opacity-80"
              :class="s.hover"
              :aria-label="s.label"
            >
              <UiIcon :name="s.key" :size="20" />
            </a>
          </div>
        </div>

        <div class="lg:flex-1" />

        <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:flex lg:gap-24">
          <div v-for="col in columns" :key="col.title" class="flex flex-col gap-4">
            <span class="type-12-caps text-neutral-10">{{ $t(col.title) }}</span>
            <NuxtLink
              v-for="l in col.links"
              :key="l.key"
              :to="l.to"
              class="type-14-caps whitespace-nowrap text-neutral-12 transition-colors hover:text-neutral-15"
            >
              {{ $t(`nav.${l.key}`) }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-2">
          <span class="type-12 grid size-9 place-items-center rounded-full bg-danger-24 text-danger">{{ $t('footer.adult') }}</span>
          <span class="type-12-caps flex h-9 items-center gap-1.5 rounded-full bg-success-24 pr-3 pl-2.5 text-success">
            <UiIcon name="shield-check" :size="16" />
            {{ $t('footer.provablyFair') }}
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <img v-for="p in PAYMENTS" :key="p" :src="`/img/pay/${p}.svg`" :alt="p" class="h-8 w-12" />
        </div>
      </div>

      <div class="h-px bg-neutral-4" />

      <div class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span class="type-12-caps text-neutral-8">{{ $t('footer.copyright', { year }) }}</span>
        <UiSelect v-model="lang" :options="localeOptions" class="w-40">
          <template #leading>
            <img src="/img/brand/flag-en.svg" alt="" class="h-3.5 w-5 shrink-0" />
          </template>
        </UiSelect>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* below the fold on every page: skipped until it is near the screen */
.kd-footer {
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}
</style>
