import type { ForgeLayer } from './useForge'
import type { ExtrudeHandle } from './useExtrude'

// The numbers are pseudo-3D (Extrude): the 3 spins in, each next flips out of the one before it while the whole label swings
// to the other side, a full second each on real timers, not the page's 200 ms clock. The VS comes the same way, out of the 1.
// Then it sinks onto the arena's own badge, smoke rolls out from under it as it lands, and only then the reels start. The
// label is mounted ahead, while the seats fill, so the first number does not pay for the shader. No WebGL: the plain number
const COUNT_LOOK = {
  font: '800 {s}px Rubik, ui-sans-serif, system-ui, sans-serif',
  charset: '0123456789VS',
  face: ['#fff6e0', '#ffc46b', '#ff7a1a'],
  side: ['#d9480f', '#2a0e00'],
  metal: 0.2,
  gloss: 0.55,
  bevel: 2,
  depth: 17,
  yaw: -22,
  pitch: 12,
  persp: 700,
  drag: false,
}

// The shader and Forge's canvas block the page while they build: never in the frames a room opens (Recreate stuttered), but
// once the browser is idle. A countdown that starts sooner asks for the label itself.
const whenIdle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 500))

interface CountdownOptions {
  /** where the 3D label mounts */
  el: Readonly<Ref<HTMLElement | null | undefined>>
  /** the frame the smoke is centred on */
  arena: Readonly<Ref<HTMLElement | null | undefined>>
  /** the page's shared layer: the smoke must not stop at the arena's frame */
  fx: ForgeLayer
  isMobile: Readonly<Ref<boolean>>
  /** the seconds before the first round */
  seconds: Readonly<Ref<number>>
  startedAt: () => string | null
}

export function useBattleCountdown({ el, arena, fx, isMobile, seconds, startedAt }: CountdownOptions) {
  const ex = useExtrude()
  const sfx = useSfx()
  let label: ExtrudeHandle | null = null
  let ready: Promise<void> | null = null
  let fresh = true
  let side = 1
  let timers: ReturnType<typeof setTimeout>[] = []
  const count3d = ref(false)
  const countArmed = ref(false)
  // what stands in the arena now: 3, 2, 1, then 0, the VS (countFade); the arena's badge steps aside until the VS is nearly on it
  const countShown = ref(0)
  const countFade = ref(false)
  const countSink = ref(false)
  const countHome = ref(false)
  function dropLabel() {
    label?.destroy()
    label = null
    ready = null
    fresh = true
    count3d.value = false
    countShown.value = 0
    countFade.value = false
    countSink.value = false
    countHome.value = false
  }
  function prepareCount() {
    ready ??= (async () => {
      if (!el.value) return
      label = await ex.mount(el.value, { ...COUNT_LOOK, size: isMobile.value ? 88 : 124, quality: isMobile.value ? 'low' : 'auto', text: '3' })
      await label?.ready
      count3d.value = !!label
    })()
    return ready
  }
  // the stage went (a countdown that was already running when the page opened): the label went with it
  watch(el, (e) => (e ? whenIdle(prepareCount) : dropLabel()))
  async function beat(n: number) {
    countShown.value = n
    if (!n) countFade.value = true
    sfx.count(n <= 1)
    await prepareCount()
    if (!label) return
    const text = n ? String(n) : 'VS'
    side = -side
    label.set({ yaw: 22 * side })
    if (fresh) {
      fresh = false
      if (label.text !== text) label.set({ text })
      label.play('pop')
    } else {
      label.swap(text, { style: 'flip' })
      label.rotate(240 * side, 0, true)
    }
  }
  function landed() {
    const r = arena.value?.getBoundingClientRect()
    dropLabel()
    // the sound a case makes as its drop lands
    sfx.reveal(0)
    if (r) fx.play('kdPuff', { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.height * 1.7 })
  }
  // in ms before the first reel: a second for each number, then the VS, and the smoke has its time before the reels move
  function run() {
    const left = Date.parse(startedAt()!) - Date.now()
    const at = (ms: number, f: () => void) => left > ms - 900 && timers.push(setTimeout(f, Math.max(0, left - ms)))
    timers.forEach(clearTimeout)
    timers = []
    countHome.value = true
    prepareCount()
    at(3800, () => beat(3))
    at(2800, () => beat(2))
    at(1800, () => beat(1))
    at(800, () => beat(0))
    at(460, () => (countSink.value = true))
    at(110, () => (countHome.value = false))
    at(40, landed)
  }
  watch(seconds, (n, old) => n > 0 && !old && nextTick(run))
  onMounted(() => {
    // finished rooms too: Replay plays the same countdown
    whenIdle(() => fx.preload())
    if (seconds.value > 0) nextTick(run)
  })
  onBeforeUnmount(() => {
    timers.forEach(clearTimeout)
    dropLabel()
  })
  return { count3d, countArmed, countShown, countFade, countSink, countHome, prepareCount }
}
