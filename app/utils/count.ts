/** Counts (not coins) the way the designs write them: 4 137 765 */
export function formatCount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Tight spots on phones: 4.14M, 312k; below 10 000 the full count */
export function shortCount(n: number): string {
  if (n < 10_000) return formatCount(n)
  const [v, unit] = n >= 1e6 ? [n / 1e6, 'M'] : [n / 1e3, 'k']
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2).replace(/\.?0+$/, '')}${unit}`
}
