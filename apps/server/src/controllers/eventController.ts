import { type Request, type Response } from 'express'
import type { AggregationInterval } from '@p42/shared'
import { asyncHandler } from '../middleware/asyncHandler'
import { getLinkAnalytics } from '../services/linkService'

const allowedIntervals: AggregationInterval[] = ['all', '1y', '3m', '1m', '1w', '1d']

const parseInterval = (value: unknown): AggregationInterval => {
  if (typeof value === 'string' && allowedIntervals.includes(value as AggregationInterval)) {
    return value as AggregationInterval
  }
  return '1m'
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })

  const analytics = await getLinkAnalytics({
    workspaceId: req.workspaceId,
    projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
    linkId: typeof req.query.linkId === 'string' ? req.query.linkId : undefined,
    interval: parseInterval(req.query.period),
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
  })

  res.json({ analytics })
})
