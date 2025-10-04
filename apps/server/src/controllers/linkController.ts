import { Request, Response } from 'express'
import type { AggregationInterval } from '@p42/shared'
import { asyncHandler } from '../middleware/asyncHandler'
import {
  archiveLink,
  createLink,
  deleteLink,
  duplicateLink,
  exportLinkAnalytics,
  getLinkAnalytics,
  getLinkShareUrl,
  getLinkById,
  listLinks,
  moveLinkToProject,
  transferLinkToWorkspace,
  togglePublicStats,
  unarchiveLink,
  updateLink
} from '../services/linkService'
import { parseAnalyticsFilters } from '../lib/analyticsFilters'

const allowedIntervals: AggregationInterval[] = ['all', '1y', '3m', '1m', '1w', '1d', '12h', '6h', '1h', '30min', '15min', '5min', '1min']
const parseInterval = (value: unknown, fallback: AggregationInterval = '1m'): AggregationInterval => {
  if (typeof value === 'string' && allowedIntervals.includes(value as AggregationInterval)) {
    return value as AggregationInterval
  }
  return fallback
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId || !req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const link = await createLink({
    workspaceId: req.workspaceId,
    createdById: req.currentUser.id,
    ...req.body
  })
  res.status(201).json({ link })
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const links = await listLinks(req.workspaceId, {
    status: req.query.status as 'active' | 'archived' | 'deleted',
    projectId: req.query.projectId as string,
    search: req.query.search as string,
    sort: (req.query.sort as 'recent' | 'performance' | 'old') ?? 'recent'
  })
  res.json({ links })
})


export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await getLinkById(req.workspaceId, req.params.id)
  if (!link) return res.status(404).json({ error: 'Link not found' })
  const shareUrl = getLinkShareUrl(link)
  res.json({ link, shareUrl })
})
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await updateLink({
    workspaceId: req.workspaceId,
    linkId: req.params.id,
    ...req.body
  })
  res.json({ link })
})

export const analytics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const analytics = await getLinkAnalytics({
    workspaceId: req.workspaceId,
    projectId: req.query.projectId as string,
    linkId: req.params.id,
    interval: parseInterval(req.query.interval),
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    filters: parseAnalyticsFilters(req.query.filters)
  })
  res.json({ analytics })
})

export const exportStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const format = (req.query.format as 'csv' | 'json') ?? 'json'
  const content = await exportLinkAnalytics(
    {
      workspaceId: req.workspaceId,
      linkId: req.params.id,
      interval: parseInterval(req.query.interval)
    },
    format
  )
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
  res.send(content)
})

export const togglePublic = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const { enabled } = req.body
  const link = await togglePublicStats(req.params.id, enabled)
  const shareUrl = getLinkShareUrl(link)
  res.json({ link, shareUrl })
})

export const archive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await archiveLink(req.params.id)
  res.json({ link })
})

export const unarchive = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await unarchiveLink(req.params.id)
  res.json({ link })
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await deleteLink(req.params.id)
  res.json({ link })
})

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await duplicateLink(req.params.id, { slug: req.body.slug })
  res.status(201).json({ link })
})

export const move = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const link = await moveLinkToProject(req.params.id, req.body.projectId ?? null)
  res.json({ link })
})

export const transfer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId || !req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const { workspaceId: targetWorkspaceId, domain, projectId } = req.body as {
    workspaceId?: string
    domain?: string
    projectId?: string | null
  }
  if (!targetWorkspaceId) return res.status(400).json({ error: 'workspaceId is required' })

  const link = await transferLinkToWorkspace({
    linkId: req.params.id,
    sourceWorkspaceId: req.workspaceId,
    targetWorkspaceId,
    requestedById: req.currentUser.id,
    domain: domain ?? null,
    projectId: projectId ?? null
  })

  res.json({ link })
})
