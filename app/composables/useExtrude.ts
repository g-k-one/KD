/*
 * Extrude (Объём): ray-marched 3D text — thick letters with bevel, gradients, metal, glow; per-letter presets for appear,
 * idle, accent, text change and exit. Vendored in public/vendor/extrude, built from pawn (src/app/16l-extrude.js:
 * `node tools/extrude-lab.mjs --vendor …`; API — pawn docs/EXTRUDE.md). One WebGL canvas per label, it draws only
 * while something moves, the glyph prep runs in a Web Worker.
 *
 *   const ex = useExtrude()
 *   const t = await ex.mount(el, { text: 'KURWADROP!', face: [...], side: [...] })   // null: no WebGL / reduced motion
 *   t.play('pop'); t.play('wave'); t.shine(); t.play('blast'); t.destroy()
 *
 * Reduced motion → mount resolves to null and callers show their plain fallback.
 */
export interface ExtrudeHandle {
  set(o: Record<string, unknown>): void
  rotate(yaw: number, pitch?: number, kick?: boolean): void
  /** Preset by name (t.groups lists them): appear and exit replace each other, idle and accent play as layers on top */
  play(name: string, o?: { speed?: number; from?: string; each?: number; time?: number; onLand?: (i: number) => void; layer?: string }): Promise<void>
  swap(text: string, o?: { style?: 'roll' | 'flip' | 'morph' | 'pop' | 'scramble' }): Promise<void>
  count(to: number, o?: Record<string, unknown>): Promise<void>
  shine(): void
  /** Finish everything at once (tap to skip) */
  skip(): void
  /** Interrupt: letters back in place */
  stop(): void
  destroy(): void
  readonly ready: Promise<void>
  readonly text: string
}
interface ExtrudeEngine {
  mount(el: HTMLElement, o?: Record<string, unknown>): ExtrudeHandle
  defaults: Record<string, unknown>
}
declare global {
  interface Window {
    Extrude?: ExtrudeEngine
  }
}

let loading: Promise<ExtrudeEngine | null> | null = null
function load(): Promise<ExtrudeEngine | null> {
  const b = useRuntimeConfig().app.baseURL || '/'
  loading ??= new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = `${b.endsWith('/') ? b : `${b}/`}vendor/extrude/extrude.js`
    s.onload = () => resolve(window.Extrude ?? null)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return loading
}

export function useExtrude() {
  const reduced = import.meta.client ? useMediaQuery('(prefers-reduced-motion: reduce)') : ref(false)
  return {
    /** Loads the engine once and mounts a label into el (its own canvas, sized to el). */
    async mount(el: HTMLElement, o: Record<string, unknown> = {}): Promise<ExtrudeHandle | null> {
      if (!import.meta.client || reduced.value) return null
      const e = await load()
      if (!e || !el.isConnected) return null
      try {
        const t = e.mount(el, o)
        // without WebGL the engine leaves plain text and a stub without animations: treat it as unavailable
        if (typeof t.play !== 'function') {
          t.destroy()
          return null
        }
        return t
      } catch {
        return null
      }
    },
    /** Warm the script while the page is idle, so the first label does not wait for the network */
    preload: () => (import.meta.client && !reduced.value ? load() : Promise.resolve(null)),
  }
}
