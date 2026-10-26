<script setup lang="ts">
import type { HistoryEntry, SeedsResponse } from '#shared/types/api'
import type { StageLoot } from '~/components/banner/Stage.vue'

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

// Hero art: a BannerStage like home's — the inspector chicken peers through a magnifier at a glass case you can see
// into; around them float chips of the player's own seeds (the real hash, client seed and nonce), not decoration.
// Five pokes run the check out loud, the last one bursts gold.
const { onMove, onLeave, vars } = usePointerTilt()
const pfStage = useTemplateRef<{ burst: () => void }>('pfStage')
const pfPokes = ref(0)
function onPfPoke(n: number) {
  pfPokes.value = n
  if (n === 5) pfStage.value?.burst()
}
const pfBubble = computed(() => (pfPokes.value >= 5 ? 'fair.pokeDone' : `fair.poke${pfPokes.value}`))
const PF_CASE = [{ src: '/img/hero/pf-case.webp', x: 20, y: 96, w: 340, d: 0.3 }]
const PF_CHICKEN = { src: '/img/hero/pf-chicken.webp', x: 322, y: 104, w: 260, d: 0.6 }
const pfLoot = computed<StageLoot[]>(() => {
  const a = seeds.value?.active
  const hash = a ? `${a.serverSeedHash.slice(0, 6)}…${a.serverSeedHash.slice(-4)}` : '…'
  return [
    { label: t('fair.chipHash', { h: hash }), x: 10, y: 52, r: -6, d: 1.4, bx: -24, by: -16 },
    { label: t('fair.chipClient', { s: a?.clientSeed ?? '…' }), x: 350, y: 44, r: 5, d: 1.2, bx: 22, by: -18, wideOnly: true },
    { label: t('fair.chipNonce', { n: a?.nonce ?? 0 }), x: 400, y: 340, r: -3, d: 1.7, bx: 26, by: 10 },
    { src: '/img/coins/coin.webp', x: 300, y: 300, w: 44, r: -20, d: 1.9, bx: -10, by: 16 },
    { src: '/img/coins/coin.webp', x: 560, y: 150, w: 36, r: 25, d: 2.1, bx: 22, by: -8 },
  ]
})

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
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 lg:gap-10 lg:px-0 lg:pt-10">
    <!-- no page bar: the banner opens the page, like the home page's -->
    <!-- Hero -->
    <section
      class="relative isolate flex min-h-80 flex-col overflow-hidden rounded-5xl px-5 pt-6 pb-6 lg:h-80 lg:min-h-0 lg:overflow-visible lg:rounded-[32px] lg:p-10"
      :style="vars"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
      <!-- the ground: near-black, a green pool of light where the glass case stands -->
      <span class="kd-fair-ground pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" aria-hidden="true" />
      <!-- the stage: a band above the text on phones, the right side wider -->
      <div class="relative -mx-5 -mt-6 mb-2 h-44 sm:absolute sm:inset-y-0 sm:right-0 sm:m-0 sm:h-auto sm:w-[48%] lg:w-[620px]">
        <BannerStage
          ref="pfStage"
          :back="PF_CASE"
          :mascot="PF_CHICKEN"
          :loot="pfLoot"
          :bubble="$t(pfBubble)"
          :bubble-at="{ x: 470, y: 80 }"
          :poke-label="$t('fair.pokeLabel')"
          @poke="onPfPoke"
        />
      </div>
      <!-- one plain line and the one thing to do here: the three steps below explain the rest -->
      <div class="relative z-10 flex flex-col gap-6 sm:max-w-[52%] lg:h-full lg:w-[600px] lg:max-w-none lg:justify-center">
        <div class="flex flex-col gap-2">
          <p class="type-12-caps lg:type-16-caps text-success lg:font-bold">{{ $t('fair.eyebrow') }}</p>
          <h2 class="text-[28px] leading-8 font-extrabold uppercase lg:type-48-caps">{{ $t('fair.heroTitle') }}</h2>
          <p class="type-14 mt-1 text-neutral-14 lg:type-16-medium lg:w-[520px] lg:text-neutral-13">{{ $t('fair.heroText1') }}</p>
        </div>
        <UiButton variant="fair" size="l" icon="shield-check" to="#rolls" class="w-max">{{ $t('fair.heroCta') }}</UiButton>
      </div>
    </section>

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
/* the ground: near-black, a green pool of light where the glass case stands, a vignette */
.kd-fair-ground {
  background:
    radial-gradient(55% 90% at 72% 70%, rgb(40 200 110 / 0.32), transparent 70%),
    radial-gradient(40% 60% at 66% 100%, rgb(120 255 170 / 0.18), transparent 70%),
    linear-gradient(110deg, var(--color-neutral-2) 30%, #0a2a17 100%);
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
