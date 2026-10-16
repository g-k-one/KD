/**
 * Formats coin cents the way the designs do: space as thousands separator,
 * no decimals for whole amounts, two decimals otherwise. 312540 → "3 125.40", 500000 → "5 000".
 */
export function formatCoins(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  const wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const out = frac === 0 ? wholeStr : `${wholeStr}.${String(frac).padStart(2, '0')}`
  return negative ? `−${out}` : out
}
