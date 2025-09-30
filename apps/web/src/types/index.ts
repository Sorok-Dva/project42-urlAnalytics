export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
}

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

export interface AnalyticsPoint {
  timestamp: string
  total: number
}

export interface AnalyticsAggregation {
  interval: string
  totalEvents: number
  timeSeries?: AnalyticsPoint[]
  byCountry?: Array<{ label: string; total: number }>
  byCity?: Array<{ label: string; total: number }>
  byContinent?: Array<{ label: string; total: number }>
  byDevice?: Array<{ label: string; total: number }>
  byOs?: Array<{ label: string; total: number }>
  byBrowser?: Array<{ label: string; total: number }>
  byLanguage?: Array<{ label: string; total: number }>
  byReferer?: Array<{ label: string; total: number }>
  eventsFlow?: Array<{
    id: string
    linkId?: string
    eventType?: 'click' | 'scan'
    device?: string | null
    referer?: string | null
    country?: string | null
    city?: string | null
    language?: string | null
    utm?: Record<string, string | null> | null
    metadata?: Record<string, unknown> | null
    occurredAt: string
  }>
  pagination?: {
    page: number
    pageSize: number
  }
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
