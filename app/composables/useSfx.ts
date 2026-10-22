// Tiny synthesized sound effects (no audio files). Respects Settings → Sound and volume.
let ctx: AudioContext | null = null

function audio() {
  if (!import.meta.client) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function useSfx() {
  const settings = useSettingsStore()

  function blip(freq: number, duration: number, gain: number, type: OscillatorType = 'triangle') {
    const s = settings.settings
    if (!s.sound || s.volume <= 0) return
    const a = audio()
    if (!a) return
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = type
    osc.frequency.value = freq
    const v = gain * (s.volume / 100)
    g.gain.setValueAtTime(v, a.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration)
    osc.connect(g).connect(a.destination)
    osc.start()
    osc.stop(a.currentTime + duration)
  }

  /** Pitch sweep, used for the chicken's scream */
  function sweep(f0: number, f1: number, duration: number, gain: number, type: OscillatorType = 'sawtooth') {
    const s = settings.settings
    if (!s.sound || s.volume <= 0) return
    const a = audio()
    if (!a) return
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f0, a.currentTime)
    osc.frequency.exponentialRampToValueAtTime(f1, a.currentTime + duration * 0.35)
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.7, a.currentTime + duration)
    const v = gain * (s.volume / 100)
    g.gain.setValueAtTime(v, a.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration)
    osc.connect(g).connect(a.destination)
    osc.start()
    osc.stop(a.currentTime + duration)
  }

  return {
    /** Golden Chicken: two squawks */
    squawk: () => {
      sweep(700, 1500, 0.32, 0.12)
      setTimeout(() => sweep(800, 1700, 0.42, 0.12), 260)
    },
    /** Reel passes a card */
    tick: () => blip(1400, 0.035, 0.05, 'square'),
    /** Result revealed: a longer, brighter arpeggio the rarer the drop (tier 0–4, or true for "rare") */
    reveal: (tier: number | boolean) => {
      const t = tier === true ? 3 : tier === false ? 0 : tier
      const notes = [[520, 780], [560, 840], [600, 900, 1200], [660, 990, 1320], [660, 990, 1320, 1760]][t] ?? [520, 780]
      notes.forEach((f, i) => setTimeout(() => blip(f, i === notes.length - 1 ? 0.4 : 0.18, 0.11), i * 90))
    },
    /** Coins land on the balance */
    coin: () => {
      blip(1320, 0.08, 0.06)
      setTimeout(() => blip(1760, 0.12, 0.05), 60)
    },
    /** Low double thump while the upgrade pointer crawls near the edge */
    heart: () => {
      blip(70, 0.12, 0.22, 'sine')
      setTimeout(() => blip(60, 0.14, 0.16, 'sine'), 140)
    },
    /** Countdown beep; the last one is higher */
    count: (last = false) => blip(last ? 1040 : 700, last ? 0.25 : 0.12, 0.09),
    lose: () => blip(180, 0.35, 0.12, 'sawtooth'),
    /** Rising breath before the reel starts */
    riser: () => sweep(220, 660, 0.42, 0.05, 'sine'),
    /** The reel hangs on a card edge: a low tense pulse */
    tense: () => blip(110, 0.22, 0.14, 'sine'),
  }
}
