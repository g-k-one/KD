// Sound, after csgogem (docs/motion.md → Sound): few, short, airy and bright, the same for every rarity at its core —
// no notes, chords or long tails. A spin is a bed of air with thin bright clicks over it; a drop is one short "shing"
// (a noise burst whose brightness falls fast, a metal ring under it). Synthesized, except the Golden Chicken, which is
// a recording (public/sfx/sprite.mp3). Everything runs into one small bus — a compressor, with a send to a short room
// reverb. Respects Settings → Sound and volume.

type Bus = { a: AudioContext; master: GainNode; send: GainNode; noise: AudioBuffer }
let bus: Bus | null = null

/** Decaying stereo noise: the reverb's impulse */
function impulse(a: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(a.sampleRate * seconds)
  const buf = a.createBuffer(2, len, a.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
  }
  return buf
}

function makeBus(): Bus | null {
  try {
    const a = new AudioContext()
    const comp = a.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 10
    comp.ratio.value = 4
    comp.attack.value = 0.002
    comp.release.value = 0.18
    comp.connect(a.destination)
    const master = a.createGain()
    master.connect(comp)
    // The reverb is high-passed, so the lows (the thump of a drop) stay dry and tight
    const hp = a.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 350
    const verb = a.createConvolver()
    verb.buffer = impulse(a, 1.1, 3.5)
    const ret = a.createGain()
    ret.gain.value = 0.45
    const send = a.createGain()
    send.connect(hp).connect(verb).connect(ret).connect(master)
    const noise = a.createBuffer(1, a.sampleRate, a.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    // Browsers start the context suspended until a gesture; resume on the next one
    const wake = () => a.state === 'suspended' && void a.resume()
    window.addEventListener('pointerdown', wake, { passive: true })
    window.addEventListener('keydown', wake)
    return { a, master, send, noise }
  } catch {
    return null
  }
}

// ── samples ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Where each clip sits in the sprite: [offset s, duration s], 0.25 s of silence between clips. One file for all
 * recordings: the artifact holds at most 511 files. Packed by scratchpad tooling (trim, -1 dBFS peak, pack).
 */
const SPRITE = { squawk: [0.25, 0.92] } as const
type Sample = keyof typeof SPRITE
/** Each clip is peak-normalized to -1 dBFS; this sets how loud it sits against the synth */
const SAMPLE_GAIN: Record<Sample, number> = { squawk: 0.5 }
let file: Promise<ArrayBuffer | null> | null = null
let decoding = false
const buffers = new Map<Sample, AudioBuffer>()

/** Fetches the sprite once (no audio context needed yet) */
function prefetch(base: string) {
  file ??= fetch(`${base}sfx/sprite.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null), () => null)
}

/**
 * Decodes the sprite on the bus's context and cuts it into one buffer per clip. Each cut starts at the first sound
 * after (offset - 0.1 s), so a decoder that pads the start a little still lands on the clip.
 */
function decode(b: Bus) {
  if (decoding || !file) return
  decoding = true
  void file.then(async (ab) => {
    if (!ab) return
    const all = await b.a.decodeAudioData(ab.slice(0)).catch(() => null)
    if (!all) return
    const d = all.getChannelData(0)
    const sr = all.sampleRate
    for (const [n, [off, dur]] of Object.entries(SPRITE) as [Sample, readonly [number, number]][]) {
      let i = Math.max(0, Math.floor((off - 0.1) * sr))
      while (i < d.length && Math.abs(d[i]!) < 1e-3) i++
      const len = Math.min(Math.ceil(dur * sr), d.length - i)
      const buf = b.a.createBuffer(1, len, sr)
      buf.copyToChannel(d.subarray(i, i + len), 0)
      buffers.set(n, buf)
    }
  })
}

/** Plays a sample if it has loaded; false sends the caller to its synth fallback */
function sample(b: Bus, t: number, n: Sample, gain = 1) {
  const buf = buffers.get(n)
  if (!buf) return false
  const src = b.a.createBufferSource()
  src.buffer = buf
  const g = b.a.createGain()
  g.gain.value = SAMPLE_GAIN[n] * gain
  src.connect(g)
  out(b, g, {})
  src.start(t)
  return true
}

// ── voices ──────────────────────────────────────────────────────────────────────────────────────────────────────────

type Env = { t: number; a?: number; d: number; g: number }
type Place = { wet?: number; pan?: number }

/** Attack to g, then an exponential tail; returns the end time */
function env(p: AudioParam, { t, a = 0.003, d, g }: Env) {
  p.setValueAtTime(0.0001, t)
  p.exponentialRampToValueAtTime(g, t + a)
  p.exponentialRampToValueAtTime(0.0001, t + a + d)
  return t + a + d
}

function out(b: Bus, node: AudioNode, { wet = 0, pan = 0 }: Place) {
  let n = node
  if (pan) {
    const p = b.a.createStereoPanner()
    p.pan.value = pan
    n = n.connect(p)
  }
  n.connect(b.master)
  if (wet) {
    const w = b.a.createGain()
    w.gain.value = wet
    n.connect(w).connect(b.send)
  }
}

function lowpass(b: Bus, t: number, end: number, f: number, to?: number, q = 0.7) {
  const lp = b.a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = q
  lp.frequency.setValueAtTime(f, t)
  if (to) lp.frequency.exponentialRampToValueAtTime(to, end)
  return lp
}

type Tone = Env & Place & { f: number; to?: number; glide?: number; type?: OscillatorType; detune?: number; lp?: number; lpTo?: number }
/** One oscillator: a pitch glide (to, over glide seconds or the whole note) and an optional sweeping low-pass */
function tone(b: Bus, o: Tone) {
  const osc = b.a.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.detune.value = o.detune ?? 0
  const g = b.a.createGain()
  const end = env(g.gain, o)
  osc.frequency.setValueAtTime(o.f, o.t)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + (o.glide ?? end - o.t))
  if (o.lp) osc.connect(lowpass(b, o.t, end, o.lp, o.lpTo)).connect(g)
  else osc.connect(g)
  out(b, g, o)
  osc.start(o.t)
  osc.stop(end + 0.05)
}

type Bell = Env & Place & { f: number; ratio?: number; index?: number }
/** Two-operator FM; an inharmonic ratio (1.41) makes it ring like thin metal */
function bell(b: Bus, o: Bell) {
  const car = b.a.createOscillator()
  const mod = b.a.createOscillator()
  const depth = b.a.createGain()
  const g = b.a.createGain()
  const end = env(g.gain, o)
  car.frequency.value = o.f
  mod.frequency.value = o.f * (o.ratio ?? 2)
  depth.gain.setValueAtTime(o.f * (o.index ?? 1.5), o.t)
  depth.gain.exponentialRampToValueAtTime(o.f * 0.02, o.t + o.d * 0.6)
  mod.connect(depth).connect(car.frequency)
  car.connect(g)
  out(b, g, o)
  car.start(o.t)
  mod.start(o.t)
  car.stop(end + 0.05)
  mod.stop(end + 0.05)
}

type Noise = Env & Place & { f: number; to?: number; q?: number; type?: BiquadFilterType }
/** Filtered noise: clicks, air, the "shing" */
function noise(b: Bus, o: Noise) {
  const src = b.a.createBufferSource()
  src.buffer = b.noise
  src.loop = true
  const f = b.a.createBiquadFilter()
  f.type = o.type ?? 'bandpass'
  f.Q.value = o.q ?? 1
  const g = b.a.createGain()
  const end = env(g.gain, o)
  f.frequency.setValueAtTime(o.f, o.t)
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, end)
  src.connect(f).connect(g)
  out(b, g, o)
  src.start(o.t, Math.random() * 0.5)
  src.stop(end + 0.05)
}

// ── building blocks ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The drop: a short bright noise burst whose brightness falls fast (9.5 kHz → 1.2 kHz, audible ~0.7 s), a sharp "sh" on the
 * front, a thin metal ring and a soft low thump. k scales it (0.8 for cheap drops, up to 1.2).
 */
function shing(b: Bus, t: number, k = 1, ring = 2637) {
  noise(b, { t, a: 0.03, d: 0.85, g: 0.8 * k, f: 9500, to: 1200, q: 0.7, wet: 0.25 })
  noise(b, { t, a: 0.004, d: 0.07, g: 0.22 * k, type: 'highpass', f: 8000 })
  bell(b, { t, a: 0.01, d: 0.5, g: 0.045 * k, f: ring, ratio: 1.41, index: 2, wet: 0.3 })
  tone(b, { t, f: 110, to: 55, d: 0.25, g: 0.22 * k })
}

/** Air: high noise that thins out over d seconds (the bed under a spin) */
function air(b: Bus, t: number, d: number, g: number) {
  noise(b, { t, a: 0.03, d, g, type: 'highpass', f: 7000, to: 3500, q: 0.5, wet: 0.2 })
  noise(b, { t, a: 0.03, d: d * 0.6, g: g * 0.5, f: 2500, to: 900, q: 0.6 })
}

/** Weight: a sub drop and a dull crack */
function hit(b: Bus, t: number, k = 1) {
  tone(b, { t, f: 120, to: 38, d: 0.5, g: 0.5 * k })
  noise(b, { t, d: 0.3, g: 0.25 * k, type: 'lowpass', f: 1800, to: 150 })
}

/** One chicken "bawk" (fallback until the recording loads): a saw through the formants of "aw", vibrato, a rasp */
function bawk(b: Bus, t: number, f: number, d: number, g: number) {
  const a = b.a
  const osc = a.createOscillator()
  osc.type = 'sawtooth'
  const fr = osc.frequency
  fr.setValueAtTime(f * 0.55, t)
  fr.exponentialRampToValueAtTime(f, t + 0.04)
  fr.setValueAtTime(f, t + d * 0.55)
  fr.exponentialRampToValueAtTime(f * 0.6, t + d)
  const lfo = a.createOscillator()
  lfo.frequency.value = 13
  const vib = a.createGain()
  vib.gain.value = f * 0.06
  lfo.connect(vib).connect(fr)
  const mix = a.createGain()
  const end = env(mix.gain, { t, a: 0.015, d, g })
  for (const [ff, q, gg] of [[1000, 5, 1.6], [2600, 6, 1], [420, 2, 0.5]] as const) {
    const bp = a.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = ff
    bp.Q.value = q
    const fg = a.createGain()
    fg.gain.value = gg
    osc.connect(bp).connect(fg).connect(mix)
  }
  out(b, mix, { wet: 0.15 })
  noise(b, { t, a: 0.015, d, g: g * 0.25, f: 2800, q: 1.5 })
  osc.start(t)
  lfo.start(t)
  osc.stop(end + 0.05)
  lfo.stop(end + 0.05)
}

// ── the sounds ──────────────────────────────────────────────────────────────────────────────────────────────────────

export function useSfx() {
  const settings = useSettingsStore()
  const base = useRuntimeConfig().app.baseURL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  if (import.meta.client && settings.settings.sound) prefetch(root)
  // the first tap anywhere opens the audio context and decodes the recording, so the first chicken is the real one
  if (import.meta.client && !bus) window.addEventListener('pointerdown', () => { if (!bus && (bus = makeBus())) decode(bus) }, { once: true, capture: true, passive: true })

  /** Runs a sound on the bus at the current volume; t is the start time on the audio clock */
  function play(fn: (b: Bus, t: number) => void) {
    const s = settings.settings
    if (!import.meta.client || !s.sound || s.volume <= 0) return
    bus ??= makeBus()
    if (!bus) return
    // both run once: fetch the sprite, then decode it on this context
    prefetch(root)
    decode(bus)
    if (bus.a.state === 'suspended') void bus.a.resume()
    bus.master.gain.value = (s.volume / 100) ** 1.5 * 1.5
    fn(bus, bus.a.currentTime + 0.01)
  }

  let lastTick = -1
  // several reels land within a second on a multi-open: the later drops play softer, so five do not pile up
  let lastReveal = -1

  return {
    /** Reel passes a card, a gauge notch: a thin bright click (no body), slightly different every time */
    tick: () =>
      play((b, t) => {
        if (t - lastTick < 0.025) return
        lastTick = t
        const r = 1 + (Math.random() - 0.5) * 0.12
        noise(b, { t, a: 0.001, d: 0.012, g: 0.45, type: 'highpass', f: 5500 * r, q: 0.7 })
        bell(b, { t, a: 0.001, d: 0.02, g: 0.05, f: 4200 * r, ratio: 1.5, index: 0.6 })
      }),
    /** The breath before the reel: a short airy swell */
    riser: () => play((b, t) => noise(b, { t, a: 0.3, d: 0.12, g: 0.12, type: 'highpass', f: 2500, to: 8000, q: 0.5, wet: 0.25 })),
    /** A spin starts: the bed of air under the clicks, thinning out over the first ~55% of it (ms: its length) */
    roll: (ms: number) => play((b, t) => air(b, t, Math.min(ms / 1000, 7) * 0.55, 0.09)),
    /** The reel hangs on a card edge: a low thump and a dark drone under it */
    tense: () =>
      play((b, t) => {
        tone(b, { t, f: 95, to: 48, d: 0.35, g: 0.5 })
        for (const detune of [-10, 10]) tone(b, { t, a: 0.04, d: 0.45, g: 0.07, f: 82.41, type: 'sawtooth', detune, lp: 380, wet: 0.2 })
      }),
    /**
     * A drop lands (tier 0–4, or true for "rare"): the same shing for every drop, a touch louder the rarer;
     * covert adds a sparkling tail, gold a low hit under it as well.
     */
    reveal: (tier: number | boolean) =>
      play((b, t) => {
        const k = tier === true ? 3 : tier === false ? 0 : Math.max(0, Math.min(4, tier))
        const crowd = t - lastReveal < 0.9
        lastReveal = t
        const g = (k <= 1 ? 0.8 : 1) * (crowd ? 0.6 : 1)
        shing(b, t, g)
        if (k >= 3) noise(b, { t: t + 0.05, a: 0.05, d: 0.9, g: 0.045 * g, type: 'highpass', f: 6500, q: 0.5, wet: 0.6 })
        if (k >= 3) bell(b, { t: t + 0.04, a: 0.01, d: 0.8, g: 0.03 * g, f: 3951, ratio: 1.41, index: 1.5, wet: 0.5 })
        if (k === 4) hit(b, t, 0.7 * g)
      }),
    /** Coins land on the balance: two thin metal tinks */
    coin: () =>
      play((b, t) => {
        const r = 1 + (Math.random() - 0.5) * 0.04
        bell(b, { t, a: 0.001, d: 0.09, g: 0.06, f: 5274 * r, ratio: 1.41, index: 1.5, wet: 0.15 })
        bell(b, { t: t + 0.045, a: 0.001, d: 0.12, g: 0.05, f: 6272 * r, ratio: 1.41, index: 1.5, wet: 0.2 })
        noise(b, { t, a: 0.001, d: 0.02, g: 0.1, type: 'highpass', f: 7000 })
      }),
    /** A reward claimed: a light shing */
    claim: () =>
      play((b, t) => {
        noise(b, { t, a: 0.02, d: 0.35, g: 0.3, f: 10000, to: 3000, q: 0.7, wet: 0.25 })
        bell(b, { t, a: 0.005, d: 0.4, g: 0.05, f: 3322, ratio: 1.41, index: 1.5, wet: 0.3 })
      }),
    /** A battle won: a hit under a full shing with the sparkling tail */
    win: () =>
      play((b, t) => {
        hit(b, t, 0.8)
        shing(b, t, 1.1)
        noise(b, { t: t + 0.05, a: 0.05, d: 1, g: 0.07, type: 'highpass', f: 6500, q: 0.5, wet: 0.6 })
      }),
    /** Level up: air rising into a shing */
    levelUp: () =>
      play((b, t) => {
        noise(b, { t, a: 0.35, d: 0.05, g: 0.2, f: 800, to: 9000, q: 0.6, wet: 0.3 })
        shing(b, t + 0.38, 1.1, 3322)
      }),
    /** The upgrade pointer crawls near the edge: a heartbeat, lub-dub */
    heart: () =>
      play((b, t) => {
        tone(b, { t, f: 70, to: 45, d: 0.14, g: 0.55 })
        noise(b, { t, d: 0.05, g: 0.2, type: 'lowpass', f: 200 })
        tone(b, { t: t + 0.16, f: 62, to: 40, d: 0.18, g: 0.4 })
      }),
    /** PvP countdown: a bright click with a short ping; the last one is a shing */
    count: (last = false) =>
      play((b, t) => {
        if (last) return shing(b, t, 1)
        noise(b, { t, a: 0.001, d: 0.015, g: 0.4, type: 'highpass', f: 5000 })
        bell(b, { t, a: 0.002, d: 0.1, g: 0.1, f: 1975.5, ratio: 1, index: 0.4, wet: 0.2 })
      }),
    /** A loss: soft and muffled, a dull whoosh falling away */
    lose: () =>
      play((b, t) => {
        noise(b, { t, a: 0.01, d: 0.45, g: 0.25, type: 'lowpass', f: 1800, to: 200 })
        tone(b, { t, f: 140, to: 55, d: 0.3, g: 0.3 })
      }),
    /** Golden Chicken: the recording (synth squawks until it has loaded) */
    squawk: () =>
      play((b, t) => {
        if (sample(b, t, 'squawk')) return
        bawk(b, t, 820, 0.22, 0.5)
        bawk(b, t + 0.26, 980, 0.34, 0.55)
        bawk(b, t + 0.68, 700, 0.1, 0.35)
      }),
  }
}
