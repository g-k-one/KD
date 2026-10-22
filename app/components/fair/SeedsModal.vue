<script setup lang="ts">
import type { SeedsResponse } from '#shared/types/api'

const open = defineModel<boolean>({ required: true })
const seeds = defineModel<SeedsResponse | null>('seeds', { required: true })
const emit = defineEmits<{ verify: [{ serverSeed: string; clientSeed: string; nonce: number }] }>()
const { t } = useI18n()
const session = useSessionStore()
const ui = useUiStore()
const toast = useToast()

const newClient = ref('')
const rotating = ref(false)

async function rotate() {
  if (!session.user) return ui.openSignIn()
  rotating.value = true
  try {
    seeds.value = await $fetch<SeedsResponse>('/api/seeds/rotate', { method: 'POST', body: { clientSeed: newClient.value } })
    newClient.value = ''
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
        <div class="flex gap-2">
          <UiInput id="new-client" v-model="newClient" size="l" mono clearable class="min-w-0 flex-1" />
          <UiButton variant="fair" size="l" icon="refresh" :loading="rotating" @click="rotate">{{ $t('fair.rotate') }}</UiButton>
        </div>
        <span class="type-12-regular text-neutral-11">{{ $t('fair.rotateHint') }}</span>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl bg-neutral-3 p-4">
        <span class="type-12-caps text-neutral-12">{{ $t('fair.previousPair') }}</span>
        <template v-if="seeds.previous">
          <dl class="grid gap-2 text-sm">
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.serverSeed') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.previous.serverSeed }}</dd></div>
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.clientSeed') }}</dt><dd class="truncate font-mono text-xs text-neutral-13">{{ seeds.previous.clientSeed }}</dd></div>
            <div class="grid grid-cols-[140px_1fr] gap-3"><dt class="type-12-caps text-neutral-11">{{ $t('fair.nonce') }}</dt><dd class="font-mono text-xs text-neutral-13">{{ seeds.previous.nonce ? `1–${seeds.previous.nonce}` : $t('fair.noRolls') }}</dd></div>
          </dl>
          <UiButton
            variant="fair"
            icon="check-circle"
            class="self-start"
            :disabled="!seeds.previous.nonce"
            @click="emit('verify', { serverSeed: seeds.previous!.serverSeed, clientSeed: seeds.previous!.clientSeed, nonce: Math.max(1, seeds.previous!.nonce) })"
          >
            {{ $t('fair.useInVerifier') }}
          </UiButton>
        </template>
        <span v-else class="type-14-regular text-neutral-11">{{ $t('fair.noPrevious') }}</span>
      </div>
    </div>
  </UiModal>
</template>
