import { z } from 'zod'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export type ShortLinkStatus = 'active' | 'archived' | 'deleted'

export const AggregationInterval = ['all', '1y', '3m', '1m', '1w', '1d'] as const
export type AggregationInterval = typeof AggregationInterval[number]

export interface GeoRule {
  id: string
  priority: number
  scope: 'country' | 'continent'
  target: string
  url: string
}

export interface ExpirationRule {
  expireAt?: string
  maxClicks?: number
  redirectUrl?: string
}

export interface LinkAnalyticsEvent {
  id: string
  linkId: string
  projectId: string
  eventType: 'click' | 'scan'
  device: string
  os: string
  browser: string
  language: string
  referer: string | null
  country: string | null
  city: string | null
  continent: string | null
  latitude: number | null
  longitude: number | null
  isBot: boolean
  ipHash: string | null
  userAgent: string | null
  occurredAt: string
  metadata?: Record<string, unknown>
  utm?: Record<string, string | null> | null
}

export interface AnalyticsPoint {
  timestamp: string
  total: number
}

export interface AnalyticsBreakdownItem {
  value: string
  label: string
  total: number
  percentage: number
}

export interface AnalyticsGeoCountry extends AnalyticsBreakdownItem {
  code: string | null
}

export interface AnalyticsGeoCity extends AnalyticsBreakdownItem {
  country: string | null
  countryCode: string | null
  latitude: number | null
  longitude: number | null
}

export type AnalyticsFilters = Partial<{
  eventType: string[]
  device: string[]
  os: string[]
  browser: string[]
  language: string[]
  country: string[]
  city: string[]
  continent: string[]
  referer: string[]
  isBot: Array<'bot' | 'human'>
  utmSource: string[]
  utmMedium: string[]
  utmCampaign: string[]
  utmContent: string[]
  utmTerm: string[]
}>

export interface AnalyticsFilterOption {
  value: string
  label: string
  count: number
  percentage: number
}

export interface AnalyticsFilterGroup {
  id: keyof AnalyticsFilters
  label: string
  type: 'single' | 'multi'
  options: AnalyticsFilterOption[]
}

export interface AnalyticsTimeBucket {
  value: string
  label: string
  total: number
  percentage: number
}

export interface AnalyticsAggregation {
  interval: string
  totalEvents: number
  totalClicks: number
  totalScans: number
  timeSeries?: AnalyticsPoint[]
  byCountry?: Array<AnalyticsBreakdownItem & { code?: string | null }>
  byCity?: AnalyticsBreakdownItem[]
  byContinent?: AnalyticsBreakdownItem[]
  byDevice?: AnalyticsBreakdownItem[]
  byOs?: AnalyticsBreakdownItem[]
  byBrowser?: AnalyticsBreakdownItem[]
  byLanguage?: AnalyticsBreakdownItem[]
  byReferer?: AnalyticsBreakdownItem[]
  byEventType?: AnalyticsBreakdownItem[]
  byBotStatus?: AnalyticsBreakdownItem[]
  byWeekday?: AnalyticsTimeBucket[]
  byHour?: AnalyticsTimeBucket[]
  byUtmSource?: AnalyticsBreakdownItem[]
  byUtmMedium?: AnalyticsBreakdownItem[]
  byUtmCampaign?: AnalyticsBreakdownItem[]
  byUtmContent?: AnalyticsBreakdownItem[]
  byUtmTerm?: AnalyticsBreakdownItem[]
  geo?: {
    countries: AnalyticsGeoCountry[]
    cities: AnalyticsGeoCity[]
  }
  eventsFlow?: Array<{
    id: string
    linkId?: string
    eventType?: 'click' | 'scan'
    device?: string | null
    os?: string | null
    browser?: string | null
    referer?: string | null
    country?: string | null
    city?: string | null
    continent?: string | null
    language?: string | null
    latitude?: number | null
    longitude?: number | null
    isBot?: boolean
    utm?: Record<string, string | null> | null
    metadata?: Record<string, unknown> | null
    occurredAt: string
  }>
  pagination?: {
    page: number
    pageSize: number
  }
  availableFilters?: AnalyticsFilterGroup[]
  appliedFilters?: AnalyticsFilters
}

export interface PublicStatsTogglePayload {
  linkId: string
  projectId: string
  public: boolean
}

export type QRDesignPreset = 'dots' | 'squares' | 'sunset' | 'mono'

export const ApiLinkSchema = z.object({
  originalUrl: z.string().url(),
  slug: z.string().min(3),
  domain: z.string().min(1),
  projectId: z.string().uuid().nullish(),
  comment: z.string().max(2048).optional(),
  geoRules: z
    .array(
      z.object({
        priority: z.number().int().min(0),
        scope: z.enum(['country', 'continent']),
        target: z.string().min(1),
        url: z.string().url()
      })
    )
    .default([]),
  expiration: z
    .object({
      expireAt: z.string().datetime().optional(),
      maxClicks: z.number().int().positive().optional(),
      redirectUrl: z.string().url().optional()
    })
    .partial()
    .optional(),
  publicStats: z.boolean().default(false)
})

export type ApiLinkPayload = z.infer<typeof ApiLinkSchema>
