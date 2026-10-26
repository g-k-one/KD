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

// KURWADROP's chicken: recorded sounds in one sprite (public/sfx/hen.mp3, generated in Magnific), [start, length] s
const HEN: Record<'swap' | 'body' | 'scream' | 'inflate' | 'pop', [number, number]> = {
  swap: [0, 1],
  body: [1.2, 1],
  scream: [2.4, 2],
  inflate: [4.6, 0.92],
  pop: [5.714, 1.48],
}
let henBuf: Promise<AudioBuffer | null> | null = null

export function useSfx() {
  const settings = useSettingsStore()
  const base = useRuntimeConfig().app.baseURL || '/'

  /** Loads and decodes the chicken's sprite once (henWarm time, so the hit only plays it) */
  function henLoad() {
    const a = audio()
    if (!a) return Promise.resolve(null)
    henBuf ??= fetch(`${base.endsWith('/') ? base : `${base}/`}sfx/hen.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => a.decodeAudioData(b))
      .catch(() => (henBuf = null))
    return henBuf
  }
  /** Plays one cut of the sprite; false when it is not loaded yet (the caller falls back to the synth) */
  function hen(name: keyof typeof HEN, len?: number, gain = 1) {
    const s = settings.settings
    if (!s.sound || s.volume <= 0) return true
    const a = audio()
    if (!a || !henBuf) return false
    henBuf.then((buf) => {
      if (!buf) return
      const [t0, d] = HEN[name]
      const src = a.createBufferSource()
      const g = a.createGain()
      src.buffer = buf
      const l = Math.min(len ?? d, d)
      g.gain.setValueAtTime(gain * (s.volume / 100), a.currentTime)
      g.gain.setValueAtTime(gain * (s.volume / 100), a.currentTime + Math.max(0, l - 0.08))
      g.gain.linearRampToValueAtTime(0.0001, a.currentTime + l)
      src.connect(g).connect(a.destination)
      src.start(0, t0, l)
    })
    return true
  }

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

  /** One voice for the chicken's sounds: an oscillator (or noise) through an optional filter, shaped by an envelope */
  function voice(
    dur: number,
    gain: number,
    build: (a: AudioContext, t: number) => { src: AudioScheduledSourceNode; out: AudioNode },
  ) {
    const s = settings.settings
    if (!s.sound || s.volume <= 0) return
    const a = audio()
    if (!a) return
    const t = a.currentTime
    const { src, out } = build(a, t)
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain * (s.volume / 100), t + Math.min(0.02, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    out.connect(g).connect(a.destination)
    src.start(t)
    src.stop(t + dur + 0.02)
  }
  let noiseBuf: AudioBuffer | null = null
  function noise(a: AudioContext) {
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const n = a.createBufferSource()
    n.buffer = noiseBuf
    n.loop = true
    return n
  }
  /** Noise through a band/low-pass whose cutoff sweeps f0 → f1 */
  function swish(f0: number, f1: number, dur: number, gain: number, type: BiquadFilterType = 'bandpass') {
    voice(dur, gain, (a, t) => {
      const n = noise(a)
      const f = a.createBiquadFilter()
      f.type = type
      f.Q.value = type === 'bandpass' ? 2.2 : 0.7
      f.frequency.setValueAtTime(f0, t)
      f.frequency.exponentialRampToValueAtTime(f1, t + dur)
      n.connect(f)
      return { src: n, out: f }
    })
  }
  /** A tone that glides f0 → f1, optionally wobbling (vibrato rate/depth in Hz) */
  function glide(f0: number, f1: number, dur: number, gain: number, type: OscillatorType, wob = 0, wobDepth = 0, glideFor = dur) {
    voice(dur, gain, (a, t) => {
      const o = a.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f0, t)
      o.frequency.exponentialRampToValueAtTime(f1, t + glideFor)
      if (wob) {
        const lfo = a.createOscillator()
        const lg = a.createGain()
        lfo.frequency.value = wob
        lg.gain.value = wobDepth
        lfo.connect(lg).connect(o.frequency)
        lfo.start(t)
        lfo.stop(t + dur + 0.02)
      }
      return { src: o, out: o }
    })
  }

  /** Result revealed: a longer, brighter arpeggio the rarer the drop (tier 0–4, or true for "rare") */
  function reveal(tier: number | boolean) {
    const t = tier === true ? 3 : tier === false ? 0 : tier
    const notes = [[520, 780], [560, 840], [600, 900, 1200], [660, 990, 1320], [660, 990, 1320, 1760]][t] ?? [520, 780]
    notes.forEach((f, i) => setTimeout(() => blip(f, i === notes.length - 1 ? 0.4 : 0.18, 0.11), i * 90))
  }

  return {
    /** Golden Chicken: two squawks */
    squawk: () => {
      sweep(700, 1500, 0.32, 0.12)
      setTimeout(() => sweep(800, 1700, 0.42, 0.12), 260)
    },
    /** Get the chicken's recorded sounds ready (with henWarm) */
    henLoad,
    /** KURWADROP's chicken (henShow): the logo zooms in with a rising swish and turns into the head with a bright ting */
    henSwap: () => {
      if (hen('swap')) return
      swish(500, 4200, 0.13, 0.12)
      setTimeout(() => blip(1760, 0.22, 0.07), 120)
    },
    /** ...its body springs out of the head */
    henBody: () => hen('body', 0.6, 0.8) || glide(220, 560, 0.26, 0.1, 'sine', 14, 40),
    /** ...the scream: a sawtooth "AAAA" through a vowel-like band, rising then shaking (Fast: half as long) */
    henScream: (fast = false) => {
      if (hen('scream', fast ? 1 : 2)) return
      const dur = fast ? 0.6 : 1.15
      voice(dur, 0.1, (a, t) => {
        const o = a.createOscillator()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(480, t)
        o.frequency.exponentialRampToValueAtTime(940, t + 0.12)
        o.frequency.exponentialRampToValueAtTime(820, t + dur)
        const lfo = a.createOscillator()
        const lg = a.createGain()
        lfo.frequency.value = 8
        lg.gain.value = 55
        lfo.connect(lg).connect(o.frequency)
        lfo.start(t)
        lfo.stop(t + dur + 0.02)
        const f = a.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.value = 1150
        f.Q.value = 1.4
        o.connect(f)
        return { src: o, out: f }
      })
      setTimeout(() => sweep(900, 1800, 0.3, 0.06), 60)
    },
    /** ...the belly stretches: a rubbery squeak rising with a fast tremble */
    henInflate: (fast = false) => hen('inflate', fast ? 0.45 : 0.92, 0.8) || glide(300, 1150, fast ? 0.2 : 0.4, 0.07, 'triangle', 18, 60),
    /** ...the pop: a noise burst, a low thump and a sparkle of coins */
    henPop: () => {
      if (hen('pop')) return
      swish(5000, 260, 0.38, 0.22, 'lowpass')
      glide(140, 40, 0.28, 0.24, 'sine')
      ;[1320, 1760, 2350].forEach((f, i) => setTimeout(() => blip(f, 0.16, 0.05), 90 + i * 70))
    },
    /** Reel passes a card */
    tick: () => blip(1400, 0.035, 0.05, 'square'),
    reveal,
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
    /** Rewards claimed, a PvP win, a level up: the reveal arpeggio they always used */
    claim: () => reveal(2),
    win: () => reveal(true),
    levelUp: () => reveal(4),
    /** Rising breath before the reel starts */
    riser: () => sweep(220, 660, 0.42, 0.05, 'sine'),
    /** The reel hangs on a card edge: a low tense pulse */
    tense: () => blip(110, 0.22, 0.14, 'sine'),
  }
}
