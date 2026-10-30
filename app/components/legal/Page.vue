<script setup lang="ts">
import type { LegalDoc, LegalSlug } from '#shared/types/api'

// One legal document: the list of documents beside it (above it on phones), numbered sections, the date of the last
// change. A link can aim at a section (/privacy#cookies): it is brought into view once the text has loaded.
const props = defineProps<{ slug: LegalSlug }>()
const { t } = useI18n()
const route = useRoute()
const title = computed(() => t(`nav.${props.slug}`))
useHead({ title: () => `${title.value} · KurwaDROP` })

const { data } = useFetch<LegalDoc>(`/api/legal/${props.slug}`, { key: `legal-${props.slug}`, lazy: true })
// after the router's own scroll to the top, which runs right after page:finish
const pageReady = ref(false)
useNuxtApp().hooks.hookOnce('page:finish', () => void setTimeout(() => (pageReady.value = true), 50))
watch([data, pageReady], ([d, ready]) => d && ready && route.hash && nextTick(() => document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' })))
// phones: the documents scroll sideways, the open one stays in view
const nav = useTemplateRef<HTMLElement>('nav')
onMounted(() => {
  const el = nav.value
  const on = el?.querySelector<HTMLElement>('[aria-current="page"]')
  if (el && on) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2
})
const updated = computed(() => data.value && new Date(data.value.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))
</script>

<template>
  <div class="kd-page kd-page-top gap-6">
    <UiPageBar
      class="-mb-2"
      :title="title"
      :left="[{ label: t('case.allCases'), icon: 'arrow-left', to: '/' }]"
      :right="[{ label: t('nav.contact'), icon: 'info', to: '/contact' }]"
    />

    <div class="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
      <nav ref="nav" class="scrollbar-none relative flex gap-1 overflow-x-auto kd-panel p-2 lg:sticky lg:top-24 lg:flex-col" :aria-label="t('footer.legal')">
        <NuxtLink
          v-for="d in LEGAL_NAV"
          :key="d.key"
          :to="d.to"
          class="kd-doc type-14 flex h-10 shrink-0 items-center rounded-3xl px-4"
          :class="d.key === slug ? 'bg-neutral-4 text-neutral-15' : 'text-neutral-12'"
          :aria-current="d.key === slug ? 'page' : undefined"
        >
          {{ t(`nav.${d.key}`) }}
        </NuxtLink>
      </nav>

      <article class="flex min-w-0 flex-col gap-6 kd-panel p-4 lg:p-8">
        <template v-if="data">
          <p class="type-12-regular text-neutral-11">{{ t('help.updated', { date: updated }) }} · {{ t('help.sample') }}</p>
          <section v-for="(s, i) in data.sections" :id="s.id" :key="s.id" class="flex max-w-[72ch] scroll-mt-28 flex-col gap-2">
            <h2 class="type-16-medium">{{ i + 1 }}. {{ s.title }}</h2>
            <p v-for="(p, n) in s.paragraphs" :key="n" class="type-14-regular text-neutral-12">{{ p }}</p>
          </section>
        </template>
        <template v-else>
          <span v-for="n in 5" :key="n" class="kd-skeleton h-20 rounded-2xl" aria-hidden="true" />
        </template>
      </article>
    </div>
  </div>
</template>

<style scoped>
.kd-doc {
  transition:
    background-color var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-doc:hover {
    color: var(--color-neutral-15);
  }
}
</style>
