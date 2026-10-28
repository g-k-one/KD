<script setup lang="ts">
import type { HistoryEntry, SeedsResponse } from '#shared/types/api'

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

    <!-- Seed log, built as Your rolls is (the history table): the header line, then inside the card's 12 px the column
         names over thin lines, a row per pair at the table's height, newest first — the one in use (its hash only, the
         rolls so far, its check waiting in grey), then each past pair with its period, the rolls it covered, its client
         seed (and whether you changed it) and its revealed server seed, which checks in one tap with the same green chip -->
    <section v-if="session.user" class="flex min-w-0 flex-col rounded-5xl bg-neutral-2">
      <div class="flex h-14 items-center gap-3 border-b border-neutral-4 px-4 lg:h-18 lg:pr-4 lg:pl-6">
        <UiIcon name="seeds" :size="24" class="shrink-0 text-neutral-13" />
        <span class="type-14 lg:type-16-medium">{{ $t('fair.history') }}</span>
      </div>
      <div v-if="seeds" class="p-3">
        <!-- the column names (desktop): wrapped, as the grid class sets its own display -->
        <div class="hidden lg:block">
          <div class="kd-seedgrid type-10-caps h-9 border-b border-neutral-4 px-3 text-neutral-11">
            <span>{{ $t('fair.period') }}</span>
            <span>{{ $t('fair.nonces') }}</span>
            <span>{{ $t('fair.clientSeed') }}</span>
            <span>{{ $t('fair.serverSeed') }}</span>
            <span />
          </div>
        </div>
        <TransitionGroup tag="ul" name="kd-hist" class="flex flex-col">
          <!-- the pair in use now -->
          <li key="active" class="kd-seedgrid kd-seedrow">
            <span class="flex min-w-0 flex-col">
              <span class="type-14 flex items-center gap-1.5 text-success"><span class="kd-live" />{{ $t('fair.inUse') }}</span>
              <span class="type-12-regular truncate text-neutral-11">{{ $t('fair.since', { when: timeAgo(seeds.active.createdAt) }) }}</span>
            </span>
            <span class="type-14 tabular-nums max-lg:text-right" :class="!seeds.active.nonce && 'text-neutral-10'">{{ seeds.active.nonce ? `1–${seeds.active.nonce}` : $t('fair.noRolls') }}</span>
            <span class="kd-seedmono truncate max-lg:hidden">{{ seeds.active.clientSeed }}</span>
            <span class="flex min-w-0 items-center gap-2 max-lg:col-span-2">
              <span class="type-10-caps shrink-0 text-neutral-11">SHA-256</span>
              <span class="kd-seedmono truncate text-neutral-12">{{ seeds.active.serverSeedHash }}</span>
              <span class="kd-check is-sealed ml-auto grid size-8 shrink-0 place-items-center rounded-lg lg:hidden" :title="$t('fair.hiddenTill')"><UiIcon name="shield" :size="16" /></span>
            </span>
            <span class="kd-check is-sealed type-12-caps flex h-8 items-center gap-1.5 justify-self-end rounded-lg px-2.5 max-lg:hidden" :title="$t('fair.hiddenTill')">
              <UiIcon name="shield" :size="16" class="shrink-0" />{{ $t('fair.check') }}
            </span>
          </li>
          <li v-for="(h, i) in seeds.history" :key="h.serverSeedHash" class="kd-seedgrid kd-seedrow">
            <span class="flex min-w-0 flex-col">
              <span class="type-14">{{ $t('fair.pairN', { n: seeds.history.length - i }) }}</span>
              <span class="type-12-regular truncate text-neutral-11">{{ when(h.createdAt) }} → {{ when(h.rotatedAt) }}</span>
            </span>
            <span class="type-14 tabular-nums max-lg:text-right" :class="!h.nonce && 'text-neutral-10'">{{ h.nonce ? `1–${h.nonce}` : $t('fair.noRolls') }}</span>
            <span class="flex min-w-0 items-center gap-2 max-lg:hidden">
              <span class="kd-seedmono truncate">{{ h.clientSeed }}</span>
              <span v-if="h.clientChanged" class="type-10-caps shrink-0 rounded-md bg-neutral-3 px-1.5 py-0.5 text-neutral-11">{{ $t('fair.changed') }}</span>
            </span>
            <span class="flex min-w-0 items-center gap-2 max-lg:col-span-2">
              <span class="kd-seedmono truncate">{{ h.serverSeed }}</span>
              <button type="button" class="kd-press grid size-7 shrink-0 place-items-center rounded-md text-neutral-11 hover:text-neutral-15" :aria-label="$t('fair.copy')" @click="copy(h.serverSeed)"><UiIcon name="copy" :size="16" /></button>
              <!-- phones: the check beside the seed it checks, the icon alone -->
              <button type="button" class="kd-check kd-press ml-auto grid size-8 shrink-0 place-items-center rounded-lg lg:hidden" :aria-label="$t('fair.check')" :disabled="!h.nonce" @click="openVerifier({ serverSeed: h.serverSeed, clientSeed: h.clientSeed, nonce: h.nonce })"><UiIcon name="shield-check" :size="16" /></button>
            </span>
            <button type="button" class="kd-check kd-press type-12-caps flex h-8 items-center gap-1.5 justify-self-end rounded-lg px-2.5 max-lg:hidden" :disabled="!h.nonce" @click="openVerifier({ serverSeed: h.serverSeed, clientSeed: h.clientSeed, nonce: h.nonce })">
              <UiIcon name="shield-check" :size="16" class="shrink-0" />{{ $t('fair.check') }}
            </button>
          </li>
        </TransitionGroup>
      </div>
    </section>
    </div>

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
/* the seed log: one grid for the column names and every row, with the history table's gaps, lines and height */
.kd-seedgrid {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px 12px;
}
@media (min-width: 64rem) {
  .kd-seedgrid {
    grid-template-columns: 220px 100px minmax(0, 1fr) minmax(0, 1.4fr) 120px;
  }
}
@media (min-width: 64rem) {
  .kd-seedgrid {
    gap: 16px;
  }
}
.kd-seedrow {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-neutral-3);
}
.kd-seedrow:last-child {
  border-bottom: 0;
}
@media (min-width: 64rem) {
  .kd-seedrow {
    height: 62px;
    padding: 0 12px;
  }
}
.kd-seedmono {
  font: 500 14px/20px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: var(--color-neutral-13);
}
/* the check: the history table's green chip; grey while the seed is still secret */
.kd-check {
  color: var(--color-success);
  background: rgb(18 183 106 / 0.12);
  transition: background-color var(--dur-base) var(--ease-out);
}
.kd-check:disabled,
.kd-check.is-sealed {
  color: var(--color-neutral-11);
  background: var(--color-neutral-3);
}
@media (hover: hover) {
  button.kd-check:not(:disabled):hover {
    background: rgb(18 183 106 / 0.24);
  }
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
