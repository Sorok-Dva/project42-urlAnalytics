import { Op } from 'sequelize'
import { subDays, subMonths, subYears } from 'date-fns'
import { LinkEvent } from '../models/linkEvent'
import { Link } from '../models/link'
import { AggregationInterval, type AnalyticsFilters } from '@p42/shared'
import { getInteractionType } from './interactionType'

type IntervalConfig = {
  durationMs?: number
  bucketMs: number
  granularity: 'second' | 'minute' | 'hour' | 'day' | 'month'
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const ANALYTICS_INTERVAL_CONFIG: Record<AggregationInterval, IntervalConfig> = {
  all: { bucketMs: 30 * DAY, granularity: 'month' },
  '1y': { durationMs: 365 * DAY, bucketMs: 7 * DAY, granularity: 'day' },
  '3m': { durationMs: 90 * DAY, bucketMs: 3 * DAY, granularity: 'day' },
  '1m': { durationMs: 30 * DAY, bucketMs: DAY, granularity: 'day' },
  '1w': { durationMs: 7 * DAY, bucketMs: 12 * HOUR, granularity: 'hour' },
  '1d': { durationMs: DAY, bucketMs: HOUR, granularity: 'hour' },
  '12h': { durationMs: 12 * HOUR, bucketMs: HOUR, granularity: 'hour' },
  '6h': { durationMs: 6 * HOUR, bucketMs: 30 * MINUTE, granularity: 'minute' },
  '1h': { durationMs: HOUR, bucketMs: MINUTE, granularity: 'minute' },
  '30min': { durationMs: 30 * MINUTE, bucketMs: 30 * 1000, granularity: 'second' },
  '15min': { durationMs: 15 * MINUTE, bucketMs: 15 * 1000, granularity: 'second' },
  '5min': { durationMs: 5 * MINUTE, bucketMs: 5 * 1000, granularity: 'second' },
  '1min': { durationMs: MINUTE, bucketMs: 1_000, granularity: 'second' }
}

const getIntervalConfig = (interval: AggregationInterval): IntervalConfig => {
  return ANALYTICS_INTERVAL_CONFIG[interval] ?? ANALYTICS_INTERVAL_CONFIG['1m']
}

const intervalToStart = (interval: AggregationInterval) => {
  const config = getIntervalConfig(interval)
  if (config.durationMs) {
    return new Date(Date.now() - config.durationMs)
  }
  return subYears(new Date(), 10)
}

const alignToBucket = (timestamp: number, bucketMs: number) => Math.floor(timestamp / bucketMs) * bucketMs

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
    if (!matchesStringFilter(getInteractionType(event), filters.eventType)) return false
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
  workspaceId?: string
  workspaceIds?: string[]
  userId?: string
  projectId?: string
  linkId?: string
  interval: AggregationInterval
  page?: number
  pageSize?: number
  filters?: AnalyticsFilters
}) => {
  const start = intervalToStart(filters.interval)
  const where: Record<string, unknown> = {
    occurredAt: { [Op.gte]: start }
  }
  if (filters.workspaceId) {
    where.workspaceId = filters.workspaceId
  } else if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    where.workspaceId = { [Op.in]: filters.workspaceIds }
  }
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.linkId) where.linkId = filters.linkId

  const include = [] as Parameters<typeof LinkEvent.findAll>[0]['include']
  if (filters.userId) {
    include?.push({
      model: Link,
      as: 'link',
      attributes: [],
      where: { createdById: filters.userId }
    })
  }

  const events = await LinkEvent.findAll({
    where,
    order: [['occurredAt', 'ASC']],
    ...(include && include.length ? { include } : {})
  })
  return applyEventFilters(events, filters.filters)
}

export const buildTimeSeries = (events: LinkEvent[], interval: AggregationInterval) => {
  const config = getIntervalConfig(interval)
  const bucketMs = config.bucketMs
  const now = new Date()
  const alignedEnd = alignToBucket(now.getTime(), bucketMs)

  const rawStart = intervalToStart(interval)
  const alignedStart = alignToBucket(rawStart.getTime(), bucketMs)

  const timestamps = events
    .map(event => (event.occurredAt instanceof Date ? event.occurredAt.getTime() : new Date(event.occurredAt).getTime()))
    .sort((a, b) => a - b)

  const series: Array<{ timestamp: string; total: number }> = []
  let index = 0

  for (let cursor = alignedStart; cursor <= alignedEnd; cursor += bucketMs) {
    const bucketEnd = cursor + bucketMs
    let total = 0
    while (index < timestamps.length && timestamps[index] < bucketEnd) {
      total += 1
      index += 1
    }
    series.push({ timestamp: new Date(cursor).toISOString(), total })
  }

  return series
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
    metadata: event.metadata,
    interactionType: getInteractionType(event)
  }))
}

export const getIntervalGranularity = (interval: AggregationInterval) => getIntervalConfig(interval).granularity
