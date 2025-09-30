import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { Link } from '../models/link'
import { LinkEvent } from '../models/linkEvent'
import { buildTimeSeries } from '../lib/analytics'

export const overview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })

  const [linksCount, totalClicks, recentEvents] = await Promise.all([
    Link.count({ where: { workspaceId: req.workspaceId, status: 'active' } }),
    Link.sum('clickCount', { where: { workspaceId: req.workspaceId } }),
    LinkEvent.findAll({
      where: { workspaceId: req.workspaceId },
      order: [['occurredAt', 'DESC']],
      limit: 20
    })
  ])

  const series = buildTimeSeries(recentEvents, '1m')

  res.json({
    metrics: {
      numberOfLinks: linksCount,
      totalClicks: Number(totalClicks ?? 0)
    },
    recentClicks: series,
    events: recentEvents
  })
})
