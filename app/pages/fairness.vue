<script setup lang="ts">
import type { SeedsResponse } from '#shared/types/api'

// Figma "Fairness": how it works, the formula, per-mode table, active seed pair, FAQ.
useHead({ title: 'Provably Fair · KurwaDROP' })

const { data: seedsData } = await useFetch<SeedsResponse>('/api/seeds', { key: 'seeds' })
const seeds = ref<SeedsResponse | null>(seedsData.value ?? null)
watch(seedsData, (v) => (seeds.value = v ?? null))

const seedsOpen = ref(false)
const verifierOpen = ref(false)
const verifierInit = ref<{ serverSeed?: string; clientSeed?: string; nonce?: number }>({})

function openVerifier(init?: typeof verifierInit.value) {
  verifierInit.value = init ?? { clientSeed: seeds.value?.active.clientSeed, nonce: Math.max(1, seeds.value?.active.nonce ?? 1) }
  seedsOpen.value = false
  verifierOpen.value = true
}

// "Check this roll" on a case result lands here with ?verify=<nonce>: open the verifier pre-filled
const route = useRoute()
onMounted(() => {
  const nonce = Number(route.query.verify)
  if (nonce > 0) openVerifier({ clientSeed: seeds.value?.active.clientSeed, nonce, serverSeed: seeds.value?.previous?.serverSeed })
})

const toast = useToast()
const { t, locale } = useI18n()
const when = (iso: string) => new Date(iso).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
async function copy(v: string) {
  try {
    await navigator.clipboard.writeText(v)
    toast.show(t('fair.copied'), 'success')
  } catch {
    toast.show(v)
  }
}

const short = (s?: string) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : '—')

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
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <UiPageBar
      :title="$t('fair.title')"
      :left="[{ label: $t('fair.mySeeds'), icon: 'seeds', onClick: () => (seedsOpen = true) }]"
      :right="[{ label: $t('fair.verify'), icon: 'check-circle', onClick: () => openVerifier() }]"
    />

    <!-- Hero -->
    <section
      class="relative isolate flex min-h-80 flex-col overflow-hidden rounded-5xl px-5 pt-6 pb-[min(66vw,260px)] sm:pb-6 lg:h-81 lg:overflow-visible lg:px-10 lg:pt-8 lg:pb-10"
      style="background-image: linear-gradient(144deg, var(--color-neutral-3) 11%, #095024 75%, #007e43 97%)"
    >
      <div class="relative z-10 flex flex-col gap-6 sm:max-w-[52%] lg:h-full lg:w-[709px] lg:max-w-none lg:justify-between">
        <div class="flex flex-col gap-2">
          <p class="type-12-caps lg:type-16-caps text-success lg:font-bold">{{ $t('fair.eyebrow') }}</p>
          <h2 class="text-[28px] leading-8 font-extrabold uppercase lg:type-48-caps">{{ $t('fair.heroTitle') }}</h2>
        </div>
        <div class="type-14 flex flex-col gap-4 text-neutral-14 lg:type-16-medium lg:w-[520px] lg:gap-6 lg:text-neutral-13">
          <p>{{ $t('fair.heroText1') }}</p>
          <p>{{ $t('fair.heroText2') }}</p>
        </div>
      </div>
      <img
        src="/img/illustrations/fairness-hero.webp"
        alt=""
        class="kd-fair-hero pointer-events-none absolute -right-3 -bottom-3 w-[105%] max-w-none sm:top-1/2 sm:right-0 sm:bottom-auto sm:w-[52%] sm:-translate-y-1/2 lg:top-[-60px] lg:-right-[39px] lg:w-[676px] lg:translate-y-0 lg:rotate-[1.85deg]"
      />
    </section>

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

    <!-- Formula -->
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

    <!-- Active pair -->
    <section class="flex flex-col gap-4 rounded-5xl bg-success-24 p-5 lg:flex-row lg:items-center lg:gap-6 lg:p-6">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="type-16-caps font-bold">{{ $t('fair.activePair') }}</span>
        <span class="type-12-regular lg:type-14-regular flex flex-wrap gap-x-2 text-success lg:gap-x-3">
          <span>{{ $t('fair.serverSeedHash') }} {{ short(seeds?.active.serverSeedHash) }}</span>
          <span aria-hidden="true">•</span>
          <span>{{ $t('fair.clientSeed') }} {{ seeds?.active.clientSeed }}</span>
          <span aria-hidden="true">•</span>
          <span>{{ $t('fair.nonce') }} {{ seeds?.active.nonce }}</span>
        </span>
      </div>
      <div class="flex gap-2">
        <UiButton variant="success" size="l" class="flex-1 lg:flex-none" @click="seedsOpen = true">{{ $t('fair.manageSeeds') }}</UiButton>
        <UiButton variant="fair" size="l" class="flex-1 lg:flex-none" @click="openVerifier()">{{ $t('fair.verify') }}</UiButton>
      </div>
    </section>

    <!-- Seed log: every change of the pair, newest first. The active pair heads it (hash only, rolls so far);
         each past pair shows its period, the nonces it covered (1…N), whether the player changed the client
         seed with that rotation, and the revealed server seed — one tap into the verifier. -->
    <section class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="type-20-caps">{{ $t('fair.history') }}</h2>
        <p class="type-14-regular text-neutral-12">{{ $t('fair.historyHint') }}</p>
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

    <!-- FAQ -->
    <section class="flex flex-col gap-2">
      <UiAccordion v-for="n in 4" :key="n" :title="$t(`fair.faq.q${n}`)" :default-open="n === 1">
        {{ $t(`fair.faq.a${n}`) }}
      </UiAccordion>
    </section>

    <FairSeedsModal v-model="seedsOpen" v-model:seeds="seeds" @verify="openVerifier" />
    <FairVerifierModal v-model="verifierOpen" :initial="verifierInit" />
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
.kd-fair-hero {
  filter: drop-shadow(0 20px 40px rgb(0 0 0 / 0.45));
  animation: kd-hero-in 800ms var(--ease-out) both;
}
@keyframes kd-hero-in {
  from {
    opacity: 0;
    transform: translateX(24px);
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
  .kd-step:hover {
    border-color: var(--color-neutral-6);
    transform: translateY(-2px);
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
