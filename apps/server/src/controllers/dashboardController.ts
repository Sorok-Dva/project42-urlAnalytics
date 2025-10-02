
import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { DashboardTimeRange } from '@p42/shared'
import { subDays, subHours, subMinutes, subMonths, subYears } from 'date-fns'
import { asyncHandler } from '../middleware/asyncHandler'
import { Link } from '../models/link'
import { LinkEvent } from '../models/linkEvent'

const DASHBOARD_RANGE_CONFIG: Record<DashboardTimeRange, {
  bucketMs: number
  granularity: 'second' | 'minute' | 'hour' | 'day' | 'month'
  start: (now: Date) => Date | null
}> = {
  '1min': {
    bucketMs: 1_000,
    granularity: 'second',
    start: now => subMinutes(now, 1)
  },
  '5min': {
    bucketMs: 5_000,
    granularity: 'second',
    start: now => subMinutes(now, 5)
  },
  '15min': {
    bucketMs: 15_000,
    granularity: 'second',
    start: now => subMinutes(now, 15)
  },
  '30min': {
    bucketMs: 30_000,
    granularity: 'second',
    start: now => subMinutes(now, 30)
  },
  '1h': {
    bucketMs: 60_000,
    granularity: 'minute',
    start: now => subHours(now, 1)
  },
  '6h': {
    bucketMs: 30 * 60_000,
    granularity: 'minute',
    start: now => subHours(now, 6)
  },
  '12h': {
    bucketMs: 60 * 60_000,
    granularity: 'hour',
    start: now => subHours(now, 12)
  },
  '24h': {
    bucketMs: 60 * 60_000,
    granularity: 'hour',
    start: now => subHours(now, 24)
  },
  '7d': {
    bucketMs: 6 * 60 * 60_000,
    granularity: 'hour',
    start: now => subDays(now, 7)
  },
  '14d': {
    bucketMs: 12 * 60 * 60_000,
    granularity: 'hour',
    start: now => subDays(now, 14)
  },
  '1mo': {
    bucketMs: 24 * 60 * 60_000,
    granularity: 'day',
    start: now => subMonths(now, 1)
  },
  '3mo': {
    bucketMs: 3 * 24 * 60 * 60_000,
    granularity: 'day',
    start: now => subMonths(now, 3)
  },
  '6mo': {
    bucketMs: 6 * 24 * 60 * 60_000,
    granularity: 'day',
    start: now => subMonths(now, 6)
  },
  '1y': {
    bucketMs: 7 * 24 * 60 * 60_000,
    granularity: 'day',
    start: now => subYears(now, 1)
  },
  all: {
    bucketMs: 30 * 24 * 60 * 60_000,
    granularity: 'month',
    start: () => null
  }
}

const isDashboardRange = (value: unknown): value is DashboardTimeRange => {
  return typeof value === 'string' && (DashboardTimeRange as readonly string[]).includes(value as DashboardTimeRange)
}

const parseRange = (value: unknown): DashboardTimeRange => {
  if (isDashboardRange(value)) return value
  return '7d'
}

const alignToBucket = (date: Date, bucketMs: number) => {
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs)
}

const buildDashboardSeries = (
  timestamps: Date[],
  start: Date,
  end: Date,
  bucketMs: number
) => {
  const data: Array<{ timestamp: string; total: number }> = []
  let cursor = start.getTime()
  const endTime = end.getTime()
  let index = 0

  while (cursor <= endTime) {
    const bucketEnd = cursor + bucketMs
    let total = 0
    while (index < timestamps.length && timestamps[index].getTime() < bucketEnd) {
      total += 1
      index += 1
    }
    data.push({ timestamp: new Date(cursor).toISOString(), total })
    cursor = bucketEnd
  }

  return data
}

export const overview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })

  const range = parseRange(req.query.range)
  const now = new Date()
  const config = DASHBOARD_RANGE_CONFIG[range]

  let start = config.start(now)
  if (!start) {
    const earliestRaw = (await LinkEvent.min('occurredAt', { where: { workspaceId: req.workspaceId } })) as Date | string | null
    start = earliestRaw ? new Date(earliestRaw) : subMonths(now, 1)
  }

  if (start > now) {
    start = subMinutes(now, 5)
  }

  const alignedStart = alignToBucket(start, config.bucketMs)
  const alignedEnd = new Date(Math.ceil(now.getTime() / config.bucketMs) * config.bucketMs)

  const occurredBetween = { [Op.between]: [alignedStart, alignedEnd] }

  const [linksCount, totalClicks, recentEvents, timelineEvents] = await Promise.all([
    Link.count({ where: { workspaceId: req.workspaceId, status: 'active' } }),
    Link.sum('clickCount', { where: { workspaceId: req.workspaceId } }),
    LinkEvent.findAll({
      where: {
        workspaceId: req.workspaceId,
        occurredAt: occurredBetween
      },
      order: [['occurredAt', 'DESC']],
      limit: 20
    }),
    LinkEvent.findAll({
      where: {
        workspaceId: req.workspaceId,
        occurredAt: occurredBetween
      },
      attributes: ['occurredAt'],
      order: [['occurredAt', 'ASC']],
      raw: true
    })
  ])

  const timestamps = (timelineEvents as Array<{ occurredAt: Date | string }>).map(event =>
    event.occurredAt instanceof Date ? event.occurredAt : new Date(event.occurredAt)
  )

  const series = buildDashboardSeries(timestamps, alignedStart, alignedEnd, config.bucketMs)

  res.json({
    metrics: {
      numberOfLinks: linksCount,
      totalClicks: Number(totalClicks ?? 0)
    },
    range,
    recentClicks: series,
    recentClicksGranularity: config.granularity,
    events: recentEvents
  })
})
