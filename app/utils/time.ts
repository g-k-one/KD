/** "5m", "3h", "2d" — compact age for feeds and big wins */
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const monthName = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })

/** A history line: its age for a week ("5m", "3d"), then the date ("12 Oct"), with the year once it is another year ("Oct 2025") */
export function historyTime(iso: string, now = Date.now()) {
  const at = new Date(iso)
  if (now - at.getTime() < 7 * 86_400_000) return timeAgo(iso, now)
  return at.getFullYear() === new Date(now).getFullYear() ? `${at.getDate()} ${monthName(at)}` : `${monthName(at)} ${at.getFullYear()}`
}

/** The full moment, for a hover: "12 Oct 2026, 18:40" */
export function fullTime(iso: string) {
  const at = new Date(iso)
  return `${at.getDate()} ${monthName(at)} ${at.getFullYear()}, ${at.toLocaleTimeString('en-GB', { timeStyle: 'short' })}`
}

/** "23:59:59" countdown to an ISO time */
export function countdown(iso: string | null, now = Date.now()) {
  if (!iso) return ''
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

/** A time-limited case: "11D 12:45:00", the seconds always running; "12:45:00" on the last day */
export function countdownDays(iso: string, now = Date.now()) {
  const days = Math.floor(Math.max(0, Date.parse(iso) - now) / 86_400_000)
  const rest = countdown(new Date(Date.parse(iso) - days * 86_400_000).toISOString(), now)
  return days ? `${days}D ${rest}` : rest
}

/** Long countdowns (the weekly race): "3d 04:12" from a day out, "04:12:05" on the last day */
export function countdownLong(iso: string | null, now = Date.now()) {
  if (!iso) return ''
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000))
  const days = Math.floor(s / 86_400)
  if (!days) return countdown(iso, now)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${days}d ${p(Math.floor((s % 86_400) / 3600))}:${p(Math.floor((s % 3600) / 60))}`
}
