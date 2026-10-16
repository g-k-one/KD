import type { CasesResponse } from '#shared/types/api'

export default defineEventHandler((): CasesResponse => {
  return { sections: getCaseSections() }
})
