// Synthesized sound (no audio files). Every voice runs into one small mix bus — a compressor, with a send to a short
// room reverb — so the sounds sit together instead of beeping straight at the speakers. Everything tonal is in one key
// (E major pentatonic), so a reveal, a coin and a countdown never clash. Respects Settings → Sound and volume.

type Bus = { a: AudioContext; master: GainNode; send: GainNode; noise: AudioBuffer }
let bus: Bus | null = null

// E major pentatonic, plus the low roots
const N = {
  E2: 82.41, E3: 164.81, B3: 246.94, E4: 329.63, Gs4: 415.3, B4: 493.88, Cs5: 554.37, E5: 659.25, Fs5: 739.99,
  Gs5: 830.61, B5: 987.77, Cs6: 1108.73, E6: 1318.51, Gs6: 1661.22, B6: 1975.53, E7: 2637.02, Gs7: 3322.44,
}
const SPARKLE = [N.E6, N.Gs6, N.B6, N.Cs6, N.E7]

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
    // The reverb is high-passed, so the lows (thumps, the sub of a hit) stay dry and tight
    const hp = a.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 350
    const verb = a.createConvolver()
    verb.buffer = impulse(a, 1.4, 3.2)
    const ret = a.createGain()
    ret.gain.value = 0.5
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
/** Two-operator FM: a bright attack that mellows as the modulator dies down (bells, coins, plucks) */
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
/** Filtered noise: clicks, air, whooshes, the crack of a hit */
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

/** A note: an FM pluck over a soft triangle body */
function pluck(b: Bus, t: number, f: number, d: number, g: number, pan = 0, wet = 0.3) {
  bell(b, { t, f, d, g: g * 0.6, ratio: 2, index: 1.2, pan, wet })
  tone(b, { t, f, d: d * 0.8, g: g * 0.5, type: 'triangle', lp: 4000, pan, wet })
}

/** Weight: a sub drop, a dull crack and a click on top */
function hit(b: Bus, t: number, k = 1) {
  tone(b, { t, f: 120, to: 38, d: 0.55, g: 0.6 * k })
  noise(b, { t, d: 0.35, g: 0.3 * k, type: 'lowpass', f: 1800, to: 150 })
  noise(b, { t, d: 0.02, g: 0.2 * k, type: 'highpass', f: 4000 })
}

/** A held chord: detuned saw pairs under a closing low-pass */
function pad(b: Bus, t: number, notes: number[], d: number, g: number) {
  for (const f of notes)
    for (const detune of [-8, 8]) tone(b, { t, f, d, g, a: 0.012, type: 'sawtooth', detune, lp: 2800, lpTo: 500, wet: 0.4 })
}

/** High bells scattered across the stereo field */
function sparkle(b: Bus, t: number, n: number, span: number) {
  for (let i = 0; i < n; i++)
    bell(b, {
      t: t + Math.random() * span,
      f: SPARKLE[Math.floor(Math.random() * SPARKLE.length)]!,
      d: 0.4,
      g: 0.025,
      ratio: 3.01,
      index: 1,
      pan: Math.random() * 1.2 - 0.6,
      wet: 0.7,
    })
}

/** Two metal clinks */
function clink(b: Bus, t: number, g = 1.5) {
  const r = 1 + (Math.random() - 0.5) * 0.02
  bell(b, { t, f: N.E7 * r, d: 0.14, g: 0.08 * g, ratio: 2.76, index: 2, wet: 0.2 })
  bell(b, { t: t + 0.055, f: N.Gs7 * r, d: 0.22, g: 0.06 * g, ratio: 2.76, index: 2, wet: 0.25 })
  noise(b, { t, d: 0.03, g: 0.05 * g, type: 'highpass', f: 6000 })
}

/** One chicken "bawk": a saw through the formants of "aw", a quick pitch flip up, vibrato and a raspy throat */
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

  /** Runs a sound on the bus at the current volume; t is the start time on the audio clock */
  function play(fn: (b: Bus, t: number) => void) {
    const s = settings.settings
    if (!import.meta.client || !s.sound || s.volume <= 0) return
    bus ??= makeBus()
    if (!bus) return
    if (bus.a.state === 'suspended') void bus.a.resume()
    bus.master.gain.value = (s.volume / 100) ** 1.5 * 1.5
    fn(bus, bus.a.currentTime + 0.01)
  }

  let lastTick = -1

  return {
    /** Reel passes a card, a gauge notch: a dry ratchet click, slightly different every time */
    tick: () =>
      play((b, t) => {
        if (t - lastTick < 0.025) return
        lastTick = t
        const r = 1 + (Math.random() - 0.5) * 0.08
        noise(b, { t, d: 0.018, g: 0.35, f: 3800 * r, q: 1.2 })
        tone(b, { t, f: 1900 * r, to: 1500 * r, d: 0.03, g: 0.1 })
        tone(b, { t, f: 420 * r, d: 0.025, g: 0.08, type: 'triangle' })
      }),
    /** The breath before the reel: air rising into a whoosh */
    riser: () =>
      play((b, t) => {
        noise(b, { t, a: 0.36, d: 0.1, g: 0.18, f: 500, to: 5000, q: 0.8, wet: 0.3 })
        tone(b, { t, a: 0.34, d: 0.1, g: 0.05, f: N.E3, to: N.E5, wet: 0.3 })
      }),
    /** The reel hangs on a card edge: a low thump and a dark drone under it */
    tense: () =>
      play((b, t) => {
        tone(b, { t, f: 95, to: 48, d: 0.35, g: 0.5 })
        for (const detune of [-10, 10]) tone(b, { t, a: 0.04, d: 0.45, g: 0.07, f: N.E2, type: 'sawtooth', detune, lp: 380, wet: 0.2 })
      }),
    /**
     * A drop lands (tier 0–4, or true for "rare"): a longer, higher arpeggio the rarer it is. From covert up it hits
     * with weight, a chord and sparkles; gold doubles all of it.
     */
    reveal: (tier: number | boolean) =>
      play((b, t) => {
        const k = tier === true ? 3 : tier === false ? 0 : Math.max(0, Math.min(4, tier))
        const arp = [[N.E5], [N.B4, N.E5], [N.E5, N.Gs5, N.B5], [N.E5, N.Gs5, N.B5, N.E6], [N.E5, N.Gs5, N.B5, N.E6, N.Gs6, N.B6]][k]!
        const step = [0, 0.075, 0.07, 0.06, 0.05][k]!
        if (k < 3) tone(b, { t, f: 190, to: 110, d: 0.09, g: 0.22 })
        arp.forEach((f, i) => {
          const last = i === arp.length - 1
          const pan = arp.length > 1 ? (i / (arp.length - 1) - 0.5) * 0.4 : 0
          pluck(b, t + i * step, f, last ? 0.5 + k * 0.15 : 0.22, 0.14, pan, 0.25 + k * 0.08)
        })
        if (k >= 3) {
          hit(b, t, k === 4 ? 1.2 : 1)
          pad(b, t, k === 4 ? [N.E3, N.B3, N.E4, N.Gs4, N.B4] : [N.E3, N.B3, N.E4, N.Gs4], k === 4 ? 1.8 : 1.1, 0.035)
          sparkle(b, t + 0.1, k === 4 ? 14 : 6, k === 4 ? 1.4 : 0.8)
        }
      }),
    /** Coins land on the balance */
    coin: () => play((b, t) => clink(b, t)),
    /** A reward claimed: two bright notes and a few sparkles (the balance clinks on its own) */
    claim: () =>
      play((b, t) => {
        pluck(b, t, N.B5, 0.2, 0.18, -0.15)
        pluck(b, t + 0.07, N.E6, 0.45, 0.18, 0.15, 0.35)
        sparkle(b, t + 0.1, 4, 0.4)
      }),
    /** A battle won: a hit, a chord and an arpeggio up two octaves, with coins */
    win: () =>
      play((b, t) => {
        hit(b, t, 0.8)
        pad(b, t, [N.E3, N.B3, N.E4, N.Gs4, N.B4], 1.4, 0.03)
        ;[N.E4, N.B4, N.E5, N.Gs5, N.B5, N.E6].forEach((f, i) => pluck(b, t + i * 0.06, f, i === 5 ? 0.8 : 0.22, 0.13, (i / 5 - 0.5) * 0.4, 0.35))
        for (let i = 0; i < 3; i++) clink(b, t + 0.35 + i * 0.12, 1.2)
        sparkle(b, t + 0.2, 10, 1.2)
      }),
    /** Level up: a fast run up two octaves that lands on a held chord */
    levelUp: () =>
      play((b, t) => {
        const run = [N.E4, N.Gs4, N.B4, N.E5, N.Gs5, N.B5, N.E6]
        run.forEach((f, i) => pluck(b, t + i * 0.045, f, 0.2, 0.11, (i / 6 - 0.5) * 0.5, 0.3))
        const top = t + run.length * 0.045
        hit(b, top, 0.7)
        pad(b, top, [N.E3, N.B3, N.E4, N.Gs4, N.B4, N.E5], 1.6, 0.03)
        pluck(b, top, N.E6, 1.2, 0.14, 0, 0.45)
        sparkle(b, top, 12, 1.2)
      }),
    /** The upgrade pointer crawls near the edge: a heartbeat, lub-dub */
    heart: () =>
      play((b, t) => {
        tone(b, { t, f: 70, to: 45, d: 0.14, g: 0.55 })
        noise(b, { t, d: 0.05, g: 0.2, type: 'lowpass', f: 200 })
        tone(b, { t: t + 0.16, f: 62, to: 40, d: 0.18, g: 0.4 })
      }),
    /** PvP countdown: a clean beep; the last one lands with weight, an octave up */
    count: (last = false) =>
      play((b, t) => {
        if (!last) {
          bell(b, { t, f: N.B5, d: 0.16, g: 0.24, ratio: 1, index: 0.5, wet: 0.25 })
          tone(b, { t, f: N.B4, d: 0.12, g: 0.1 })
          noise(b, { t, d: 0.015, g: 0.15, f: 3800, q: 1.2 })
          return
        }
        hit(b, t, 0.6)
        pluck(b, t, N.B5, 0.5, 0.12, -0.1, 0.35)
        pluck(b, t, N.E6, 0.7, 0.14, 0.1, 0.35)
      }),
    /** A loss: soft and short, three muted notes falling into a minor third, the last one sagging */
    lose: () =>
      play((b, t) => {
        tone(b, { t, f: 120, to: 60, d: 0.25, g: 0.25 })
        const notes = [N.B4, 392, N.E4]
        notes.forEach((f, i) => {
          const last = i === notes.length - 1
          for (const detune of [-6, 6])
            tone(b, { t: t + i * 0.13, f, to: last ? f * 0.94 : undefined, d: last ? 0.5 : 0.16, g: 0.06, type: 'triangle', detune, lp: 1600, lpTo: last ? 400 : 900, wet: 0.3 })
        })
      }),
    /** Golden Chicken: two squawks and a cluck */
    squawk: () =>
      play((b, t) => {
        bawk(b, t, 820, 0.22, 0.5)
        bawk(b, t + 0.26, 980, 0.34, 0.55)
        bawk(b, t + 0.68, 700, 0.1, 0.35)
      }),
  }
}
