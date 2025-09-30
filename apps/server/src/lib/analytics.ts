import { Op } from 'sequelize'
import { subDays, subMonths, subYears, isAfter, formatISO } from 'date-fns'
import { LinkEvent } from '../models/linkEvent'
import { AggregationInterval } from '@p42/shared'

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

export const fetchEventsForInterval = async (filters: {
  workspaceId: string
  projectId?: string
  linkId?: string
  interval: typeof AggregationInterval[number]
  page?: number
  pageSize?: number
}) => {
  const start = intervalToStart(filters.interval)
  const where: Record<string, unknown> = {
    workspaceId: filters.workspaceId,
    occurredAt: { [Op.gte]: start }
  }
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.linkId) where.linkId = filters.linkId

  const events = await LinkEvent.findAll({ where, order: [['occurredAt', 'ASC']] })
  return events
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

export const summarizeByDimension = (events: LinkEvent[], dimension: keyof LinkEvent) => {
  const bucket = new Map<string, number>()
  events.forEach(event => {
    const key = (event[dimension] as string | null) ?? 'unknown'
    increment(bucket, key, 1)
  })
  return Array.from(bucket.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
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
    language: event.language,
    occurredAt: event.occurredAt,
    utm: event.utm
  }))
}
