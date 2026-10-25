// One admin section's value as a draft (/admin): edit freely, Save sends it whole (PUT) and the draft becomes what
// the backend kept (it clamps and drops what does not fit), Discard goes back to the last saved value.
// Leaving the page with changes asks first.
export function useAdminDraft<T>(load: () => Promise<T>, put: (value: T) => Promise<T>, after?: (saved: T) => void) {
  const toast = useToast()
  const saved = ref<T | null>(null) as Ref<T | null>
  const draft = ref<T | null>(null) as Ref<T | null>
  const saving = ref(false)
  const copy = (v: T): T => JSON.parse(JSON.stringify(v))
  const dirty = computed(() => draft.value != null && JSON.stringify(draft.value) !== JSON.stringify(saved.value))

  async function reload() {
    try {
      const v = await load()
      saved.value = v
      draft.value = copy(v)
    } catch (e) {
      toast.error(e, 'Could not load this section')
    }
  }
  async function save() {
    if (!draft.value || saving.value) return
    saving.value = true
    try {
      const v = await put(copy(draft.value))
      saved.value = v
      draft.value = copy(v)
      after?.(v)
      toast.show('Saved', 'success')
    } catch (e) {
      toast.error(e, 'Could not save')
    } finally {
      saving.value = false
    }
  }
  const discard = () => saved.value != null && (draft.value = copy(saved.value))

  onMounted(reload)
  onBeforeRouteLeave(() => !dirty.value || window.confirm('Leave without saving your changes?'))
  return { saved, draft, dirty, saving, save, discard, reload }
}
