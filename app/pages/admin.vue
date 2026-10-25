<script setup lang="ts">
/*
 * The admin panel (prototype): every setting of the site, one section per page — cases, home layout, bonuses,
 * upgrade and PvP, live feed and big wins, users. Each section saves through /api/admin/* (shared/types/api.ts),
 * the same contract the Go backend implements. Its own shell, not the site's: a top bar, a left nav (a chip row
 * on phones), and "Reset everything" at the end of the nav.
 */
definePageMeta({ layout: false })
useHead({ title: 'Admin · KurwaDROP' })

const route = useRoute()
const toast = useToast()
const NAV = [
  { to: '/admin/cases', label: 'Cases', icon: 'cases' },
  { to: '/admin/home', label: 'Home layout', icon: 'view-grid' },
  { to: '/admin/bonuses', label: 'Bonuses', icon: 'bonuses' },
  { to: '/admin/games', label: 'Upgrade & PvP', icon: 'm-upgrade' },
  { to: '/admin/feed', label: 'Feed & big wins', icon: 'live' },
  { to: '/admin/users', label: 'Users', icon: 'user' },
]
const active = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
// phones: the open section's chip stays in sight
const chips = useTemplateRef<HTMLElement>('chips')
function showChip() {
  const el = chips.value?.querySelector<HTMLElement>('[aria-pressed="true"]')
  el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}
onMounted(showChip)
watch(() => route.path, () => nextTick(showChip))

const resetting = ref(false)
const rev = ref(0)
const confirmReset = ref(false)
async function resetAll() {
  resetting.value = true
  try {
    await $fetch('/api/admin/reset', { method: 'POST' })
    confirmReset.value = false
    toast.show('Everything is back to the defaults', 'success')
    // the open section reads its values again
    rev.value += 1
    refreshNuxtData()
  } catch (e) {
    toast.error(e, 'Could not reset')
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="sticky top-0 z-30 border-b border-neutral-4 bg-neutral-2">
      <div class="mx-auto box-content flex h-14 max-w-content items-center gap-3 px-4 lg:h-16 lg:px-6">
        <NuxtLink to="/" aria-label="KurwaDROP" class="shrink-0"><UiLogo :height="32" /></NuxtLink>
        <span class="type-12-caps rounded-md bg-brand-24 px-2 py-1 text-brand-light">Admin</span>
        <UiButton variant="ghost" size="s" icon="arrow-left" to="/" class="ml-auto">Back to site</UiButton>
      </div>
    </header>

    <!-- phones: the sections as a row of chips -->
    <nav ref="chips" class="kd-admin-chips flex gap-1 overflow-x-auto px-4 pt-3 lg:hidden" aria-label="Admin sections">
      <NuxtLink v-for="n in NAV" :key="n.to" :to="n.to" custom>
        <template #default="{ navigate }">
          <UiChip size="m" :icon="n.icon" :active="active(n.to)" @click="navigate">{{ n.label }}</UiChip>
        </template>
      </NuxtLink>
    </nav>

    <div class="mx-auto box-content flex max-w-content gap-6 px-4 pt-4 pb-32 lg:px-6 lg:pt-8">
      <nav class="sticky top-24 hidden w-60 shrink-0 flex-col gap-1 self-start rounded-5xl bg-neutral-2 p-2 lg:flex" aria-label="Admin sections">
        <NuxtLink
          v-for="n in NAV"
          :key="n.to"
          :to="n.to"
          class="kd-press kd-admin-link type-14-caps flex h-12 items-center gap-3 rounded-3xl px-4"
          :class="active(n.to) ? 'is-active text-neutral-15' : 'text-neutral-12 hover:bg-white-4 hover:text-neutral-15'"
        >
          <UiIcon :name="n.icon" :size="20" />{{ n.label }}
        </NuxtLink>
        <div class="mx-2 my-1 h-px bg-neutral-4" />
        <button type="button" class="kd-press type-12-caps flex h-10 items-center gap-3 rounded-3xl px-4 text-neutral-11 hover:bg-white-4 hover:text-neutral-15" @click="confirmReset = true">
          <UiIcon name="refresh" :size="18" />Reset everything
        </button>
      </nav>

      <main class="min-w-0 flex-1">
        <NuxtPage :key="rev" />
        <UiButton variant="ghost" size="s" icon="refresh" class="mt-6 lg:hidden" @click="confirmReset = true">Reset everything</UiButton>
      </main>
    </div>

    <UiModal v-model="confirmReset" title="Reset everything?" description="Cases, home layout, bonuses, rules, feed, big wins and users go back to the defaults. Copies of cases are deleted.">
      <template #actions>
        <UiButton variant="secondary" size="l" class="flex-1" @click="confirmReset = false">Cancel</UiButton>
        <UiButton variant="danger" size="l" class="flex-1" :loading="resetting" @click="resetAll">Reset</UiButton>
      </template>
    </UiModal>
    <UiToaster />
  </div>
</template>

<style scoped>
.kd-admin-chips {
  scrollbar-width: none;
}
.kd-admin-link.is-active {
  background: var(--color-white-8);
  box-shadow: inset 3px 0 0 var(--color-brand-base);
}
</style>
