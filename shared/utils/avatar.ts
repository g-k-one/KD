/**
 * A stand-in avatar for a player who has none of their own (mock lobby, feed, big wins): their initial on a two-tone
 * gradient picked from the nickname, so every player looks different and the same player always looks the same.
 * Returned as an SVG data URI, so it works anywhere an image URL does. The real site shows Steam avatars.
 */
const TONES: Array<[string, string]> = [
  ['#ff8a1f', '#c2410c'],
  ['#a855f7', '#6b21a8'],
  ['#14b8a6', '#0f766e'],
  ['#3b82f6', '#1e40af'],
  ['#ef4444', '#991b1b'],
  ['#22c55e', '#166534'],
  ['#ec4899', '#9d174d'],
  ['#eab308', '#a16207'],
]

export function avatarFor(nickname: string): string {
  let h = 0
  for (const ch of nickname) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [a, b] = TONES[h % TONES.length]!
  const letter = (nickname.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="43" text-anchor="middle" font-family="Rubik,Arial,sans-serif" font-size="30" font-weight="800" fill="#fff">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
