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
  ipHash: string | null
  userAgent: string | null
  occurredAt: string
  metadata?: Record<string, unknown>
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
  projectId: z.string().uuid().nullable(),
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
