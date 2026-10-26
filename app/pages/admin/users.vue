<script setup lang="ts">
import type { AdminUsers } from '#shared/types/api'

// Admin · users: the signed-in demo player (nickname, balance, level and progress) and the fake players that fill
// the live feed, big wins, case top drops and PvP lobbies. PUT /api/admin/users.
useHead({ title: 'Users · Admin · KurwaDROP' })
const session = useSessionStore()

const { draft, dirty, saving, save, discard } = useAdminDraft<AdminUsers>(
  async () => (await $fetch<{ users: AdminUsers }>('/api/admin/users')).users,
  async (users) => (await $fetch<{ users: AdminUsers }>('/api/admin/users', { method: 'PUT', body: { users } })).users,
  // the header's balance and level follow at once
  (users) => session.user && Object.assign(session.user, users.player),
)
const addPlayer = () => draft.value!.players.push({ nickname: '', level: 1 })
</script>

<template>
  <div>
    <AdminHead title="Users" hint="The demo player, and the fake players who show up in the feed, big wins and PvP." />

    <div v-if="draft" class="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
      <AdminPanel title="Demo player" icon="user" hint="Who you play as when signed in">
        <AdminField label="Nickname"><UiInput v-model="draft.player.nickname" lazy /></AdminField>
        <AdminField label="Balance"><AdminCoinInput v-model="draft.player.balance" /></AdminField>
        <div class="grid grid-cols-2 gap-3">
          <AdminField label="Level"><UiInput v-model.number="draft.player.level" lazy align="right" inputmode="numeric" /></AdminField>
          <AdminField label="Progress" hint="To the next level"><AdminPercentInput v-model="draft.player.levelProgress" :per1="1" /></AdminField>
        </div>
      </AdminPanel>

      <AdminPanel :title="`Fake players (${draft.players.length})`" icon="user-empty" body="list" hint="Nicknames and levels; the first five win today's seeded big wins">
        <div v-for="(p, k) in draft.players" :key="k" class="flex items-center gap-2 rounded-2xl bg-neutral-3 p-1.5">
          <UiAvatar :src="avatarFor(p.nickname)" :size="32" class="shrink-0" />
          <UiInput v-model="p.nickname" size="s" lazy placeholder="nickname" class="flex-1" />
          <UiInput v-model.number="p.level" size="s" lazy align="right" inputmode="numeric" class="w-20">
            <template #leading><span class="type-10-caps shrink-0 text-neutral-11">Lvl</span></template>
          </UiInput>
          <UiButton variant="ghost" size="s" icon="x" icon-only :aria-label="`Remove ${p.nickname || 'player'}`" :disabled="draft.players.length <= 1" @click="draft.players.splice(k, 1)" />
        </div>
        <UiButton variant="secondary" icon="plus" class="mt-2 self-start" @click="addPlayer">Add player</UiButton>
      </AdminPanel>
    </div>
    <span v-else class="kd-skeleton block h-96 rounded-5xl" />

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
