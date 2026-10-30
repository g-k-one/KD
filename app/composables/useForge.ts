/*
 * Forge (Горн): our WebGL particle engine, vendored in public/vendor/forge (see docs/motion.md → VFX).
 * Loaded lazily on the client the first time an effect is asked for; nothing runs while no effect is live.
 *
 *   const fx = useForge()            // shared full-screen layer (above everything): one-shot big moments
 *   const fx = useForge(hostRef)     // own canvas inside hostRef: stays under sticky headers, clipped to it
 *   fx.play('coins', { el })         // follow an element: centred on it, sized to its width, clipped to it
 *   fx.at('shock', el, 1.6)          // one-shot centred on an element, 1.6× its width, not clipped
 *
 * Effects are authored in a 360×360 square. Reduced motion → every call is a no-op.
 */
import { KD_ATLAS, KD_ATLAS_MAP } from '~/utils/forgeAtlas'

export interface ForgeHandle {
  stop(): void
  kill(): void
  alive(): boolean
  /** Sets a field on the effect's state, e.g. set('tint', [r, g, b]) for kdAura */
  set(k: string, v: unknown): void
}
/** play options: position and size, follow an element, loop; effect settings (rarity colour and level, a coin image …) */
export interface ForgeOptions {
  x?: number
  y?: number
  size?: number
  loop?: boolean
  el?: HTMLElement
  [k: string]: unknown
}
interface ForgeEngine {
  names: string[]
  define: (name: string, build: (h: never) => unknown) => void
  base: string
  play(name: string, o?: ForgeOptions): ForgeHandle | null
  stopAll(): void
  preload(atlas: string): void
  /** vendored patch: frees a section canvas and its GL context */
  destroy?(): void
}
declare global {
  interface Window {
    Forge?: ForgeEngine
    makeForge?: (host: HTMLElement | null) => ForgeEngine
  }
  /** the engine's atlas maps, a global of forge.js */
  const FX_ATLAS: Record<string, unknown>
}

let loading: Promise<boolean> | null = null
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Forge: ${src}`))
    document.head.appendChild(s)
  })
}
function baseUrl() {
  const b = useRuntimeConfig().app.baseURL || '/'
  return `${b.endsWith('/') ? b : `${b}/`}vendor/forge/`
}
/** Forge packs we ship (from the Pawn repo: `npm run forge` → dist-forge, *.min.js copied here without .min):
 *  image — image modes the others build on · hits — sharp shapes (rays, rings) · matter — 3D coins and feathers,
 *  gold burst (goldboom, feathers) · rarity — rarity beam under a drop (lootbeam), rarity frame / reveal, appear / vanish ·
 *  motion — hits of the second round and the rank reveal (tier), which our kdRank colours per rarity */
const PACKS = ['image', 'hits', 'matter', 'rarity', 'motion']
/** Loads the engine (with its atlas map), adds our own atlas, then the packs — once, in order (classic scripts sharing globals). */
function ensureForge(base: string) {
  loading ??= loadScript(`${base}forge.js`)
    // our own atlas (KD coin, feather, glow masks, smoke), see scripts/build-forge-atlas.mjs: its map ships with this code and
    // its picture is named by its hash, so a browser's cache can't pair them wrongly; the engine's map exists from here on
    .then(() => {
      FX_ATLAS[KD_ATLAS] = KD_ATLAS_MAP
    })
    .then(() => PACKS.reduce((p, n) => p.then(() => loadScript(`${base}forge-${n}.js`)), Promise.resolve()))
    .then(() => {
      if (!window.Forge) return false
      window.Forge.base = base
      defineKdEffects(window.Forge as never)
      return true
    })
    .catch((e) => {
      console.error('Forge failed to load, effects are off', e)
      return false
    })
  return loading
}

export function useForge(host?: Ref<HTMLElement | null | undefined>) {
  const base = import.meta.client ? baseUrl() : ''
  const reduced = import.meta.client ? useMediaQuery('(prefers-reduced-motion: reduce)') : ref(false)
  // One engine per layer, even when many effects ask for it at once while the script loads
  let engine: Promise<ForgeEngine | null> | null = null
  const live = new Set<ForgeHandle>()

  async function create() {
    if (!(await ensureForge(base))) return null
    if (!host) return window.Forge ?? null
    if (!host.value || !window.makeForge) return null
    const e = window.makeForge(host.value)
    e.base = base
    // Effects live per engine: every section canvas gets KurwaDROP's own set too
    defineKdEffects(e as never)
    return e
  }
  async function get() {
    if (!import.meta.client || reduced.value) return null
    engine ??= create()
    const e = await engine
    // The host was not mounted yet: try again next time
    if (!e) engine = null
    return e
  }

  async function play(name: string, o: ForgeOptions = {}) {
    const e = await get()
    const h = e?.play(name, o) ?? null
    // forget the finished ones, so the set holds only what still draws
    for (const x of live) if (!x.alive()) live.delete(x)
    if (h) live.add(h)
    return h
  }

  /**
   * One-shot centred on an element (viewport coordinates, or relative to the host). opts.sizeEl sizes it by another
   * element than the one it is centred on; opts.lift moves it up by that share of its size.
   */
  function at(name: string, el: HTMLElement | null | undefined, scale = 1, loop = false, opts: ForgeAtOptions = {}) {
    if (!el) return Promise.resolve(null)
    const { sizeEl, lift = 0, follow, ...rest } = opts
    if (follow && host?.value) return play(name, { ...rest, el: anchorOn(el, sizeEl ?? el, scale, lift), loop })
    const r = el.getBoundingClientRect()
    const sr = sizeEl?.getBoundingClientRect() ?? r
    const hr = host?.value?.getBoundingClientRect()
    // the host may be mid-transform (the reel's punch scales it a touch): the canvas draws in its own unscaled
    // pixels, so measure in those, or the effect lands off its element — more so the further from the host's corner
    const k = host?.value && hr && host.value.offsetWidth ? hr.width / host.value.offsetWidth : 1
    const size = Math.max(sr.width, sr.height) * scale
    return play(name, { ...rest, x: (r.left + r.width / 2 - (hr?.left ?? 0)) / k, y: (r.top + r.height / 2 - (hr?.top ?? 0) - size * lift) / k, size: size / k, loop })
  }

  /**
   * An invisible square the effect's size, centred on el and riding with it: Forge re-reads an `el` every frame, so
   * the effect stays on its element whatever moves after the start (a skipped reel settling, the frame's punch, a
   * re-centre). Sized in layout pixels, so a transform on the way does not skew it; gone after 4 s (one-shots end by then).
   */
  function anchorOn(el: HTMLElement, sizeEl: HTMLElement, scale: number, lift: number) {
    const size = Math.max(sizeEl.offsetWidth, sizeEl.offsetHeight) * scale
    const a = document.createElement('span')
    a.setAttribute('aria-hidden', 'true')
    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement!
    // the centre from the rendered boxes (offsetLeft misses el's own translate), back in the parent's layout pixels
    const er = el.getBoundingClientRect()
    const pr = parent.getBoundingClientRect()
    const k = parent.offsetWidth ? pr.width / parent.offsetWidth : 1
    const cx = (er.left + er.width / 2 - pr.left) / k - parent.clientLeft
    const cy = (er.top + er.height / 2 - pr.top) / k - parent.clientTop
    Object.assign(a.style, {
      position: 'absolute',
      pointerEvents: 'none',
      width: `${size}px`,
      height: `${size}px`,
      left: `${cx - size / 2}px`,
      top: `${cy - size / 2 - size * lift}px`,
    })
    parent.appendChild(a)
    setTimeout(() => a.remove(), 4000)
    return a
  }

  // stopAll lets every effect fade out on its own; killAll drops them at once — for an effect riding an element that
  // is about to jump (a reel strip reset for the next spin), a fade would trail it out past the frame
  function stopAll() {
    live.forEach((h) => h.stop())
    live.clear()
  }
  function killAll() {
    live.forEach((h) => h.kill())
    live.clear()
  }

  // Loops die with the component that started them; a section canvas (host) is freed with its GL context —
  // without this every visit to a page with a reel, the feed or the dial left a WebGL context behind
  if (getCurrentInstance())
    onBeforeUnmount(() => {
      stopAll()
      if (!host || !engine) return
      const e = engine
      engine = null
      e.then((x) => x?.destroy?.())
    })

  return { play, at, stopAll, killAll, preload: async (atlas = KD_ATLAS) => (await get())?.preload(atlas) }
}

/** sizeEl sizes it by another element; lift moves it up by that share of its size; follow keeps it on el as el moves */
export type ForgeAtOptions = ForgeOptions & { sizeEl?: HTMLElement | null; lift?: number; follow?: boolean }
export type ForgeLayer = ReturnType<typeof useForge>
export const FORGE_KEY = Symbol('kd-forge') as InjectionKey<ForgeLayer>

/**
 * Gives a section its own Forge canvas: effects started by children (FxFire) draw inside it,
 * under the sticky header. The canvas is raised to z-index 1, so content that should sit in front
 * of the effect (badge text) takes z-index 2.
 */
export function provideForge(host: Ref<HTMLElement | null | undefined>) {
  const layer = useForge(host)
  provide(FORGE_KEY, layer)
  onMounted(() => {
    // makeForge appends its canvas on first use; lift it above the cards once it exists
    const lift = new MutationObserver(() => {
      const cv = host.value?.querySelector<HTMLCanvasElement>(':scope > canvas.fx-cv')
      if (cv) {
        cv.style.zIndex = '1'
        lift.disconnect()
      }
    })
    if (host.value) lift.observe(host.value, { childList: true })
    onBeforeUnmount(() => lift.disconnect())
  })
  return layer
}
