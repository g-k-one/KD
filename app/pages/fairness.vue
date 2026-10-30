<script setup lang="ts">
import type { HistoryEntry, RevealedSeedPair, SeedsResponse } from '#shared/types/api'

// Figma "Fairness", around one path: the player's own rolls, each with one action (Check, or Reveal and check).
// Order: hero, Your rolls, how it works in three steps, then the formula, each mode and the seed log (with a manual
// check), all out, FAQ. The page bar holds no shortcuts: they duplicated the rolls and the log.
useHead({ title: 'Provably Fair · KurwaDROP' })

// lazy on a tap from elsewhere: the page shows at once, the rolls keep a skeleton until the seeds come in
const seedsReq = useFetch<SeedsResponse>('/api/seeds', { key: 'seeds', lazy: true })
if (import.meta.server) await seedsReq
const { data: seedsData } = seedsReq
const seeds = ref<SeedsResponse | null>(seedsData.value ?? null)
watch(seedsData, (v) => (seeds.value = v ?? null))
// the seeds are the account's: signing in or out reads them again (a guest sees none, only the sign-in)
const session = useSessionStore()
watch(
  () => session.user?.id,
  () => seedsReq.refresh(),
)

const seedsOpen = ref(false)
const route = useRoute()
const isLg = useMediaQuery('(min-width: 1024px)')
const verifierOpen = ref(false)
const verifierInit = ref<{ serverSeed?: string; clientSeed?: string; nonce?: number; expect?: { ticket?: number; roll?: number }; entry?: HistoryEntry }>({})

function openVerifier(init?: typeof verifierInit.value) {
  verifierInit.value = init ?? { clientSeed: seeds.value?.active.clientSeed, nonce: Math.max(1, seeds.value?.active.nonce ?? 1) }
  seedsOpen.value = false
  pairOpen.value = false
  verifierOpen.value = true
}

// Check on a past pair: every roll of it at once
const pairOpen = ref(false)
const pairToCheck = ref<RevealedSeedPair | null>(null)
function checkPair(pair: RevealedSeedPair) {
  pairToCheck.value = pair
  pairOpen.value = true
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
const day = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
const period = (from: string, to: string) => (day(from) === day(to) ? day(to) : `${day(from)} – ${day(to)}`)
// a seed reads by its two ends (the whole of it is one tap away, copied)
const shortSeed = (v: string) => (v.length > 20 ? `${v.slice(0, 8)}…${v.slice(-8)}` : v)

// The seed log, newest first: the pair in use (its seed sealed, so its hash stands in) then each revealed one
const pairs = computed(() => {
  const s = seeds.value
  if (!s) return []
  return [{ ...s.active, server: s.active.serverSeedHash, revealed: null }, ...s.history.map((h) => ({ ...h, server: h.serverSeed, revealed: h }))]
})
// Every revealed seed against the hash shown before its first roll, here in the browser: proof with no tap
const hashOk = ref<Record<string, boolean>>({})
async function checkHashes() {
  for (const h of seeds.value?.history ?? []) hashOk.value[h.serverSeedHash] ??= (await sha256Hex(h.serverSeed)) === h.serverSeedHash
}
onMounted(checkHashes)
watch(seeds, checkHashes)

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
// phones: one card with the three modes as a switch (three stacked cards made the page ~900 px longer)
const fairMode = ref<(typeof MODES)[number]['key']>('cases')
const modeOptions = computed(() => MODES.map((m) => ({ value: m.key, label: t(`fair.${m.key}`) })))
const shownModes = computed(() => (isLg.value ? MODES : MODES.filter((m) => m.key === fairMode.value)))
const ROWS = ['Server', 'Client', 'Nonce', 'Output'] as const
const ROW_LABEL = { Server: 'fair.serverSeed', Client: 'fair.clientSeed', Nonce: 'fair.nonce', Output: 'fair.output' }
</script>

<template>
  <div>
    <!-- the banner opens the page, full width like the home page's -->
    <FairHero :seeds="seeds" @seeds="seedsOpen = true" />
  <div class="mx-auto flex max-w-content flex-col gap-6 px-4 lg:gap-10 lg:px-0">
    <!-- Your rolls and the seed log are a player's own: a guest gets neither (two empty "sign in" cards said nothing) -->
    <FairMyRolls v-if="session.user" :seeds="seeds" :focus="focusNonce" :focus-roll="focusRoll" :rotating="rotating" @verify="openVerifier" @rotate="rotate" />

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

    <!-- The formula, each mode, the seed log: always out, nothing to unfold -->
    <div id="seeds" class="flex scroll-mt-24 flex-col gap-4 lg:gap-6">
    <section class="flex flex-col rounded-5xl bg-neutral-2">
      <!-- Verify a result sits by the formula it runs: there for guests too (any seeds can be checked by hand) -->
      <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
        <UiIcon name="function" :size="24" class="shrink-0 text-neutral-13" />
        <h3 class="type-14 lg:type-16-medium lg:font-semibold">{{ $t('fair.formula') }}</h3>
        <UiButton variant="secondary" :size="isLg ? 'm' : 's'" icon="function" class="ml-auto" @click="openVerifier()">{{ $t('fair.verify') }}</UiButton>
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
      <div v-for="m in shownModes" :key="m.key" class="flex flex-col rounded-5xl bg-neutral-2">
        <div v-if="isLg" class="flex h-18 items-center gap-3 border-b border-neutral-4 px-6">
          <UiIcon :name="m.icon" :size="24" class="text-neutral-13" />
          <h3 class="type-16-medium font-semibold">{{ $t(`fair.${m.key}`) }}</h3>
        </div>
        <div v-else class="border-b border-neutral-4 p-3">
          <UiSegmented v-model="fairMode" :options="modeOptions" block />
        </div>
        <dl class="flex flex-col px-6 py-2 lg:pb-4">
          <div v-for="(r, i) in ROWS" :key="r" class="flex min-h-12 items-center justify-between gap-4 lg:min-h-11" :class="{ 'border-t border-neutral-4': i > 0 }">
            <dt class="type-12-caps shrink-0 text-neutral-11">{{ $t(ROW_LABEL[r]) }}</dt>
            <dd class="type-12 text-right lg:type-14">{{ $t(`fair.${m.key}${r}`) }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Seed log, a timeline and not a table: a row per pair, newest first, on a rail. On the left what a player cares
         about (how many rolls, when), in the middle the two seeds each under its own name with the whole value a tap to
         copy, on the right the one thing to do: Reveal for the pair in use, Check (all its rolls) for a past one. A revealed seed says at
         once that it matches the hash promised before its first roll -->
    <section v-if="session.user" class="flex min-w-0 flex-col rounded-5xl bg-neutral-2">
      <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
        <UiIcon name="seeds" :size="24" class="shrink-0 text-neutral-13" />
        <span class="type-14 lg:type-16-medium">{{ $t('fair.history') }}</span>
      </div>
      <TransitionGroup v-if="seeds" tag="ul" name="kd-hist" class="flex flex-col p-3">
        <li v-for="p in pairs" :key="p.serverSeedHash" class="kd-seedrow">
          <span class="kd-seeddot" :class="!p.revealed && 'kd-live'" />
          <span class="flex min-w-0 flex-col">
            <span class="type-14 lg:type-16-medium lg:font-semibold" :class="!p.nonce && 'text-neutral-11'">{{ $t('fair.pairRolls', { n: p.nonce }, p.nonce) }}</span>
            <span v-if="p.revealed" class="type-12-regular truncate text-neutral-11" :title="`${when(p.revealed.createdAt)} → ${when(p.revealed.rotatedAt)}`">{{ period(p.revealed.createdAt, p.revealed.rotatedAt) }}</span>
            <span v-else class="type-12-regular truncate text-neutral-11"><span class="text-success">{{ $t('fair.inUse') }}</span> · {{ $t('fair.since', { when: timeAgo(p.createdAt) }) }}</span>
          </span>
          <dl class="kd-seedvals">
            <dt class="type-12-caps text-neutral-11">{{ p.revealed ? $t('fair.serverSeed') : $t('fair.serverHash') }}</dt>
            <dd class="flex min-w-0 items-center gap-2">
              <button type="button" class="kd-seedcopy kd-press" :title="p.server" :aria-label="$t('fair.copy')" @click="copy(p.server)">
                <span class="kd-seedmono truncate">{{ shortSeed(p.server) }}</span><UiIcon name="copy" :size="14" class="shrink-0" />
              </button>
              <span v-if="!p.revealed" class="kd-seedtag type-10-caps bg-neutral-3 text-neutral-11" :title="$t('fair.hiddenTill')"><UiIcon name="lock" :size="12" class="shrink-0" /><span class="max-lg:hidden">{{ $t('fair.sealedTag') }}</span></span>
              <span v-else-if="hashOk[p.serverSeedHash] === true" class="kd-seedtag type-10-caps bg-success-24 text-success" :title="$t('fair.hashMatchesHint')"><UiIcon name="check" :size="12" class="shrink-0" /><span class="max-lg:hidden">{{ $t('fair.hashMatches') }}</span></span>
              <span v-else-if="hashOk[p.serverSeedHash] === false" class="kd-seedtag type-10-caps bg-danger-24 text-danger"><UiIcon name="x-circle" :size="12" class="shrink-0" /><span class="max-lg:hidden">{{ $t('fair.hashMismatch') }}</span></span>
            </dd>
            <dt class="type-12-caps text-neutral-11">{{ $t('fair.clientSeed') }}</dt>
            <dd class="flex min-w-0 items-center gap-2">
              <button type="button" class="kd-seedcopy kd-press" :aria-label="$t('fair.copy')" @click="copy(p.clientSeed)">
                <span class="kd-seedmono truncate">{{ p.clientSeed }}</span><UiIcon name="copy" :size="14" class="shrink-0" />
              </button>
              <span v-if="p.revealed?.clientChanged" class="kd-seedtag type-10-caps bg-neutral-3 text-neutral-11">{{ $t('fair.changed') }}</span>
            </dd>
          </dl>
          <button v-if="p.revealed" type="button" class="kd-check kd-press type-12-caps flex h-8 items-center justify-center gap-1.5 justify-self-end rounded-lg max-lg:w-8 lg:w-26" :aria-label="$t('fair.check')" :title="$t('fair.pairCheck')" :disabled="!p.nonce" @click="checkPair(p.revealed)">
            <UiIcon name="shield-check" :size="16" class="shrink-0" /><span class="max-lg:hidden">{{ $t('fair.check') }}</span>
          </button>
          <UiButton v-else-if="p.nonce" variant="fair" size="s" icon="refresh" :loading="rotating" class="justify-self-end lg:w-26" :title="$t('fair.hiddenTill')" @click="rotate">{{ $t('fair.reveal') }}</UiButton>
        </li>
      </TransitionGroup>
    </section>
    </div>

    <!-- FAQ -->
    <section class="flex flex-col gap-2">
      <UiAccordion v-for="n in 4" :key="n" :title="$t(`fair.faq.q${n}`)" :default-open="n === 1">
        {{ $t(`fair.faq.a${n}`) }}
      </UiAccordion>
    </section>

    <FairSeedsModal v-model="seedsOpen" v-model:seeds="seeds" />
    <FairPairCheck v-model="pairOpen" :pair="pairToCheck" :period="pairToCheck ? period(pairToCheck.createdAt, pairToCheck.rotatedAt) : ''" @verify="openVerifier" />
    <FairVerifierModal v-model="verifierOpen" :initial="verifierInit" />
  </div>
  </div>
</template>

<style scoped>
/* the seed log: the rail, who and when, the seeds, the action; on a phone the seeds drop under the first two */
.kd-seedrow {
  position: relative;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 8px;
}
.kd-seedvals {
  grid-column: 2 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 2px 8px;
}
.kd-seeddot {
  align-self: start;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 9999px;
  background: var(--color-neutral-6);
}
/* the rail: from under one dot to the next */
.kd-seedrow:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 31px;
  bottom: -13px;
  left: 12px;
  width: 2px;
  border-radius: 9999px;
  background: var(--color-neutral-4);
}
@media (min-width: 64rem) {
  .kd-seedrow {
    grid-template-columns: 10px 200px minmax(0, 1fr) 104px;
    gap: 16px;
    padding: 14px 12px;
  }
  .kd-seedvals {
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: 104px minmax(0, 1fr);
  }
  .kd-seeddot {
    margin-top: 7px;
  }
  .kd-seedrow:not(:last-child)::after {
    top: 35px;
    bottom: -15px;
    left: 16px;
  }
}
.kd-seedmono {
  font: 500 13px/20px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: var(--color-neutral-13);
}
/* a value and its copy icon are one button; an invisible ring makes the 24 px line easier to hit */
.kd-seedcopy {
  position: relative;
  display: flex;
  min-width: 0;
  height: 24px;
  align-items: center;
  gap: 6px;
  color: var(--color-neutral-11);
  transition: color var(--dur-base) var(--ease-out);
}
.kd-seedcopy::before {
  content: '';
  position: absolute;
  inset: -4px -6px;
}
@media (hover: hover) {
  .kd-seedcopy:hover {
    color: var(--color-neutral-15);
  }
}
.kd-seedtag {
  display: inline-flex;
  flex-shrink: 0;
  height: 20px;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  padding: 0 6px;
  white-space: nowrap;
}
/* the check: the history table's green chip */
.kd-check {
  color: var(--color-success);
  background: rgb(18 183 106 / 0.12);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-check:disabled {
  color: var(--color-neutral-11);
  background: var(--color-neutral-3);
}
@media (hover: hover) {
  button.kd-check:not(:disabled):hover {
    background: rgb(18 183 106 / 0.24);
  }
}
.kd-live {
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
