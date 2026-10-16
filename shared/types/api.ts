/**
 * API contract between the Nuxt prototype and the Go backend.
 * Mock implementation lives in server/api. Keep this file in sync with the OpenAPI spec.
 *
 * Money: every amount is an integer number of coin cents (1 coin = 100). Never floats.
 */

export type Rarity = 'covert' | 'classified' | 'restricted' | 'milspec' | 'industrial' | 'gold'

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export type CaseTag = 'new' | 'hot'

export interface CaseSummary {
  id: string
  slug: string
  name: string
  image: string
  price: number
  risk: RiskLevel
  tag?: CaseTag
  /** Return to player, basis points (9240 = 92.40%). Configured in the admin panel. */
  rtp: number
  createdAt: string
}

export interface CaseSection {
  id: string
  title: string
  cases: CaseSummary[]
}

export interface CasesResponse {
  sections: CaseSection[]
}

export interface User {
  id: string
  nickname: string
  avatar: string
  steamId: string
  level: number
  /** 0..100 progress to the next level */
  levelProgress: number
  balance: number
  skinsValue: number
}

export interface MeResponse {
  user: User | null
}

export interface FeedDrop {
  id: string
  itemName: string
  skinName: string
  rarity: Rarity
  image: string
  price: number
  caseSlug: string
  userNickname: string
  createdAt: string
}

export interface FeedResponse {
  drops: FeedDrop[]
  /** Highest-value recent drop, shown pinned at the start of the feed */
  highlight: FeedDrop | null
}
