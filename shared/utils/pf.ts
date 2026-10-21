/**
 * Provably fair maths, shared by the mock backend and the verifier on /fairness.
 * The Go backend must produce identical results — see PF_TEST_VECTORS below.
 *
 *   hash   = HMAC_SHA256(server_seed, client_seed + ":" + nonce)
 *   number = parseInt(hash.slice(0, 8), 16)          // 0 … 4 294 967 295
 *   ticket = number % 1 000 000 + 1                  // 1 … 1 000 000   (cases)
 *   roll   = (number % 10 000) / 100                 // 0.00 … 99.99    (upgrade)
 */
export const PF_TICKETS = 1_000_000

const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const k = await globalThis.crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await globalThis.crypto.subtle.sign('HMAC', k, enc.encode(message)))
}

export async function sha256Hex(message: string): Promise<string> {
  return toHex(await globalThis.crypto.subtle.digest('SHA-256', enc.encode(message)))
}

export async function pfNumber(serverSeed: string, clientSeed: string, nonce: number): Promise<{ hash: string; number: number }> {
  const hash = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`)
  return { hash, number: Number.parseInt(hash.slice(0, 8), 16) }
}

export async function pfTicket(serverSeed: string, clientSeed: string, nonce: number) {
  const { hash, number } = await pfNumber(serverSeed, clientSeed, nonce)
  return { hash, number, ticket: (number % PF_TICKETS) + 1 }
}

export async function pfRoll(serverSeed: string, clientSeed: string, nonce: number) {
  const { hash, number } = await pfNumber(serverSeed, clientSeed, nonce)
  return { hash, number, roll: (number % 10_000) / 100 }
}

/** Picks the item whose ticket range contains the ticket. */
export function pickByTicket<T extends { ticketFrom: number; ticketTo: number }>(items: T[], ticket: number): T {
  return items.find((i) => ticket >= i.ticketFrom && ticket <= i.ticketTo) ?? items[items.length - 1]!
}

export function randomSeed(bytes = 32) {
  const a = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(a)
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}
