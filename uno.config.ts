import { defineConfig, presetWind4, transformerDirectives, type Rule } from 'unocss'

/*
 * UnoCSS with the Tailwind 4 preset: the same class names as before (lg:, max-lg:, size-*, mask-*, bg-x/60…).
 * Design tokens live as CSS variables in app/assets/css/main.css (mirrored from Figma); the theme below only points
 * at them, so a token changes in one place. The default palette is replaced: only project colours exist.
 * Output goes into the same cascade layers Tailwind used (theme, base, components, utilities), so main.css's
 * @layer base / components blocks keep their place under the utilities.
 */
const v = (name: string) => `var(--${name})`
const scale = (prefix: string, keys: Array<string | number>) => Object.fromEntries(keys.map((k) => [k, v(`${prefix}-${k}`)]))

const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  neutral: scale('color-neutral', [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]),
  weapon: v('color-weapon'),
  brand: { base: v('color-brand-base'), light: v('color-brand-light'), bright: v('color-brand-bright'), 24: v('color-brand-24') },
  coin: v('color-coin'),
  success: { DEFAULT: v('color-success'), 24: v('color-success-24'), 48: v('color-success-48') },
  warning: { DEFAULT: v('color-warning'), 24: v('color-warning-24'), 48: v('color-warning-48') },
  danger: { DEFAULT: v('color-danger'), 24: v('color-danger-24'), 48: v('color-danger-48') },
  item: scale('color-item', ['covert', 'classified', 'restricted', 'milspec', 'industrial', 'gold']),
  gold: { DEFAULT: v('color-gold'), light: v('color-gold-light'), dark: v('color-gold-dark') },
  white: { DEFAULT: '#fff', 4: v('color-white-4'), 8: v('color-white-8'), 12: v('color-white-12') },
  black: { 32: v('color-black-32'), 60: v('color-black-60') },
}

// Text styles from Figma (size/weight[ caps]); Figma letter-spacing is in %, so 3 → 0.03em
const type = (size: number, line: number, weight: number, caps?: number) => ({
  'font-size': `${size}px`,
  'line-height': `${line}px`,
  'font-weight': weight,
  ...(caps != null && { 'letter-spacing': `${caps}em`, 'text-transform': 'uppercase' }),
})

const rules: Rule[] = [
  // the smallest step: 11px (10px was hard to read on phones), still on a 12px line so tight rows keep their height
  ['type-10-caps', type(11, 12, 600, 0.06)],
  ['type-12', type(12, 16, 600)],
  ['type-12-regular', type(12, 16, 400)],
  ['type-12-caps', type(12, 16, 600, 0.04)],
  ['type-14', type(14, 20, 600)],
  ['type-14-regular', type(14, 20, 400)],
  ['type-14-caps', type(14, 20, 600, 0.03)],
  ['type-16-medium', type(16, 24, 500)],
  ['type-16-caps', type(16, 24, 700, 0.02)],
  ['type-20-caps', type(20, 24, 800, 0.01)],
  ['type-28', type(28, 36, 700)],
  ['type-48-caps', type(48, 52, 800, -0.01)],
  // The amount inside a button (price, shortfall, chance): one pill tinted by the button's own text colour, so
  // Open, Sell all, Upgrade and the sticky bar all read "label · [value]" the same way on any button colour
  [
    'btn-value',
    {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '2px',
      height: '28px',
      'margin-left': '4px',
      padding: '0 8px',
      'border-radius': '8px',
      background: 'color-mix(in srgb, currentColor 14%, transparent)',
      'line-height': 1,
    },
  ],
  ['bg-brand-gradient', { 'background-image': 'linear-gradient(90deg, var(--color-brand-base), var(--color-brand-bright))' }],
  [/^scrollbar-none$/, (_, { symbols }) => [{ 'scrollbar-width': 'none' }, { [symbols.selector]: (s: string) => `${s}::-webkit-scrollbar`, display: 'none' }], { noMerge: true }],
]

export default defineConfig({
  // our rules come first, before the preset's: UnoCSS orders utilities by rule, so these multi-property ones sit
  // before the single-property utilities (as Tailwind sorts them) — `type-10-caps leading-tight` takes the tight
  // line, `text-xl lg:type-28` the 28px on desktop
  // An empty `components` layer keeps UnoCSS's own @layer order statement the same as main.css's, whichever
  // stylesheet comes first: components (main.css's .kd-btn & co.) under the utilities
  layers: { components: -50 },
  presets: [{ name: 'kd', rules, preflights: [{ layer: 'components', getCSS: () => '.kd-layer-components{}' }] }, presetWind4({ preflights: { reset: true, theme: 'on-demand' } })],
  transformers: [transformerDirectives()],
  // `hidden` after every other display utility (as in Tailwind): a component's own `flex` must give way to a
  // `hidden lg:flex` passed from outside (the desktop header on phones)
  // (never merged with another display:none rule, which would pull it back up)
  rules: [['hidden', { display: 'none' }, { noMerge: true }]],
  outputToCssLayers: {
    cssLayerName: (layer) => (({ preflights: 'base', default: 'utilities', shortcuts: 'utilities', imports: 'base' }) as Record<string, string>)[layer] ?? layer,
  },
  extendTheme: (theme) => ({
    ...theme,
    colors,
    font: { ...theme.font, sans: v('font-sans'), mono: theme.font?.mono },
    radius: { DEFAULT: '0.25rem', ...scale('radius', ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']), full: 'calc(infinity * 1px)', none: '0' },
    shadow: { ...theme.shadow, 'elevation-2': v('shadow-elevation-2'), 'inner-primary': v('shadow-inner-primary') },
    container: { ...theme.container, content: v('container-content') },
  }),
})
