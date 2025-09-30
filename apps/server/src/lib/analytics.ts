import { Op } from 'sequelize'
import { subDays, subMonths, subYears, isAfter, formatISO } from 'date-fns'
import { LinkEvent } from '../models/linkEvent'
import { AggregationInterval, type AnalyticsFilters } from '@p42/shared'

const intervalToStart = (interval: string) => {
  const now = new Date()
  switch (interval) {
    case '1d':
      return subDays(now, 1)
    case '1w':
      return subDays(now, 7)
    case '1m':
      return subMonths(now, 1)
    case '3m':
      return subMonths(now, 3)
    case '1y':
      return subYears(now, 1)
    default:
      return subYears(now, 10)
  }
}

const UNKNOWN_VALUE = 'unknown'

const normalizeValue = (value: unknown) => {
  if (value == null) return UNKNOWN_VALUE
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : UNKNOWN_VALUE
  }
  return String(value)
}

const normalizeLabel = (value: string) => (value === UNKNOWN_VALUE ? 'Unknown' : value)

const matchesStringFilter = (value: string | null, filterValues?: string[]) => {
  if (!filterValues || filterValues.length === 0) return true
  const normalized = normalizeValue(value).toLowerCase()
  return filterValues.some(option => {
    if (option === UNKNOWN_VALUE) return normalized === UNKNOWN_VALUE
    return normalizeValue(option).toLowerCase() === normalized
  })
}

const matchesBotFilter = (isBot: boolean, options?: Array<'bot' | 'human'>) => {
  if (!options || options.length === 0) return true
  const label = isBot ? 'bot' : 'human'
  return options.includes(label)
}

const matchesUtmFilter = (
  utm: Record<string, string | null> | null | undefined,
  key: 'source' | 'medium' | 'campaign' | 'content' | 'term',
  filterValues?: string[]
) => {
  if (!filterValues || filterValues.length === 0) return true
  const value = utm?.[key] ?? null
  return matchesStringFilter(value, filterValues)
}

const applyEventFilters = (events: LinkEvent[], filters?: AnalyticsFilters) => {
  if (!filters) return events
  return events.filter(event => {
    if (!matchesStringFilter(event.eventType, filters.eventType)) return false
    if (!matchesStringFilter(event.device, filters.device)) return false
    if (!matchesStringFilter(event.os, filters.os)) return false
    if (!matchesStringFilter(event.browser, filters.browser)) return false
    if (!matchesStringFilter(event.language, filters.language)) return false
    if (!matchesStringFilter(event.country, filters.country)) return false
    if (!matchesStringFilter(event.city, filters.city)) return false
    if (!matchesStringFilter(event.continent, filters.continent)) return false
    if (!matchesStringFilter(event.referer, filters.referer)) return false
    if (!matchesBotFilter(event.isBot, filters.isBot)) return false
    if (!matchesUtmFilter(event.utm ?? null, 'source', filters.utmSource)) return false
    if (!matchesUtmFilter(event.utm ?? null, 'medium', filters.utmMedium)) return false
    if (!matchesUtmFilter(event.utm ?? null, 'campaign', filters.utmCampaign)) return false
    if (!matchesUtmFilter(event.utm ?? null, 'content', filters.utmContent)) return false
    if (!matchesUtmFilter(event.utm ?? null, 'term', filters.utmTerm)) return false
    return true
  })
}

export const fetchEventsForInterval = async (filters: {
  workspaceId: string
  projectId?: string
  linkId?: string
  interval: typeof AggregationInterval[number]
  page?: number
  pageSize?: number
  filters?: AnalyticsFilters
}) => {
  const start = intervalToStart(filters.interval)
  const where: Record<string, unknown> = {
    workspaceId: filters.workspaceId,
    occurredAt: { [Op.gte]: start }
  }
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.linkId) where.linkId = filters.linkId

  const events = await LinkEvent.findAll({ where, order: [['occurredAt', 'ASC']] })
  return applyEventFilters(events, filters.filters)
}

const increment = (
  bucket: Map<string, number>,
  key: string,
  amount: number
) => {
  const current = bucket.get(key) ?? 0
  bucket.set(key, current + amount)
}

const floorDateKey = (date: Date, interval: string) => {
  switch (interval) {
    case '1d':
      return formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()))
    case '1w':
    case '1m':
    case '3m':
    case '1y':
    default:
      return formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
  }
}

export const buildTimeSeries = (events: LinkEvent[], interval: string) => {
  const buckets = new Map<string, number>()
  events.forEach(event => {
    const key = floorDateKey(event.occurredAt, interval)
    increment(buckets, key, 1)
  })
  return Array.from(buckets.entries())
    .sort((a, b) => (isAfter(new Date(a[0]), new Date(b[0])) ? 1 : -1))
    .map(([timestamp, total]) => ({ timestamp, total }))
}

export const summarizeByDimension = (
  events: LinkEvent[],
  dimension: keyof LinkEvent,
  options?: {
    labelFormatter?: (value: string) => string
    valueFormatter?: (value: unknown) => string
  }
) => {
  const bucket = new Map<string, { value: string; label: string; total: number }>()
  const valueFormatter = options?.valueFormatter ?? normalizeValue
  const labelFormatter = options?.labelFormatter ?? normalizeLabel

  events.forEach(event => {
    const rawValue = event[dimension]
    const value = valueFormatter(rawValue)
    const label = labelFormatter(value)
    const existing = bucket.get(value)
    if (existing) {
      existing.total += 1
    } else {
      bucket.set(value, { value, label, total: 1 })
    }
  })

  return Array.from(bucket.values()).sort((a, b) => b.total - a.total)
}

export const buildEventsFlow = (events: LinkEvent[]) => {
  return events.map(event => ({
    id: event.id,
    linkId: event.linkId,
    eventType: event.eventType,
    device: event.device,
    os: event.os,
    browser: event.browser,
    referer: event.referer,
    country: event.country,
    city: event.city,
    continent: event.continent,
    language: event.language,
    latitude: event.latitude,
    longitude: event.longitude,
    isBot: event.isBot,
    occurredAt: event.occurredAt,
    utm: event.utm,
    metadata: event.metadata
  }))
}
