<script setup lang="ts">
import type { FaqResponse } from '#shared/types/api'

// FAQ: find it by typing or by topic; what is left leads to the Contact page
useHead({ title: 'FAQ · KurwaDROP' })
const { t } = useI18n()

const { data } = useFetch<FaqResponse>('/api/faq', { key: 'faq', lazy: true })
const query = ref('')
const topic = ref('all')
const topics = computed(() => [{ id: 'all', title: t('help.faqAll'), icon: 'view-grid' }, ...(data.value?.groups ?? [])])
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (data.value?.groups ?? [])
    .filter((g) => topic.value === 'all' || g.id === topic.value)
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || `${i.q} ${i.a}`.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length)
})
</script>

<template>
  <div class="kd-page kd-page-top gap-6">
    <UiPageBar
      class="-mb-2"
      :title="t('nav.faq')"
      :left="[{ label: t('case.allCases'), icon: 'arrow-left', to: '/' }]"
      :right="[{ label: t('nav.contact'), icon: 'info', to: '/contact' }]"
    />

    <!-- the same frame as the legal pages: the topics beside the text (above it on phones), one column of questions -->
    <div class="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
      <nav class="scrollbar-none flex gap-1 overflow-x-auto kd-panel p-2 lg:sticky lg:top-24 lg:flex-col" :aria-label="t('nav.faq')">
        <button
          v-for="o in topics"
          :key="o.id"
          type="button"
          class="kd-topic type-14 flex h-10 shrink-0 items-center gap-3 rounded-3xl px-4 text-left"
          :class="topic === o.id ? 'bg-neutral-4 text-neutral-15' : 'text-neutral-12'"
          :aria-pressed="topic === o.id"
          @click="topic = o.id"
        >
          <UiIcon :name="o.icon" :size="18" class="shrink-0" />
          {{ o.title }}
        </button>
      </nav>

      <div class="flex min-w-0 flex-col gap-6">
        <UiInput v-model="query" size="l" icon="search" clearable inputmode="search" :placeholder="t('help.faqSearch')" />

        <div v-if="!data" class="flex flex-col gap-2">
          <span v-for="n in 8" :key="n" class="kd-skeleton h-14 rounded-5xl" aria-hidden="true" />
        </div>
        <UiEmptyState v-else-if="!groups.length" :text="t('help.faqEmpty')" art="empty-search">
          <UiButton variant="secondary" to="/contact">{{ t('nav.contact') }}</UiButton>
        </UiEmptyState>
        <div v-else class="flex flex-col gap-8 lg:gap-10">
          <section v-for="g in groups" :key="g.id" class="flex flex-col gap-4">
            <UiSectionHeader :title="g.title" />
            <div class="flex flex-col gap-2">
              <UiAccordion v-for="i in g.items" :key="i.q" :title="i.q">{{ i.a }}</UiAccordion>
            </div>
          </section>
        </div>

        <div class="flex flex-col items-center gap-3 kd-panel p-4 text-center lg:flex-row lg:px-6 lg:text-left">
          <p class="type-14-regular flex-1 text-neutral-12">{{ t('help.faqMore') }}</p>
          <UiButton variant="secondary" size="m" to="/contact">{{ t('nav.contact') }}</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-topic {
  transition:
    background-color var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out);
}
@media (hover: hover) {
  .kd-topic:hover {
    color: var(--color-neutral-15);
  }
}
</style>
