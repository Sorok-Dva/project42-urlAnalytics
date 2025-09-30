import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getLinkAnalytics, getLinkByToken } from '../services/linkService'
import type { AggregationInterval } from '@p42/shared'
import { getProjectByToken, getProjectStatsSnapshot } from '../services/projectService'

const allowedIntervals: AggregationInterval[] = ['all', '1y', '3m', '1m', '1w', '1d']
const parseInterval = (value: unknown): AggregationInterval => {
  if (typeof value === 'string' && allowedIntervals.includes(value as AggregationInterval)) {
    return value as AggregationInterval
  }
  return '1m'
}

export const linkStats = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token
  const interval = parseInterval(req.query.interval)
  const link = await getLinkByToken(token)
  if (!link) return res.status(404).json({ error: 'Link not found or not public' })

  const analytics = await getLinkAnalytics({
    workspaceId: link.workspaceId,
    linkId: link.id,
    interval
  })

  res.json({
    link: {
      id: link.id,
      slug: link.slug,
      originalUrl: link.originalUrl,
      publicStats: link.publicStats
    },
    analytics
  })
})

export const projectStats = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token
  const interval = parseInterval(req.query.interval)
  const project = await getProjectByToken(token)
  if (!project) return res.status(404).json({ error: 'Project not found or not public' })

  const analytics = await getLinkAnalytics({
    workspaceId: project.workspaceId,
    projectId: project.id,
    interval
  })
  const snapshot = await getProjectStatsSnapshot(project.id)

  res.json({ project, analytics, snapshot })
})
