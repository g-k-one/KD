// Debug-only endpoint used by /debug. Not part of the backend contract.
export default defineEventHandler(async (event) => {
  const body = await readBody<DebugStateBody>(event)
  return applyDebugState(body ?? {})
})
