<script setup lang="ts">
import type { SeedsResponse } from '#shared/types/api'

const open = defineModel<boolean>({ required: true })
const seeds = defineModel<SeedsResponse | null>('seeds', { required: true })
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

// The next pair's client seed is there from the start (a random one, yours to change or roll again), so the field never
// reads as a required step; after a rotation it moves up into the active pair and a fresh one takes its place
const randomSeed = () => (import.meta.client ? [...crypto.getRandomValues(new Uint8Array(5))].map((b) => b.toString(16).padStart(2, '0')).join('') : '')
const newClient = ref(randomSeed())
const rotating = ref(false)

async function rotate() {
  if (!session.user) return ui.openSignIn()
  rotating.value = true
  try {
    seeds.value = await $fetch<SeedsResponse>('/api/seeds/rotate', { method: 'POST', body: { clientSeed: newClient.value } })
    newClient.value = randomSeed()
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    rotating.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" :title="$t('fair.mySeeds')" :width="640">
    <div v-if="seeds" class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-2xl border border-success/40 bg-success-24/40 p-4">
        <span class="type-12-caps text-success">{{ $t('fair.activePair') }}</span>
        <dl class="grid gap-2 text-sm">
          <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeedHash') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.active.serverSeedHash }}</dd></div>
          <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.clientSeed') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.active.clientSeed }}</dd></div>
          <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.nonce') }}</dt><dd class="font-mono text-xs text-neutral-13">{{ seeds.active.nonce }}</dd></div>
        </dl>
      </div>

      <div class="flex flex-col gap-2">
        <label for="new-client" class="type-12-caps text-neutral-12">{{ $t('fair.newClientSeed') }}</label>
        <!-- the seed and a new random one beside it; the rotation is its own step under them -->
        <div class="flex gap-2">
          <UiInput id="new-client" v-model="newClient" size="l" mono class="min-w-0 flex-1" />
          <UiButton variant="secondary" size="l" icon="refresh" icon-only :aria-label="$t('fair.randomSeed')" :title="$t('fair.randomSeed')" @click="newClient = randomSeed()" />
        </div>
        <span class="type-12-regular text-neutral-11">{{ $t('fair.rotateHint') }}</span>
        <UiButton variant="fair" size="l" icon="shield-check" block :loading="rotating" :disabled="!newClient.trim()" class="mt-1" @click="rotate">{{ $t('fair.rotate') }}</UiButton>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-4">
        <span class="type-12-caps text-neutral-12">{{ $t('fair.previousPair') }}</span>
        <template v-if="seeds.previous">
          <dl class="grid gap-2 text-sm">
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeed') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.previous.serverSeed }}</dd></div>
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.clientSeed') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.previous.clientSeed }}</dd></div>
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.nonce') }}</dt><dd class="font-mono text-xs text-neutral-13">{{ seeds.previous.nonce ? `1–${seeds.previous.nonce}` : $t('fair.noRolls') }}</dd></div>
          </dl>
        </template>
        <span v-else class="type-14-regular text-neutral-11">{{ $t('fair.noPrevious') }}</span>
      </div>
    </div>
  </UiModal>
</template>
