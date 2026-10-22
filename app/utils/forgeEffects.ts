import type { Rarity } from '#shared/types/api'
import { RARITY_HEX } from './rarity'

/*
 * KurwaDROP's own Forge effects (docs/motion.md → VFX), drawn from our atlas 'kd'
 * (scripts/build-forge-atlas.mjs): the KD coin and its edge, a golden-chicken feather, and white masks
 * (glow, ring, spark, rays, ember) tinted per particle. Authored in the usual 360×360 square, centre (180, 180).
 *
 *   kdJackpot — Golden Chicken / gold drop: a spark shockwave, gold feathers that burst and drift down,
 *               a few KD coins, soft rays
 *   kdReveal  — one-shot when a drop lands: a short flash, a crisp ring of small sparks and a few motes,
 *               all in the rarity colour (handle.set('tint', rgb)); handle.set('level', 1…3) scales it
 *               (restricted · classified · covert). Covert gets a second ring and rising embers.
 *   kdCoins   — loop for the KURWADROP promo: a small KD-coin fountain every couple of seconds
 *   kdAura    — loop behind a rare result: a breathing glow and a few sparks drifting up.
 *               Colour per rarity: handle.set('tint', [r, g, b])
 *   kdWin     — won upgrade: green-gold shockwave and sparks
 *   kdLose    — lost upgrade: a red ring closes in, embers fall away
 *   kdCharge  — loop while the gauge turns: light is drawn into the centre
 *   kdBurn    — loop around a label: a flat warm glow hugging it, licks and embers rising along its width
 *               (the label's middle sits at y ≈ 300)
 *   kdRank    — Forge's rank reveal (motion pack, `tier`: base → luck → mega → ultra → jackpot) in the rarity's own
 *               colour, one burst on the drop's rarity shape; opts { color: '#hex', level: 0…4 }
 */
type Cell = number
type Rgb = number[]
interface Particle {
  x: number
  y: number
  [k: string]: unknown
}
interface Helpers {
  R: (a: number, b: number) => number
  PI: number
  easeOut: (t: number) => number
  spawn: (L: Particle[], o: Record<string, unknown>) => Particle
  step: (L: Particle[], dt: number) => void
  draw: (c: unknown, L: Particle[]) => void
  sprite: (c: unknown, x: number, y: number, size: number, rot: number, alpha: number, add: number, cell: Cell, sy?: number, tint?: Rgb | null) => void
  emit: (acc: Record<string, number>, k: number, rate: number, dt: number, f: () => void) => void
  pick: <T>(a: T[]) => T
}
interface Atlas {
  map: Record<string, Cell>
}
interface State {
  t: number
  cycle: number
  acc: Record<string, number>
  [k: string]: unknown
}
interface Ctx {
  at: Atlas
}
type Def = {
  atlas: string
  period?: number
  init: (s: State) => void
  update: (s: State, dt: number, at: Atlas) => void
  render: (s: State, c: Ctx) => void
}
interface Engine {
  define: (name: string, build: (h: Helpers) => Def) => void
}

const GOLD: Rgb = [1, 0.8, 0.32]
const GOLD_HI: Rgb = [1, 0.94, 0.7]
const GREEN: Rgb = [0.3, 1, 0.55]
const RED: Rgb = [1, 0.26, 0.22]
const ORANGE: Rgb = [1, 0.5, 0.16]
const AMBER: Rgb = [1, 0.78, 0.38]

/** '#eb4b4b' → [0.92, 0.29, 0.29] for handle.set('tint', …) */
export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

type Coin = { x: number; y: number; vx: number; vy: number; spin: number; vs: number; size: number; feather: number; rot: number; vr: number }

export function defineKdEffects(engine: Engine) {
  // The rank reveal, recoloured: the light core, the rarity colour, the dark tail of each spark. Without the
  // motion pack it draws nothing rather than failing.
  engine.define('kdRank', (h) => {
    const tier = (h as unknown as { DEF: Record<string, Def | undefined> }).DEF.tier
    if (!tier) return { atlas: 'aura', init: () => {}, update: () => {}, render: () => {} }
    return {
      ...tier,
      init(s) {
        tier.init(s)
        const o = (s as State & { o: { color?: string; level?: number } }).o
        if (o.color) {
          const c = hexToRgb(o.color)
          s.pal = [c.map((v) => v * 0.35 + 0.65), c, c.map((v) => v * 0.3)]
        }
        if (o.level != null) s.L = o.level
      },
    }
  })

  /** A spinning KD coin: face, squeezing to the edge and back; feathers tumble instead */
  const coinSprite = (h: Helpers, c: Ctx, k: Coin, alpha: number) => {
    const m = c.at.map
    if (k.feather) return h.sprite(c, k.x, k.y, k.size * 1.5, k.rot, alpha, 0, m.feather!)
    // squeeze the face down to a thin disc rather than swapping to the edge sprite (it read as a stick)
    const a = Math.max(0.28, Math.abs(Math.cos(k.spin)))
    h.sprite(c, k.x, k.y, k.size, k.rot, alpha, 0, m.coin!, a)
  }
  const flyCoins = (coins: Coin[], dt: number, g: number) => {
    for (const k of coins) {
      k.vy += (k.feather ? g * 0.18 : g) * dt
      k.vx *= 1 - (k.feather ? 2.2 : 0.4) * dt
      if (k.feather) {
        k.vy *= 1 - 1.6 * dt
        // falling feathers swing side to side and tilt with the swing
        if (k.vy > 0) {
          k.x += Math.sin(k.spin) * 46 * dt
          k.rot += Math.cos(k.spin) * 1.4 * dt
        }
      }
      k.x += k.vx * dt
      k.y += k.vy * dt
      k.spin += k.vs * dt
      k.rot += k.vr * dt
    }
  }

  engine.define('kdJackpot', (h) => ({
    atlas: 'kd',
    period: 3.8,
    // The Golden Chicken: a crisp shockwave of small sparks (no upscaled ring texture), a cloud of gold
    // feathers that bursts up and then drifts down swaying, and a handful of KD coins thrown higher than
    // them. Rays turn slowly behind it all. Every sprite stays near its native size, so nothing looks soft.
    init: (s) => Object.assign(s, { fired: false, coins: [] as Coin[], sp: [] as Particle[], wave: [] as Particle[], trail: [] as Particle[] }),
    update(s, dt, at) {
      const { R, PI } = h
      const coins = s.coins as Coin[]
      if (!s.fired && s.cycle > 0.04) {
        s.fired = true
        // feathers: the star of the show
        for (let i = 0; i < 22; i++) {
          const a = -PI / 2 + R(-1.4, 1.4)
          const sp = R(220, 520)
          coins.push({ x: 180 + R(-10, 10), y: 196, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: R(0, 6.28), vs: R(2.2, 3.6), size: R(26, 40), feather: 1, rot: R(-0.8, 0.8), vr: R(-2.5, 2.5) })
        }
        // coins: fewer and smaller, thrown higher
        for (let i = 0; i < 14; i++) {
          const a = -PI / 2 + R(-0.9, 0.9)
          const sp = R(520, 860)
          coins.push({ x: 180 + R(-6, 6), y: 196, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: R(0, 6.28), vs: R(8, 14), size: R(18, 28), feather: 0, rot: R(-0.4, 0.4), vr: R(-0.4, 0.4) })
        }
        // shockwave: a ring of small sparks flying out evenly
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * PI * 2 + R(-0.04, 0.04)
          const sp = R(520, 600)
          h.spawn(s.wave as Particle[], { x: 180 + Math.cos(a) * 18, y: 190 + Math.sin(a) * 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 3.2, size: R(10, 16), life: R(0.45, 0.6), rot: a, vr: 0, cells: [at.map.spark], add: 1, tint: GOLD_HI, fadeIn: 0.01, fadeOut: 0.4 })
        }
        for (let i = 0; i < 18; i++) {
          const a = R(0, 6.28)
          const sp = R(120, 340)
          h.spawn(s.sp as Particle[], { x: 180, y: 190, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.4, size: R(14, 26), life: R(0.6, 1.1), rot: R(0, 6), vr: R(-4, 4), cells: [at.map.spark], add: 1, tint: GOLD_HI, fadeIn: 0.02, fadeOut: 0.6 })
        }
      }
      flyCoins(coins, dt, 1250)
      // feathers leave a faint glitter while they fall
      for (const k of coins) {
        if (!k.feather || Math.random() > dt * 7) continue
        h.spawn(s.trail as Particle[], { x: k.x + R(-6, 6), y: k.y + R(-6, 6), vx: R(-10, 10), vy: R(10, 40), drag: 1, size: R(6, 10), life: R(0.4, 0.7), rot: R(0, 6), vr: R(-3, 3), cells: [at.map.spark], add: 1, tint: GOLD, fadeIn: 0.05, fadeOut: 0.5 })
      }
      h.step(s.sp as Particle[], dt)
      h.step(s.wave as Particle[], dt)
      h.step(s.trail as Particle[], dt)
    },
    render(s, c) {
      const m = c.at.map
      const t = s.cycle
      const out = Math.min(1, Math.max(0, (3.8 - t) / 0.9))
      const inn = Math.min(1, t / 0.25)
      h.sprite(c, 180, 190, 300, t * 0.22, 0.2 * out * inn, 1, m.rays!, 1, GOLD)
      h.sprite(c, 180, 190, 260, 0, (0.34 + 0.05 * Math.sin(t * 5)) * out, 1, m.glow!, 1, GOLD)
      if (t < 0.3) h.sprite(c, 180, 190, 150, 0, (1 - t / 0.3) * 0.9, 1, m.glow!, 1, [1, 1, 1])
      h.draw(c, s.wave as Particle[])
      h.draw(c, s.trail as Particle[])
      for (const k of s.coins as Coin[]) coinSprite(h, c, k, out)
      h.draw(c, s.sp as Particle[])
    },
  }))

  engine.define('kdReveal', (h) => ({
    atlas: 'kd',
    period: 1.6,
    // Cheap by design: ≤ 70 particles at the top level, all small spark sprites near native size.
    init: (s) => Object.assign(s, { fired: 0, wave: [] as Particle[], motes: [] as Particle[], tint: GOLD, level: 1 }),
    update(s, dt, at) {
      const { R, PI } = h
      const tint = s.tint as Rgb
      const hot: Rgb = [Math.min(1, tint[0]! * 0.4 + 0.6), Math.min(1, tint[1]! * 0.4 + 0.6), Math.min(1, tint[2]! * 0.4 + 0.6)]
      const lvl = Math.max(1, Math.min(3, Number(s.level) || 1))
      const ring = (n: number, sp: number, size: number, r0: number) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * PI * 2 + R(-0.06, 0.06)
          const v = sp * R(0.9, 1.1)
          // every third spark has a white-hot core: the ring reads as light, not as dots
          h.spawn(s.wave as Particle[], { x: 180 + Math.cos(a) * r0, y: 180 + Math.sin(a) * r0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3.6, size: R(size * 0.7, size), life: R(0.38, 0.52), rot: a, vr: 0, cells: [at.map.spark], add: 1, tint: i % 3 ? tint : hot, fadeIn: 0.01, fadeOut: 0.5 })
        }
      }
      if (!s.fired && s.cycle > 0.02) {
        s.fired = 1
        ring([0, 16, 24, 32][lvl]!, [0, 340, 430, 520][lvl]!, [0, 11, 13, 15][lvl]!, 12)
        for (let i = 0; i < [0, 4, 7, 10][lvl]!; i++) {
          const a = R(0, PI * 2)
          const sp = R(40, 120)
          h.spawn(s.motes as Particle[], { x: 180 + R(-24, 24), y: 180 + R(-24, 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, drag: 1.8, size: R(9, 15), life: R(0.7, 1.2), rot: R(0, 6), vr: R(-2, 2), cells: [at.map.spark], add: 1, tint: i % 2 ? tint : hot, fadeIn: 0.05, fadeOut: 0.5 })
        }
      }
      // covert: a second, wider ring a beat later and a few embers rising
      if (lvl >= 3 && s.fired === 1 && s.cycle > 0.2) {
        s.fired = 2
        ring(20, 640, 11, 26)
        for (let i = 0; i < 10; i++) {
          h.spawn(s.motes as Particle[], { x: 180 + R(-80, 80), y: R(205, 250), vx: R(-8, 8), vy: R(-150, -80), drag: 0.6, size: R(11, 17), life: R(0.8, 1.2), rot: R(0, 6), vr: R(-2, 2), cells: [at.map.ember], add: 1, tint, fadeIn: 0.1, fadeOut: 0.5 })
        }
      }
      h.step(s.wave as Particle[], dt)
      h.step(s.motes as Particle[], dt)
    },
    render(s, c) {
      const t = s.cycle
      const lvl = Math.max(1, Math.min(3, Number(s.level) || 1))
      // a short soft flash in the rarity colour with a white core, sized by the level
      if (t < 0.3) {
        const k = h.easeOut(t / 0.3)
        h.sprite(c, 180, 180, 120 + 70 * lvl * k, 0, (1 - k) * (0.45 + 0.1 * lvl), 1, c.at.map.glow!, 1, s.tint as Rgb)
        h.sprite(c, 180, 180, 70 + 10 * lvl, 0, (1 - k) * 0.55, 1, c.at.map.glow!, 1, [1, 1, 1])
      }
      h.draw(c, s.wave as Particle[])
      h.draw(c, s.motes as Particle[])
    },
  }))

  engine.define('kdCoins', (h) => ({
    atlas: 'kd',
    init: (s) => Object.assign(s, { fired: false, coins: [] as Coin[] }),
    update(s, dt) {
      const { R, PI } = h
      const coins = s.coins as Coin[]
      if (s.cycle >= 2.6) {
        s.cycle -= 2.6
        s.fired = false
      }
      if (!s.fired && s.cycle > 0.05) {
        s.fired = true
        coins.length = 0
        for (let i = 0; i < 9; i++) {
          const a = -PI / 2 + R(-0.7, 0.7)
          const sp = R(300, 470)
          coins.push({ x: 180 + R(-6, 6), y: 250, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: R(0, 6.28), vs: R(8, 14), size: R(34, 46), feather: i === 4 ? 1 : 0, rot: R(-0.4, 0.4), vr: R(-1, 1) })
        }
      }
      flyCoins(coins, dt, 1300)
    },
    render(s, c) {
      const fade = Math.min(1, Math.max(0, (2.4 - s.cycle) / 0.5))
      h.sprite(c, 180, 250, 300, 0, 0.22 + 0.06 * Math.sin(s.t * 3), 1, c.at.map.glow!, 0.8, GOLD)
      for (const k of s.coins as Coin[]) coinSprite(h, c, k, fade)
    },
  }))

  engine.define('kdAura', (h) => ({
    atlas: 'kd',
    init: (s) => Object.assign(s, { sp: [] as Particle[], tint: GOLD }),
    update(s, dt, at) {
      const { R } = h
      h.emit(s.acc, 1, 4, dt, () =>
        h.spawn(s.sp as Particle[], {
          x: 180 + R(-120, 120),
          y: R(190, 290),
          vx: R(-8, 8),
          vy: R(-70, -30),
          size: R(10, 18),
          sc: [[0, 0], [0.3, 1], [1, 0]],
          life: R(1.1, 1.9),
          rot: R(0, 6),
          vr: R(-1, 1),
          cells: [at.map.spark],
          add: 1,
          tint: Math.random() < 0.5 ? (s.tint as Rgb) : [1, 1, 1],
          fadeIn: 0.2,
          fadeOut: 0.4,
        }),
      )
      h.step(s.sp as Particle[], dt)
    },
    render(s, c) {
      const m = c.at.map
      const t = s.t
      const tint = s.tint as Rgb
      const appear = Math.min(1, t / 0.6)
      // only a soft breathing glow in the rarity colour — no ray wheels (they read as cheap)
      const soft = s.soft ? 0.5 : 1
      h.sprite(c, 180, 180, 330 * (1 + 0.04 * Math.sin(t * 1.6)), 0, (0.42 + 0.06 * Math.sin(t * 1.6)) * appear * soft, 1, m.glow!, 1, tint)
      h.draw(c, s.sp as Particle[])
    },
  }))

  engine.define('kdWin', (h) => ({
    atlas: 'kd',
    period: 2.2,
    init: (s) => Object.assign(s, { fired: false, sp: [] as Particle[] }),
    update(s, dt, at) {
      const { R, pick } = h
      if (!s.fired) {
        s.fired = true
        for (let i = 0; i < 40; i++) {
          const a = R(0, 6.28)
          const sp = R(220, 560)
          h.spawn(s.sp as Particle[], { x: 180, y: 180, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: R(16, 32), life: R(0.7, 1.2), rot: R(0, 6), vr: R(-5, 5), drag: 2.6, cells: [at.map.spark], add: 1, tint: pick([GREEN, GOLD_HI, [1, 1, 1]]), fadeIn: 0.02, fadeOut: 0.6 })
        }
      }
      h.step(s.sp as Particle[], dt)
    },
    render(s, c) {
      const m = c.at.map
      const t = s.cycle
      h.sprite(c, 180, 180, 360, 0, Math.max(0, 0.6 - t * 0.35), 1, m.glow!, 1, GREEN)
      for (const [delay, tint] of [[0, GREEN], [0.14, GOLD]] as Array<[number, Rgb]>) {
        const k = (t - delay) / 0.75
        if (k > 0 && k < 1) h.sprite(c, 180, 180, 130 + 450 * h.easeOut(k), 0, (1 - k) * 0.9, 1, m.ring!, 1, tint)
      }
      h.draw(c, s.sp as Particle[])
    },
  }))

  engine.define('kdLose', (h) => ({
    atlas: 'kd',
    period: 1.8,
    init: (s) => Object.assign(s, { fired: false, em: [] as Particle[] }),
    update(s, dt, at) {
      const { R } = h
      if (!s.fired && s.cycle > 0.35) {
        s.fired = true
        for (let i = 0; i < 22; i++) {
          const a = R(0, 6.28)
          const sp = R(50, 170)
          h.spawn(s.em as Particle[], { x: 180 + Math.cos(a) * 34, y: 180 + Math.sin(a) * 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, grav: 480, size: R(14, 26), life: R(0.7, 1.2), cells: [at.map.ember], add: 1, tint: RED, fadeIn: 0.02, fadeOut: 0.6 })
        }
      }
      h.step(s.em as Particle[], dt)
    },
    render(s, c) {
      const m = c.at.map
      const t = s.cycle
      if (t < 0.38) {
        const k = t / 0.38
        h.sprite(c, 180, 180, 470 - 390 * k * k, 0, 0.3 + 0.6 * k, 1, m.ring!, 1, RED)
      }
      const p = t - 0.35
      if (p > 0 && p < 0.7) h.sprite(c, 180, 180, 260 + 120 * p, 0, (1 - p / 0.7) * 0.6, 1, m.glow!, 1, [0.8, 0.12, 0.1])
      h.draw(c, s.em as Particle[])
    },
  }))

  engine.define('kdCharge', (h) => ({
    atlas: 'kd',
    init: (s) => Object.assign(s, { inS: [] as Particle[], rip: [] as Particle[] }),
    update(s, dt, at) {
      const { R } = h
      const pre = Math.min(1, s.t / 1.6)
      h.emit(s.acc, 1, 16 + 30 * pre, dt, () => {
        const a = R(0, 6.28)
        const d = R(130, 175)
        h.spawn(s.inS as Particle[], { x: 180 + Math.cos(a) * d, y: 180 + Math.sin(a) * d, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6, size: R(16, 28), life: 0.55, rot: R(0, 1), cells: [at.map.spark], add: 1, tint: AMBER, fadeIn: 0.3, fadeOut: 0.3 })
      })
      h.emit(s.acc, 2, 2, dt, () => h.spawn(s.rip as Particle[], { x: 180, y: 180, size: 330, grow: -0.7, life: 0.7, cells: [at.map.ring], add: 1, alpha: 0.4, tint: ORANGE, fadeIn: 0.2, fadeOut: 0.5 }))
      h.step(s.inS as Particle[], dt)
      h.step(s.rip as Particle[], dt)
    },
    render(s, c) {
      const pre = Math.min(1, s.t / 1.6)
      h.sprite(c, 180, 180, 240 * (1 + 0.08 * Math.sin(s.t * (5 + pre * 9))), 0, 0.2 + 0.35 * pre, 1, c.at.map.glow!, 1, ORANGE)
      h.draw(c, s.rip as Particle[])
      h.draw(c, s.inS as Particle[])
    },
  }))

  engine.define('kdBurn', (h) => ({
    atlas: 'kd',
    init: (s) => Object.assign(s, { em: [] as Particle[], lick: [] as Particle[] }),
    update(s, dt, at) {
      const { R } = h
      h.emit(s.acc, 1, 26, dt, () =>
        h.spawn(s.em as Particle[], { x: R(40, 320), y: R(288, 306), vx: R(-12, 12), vy: R(-180, -95), sway: R(8, 22), size: R(16, 28), life: R(0.6, 1.1), cells: [at.map.ember], add: 1, tint: Math.random() < 0.55 ? ORANGE : AMBER, fadeIn: 0.1, fadeOut: 0.7 }),
      )
      h.emit(s.acc, 2, 12, dt, () =>
        h.spawn(s.lick as Particle[], { x: R(60, 300), y: R(284, 298), vy: R(-80, -45), size: R(70, 110), stretch: 1.6, sc: [[0, 0.5], [0.3, 1], [1, 0.3]], life: R(0.35, 0.6), cells: [at.map.glow], add: 1, alpha: 0.55, tint: [1, 0.4, 0.1], fadeIn: 0.25, fadeOut: 0.6 }),
      )
      h.step(s.em as Particle[], dt)
      h.step(s.lick as Particle[], dt)
    },
    render(s, c) {
      h.sprite(c, 180, 298, 400, 0, 0.5 + 0.08 * Math.sin(s.t * 7), 1, c.at.map.glow!, 0.26, ORANGE)
      h.draw(c, s.lick as Particle[])
      h.draw(c, s.em as Particle[])
    },
  }))
}

/* ── Forge packs (rarity, matter): rarity beams under drops and the gold burst ── */
type Layer = { at: (name: string, el: HTMLElement | null | undefined, scale?: number, loop?: boolean, opts?: Record<string, unknown>) => Promise<{ stop(): void; kill(): void } | null> }

/**
 * Rarity → rank of the reveal (Forge's tier, split over our six rarities). Every step keeps the last one's layers
 * and adds its own: 0 flash, ring, sparks (industrial, mil-spec) · 1 + twinkling stars (restricted) · 2 + speed lines
 * and the four-point star popping out of the rarity shape (classified) · 3 + light rays shooting up, a wide flash,
 * a freeze frame (covert) · 4 + the big star crown, rising embers and three follow-up bursts (gold)
 */
export const RANK_LEVEL: Record<Rarity, number> = { industrial: 0, milspec: 0, restricted: 1, classified: 2, covert: 3, gold: 4 }
/** One burst on a landed drop, centred on its picture (where the rarity shape is), in the rarity's colour */
export function rarityRank(layer: Layer, el: HTMLElement | null | undefined, rarity: Rarity, scale = 1) {
  return layer.at('kdRank', el, scale, false, { color: RARITY_HEX[rarity], level: RANK_LEVEL[rarity] })
}

let coinUrl: Promise<string> | null = null
/** The KD coin as a 256 px image for Forge coin faces: the svg is 20 px and would draw blurry as it is */
function kdCoin(base: string) {
  coinUrl ??= fetch(`${base}img/brand/coin.svg`)
    .then((r) => r.text())
    .then((t) => URL.createObjectURL(new Blob([t.replace(/width="20" height="20"/, 'width="256" height="256"')], { type: 'image/svg+xml' })))
    .catch(() => '')
  return coinUrl
}
/** Gold drop and the Golden Chicken: gold is drawn in, flash and rays, KD coins with an edge tumble, fall and bounce,
 *  gold feathers burst out, glide and burn away. base — the app's baseURL (useRuntimeConfig().app.baseURL) */
export async function goldBurst(layer: Layer, el: HTMLElement | null | undefined, scale: number, base: string) {
  if (!el) return
  const img = await kdCoin(base.endsWith('/') ? base : `${base}/`)
  // big targets (the 3D chicken) would blow the burst up past the reel: cap it at ~440 px
  const r = el.getBoundingClientRect(), k = Math.min(scale, 440 / Math.max(r.width, r.height, 1))
  // coins fly out and away rather than piling up over the controls under the reel
  layer.at('goldboom', el, k, false, { floor: false, ...(img ? { img } : {}) })
  layer.at('feathers:gold', el, k * 0.9)
}
