// The cases this player opened last, newest first (docs/ux-research-v3.md #4 "Continue"): kept on this device,
// written by the case page after a paid opening, read by the home page
export function useRecentCases() {
  const store = usePersisted('kd_recent', { slugs: [] as string[] })
  const slugs = computed(() => store.value.slugs)
  function add(slug: string) {
    store.value = { slugs: [slug, ...store.value.slugs.filter((s) => s !== slug)].slice(0, 8) }
  }
  return { slugs, add }
}
