<script setup lang="ts">
import type { HistoryEntry, SeedsResponse } from '#shared/types/api'

// Figma "Fairness", around one path: the player's own rolls, each with one action (Check, or Reveal and check).
// Order: hero, Your rolls, how it works in three steps, then "Under the hood" folded (the formula, per mode, the seed
// log, a manual check and the seeds), FAQ. The page bar holds no shortcuts: they duplicated the rolls and the log.
useHead({ title: 'Provably Fair · KurwaDROP' })

// lazy on a tap from elsewhere: the page shows at once, the rolls keep a skeleton until the seeds come in
const seedsReq = useFetch<SeedsResponse>('/api/seeds', { key: 'seeds', lazy: true })
if (import.meta.server) await seedsReq
const { data: seedsData } = seedsReq
const seeds = ref<SeedsResponse | null>(seedsData.value ?? null)
watch(seedsData, (v) => (seeds.value = v ?? null))

const seedsOpen = ref(false)
// the theory is there for whoever wants it, folded by default; a link from elsewhere (#seeds) opens it
const route = useRoute()
const hood = ref(route.hash === '#seeds')
const verifierOpen = ref(false)
const verifierInit = ref<{ serverSeed?: string; clientSeed?: string; nonce?: number; expect?: { ticket?: number; roll?: number }; entry?: HistoryEntry }>({})

function openVerifier(init?: typeof verifierInit.value) {
  verifierInit.value = init ?? { clientSeed: seeds.value?.active.clientSeed, nonce: Math.max(1, seeds.value?.active.nonce ?? 1) }
  seedsOpen.value = false
  verifierOpen.value = true
}

// "Check this roll" on a case or upgrade lands here with ?verify=<nonce>: a roll of the active pair, so
// "Your rolls" highlights it next to the rotation that reveals its seed (and checks it once revealed)
const focusNonce = computed(() => Number(route.query.verify) || undefined)
// ?roll=<history id>: any roll from the game history (the profile links each one here)
const focusRoll = computed(() => (typeof route.query.roll === 'string' ? route.query.roll : undefined))

const toast = useToast()
const { t, locale } = useI18n()

const rotating = ref(false)
async function rotate() {
  rotating.value = true
  try {
    seeds.value = await $fetch<SeedsResponse>('/api/seeds/rotate', { method: 'POST', body: {} })
    toast.show(t('fair.revealed'), 'success')
  } catch (e) {
    toast.error(e, t('common.error'))
  } finally {
    rotating.value = false
  }
}
const when = (iso: string) => new Date(iso).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
async function copy(v: string) {
  try {
    await navigator.clipboard.writeText(v)
    toast.show(t('fair.copied'), 'success')
  } catch {
    toast.show(v)
  }
}

const STEPS = [
  { key: 'step1', img: 'pf-commit' },
  { key: 'step2', img: 'pf-randomness' },
  { key: 'step3', img: 'pf-verify' },
]
const MODES = [
  { key: 'cases', icon: 'cases' },
  { key: 'upgrade', icon: 'upgrade' },
  { key: 'pvp', icon: 'pvp' },
] as const
const ROWS = ['Server', 'Client', 'Nonce', 'Output'] as const
const ROW_LABEL = { Server: 'fair.serverSeed', Client: 'fair.clientSeed', Nonce: 'fair.nonce', Output: 'fair.output' }
</script>

<template>
  <div>
    <!-- the banner opens the page, full width like the home page's -->
    <FairHero :seeds="seeds" @seeds="seedsOpen = true" />
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 lg:gap-10 lg:px-0">
    <FairMyRolls :seeds="seeds" :focus="focusNonce" :focus-roll="focusRoll" :rotating="rotating" @verify="openVerifier" @rotate="rotate" />

    <!-- Steps -->
    <section class="grid gap-3 md:grid-cols-3 lg:gap-4">
      <div
        v-for="(s, i) in STEPS"
        :key="s.key"
        class="kd-step group flex flex-col gap-4 rounded-5xl bg-neutral-2 p-6"
        :style="{ animationDelay: `${i * 90}ms` }"
      >
        <img :src="`/img/illustrations/${s.img}.webp`" alt="" class="kd-step-art h-20 w-50 object-contain object-left" />
        <h3 class="type-16-caps">{{ $t(`fair.${s.key}Title`) }}</h3>
        <p class="type-14-regular text-neutral-12">{{ $t(`fair.${s.key}Text`) }}</p>
      </div>
    </section>

    <!-- Under the hood: folded; the formula, per mode, the seed log, a manual check and the seeds -->
    <section id="seeds" class="flex scroll-mt-24 flex-col gap-4 lg:gap-6">
      <button type="button" class="kd-press kd-press-wide flex min-h-16 items-center gap-3 rounded-3xl bg-neutral-2 px-5 text-left hover:text-neutral-15" :aria-expanded="hood" @click="hood = !hood">
        <UiIcon name="function" :size="22" class="shrink-0 text-neutral-12" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="type-16-caps">{{ $t('fair.hood') }}</span>
          <span class="type-12-regular text-neutral-11">{{ $t('fair.hoodHint') }}</span>
        </span>
        <UiIcon name="chevron-down" :size="20" class="shrink-0 text-neutral-12 transition-transform duration-300" :class="hood && 'rotate-180'" />
      </button>
      <template v-if="hood">
    <section class="flex flex-col rounded-5xl bg-neutral-2">
      <div class="flex h-18 items-center gap-3 border-b border-neutral-4 px-6">
        <UiIcon name="function" :size="24" class="text-neutral-13" />
        <h3 class="type-16-medium font-semibold">{{ $t('fair.formula') }}</h3>
      </div>
      <div class="flex flex-col gap-4 p-4 lg:gap-3 lg:p-6">
        <div class="overflow-x-auto rounded-2xl bg-neutral-1 p-4">
          <pre class="type-14 -my-1 leading-7 whitespace-pre"><span class="text-neutral-15">hash   = HMAC_SHA256(server_seed, client_seed + ":" + nonce)</span>
<span class="text-neutral-15">number = parseInt(hash.slice(0, 8), 16)</span>        <span class="text-neutral-11">// 0 … 4 294 967 295</span>
<span class="text-brand-light">ticket = number % 1 000 000 + 1</span>               <span class="text-brand-light">// 1 … 1 000 000</span></pre>
        </div>
        <p class="type-12-regular lg:type-14-regular text-neutral-12">{{ $t('fair.formulaNote') }}</p>
      </div>
    </section>

    <!-- Modes -->
    <section class="grid gap-3 lg:grid-cols-3 lg:gap-4">
      <div v-for="m in MODES" :key="m.key" class="flex flex-col rounded-5xl bg-neutral-2">
        <div class="flex h-18 items-center gap-3 border-b border-neutral-4 px-6">
          <UiIcon :name="m.icon" :size="24" class="text-neutral-13" />
          <h3 class="type-16-medium font-semibold">{{ $t(`fair.${m.key}`) }}</h3>
        </div>
        <dl class="flex flex-col px-6 py-2 lg:pb-4">
          <div v-for="(r, i) in ROWS" :key="r" class="flex min-h-12 items-center justify-between gap-4 lg:min-h-11" :class="{ 'border-t border-neutral-4': i > 0 }">
            <dt class="type-12-caps shrink-0 text-neutral-11">{{ $t(ROW_LABEL[r]) }}</dt>
            <dd class="type-12 text-right lg:type-14">{{ $t(`fair.${m.key}${r}`) }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Seed log: every change of the pair, newest first. The active pair heads it (hash only, rolls so far);
         each past pair shows its period, the nonces it covered (1…N), whether the player changed the client
         seed with that rotation, and the revealed server seed — one tap into the verifier. -->
    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex flex-1 flex-col gap-1">
          <h2 class="type-20-caps">{{ $t('fair.history') }}</h2>
          <p class="type-14-regular text-neutral-12">{{ $t('fair.historyHint') }}</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <UiButton variant="secondary" size="l" icon="check-circle" @click="openVerifier()">{{ $t('fair.verify') }}</UiButton>
          <UiButton variant="secondary" size="l" icon="seeds" @click="seedsOpen = true">{{ $t('fair.manageSeeds') }}</UiButton>
        </div>
      </div>
      <div class="type-10-caps hidden grid-cols-[150px_110px_1fr_1.3fr_auto] gap-4 px-4 text-neutral-10 lg:grid">
        <span>{{ $t('fair.period') }}</span>
        <span>{{ $t('fair.nonces') }}</span>
        <span>{{ $t('fair.clientSeed') }}</span>
        <span>{{ $t('fair.serverSeed') }}</span>
        <span class="w-36" />
      </div>
      <TransitionGroup v-if="seeds" tag="ul" name="kd-hist" class="flex flex-col gap-1.5">
        <!-- the pair in use now -->
        <li key="active" class="kd-seedrow is-active">
          <span class="flex flex-col">
            <span class="type-12-caps flex items-center gap-1.5 text-success"><span class="kd-live" />{{ $t('fair.inUse') }}</span>
            <span class="type-12 text-neutral-11">{{ $t('fair.since', { when: timeAgo(seeds.active.createdAt) }) }}</span>
          </span>
          <span class="type-14 tabular-nums">{{ seeds.active.nonce ? `1–${seeds.active.nonce}` : $t('fair.noRolls') }}</span>
          <span class="truncate font-mono text-xs text-neutral-14 max-lg:hidden">{{ seeds.active.clientSeed }}</span>
          <span class="flex min-w-0 items-center gap-2 max-lg:col-span-2">
            <span class="type-10-caps shrink-0 text-neutral-11">SHA-256</span>
            <span class="truncate font-mono text-xs text-neutral-12">{{ seeds.active.serverSeedHash }}</span>
          </span>
          <span class="type-12 w-36 text-right text-neutral-11 max-lg:hidden">{{ $t('fair.hiddenTill') }}</span>
        </li>
        <li v-for="(h, i) in seeds.history" :key="h.serverSeedHash" class="kd-seedrow">
          <span class="flex flex-col">
            <span class="type-12 text-neutral-13">{{ $t('fair.pairN', { n: seeds.history.length - i }) }}</span>
            <span class="type-12 text-neutral-11">{{ when(h.createdAt) }} → {{ when(h.rotatedAt) }}</span>
          </span>
          <span class="type-14 tabular-nums" :class="!h.nonce && 'text-neutral-10'">{{ h.nonce ? `1–${h.nonce}` : $t('fair.noRolls') }}</span>
          <span class="flex min-w-0 items-center gap-2 max-lg:hidden">
            <span class="truncate font-mono text-xs text-neutral-14">{{ h.clientSeed }}</span>
            <span v-if="h.clientChanged" class="type-10-caps shrink-0 rounded-sm bg-brand-24 px-1.5 py-0.5 text-brand-light">{{ $t('fair.changed') }}</span>
          </span>
          <span class="flex min-w-0 items-center gap-2 max-lg:col-span-2">
            <span class="truncate font-mono text-xs text-neutral-14">{{ h.serverSeed }}</span>
            <button type="button" class="kd-press shrink-0 text-neutral-11 hover:text-neutral-15" :aria-label="$t('fair.copy')" @click="copy(h.serverSeed)"><UiIcon name="copy" :size="14" /></button>
          </span>
          <UiButton variant="fair" size="s" class="w-36 justify-self-end max-lg:col-start-2 max-lg:row-start-1" :disabled="!h.nonce" @click="openVerifier({ serverSeed: h.serverSeed, clientSeed: h.clientSeed, nonce: h.nonce })">{{ $t('fair.verify') }}</UiButton>
        </li>
      </TransitionGroup>
    </section>
      </template>
    </section>

    <!-- FAQ -->
    <section class="flex flex-col gap-2">
      <UiAccordion v-for="n in 4" :key="n" :title="$t(`fair.faq.q${n}`)" :default-open="n === 1">
        {{ $t(`fair.faq.a${n}`) }}
      </UiAccordion>
    </section>

    <FairSeedsModal v-model="seedsOpen" v-model:seeds="seeds" />
    <FairVerifierModal v-model="verifierOpen" :initial="verifierInit" />
  </div>
  </div>
</template>

<style scoped>
.kd-seedrow {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px 16px;
  border-radius: 16px;
  background: var(--color-neutral-2);
  padding: 12px 16px;
}
@media (min-width: 64rem) {
  .kd-seedrow {
    grid-template-columns: 150px 110px 1fr 1.3fr auto;
  }
}
.kd-seedrow.is-active {
  background: rgb(18 183 106 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(18 183 106 / 0.18);
}
.kd-live {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--color-success);
  animation: kd-live 1.6s ease-in-out infinite;
}
@keyframes kd-live {
  50% {
    opacity: 0.3;
  }
}
.kd-step {
  animation: kd-rise var(--dur-slow) var(--ease-out) both;
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kd-step-art {
  transition: transform var(--dur-slow) var(--ease-spring);
}
@media (hover: hover) {
  /* the card stays put on hover (only its picture moves) */
  .kd-step:hover {
    border-color: var(--color-neutral-6);
  }
  .kd-step:hover .kd-step-art {
    transform: translateX(4px) scale(1.04);
  }
}
@keyframes kd-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
.kd-hist-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.kd-hist-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.kd-hist-move {
  transition: transform var(--dur-slow) var(--ease-out);
}
</style>
