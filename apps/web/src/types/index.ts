import type {
  AnalyticsAggregation,
  AnalyticsBreakdownItem,
  AnalyticsFilterGroup,
  AnalyticsFilterOption,
  AnalyticsFilters,
  AnalyticsGeoCity,
  AnalyticsGeoCountry,
  AnalyticsPoint,
  AnalyticsTimeBucket,
  WorkspaceSummary,
  WorkspaceMemberSummary,
  WorkspaceRole
} from '@p42/shared'

export interface GeoRule {
  priority: number
  scope: 'country' | 'continent'
  target: string
  url: string
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}

export interface Link {
  id: string
  slug: string
  label?: string | null
  originalUrl: string
  status: 'active' | 'archived' | 'deleted'
  clickCount: number
  publicStats: boolean
  publicStatsToken?: string | null
  comment?: string | null
  maxClicks?: number | null
  expirationAt?: string | null
  fallbackUrl?: string | null
  geoRules?: GeoRule[]
  projectId?: string | null
  createdAt?: string
  domain?: {
    domain: string
  }
}

export type {
  AnalyticsAggregation,
  AnalyticsBreakdownItem,
  AnalyticsFilterGroup,
  AnalyticsFilterOption,
  AnalyticsFilters,
  AnalyticsGeoCity,
  AnalyticsGeoCountry,
  AnalyticsPoint,
  AnalyticsTimeBucket,
  WorkspaceSummary,
  WorkspaceMemberSummary,
  WorkspaceRole
}

export interface Project {
  id: string
  name: string
  slug: string
  description?: string | null
  isPublic: boolean
  publicStatsToken?: string | null
}

export interface QrDesign {
  modules: 'dots-classic' | 'dots-rounded' | 'dots-diamond' | 'dots-square'
  pilotCenter: 'dot' | 'rounded' | 'square'
  pilotBorder: 'square' | 'dot' | 'rounded'
  foreground: string
  background?: string
  logo: {
    type: 'p42' | 'app' | 'custom' | 'none'
    value?: string | null
  }
}

export interface QrCodeSummary {
  id: string
  name: string
  code: string
  totalScans: number
  linkId?: string | null
  design: QrDesign
}

export interface QrCodeDetail extends QrCodeSummary {
  link?: {
    id: string
    slug: string
    originalUrl: string
    domainId?: string | null
  } | null
}
