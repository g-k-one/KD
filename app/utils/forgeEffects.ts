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
 *   kdAura    — loop behind the upgrade target while the dial turns: a glow that pulses and sparks drifting up
 *               over the whole card.
 *               Colour per rarity: handle.set('tint', [r, g, b])
 *   kdWin     — won upgrade: one beat — a burst of green and gold sparks and a single thin ring that stays
 *               close to the dial (no glow wash, no second wave)
 *   kdBurn    — loop around a label: a flat warm glow hugging it, licks and embers rising along its width
 *               (the label's middle sits at y ≈ 300)
 *   kdBlaze   — kdBurn turned up for a small plate that must read as on fire (a limited case's stock): tall licks
 *               that clear the plate's top edge, a denser shower of embers, a hotter glow; same base line
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
  /** matter pack: a crisp four-point glint drawn by the shader (no sprite, so no pixels at any size) */
  glint?: (L: Particle[], x: number, y: number, scale?: number, tint?: Rgb) => void
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
  /** the effect's own clock: 0.6 runs everything at 60% speed */
  rate?: number
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
      // the tier's sparks are thrown with a downward bias and fall hard (grav 260), so its mass sat under the shape:
      // halve the fall and drop the bias, once per spark
      update(s, dt, at) {
        tier.update(s, dt, at)
        for (const p of (s.p as Particle[] | undefined) ?? []) {
          if (p.kd) continue
          p.kd = 1
          if ((p.grav as number) > 0) {
            p.grav = (p.grav as number) * 0.45
            p.vy = (p.vy as number) + 40
          }
        }
      },
      init(s) {
        tier.init(s)
        const o = (s as State & { o: { color?: string; level?: number } }).o
        if (o.color) {
          // clean rarity colour: a light core, the colour itself pushed a little more saturated, and tails that fade
          // out in the colour — dimming the whole palette or a 25% tail read as a muddy brown over the reel
          const c = hexToRgb(o.color)
          const l = 0.3 * c[0]! + 0.59 * c[1]! + 0.11 * c[2]!
          const vivid = c.map((v) => Math.min(1, Math.max(0, l + (v - l) * 1.3)))
          s.pal = [vivid.map((v) => v * 0.55 + 0.45), vivid, vivid.map((v) => v * 0.6)]
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
      h.emit(s.acc, 1, 12, dt, () =>
        h.spawn(s.sp as Particle[], {
          x: 180 + R(-140, 140),
          y: R(140, 300),
          vx: R(-12, 12),
          vy: R(-90, -35),
          size: R(8, 18),
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
      // a clear heartbeat: the glow swells by a tenth and brightens with it
      const beat = Math.sin(t * 2.6)
      h.sprite(c, 180, 180, 330 * (1 + 0.1 * beat), 0, (0.42 + 0.14 * beat) * appear * soft, 1, m.glow!, 1, tint)
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
        for (let i = 0; i < 24; i++) {
          const a = R(0, 6.28)
          const sp = R(200, 420)
          h.spawn(s.sp as Particle[], { x: 180 + Math.cos(a) * 70, y: 180 + Math.sin(a) * 70, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: R(12, 24), life: R(0.5, 0.9), rot: R(0, 6), vr: R(-5, 5), drag: 3, cells: [at.map.spark], add: 1, tint: pick([GREEN, GOLD_HI, [1, 1, 1]]), fadeIn: 0.02, fadeOut: 0.6 })
        }
      }
      h.step(s.sp as Particle[], dt)
    },
    render(s, c) {
      const m = c.at.map
      const t = s.cycle
      const k = t / 0.55
      if (k < 1) h.sprite(c, 180, 180, 220 + 120 * h.easeOut(k), 0, (1 - k) * 0.55, 1, m.ring!, 1, GREEN)
      h.draw(c, s.sp as Particle[])
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

  // A calm flame behind a big win's skin (home, top 3), in the rarity's colour (opts.color): slower than the stock
  // plate's blaze, smaller licks in the plain colour (no whitening: hot licks read as white balls), a faint glow
  engine.define('kdFlame', (h) => ({
    atlas: 'kd',
    rate: 0.4,
    init(s) {
      const o = (s as State & { o: { color?: string } }).o
      const c = o.color ? hexToRgb(o.color) : ORANGE
      Object.assign(s, { em: [] as Particle[], lick: [] as Particle[], c, deep: c.map((v) => v * 0.7) })
    },
    update(s, dt, at) {
      const { R } = h
      const c = s.c as Rgb
      const deep = s.deep as Rgb
      h.emit(s.acc, 1, 26, dt, () =>
        h.spawn(s.em as Particle[], { x: R(70, 290), y: R(250, 285), vx: R(-12, 12), vy: R(-190, -100), sway: R(8, 18), size: R(12, 22), life: R(0.7, 1.2), cells: [at.map.ember], add: 1, tint: c, fadeIn: 0.1, fadeOut: 0.7 }),
      )
      h.emit(s.acc, 2, 16, dt, () =>
        h.spawn(s.lick as Particle[], { x: R(90, 270), y: R(250, 276), vy: R(-130, -80), size: R(80, 130), stretch: 1.8, sc: [[0, 0.4], [0.3, 1], [1, 0.2]], life: R(0.5, 0.8), cells: [at.map.glow], add: 1, alpha: 0.6, tint: Math.random() < 0.5 ? c : deep, fadeIn: 0.25, fadeOut: 0.6 }),
      )
      h.step(s.em as Particle[], dt)
      h.step(s.lick as Particle[], dt)
    },
    render(s, c) {
      h.sprite(c, 180, 270, 320, 0, 0.42 + 0.06 * Math.sin(s.t * 5), 1, c.at.map.glow!, 0.35, s.deep as Rgb)
      h.draw(c, s.lick as Particle[])
      h.draw(c, s.em as Particle[])
    },
  }))

  engine.define('kdBlaze', (h) => ({
    atlas: 'kd',
    // a slower burn: the licks and embers rise at 70% speed
    rate: 0.7,
    // opts.color: burn in that colour (a rarity's) — the licks in it and a hotter version of it, embers likewise
    init(s) {
      const o = (s as State & { o: { color?: string } }).o
      const c = o.color ? hexToRgb(o.color) : null
      const hot = c ? c.map((v) => v * 0.45 + 0.55) : null
      Object.assign(s, {
        em: [] as Particle[],
        lick: [] as Particle[],
        cEm: c ? [c, hot] : [ORANGE, AMBER],
        cLick: c ? [c.map((v) => v * 0.9), hot!.map((v) => v * 0.95)] : [[1, 0.42, 0.08], [1, 0.62, 0.18]],
        cGlow: c ?? ORANGE,
      })
    },
    update(s, dt, at) {
      const { R } = h
      const em = s.cEm as Rgb[]
      const lick = s.cLick as Rgb[]
      h.emit(s.acc, 1, 44, dt, () =>
        h.spawn(s.em as Particle[], { x: R(50, 310), y: R(270, 300), vx: R(-16, 16), vy: R(-240, -130), sway: R(10, 26), size: R(18, 32), life: R(0.6, 1.1), cells: [at.map.ember], add: 1, tint: Math.random() < 0.5 ? em[0] : em[1], fadeIn: 0.08, fadeOut: 0.7 }),
      )
      // the licks start on the plate's top edge and climb well over it, so the fire shows above the plate, not behind it
      h.emit(s.acc, 2, 22, dt, () =>
        h.spawn(s.lick as Particle[], { x: R(80, 280), y: R(262, 282), vy: R(-150, -90), size: R(90, 150), stretch: 1.9, sc: [[0, 0.45], [0.3, 1], [1, 0.25]], life: R(0.4, 0.7), cells: [at.map.glow], add: 1, alpha: 0.75, tint: Math.random() < 0.5 ? lick[0] : lick[1], fadeIn: 0.2, fadeOut: 0.6 }),
      )
      h.step(s.em as Particle[], dt)
      h.step(s.lick as Particle[], dt)
    },
    render(s, c) {
      h.sprite(c, 180, 292, 440, 0, 0.62 + 0.1 * Math.sin(s.t * 8), 1, c.at.map.glow!, 0.3, s.cGlow as Rgb)
      h.draw(c, s.lick as Particle[])
      h.draw(c, s.em as Particle[])
    },
  }))
}

/* ── Forge packs (rarity, matter): rarity beams under drops and the gold burst ── */
type Layer = { at: (name: string, el: HTMLElement | null | undefined, scale?: number, loop?: boolean, opts?: ForgeAtOptions) => Promise<{ stop(): void; kill(): void } | null> }

/**
 * Rarity → rank of Forge's accent on the reveal. The reveal itself is the rarity shape (ItemArt: the pop, then waves
 * of the shape, a flash, a bloom); Forge adds only sparks and stars on covert (rank 1) and the full rank on gold
 * (rank 3: rays up, a wide flash, a freeze frame). Below covert, Forge stays out: its round rings fought the shape.
 */
// gold at rank 2, not 3: rank 3's wide nebula is a square too big for the reel, and its sides cut off flat; the depth
// gold lost there comes from ItemArt's galaxy and the shape's 3D turn
export const RANK_LEVEL: Record<Rarity, number> = { industrial: -1, milspec: -1, restricted: -1, classified: -1, covert: 1, gold: 2 }
/**
 * One burst on a landed drop in the rarity's colour, centred on the drop's picture (el, the skin image) and sized by
 * it — the same rule everywhere (reel, PvP, upgrade): the middle of the skin, not the rarity shape or a lift off it.
 * It rides with the skin (follow): measured once, a skipped reel still settling or the frame's punch left it off-centre.
 */
export function rarityRank(layer: Layer, el: HTMLElement | null | undefined, rarity: Rarity, scale = 1) {
  if (RANK_LEVEL[rarity] < 0) return Promise.resolve(null)
  return layer.at('kdRank', el, scale, false, { color: RARITY_HEX[rarity], level: RANK_LEVEL[rarity], follow: true })
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
