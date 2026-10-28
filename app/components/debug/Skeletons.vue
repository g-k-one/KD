<script setup lang="ts">
// The loading skeletons as the pages show them while their data comes in, one page at a time at its real width
type Page = 'case' | 'home' | 'battle' | 'drops'
const prefs = usePersisted('kd_debug_skeleton', { page: 'case' as Page })
const page = computed({ get: () => prefs.value.page, set: (v: Page) => (prefs.value = { ...prefs.value, page: v }) })
const PAGES: { value: Page; label: string }[] = [
  { value: 'case', label: 'Case page' },
  { value: 'home', label: 'Home catalog' },
  { value: 'battle', label: 'Battle room' },
  { value: 'drops', label: 'Drop cards' },
]
const isSm = useMediaQuery('(min-width: 640px)')
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="dbg-card">
      <h2 class="dbg-h">Skeletons <span class="dbg-note">what a page shows until its data comes in</span></h2>
      <UiSegmented v-model="page" :options="PAGES" size="s" />
    </section>

    <CasePageSkeleton v-if="page === 'case'" />

    <!-- the catalog's two rows, as on Home -->
    <template v-else-if="page === 'home'">
      <section v-for="n in 2" :key="n" class="flex flex-col gap-4" aria-hidden="true">
        <div class="flex h-8 items-center"><span class="kd-skeleton h-6 w-44 rounded-md" /></div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          <HomeCaseCardSkeleton v-for="k in 5" :key="k" />
        </div>
      </section>
    </template>

    <PvpRoomSkeleton v-else-if="page === 'battle'" />

    <template v-else>
      <section class="dbg-card">
        <h2 class="dbg-h">Drop card skeleton <span class="dbg-note">DropCardSkeleton · regular · compact (phones)</span></h2>
        <div class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          <ItemDropCardSkeleton v-for="n in 6" :key="n" :compact="!isSm" />
        </div>
        <div class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          <ItemDropCardSkeleton v-for="n in 6" :key="n" compact />
        </div>
      </section>
    </template>
  </div>
</template>
