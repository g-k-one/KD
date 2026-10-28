<script setup lang="ts">
// Figma "ProfileMenu" head + balance block. compact = MobileMenu version (both values in the coin colour, Deposit + Withdraw as small buttons).
import type { User } from '#shared/types/api'

const props = withDefaults(defineProps<{ user: User; compact?: boolean; actions?: boolean }>(), { actions: true })
const streamer = computed(() => useSettingsStore().settings.streamerMode)

const maskedSteamId = computed(() => `${props.user.steamId.slice(0, 4)}…${props.user.steamId.slice(-4)}`)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <UiAvatar :src="user.avatar" :size="48" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <div class="flex items-center gap-1.5">
          <span class="type-16-caps truncate">{{ user.nickname }}</span>
          <UiLevelBadge :level="user.level" />
        </div>
        <span v-if="!streamer" class="type-12-regular text-neutral-11">{{ $t('profile.steamId', { id: maskedSteamId }) }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="type-12 flex justify-between text-neutral-14">
        <span>{{ $t('profile.level', { from: user.level, to: user.level + 1 }) }}</span>
        <span>{{ user.levelProgress }}%</span>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-neutral-8">
        <div class="bg-brand-gradient h-full rounded-full" :style="{ width: `${user.levelProgress}%` }" />
      </div>
    </div>

    <div class="flex flex-col gap-3 bg-neutral-3 p-3" :class="compact ? 'rounded-lg' : 'rounded-[22px]'">
      <div class="flex items-center justify-between">
        <span class="type-12-caps text-neutral-11">{{ $t('wallet.balance') }}</span>
        <UiPrice :amount="user.balance" size="l" :tone="compact ? 'coin' : 'default'" />
      </div>
      <div class="flex items-center justify-between">
        <span class="type-12-caps text-neutral-11">{{ $t('wallet.skins') }}</span>
        <UiPrice :amount="user.skinsValue" size="l" tone="coin" />
      </div>
      <div v-if="compact && actions" class="flex gap-2">
        <UiButton size="s" icon="plus" class="flex-1" to="/deposit">{{ $t('wallet.deposit') }}</UiButton>
        <UiButton size="s" variant="secondary" icon="arrow-up" class="flex-1" to="/withdraw">{{ $t('wallet.withdraw') }}</UiButton>
      </div>
      <UiButton v-else-if="!compact" size="l" icon="plus" block to="/deposit">{{ $t('wallet.depositFunds') }}</UiButton>
    </div>
  </div>
</template>
