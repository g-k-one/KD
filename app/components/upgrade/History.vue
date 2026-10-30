<script setup lang="ts">
import type { HistoryEntry, HistoryResponse } from '#shared/types/api'

// "My upgrades" right on the page (player audit D8): the profile's history table with the roll and its chance; a row
// opens its check.
const props = defineProps<{ version: number }>()
const session = useSessionStore()
const entries = ref<HistoryEntry[]>([])
async function load() {
  if (!session.user) return (entries.value = [])
  try {
    entries.value = (await $fetch<HistoryResponse>('/api/history', { query: { game: 'upgrade', limit: 8 } })).entries
  } catch {
    entries.value = []
  }
}
onMounted(load)
watch(() => [props.version, session.user?.id], load)
</script>

<template>
  <section v-if="entries.length" class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="type-16-caps lg:type-20-caps">{{ $t('upgrade.myUpgrades') }}</h2>
      <NuxtLink to="/profile?tab=history" class="kd-hit type-12-caps relative text-neutral-11 [--hit:-12px_-8px] hover:text-neutral-15">{{ $t('upgrade.allHistory') }}</NuxtLink>
    </div>
    <!-- the profile's history table, with the roll and the chance it was played at; a row opens its check. The rows'
         12 px corners sit 12 px in from the card's 24, on every side -->
    <div class="kd-panel p-3">
      <HistoryTable roll :entries="entries" :link="(e) => (e.nonce ? `/fairness?roll=${e.id}` : undefined)" />
    </div>
  </section>
</template>
