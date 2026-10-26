<script setup lang="ts">
import type { AdminCase, HomeLayout, SectionTheme } from '#shared/types/api'

// Admin · home layout: the rows of home in order (PUT /api/admin/home-layout). Each row: its title, the cases in it
// and their order, a scene behind it, shown or hidden. Weekly picks fills itself; rows added here can be removed.
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
const { data: casesData } = useFetch<{ cases: AdminCase[] }>('/api/admin/cases', { key: 'admin-cases', server: false })
const caseOf = (slug: string) => casesData.value?.cases.find((c) => c.slug === slug)

const AUTO = 'weekly'
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

// the cases of a row: add (from the ones not in it yet), take out, move left / right
const adding = ref<Record<string, string>>({})
const addOptions = (rowCases: string[]) =>
  (casesData.value?.cases ?? []).filter((c) => !rowCases.includes(c.slug)).map((c) => ({ value: c.slug, label: `${c.name} · ${formatCoins(c.price)}` }))
function addCase(i: number, slug: string) {
  const row = draft.value?.sections[i]
  if (!row || !slug) return
  row.cases = [...(row.cases ?? []), slug]
  adding.value[row.id] = ''
}
const dropCase = (i: number, k: number) => draft.value?.sections[i]!.cases!.splice(k, 1)
function shift(i: number, k: number, dir: -1 | 1) {
  const list = draft.value?.sections[i]!.cases
  if (!list || !list[k + dir]) return
  ;[list[k], list[k + dir]] = [list[k + dir]!, list[k]!]
}

// a new row goes to the end, empty, with its title ready to type
let seq = 0
function addRow() {
  if (!draft.value) return
  draft.value.sections.push({ id: `row-${Date.now().toString(36)}${seq++}`, title: 'New row', cases: [] })
}
const removeRow = (i: number) => draft.value?.sections.splice(i, 1)

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
    <AdminHead title="Home layout" hint="The rows of home: their names, the cases in each and their order, a scene behind the cards, shown or hidden.">
      <UiButton variant="secondary" size="s" icon="sliders" @click="editOnHome">Edit on home</UiButton>
      <UiButton variant="ghost" size="s" icon="refresh" :disabled="dirty" @click="reset">Default layout</UiButton>
    </AdminHead>

    <AdminPanel title="Rows" icon="view-grid" body="list" hint="Top to bottom as on home. A hidden row keeps its place; a row with no cases is not shown.">
      <template v-if="draft">
        <div v-for="(r, i) in draft.sections" :key="r.id" class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-3 transition-opacity" :class="r.hidden && 'opacity-48'">
          <!-- the row: its number and name, its scene, order, show / hide, remove (rows added here) -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="type-14-caps w-5 shrink-0 text-center text-neutral-11 tabular-nums">{{ i + 1 }}</span>
            <UiInput v-model="r.title" size="s" lazy class="min-w-40 flex-1" :aria-label="`Row ${i + 1} title`" />
            <span v-if="r.hidden" class="type-10-caps rounded-sm bg-neutral-5 px-1.5 py-0.5 text-neutral-13">Hidden</span>
            <div class="flex items-center gap-1 max-sm:w-full max-sm:justify-end">
              <UiSegmented :model-value="r.theme ?? 'none'" :options="THEMES" size="s" class="mr-1" @update:model-value="setTheme(i, $event)" />
              <UiButton size="s" variant="secondary" icon="chevron-up" icon-only title="Move up" :aria-label="`Move ${r.title} up`" :disabled="i === 0" @click="move(i, -1)" />
              <UiButton size="s" variant="secondary" icon="chevron-down" icon-only title="Move down" :aria-label="`Move ${r.title} down`" :disabled="i === draft.sections.length - 1" @click="move(i, 1)" />
              <UiButton size="s" variant="secondary" :icon="r.hidden ? 'eye' : 'eye-slash'" icon-only :title="r.hidden ? 'Show row' : 'Hide row'" :aria-label="`${r.hidden ? 'Show' : 'Hide'} ${r.title}`" @click="toggle(i)" />
              <UiButton v-if="r.id.startsWith('row-')" size="s" variant="secondary" icon="x" icon-only title="Remove row" :aria-label="`Remove ${r.title}`" @click="removeRow(i)" />
            </div>
          </div>

          <!-- its cases, in order -->
          <p v-if="r.id === AUTO" class="type-12-regular pl-7 text-neutral-11">Fills itself: five cases every Monday, none of them from the first row.</p>
          <div v-else class="flex flex-wrap items-center gap-2 pl-7">
            <div v-for="(slug, k) in r.cases ?? []" :key="slug" class="kd-row-case flex items-center gap-1.5 rounded-xl py-1 pr-1 pl-1.5 [--hit:-6px_0px]">
              <img v-if="caseOf(slug)" :src="caseOf(slug)!.image" alt="" class="size-8 object-contain" />
              <span class="type-12 max-w-32 truncate">{{ caseOf(slug)?.name ?? slug }}</span>
              <span class="flex items-center">
                <button type="button" class="kd-hit relative grid size-6 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 disabled:opacity-30" :disabled="k === 0" :aria-label="`Move ${slug} left`" @click="shift(i, k, -1)"><UiIcon name="chevron-left" :size="14" /></button>
                <button type="button" class="kd-hit relative grid size-6 place-items-center rounded-md text-neutral-11 hover:text-neutral-15 disabled:opacity-30" :disabled="k === (r.cases?.length ?? 0) - 1" :aria-label="`Move ${slug} right`" @click="shift(i, k, 1)"><UiIcon name="chevron-right" :size="14" /></button>
                <button type="button" class="kd-hit relative grid size-6 place-items-center rounded-md text-neutral-11 hover:text-danger" :aria-label="`Remove ${slug} from ${r.title}`" @click="dropCase(i, k)"><UiIcon name="x" :size="14" /></button>
              </span>
            </div>
            <UiSelect
              :model-value="adding[r.id] ?? ''"
              :options="addOptions(r.cases ?? [])"
              placeholder="Add a case"
              menu-width="fixed"
              class="w-44"
              @update:model-value="addCase(i, $event as string)"
            >
              <template #leading><UiIcon name="plus" :size="16" class="text-neutral-11" /></template>
            </UiSelect>
          </div>
        </div>
        <UiButton variant="secondary" size="m" icon="plus" class="self-start" @click="addRow">Add a row</UiButton>
      </template>
      <template v-else>
        <span v-for="n in 4" :key="n" class="kd-skeleton h-24 rounded-2xl" />
      </template>
    </AdminPanel>

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>

<style scoped>
.kd-row-case {
  background: var(--color-neutral-4);
}
</style>
