<script setup lang="ts">
import type { HomeLayout, SectionTheme } from '#shared/types/api'

// Admin · home layout: the rows of home in order, each with its scene and shown or hidden (PUT /api/admin/home-layout).
// Card kinds live on each case; the same layout can be edited in place on home.
useHead({ title: 'Home layout · Admin · KurwaDROP' })
const homeLayout = useHomeLayout()

const { draft, dirty, saving, save, discard, reload } = useAdminDraft<HomeLayout>(
  async () => (await $fetch<{ layout: HomeLayout }>('/api/admin/home-layout')).layout,
  async (layout) => (await $fetch<{ layout: HomeLayout }>('/api/admin/home-layout', { method: 'PUT', body: { layout } })).layout,
  (layout) => {
    homeLayout.layout.value = layout
    refreshNuxtData('cases')
  },
)

const THEMES: Array<{ value: SectionTheme | 'none'; label: string; title: string }> = [
  { value: 'none', label: 'No scene', title: 'Plain row' },
  { value: 'coop', label: 'Coop', title: 'Chicken coop: cards sit in nests' },
]
function move(i: number, dir: -1 | 1) {
  const rows = draft.value?.sections
  if (!rows || !rows[i + dir]) return
  ;[rows[i], rows[i + dir]] = [rows[i + dir]!, rows[i]!]
}
const setTheme = (i: number, t: SectionTheme | 'none') => draft.value && (draft.value.sections[i]!.theme = t === 'none' ? null : t)
const toggle = (i: number) => draft.value && (draft.value.sections[i]!.hidden = !draft.value.sections[i]!.hidden || undefined)

async function reset() {
  await homeLayout.reset()
  await reload()
}
async function editOnHome() {
  homeLayout.editing.value = true
  await navigateTo('/')
}
</script>

<template>
  <div>
    <AdminHead title="Home layout" hint="The rows of home: their order, a scene behind the cards, shown or hidden.">
      <UiButton variant="secondary" size="s" icon="sliders" @click="editOnHome">Edit on home</UiButton>
      <UiButton variant="ghost" size="s" icon="refresh" :disabled="dirty" @click="reset">Default layout</UiButton>
    </AdminHead>

    <AdminPanel title="Rows" icon="view-grid" body="list" hint="Top to bottom as on home. A hidden row keeps its place.">
      <template v-if="draft">
        <div
          v-for="(r, i) in draft.sections"
          :key="r.id"
          class="flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-3 py-1.5 pr-1.5 pl-4 transition-opacity"
          :class="r.hidden && 'opacity-48'"
        >
          <span class="type-14-caps w-5 shrink-0 text-neutral-11 tabular-nums">{{ i + 1 }}</span>
          <span class="type-14-caps min-w-0 flex-1 truncate">{{ r.title }}</span>
          <span v-if="r.hidden" class="type-10-caps rounded-sm bg-neutral-5 px-1.5 py-0.5 text-neutral-13">Hidden</span>
          <div class="flex items-center gap-1 max-sm:w-full max-sm:justify-end">
            <UiSegmented :model-value="r.theme ?? 'none'" :options="THEMES" size="s" class="mr-1" @update:model-value="setTheme(i, $event)" />
            <UiButton size="s" variant="secondary" icon="chevron-up" icon-only title="Move up" :aria-label="`Move ${r.title} up`" :disabled="i === 0" @click="move(i, -1)" />
            <UiButton size="s" variant="secondary" icon="chevron-down" icon-only title="Move down" :aria-label="`Move ${r.title} down`" :disabled="i === draft.sections.length - 1" @click="move(i, 1)" />
            <UiButton size="s" variant="secondary" :icon="r.hidden ? 'eye' : 'eye-slash'" icon-only :title="r.hidden ? 'Show row' : 'Hide row'" :aria-label="`${r.hidden ? 'Show' : 'Hide'} ${r.title}`" @click="toggle(i)" />
          </div>
        </div>
      </template>
      <template v-else>
        <span v-for="n in 4" :key="n" class="kd-skeleton h-11 rounded-2xl" />
      </template>
    </AdminPanel>

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
