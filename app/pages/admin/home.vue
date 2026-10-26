<script setup lang="ts">
import type { AdminCase, HomeLayout, SectionTheme } from '#shared/types/api'
import type { Directive } from 'vue'
import type Sortable from 'sortablejs'

// Admin · home layout: the rows of home in order (PUT /api/admin/home-layout). Each row: its title, the cases in it
// and their order, a scene behind it, shown or hidden. Weekly picks fills itself; rows added here can be removed.
// Rows drag by their grip, cases drag anywhere on their chip, within a row and from one row to another.
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
const setTheme = (i: number, t: SectionTheme | 'none') => draft.value && (draft.value.sections[i]!.theme = t === 'none' ? null : t)
const toggle = (i: number) => draft.value && (draft.value.sections[i]!.hidden = !draft.value.sections[i]!.hidden || undefined)

// the cases of a row: add (from the ones not in it yet), take out
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

/*
 * Drag and drop (SortableJS: mouse and touch alike, scrolls the page near its edges). Vue keeps the DOM: Sortable's own
 * move is put back at once and the change goes to the draft. A case can't land in a row that already has it.
 */
type Drop = { from: HTMLElement; to: HTMLElement; oldIndex: number; newIndex: number }
const rowOf = (el: HTMLElement) => draft.value?.sections[Number(el.dataset.row)]
function dropped({ from, to, oldIndex, newIndex }: Drop) {
  if (!draft.value) return
  if (from.dataset.kind === 'rows') {
    const [row] = draft.value.sections.splice(oldIndex, 1)
    draft.value.sections.splice(newIndex, 0, row!)
    return
  }
  const [slug] = rowOf(from)!.cases!.splice(oldIndex, 1)
  const target = rowOf(to)!
  target.cases = target.cases ?? []
  target.cases.splice(newIndex, 0, slug!)
}
const vDragSort: Directive<HTMLElement & { sortable?: Sortable }, 'rows' | 'cases'> = {
  async mounted(el, { value }) {
    const { default: Sortable } = await import('sortablejs')
    let next: Node | null = null
    el.dataset.kind = value
    el.sortable = Sortable.create(el, {
      group: value === 'rows' ? 'rows' : { name: 'cases', put: (to, _from, item) => !rowOf(to.el)?.cases?.includes(item.dataset.slug!) },
      draggable: value === 'rows' ? '.kd-drag-row' : '.kd-drag-case',
      handle: value === 'rows' ? '.kd-row-grip' : undefined,
      filter: 'button',
      preventOnFilter: false,
      delay: value === 'cases' ? 160 : 0,
      delayOnTouchOnly: true,
      animation: 160,
      forceFallback: true,
      fallbackOnBody: true,
      ghostClass: 'kd-drag-ghost',
      fallbackClass: 'kd-drag-float',
      onStart: (e) => (next = e.item.nextSibling),
      onEnd: (e) => {
        e.item.remove()
        e.from.insertBefore(e.item, next)
        if (e.oldDraggableIndex == null || e.newDraggableIndex == null || (e.from === e.to && e.oldDraggableIndex === e.newDraggableIndex)) return
        dropped({ from: e.from, to: e.to, oldIndex: e.oldDraggableIndex, newIndex: e.newDraggableIndex })
      },
    })
  },
  unmounted: (el) => el.sortable?.destroy(),
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
        <div v-drag-sort="'rows'" class="flex flex-col gap-1">
          <div v-for="(r, i) in draft.sections" :key="r.id" class="kd-drag-row flex flex-col gap-3 rounded-3xl bg-neutral-3 p-2.5 transition-opacity" :class="r.hidden && 'opacity-48'">
            <!-- the row: a grip to drag it, its number and name, its scene, show / hide, remove (rows added here) -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="kd-row-grip flex w-9 shrink-0 cursor-grab touch-none items-center justify-center gap-0.5 self-stretch rounded-lg text-neutral-11 hover:text-neutral-15" :title="`Drag ${r.title}`">
                <UiIcon name="dots-six-vertical" :size="16" />
                <span class="type-14-caps tabular-nums">{{ i + 1 }}</span>
              </span>
              <UiInput v-model="r.title" size="s" lazy class="min-w-40 flex-1" :aria-label="`Row ${i + 1} title`" />
              <span v-if="r.hidden" class="type-10-caps rounded-sm bg-neutral-5 px-1.5 py-0.5 text-neutral-13">Hidden</span>
              <div class="flex items-center gap-1 max-sm:w-full max-sm:justify-end">
                <UiSegmented :model-value="r.theme ?? 'none'" :options="THEMES" size="s" class="mr-1" @update:model-value="setTheme(i, $event)" />
                <UiButton size="s" variant="secondary" :icon="r.hidden ? 'eye' : 'eye-slash'" icon-only :title="r.hidden ? 'Show row' : 'Hide row'" :aria-label="`${r.hidden ? 'Show' : 'Hide'} ${r.title}`" @click="toggle(i)" />
                <UiButton v-if="r.id.startsWith('row-')" size="s" variant="secondary" icon="x" icon-only title="Remove row" :aria-label="`Remove ${r.title}`" @click="removeRow(i)" />
              </div>
            </div>

            <!-- its cases, in order -->
            <p v-if="r.id === AUTO" class="type-12-regular pl-11 text-neutral-11">Fills itself: five cases every Monday, none of them from the first row.</p>
            <div v-else v-drag-sort="'cases'" :data-row="i" class="flex flex-wrap items-center gap-2 pl-11">
              <div v-for="(slug, k) in r.cases ?? []" :key="slug" :data-slug="slug" class="kd-drag-case kd-row-case flex cursor-grab items-center gap-1.5 rounded-xl py-1 pr-1 pl-1.5">
                <img v-if="caseOf(slug)" :src="caseOf(slug)!.image" alt="" draggable="false" class="size-8 object-contain" />
                <span class="type-12 max-w-32 truncate">{{ caseOf(slug)?.name ?? slug }}</span>
                <button type="button" class="kd-hit relative grid size-6 place-items-center rounded-md text-neutral-11 hover:text-danger" :aria-label="`Remove ${slug} from ${r.title}`" @click="dropCase(i, k)"><UiIcon name="x" :size="14" /></button>
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
/* where the dragged one will land, and the one under the finger */
.kd-drag-ghost {
  background: transparent;
  outline: 1.5px dashed var(--color-neutral-8);
  outline-offset: -1.5px;
}
.kd-drag-ghost > * {
  opacity: 0;
}
.kd-drag-float {
  opacity: 1 !important;
  box-shadow:
    0 0 0 1.5px var(--color-brand-base),
    0 12px 24px rgb(0 0 0 / 0.6);
}
</style>
