import type { CaseSummary, RiskLevel } from '#shared/types/api'

export type PriceRange = 'any' | '0-1' | '1-5' | '5-10' | '10-30' | '30+'
export type CaseSort = 'default' | 'priceAsc' | 'priceDesc' | 'newest'

// Coin cents
const RANGES: Record<Exclude<PriceRange, 'any'>, [number, number]> = {
  '0-1': [0, 100],
  '1-5': [100, 500],
  '5-10': [500, 1000],
  '10-30': [1000, 3000],
  '30+': [3000, Number.POSITIVE_INFINITY],
}

export const PRICE_RANGES = ['any', ...Object.keys(RANGES)] as PriceRange[]
export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'extreme']

export function useCaseFilters() {
  const price = ref<PriceRange>('any')
  const risks = ref<RiskLevel[]>([])
  const affordable = ref(false)
  const sort = ref<CaseSort>('default')
  const query = ref('')
  const session = useSessionStore()

  const isActive = computed(() => !!query.value.trim() || price.value !== 'any' || risks.value.length > 0 || affordable.value || sort.value !== 'default')

  function apply(list: CaseSummary[]) {
    const q = query.value.trim().toLowerCase()
    let out = list.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (price.value !== 'any') {
        const [min, max] = RANGES[price.value]
        if (c.price < min || c.price >= max) return false
      }
      if (risks.value.length && !risks.value.includes(c.risk)) return false
      if (affordable.value && session.user && c.price > session.user.balance) return false
      return true
    })
    if (sort.value === 'priceAsc') out = [...out].sort((a, b) => a.price - b.price)
    if (sort.value === 'priceDesc') out = [...out].sort((a, b) => b.price - a.price)
    if (sort.value === 'newest') out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return out
  }

  function reset() {
    price.value = 'any'
    risks.value = []
    affordable.value = false
    sort.value = 'default'
    query.value = ''
  }

  return { price, risks, affordable, sort, query, isActive, apply, reset }
}
