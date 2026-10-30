<script setup lang="ts">
import type { FaqResponse } from '#shared/types/api'

// FAQ: find it by typing or by topic; what is left leads to the Contact page
useHead({ title: 'FAQ · KurwaDROP' })
const { t } = useI18n()

const { data } = useFetch<FaqResponse>('/api/faq', { key: 'faq', lazy: true })
const query = ref('')
const topic = ref('all')
const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (data.value?.groups ?? [])
    .filter((g) => topic.value === 'all' || g.id === topic.value)
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || `${i.q} ${i.a}`.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length)
})
</script>

<template>
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:px-0 lg:pt-10">
    <UiPageBar
      class="-mb-2"
      :title="t('nav.faq')"
      :left="[{ label: t('case.allCases'), icon: 'arrow-left', to: '/' }]"
      :right="[{ label: t('nav.contact'), icon: 'info', to: '/contact' }]"
    />

    <div class="flex flex-col gap-3 rounded-5xl bg-neutral-2 p-3 lg:flex-row lg:items-center lg:px-4">
      <UiInput v-model="query" size="l" icon="search" clearable inputmode="search" :placeholder="t('help.faqSearch')" class="min-w-0 lg:w-80 lg:shrink-0" />
      <div class="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 lg:mx-0 lg:flex-wrap lg:justify-end lg:px-0 lg:flex-1">
        <UiChip size="m" :active="topic === 'all'" @click="topic = 'all'">{{ t('help.faqAll') }}</UiChip>
        <UiChip v-for="g in data?.groups" :key="g.id" size="m" :active="topic === g.id" @click="topic = g.id">{{ g.title }}</UiChip>
      </div>
    </div>

    <div v-if="!data" class="grid gap-2 lg:grid-cols-2">
      <span v-for="n in 8" :key="n" class="kd-skeleton h-14 rounded-5xl" aria-hidden="true" />
    </div>
    <UiEmptyState v-else-if="!groups.length" :text="t('help.faqEmpty')" art="empty-search">
      <UiButton variant="secondary" to="/contact">{{ t('nav.contact') }}</UiButton>
    </UiEmptyState>
    <section v-for="g in groups" v-else :key="g.id" class="flex flex-col gap-3">
      <div class="flex items-center gap-3 px-1">
        <UiIcon :name="g.icon" :size="20" class="text-neutral-12" />
        <h2 class="type-16-medium">{{ g.title }}</h2>
      </div>
      <!-- each column runs on its own, so an opened answer does not stretch its neighbour -->
      <div class="grid items-start gap-2 lg:grid-cols-2">
        <UiAccordion v-for="i in g.items" :key="i.q" :title="i.q">{{ i.a }}</UiAccordion>
      </div>
    </section>

    <div class="flex flex-col items-center gap-3 rounded-5xl bg-neutral-2 p-4 text-center lg:flex-row lg:px-6 lg:text-left">
      <p class="type-14-regular flex-1 text-neutral-12">{{ t('help.faqMore') }}</p>
      <UiButton variant="secondary" size="m" to="/contact">{{ t('nav.contact') }}</UiButton>
    </div>
  </div>
</template>
