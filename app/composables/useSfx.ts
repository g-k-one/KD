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

// KURWADROP's chicken: recorded sounds in one sprite (public/sfx/hen.mp3, generated in KREA with Seed Audio: cartoonish
// and soft, the scream is the chicken shouting KURWAAAA), [start, length] s; each trimmed with long fade-outs and the
// same light room echo baked in, so one sound flows into the next. The stretch starts where its squeak gets loud and the
// pop just before its bang, so neither lags the picture
const HEN: Record<'swap' | 'body' | 'scream' | 'inflate' | 'pop', [number, number]> = {
  swap: [0, 0.705],
  body: [0.905, 0.645],
  scream: [1.75, 1.415],
  inflate: [3.575, 0.418],
  pop: [4.35, 2.318],
}
let henBuf: Promise<AudioBuffer | null> | null = null
// The home banner's chicken, poked: a second sprite (public/sfx/poke.mp3, KREA · Seed Audio) in the voice of the reel's
// KURWAAAA shout (a chubby hen, round and warm, mid-low): a surprised "buh-GAWK!", an indignant "buk-BUK?!", and, fed up,
// a clipped "KUR-WAWK!" or an angry "KURWA!" with an offended cluck; plus a soft feather puff. Trimmed, levelled, short fades
const POKE: Record<'gawk' | 'bukbuk' | 'kurwawk' | 'kurwa' | 'puff', [number, number]> = {
  gawk: [0, 0.875],
  bukbuk: [1.025, 0.58],
  kurwawk: [1.755, 1.0],
  kurwa: [2.905, 1.31],
  puff: [4.365, 0.281],
}
let pokeBuf: Promise<AudioBuffer | null> | null = null
// the last launch: the case page plays it on the press and the reel again as it starts, the second within 300 ms is dropped
let lastLaunch = 0

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
  /** Loads and decodes the poke sprite once (the banner asks when it mounts) */
  function pokeLoad() {
    const a = audio()
    if (!a) return Promise.resolve(null)
    pokeBuf ??= fetch(`${base.endsWith('/') ? base : `${base}/`}sfx/poke.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => a.decodeAudioData(b))
      .catch(() => (pokeBuf = null))
    return pokeBuf
  }
  /** Plays one cut of the poke sprite at a playback rate (a quick run of pokes climbs in pitch); false when not loaded */
  function pokeCut(name: keyof typeof POKE, gain: number, rate = 1) {
    const s = settings.settings
    if (!s.sound || s.volume <= 0) return true
    const a = audio()
    if (!a || !pokeBuf) return false
    pokeBuf.then((buf) => {
      if (!buf) return
      const [t0, d] = POKE[name]
      const src = a.createBufferSource()
      const g = a.createGain()
      src.buffer = buf
      src.playbackRate.value = rate
      g.gain.value = gain * (s.volume / 100)
      src.connect(g).connect(a.destination)
      src.start(0, t0, d)
    })
    return true
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
      // a 5 ms fade-in: a cut may start mid-wave (the pop starts right at its bang), which would click
      g.gain.setValueAtTime(0.0001, a.currentTime)
      g.gain.linearRampToValueAtTime(gain * (s.volume / 100), a.currentTime + 0.005)
      g.gain.setValueAtTime(gain * (s.volume / 100), a.currentTime + Math.max(0.005, l - 0.08))
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

  /** Golden Chicken: two squawks */
  function squawkNow() {
    sweep(700, 1500, 0.32, 0.12)
    setTimeout(() => sweep(800, 1700, 0.42, 0.12), 260)
  }

  /** Result revealed: a longer, brighter arpeggio the rarer the drop (tier 0–4, or true for "rare") */
  function reveal(tier: number | boolean) {
    const t = tier === true ? 3 : tier === false ? 0 : tier
    const notes = [[520, 780], [560, 840], [600, 900, 1200], [660, 990, 1320], [660, 990, 1320, 1760]][t] ?? [520, 780]
    notes.forEach((f, i) => setTimeout(() => blip(f, i === notes.length - 1 ? 0.4 : 0.18, 0.11), i * 90))
  }

  return {
    /** Golden Chicken: two squawks */
    squawk: squawkNow,
    /** Get the chicken's recorded sounds ready (with henWarm) */
    henLoad,
    /** Get the banner chicken's poke sounds ready */
    pokeLoad,
    /**
     * The banner chicken poked: level 1–2 a "buh-GAWK!" or a "buk-BUK?!" (picked at random, a quick run climbs in pitch),
     * level 3 — fed up — "KUR-WAWK!" or "KURWA!"; a soft feather puff under each. The synth squawks until the sprite is in.
     */
    henPoke: (level: number, combo = 1) => {
      const rate = level === 3 ? 1 : 1 + Math.min(combo - 1, 4) * 0.05 + (Math.random() - 0.5) * 0.06
      const ok = level === 3 ? pokeCut(Math.random() < 0.5 ? 'kurwawk' : 'kurwa', 0.9) : pokeCut(Math.random() < 0.5 ? 'gawk' : 'bukbuk', 0.8, rate)
      if (!ok) return squawkNow()
      pokeCut('puff', level === 3 ? 0.55 : 0.35)
    },
    /** KURWADROP's chicken (henShow): the logo zooms in with a rising swish and turns into the head with a bright ting */
    henSwap: () => {
      if (hen('swap', undefined, 0.75)) return
      swish(500, 4200, 0.13, 0.12)
      setTimeout(() => blip(1760, 0.22, 0.07), 120)
    },
    /** ...its body springs out of the head: a soft bouncy bloop, a hair after the swap's ting so they don't land as one */
    henBody: () => void setTimeout(() => hen('body', undefined, 0.65), 50),
    /** ...the scream: the chicken shouts KURWAAAA (Fast cuts it before the stretch starts); the synth squawks without the sprite */
    henScream: (fast = false) => {
      if (!hen('scream', fast ? 0.5 : undefined, 0.95)) squawkNow()
    },
    /** ...the belly stretches: a rising balloon squeak that runs into the pop */
    henInflate: (fast = false) => void hen('inflate', fast ? 0.22 : undefined, 0.7),
    /** ...the pop: a balloon burst and a long shower of coins */
    henPop: () => {
      if (hen('pop', undefined, 0.9)) return
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
    /** Something heavy lands: a sharp crack on top so it cuts through, the metal ringing, the body falling away, its dust */
    thud: () => {
      glide(1800, 240, 0.05, 0.2, 'square')
      swish(5200, 700, 0.1, 0.34, 'bandpass')
      glide(640, 520, 0.3, 0.1, 'triangle')
      glide(210, 58, 0.3, 0.42, 'sine')
      swish(2600, 260, 0.42, 0.16, 'lowpass')
    },
    lose: () => blip(180, 0.35, 0.12, 'sawtooth'),
    /** Rewards claimed, a PvP win, a level up: the reveal arpeggio they always used */
    claim: () => reveal(2),
    win: () => reveal(true),
    levelUp: () => reveal(4),
    /** The launch of a reel or an upgrade: the reel's own tick, and on its heels the coin's two bright notes */
    riser: () => {
      if (import.meta.client && document.hidden) return
      const now = performance.now()
      if (now - lastLaunch < 300) return
      lastLaunch = now
      // the tick and the coin's first note together, on the press itself; the coin's second note right after
      blip(1400, 0.035, 0.06, 'square')
      blip(1320, 0.08, 0.07)
      setTimeout(() => blip(1760, 0.12, 0.06), 60)
    },
    /** The reel hangs on a card edge: a low tense pulse */
    tense: () => blip(110, 0.22, 0.14, 'sine'),

    // Moments of play outside the games, in the same voice (triangle blips, short glides, quieter than any game sound);
    // plain presses stay silent:
    /** A skin into the stake (or a seat filled): a quick rising pluck; `n` (how many are in now) lifts the pitch a step */
    select: (n = 1) => {
      const f = 660 * 2 ** (Math.min(Math.max(n, 1) - 1, 6) / 6) * (1 + (Math.random() - 0.5) * 0.02)
      blip(f, 0.07, 0.07)
      setTimeout(() => blip(f * 1.5, 0.1, 0.055), 45)
    },
    /** ...and back out: the same pluck falling */
    deselect: () => {
      blip(990, 0.06, 0.05)
      setTimeout(() => blip(660, 0.09, 0.045), 45)
    },
    /** A target chosen (the upgrade's skin, a case to battle): a glide up into a bright ting */
    pick: () => {
      glide(520, 1040, 0.12, 0.06, 'triangle')
      setTimeout(() => blip(1560, 0.16, 0.05), 100)
    },
    /** Not allowed (no free slot, too cheap, a server error): two low soft knocks, never harsh */
    denied: () => {
      blip(260, 0.08, 0.09)
      setTimeout(() => blip(196, 0.12, 0.08), 90)
    },
    /** Something worked (copied, revealed, saved): a small two-note ting */
    ok: () => {
      blip(1175, 0.07, 0.045)
      setTimeout(() => blip(1568, 0.12, 0.04), 60)
    },
  }
}
