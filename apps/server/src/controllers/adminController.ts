import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import { AggregationInterval } from '@p42/shared'
import { asyncHandler } from '../middleware/asyncHandler'
import { env } from '../config/env'
import { User } from '../models/user'
import { Workspace } from '../models/workspace'
import { WorkspaceMember } from '../models/workspaceMember'
import { Link } from '../models/link'
import { LinkEvent } from '../models/linkEvent'
import { QrCode } from '../models/qrCode'
import { createInviteCode, listInvites } from '../services/signupInviteService'
import { parseAnalyticsFilters } from '../lib/analyticsFilters'
import { getAdminAnalytics } from '../services/linkService'

const planSchema = z.enum(['free', 'pro', 'enterprise'])

const updateWorkspaceSchema = z.object({
  plan: planSchema.optional(),
  planLimits: z
    .object({
      links: z.number().int().positive().optional(),
      qrCodes: z.number().int().positive().optional(),
      members: z.number().int().positive().optional()
    })
    .partial()
    .optional()
})

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers, totalAdmins, totalWorkspaces, totalLinks, totalActiveLinks, totalQrCodes, totalEvents] =
    await Promise.all([
      User.count(),
      User.count({ where: { role: 'admin' } }),
      Workspace.count(),
      Link.count(),
      Link.count({ where: { status: 'active' } }),
      QrCode.count(),
      LinkEvent.count()
    ])

  const recentUsers = await User.findAll({
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['id', 'email', 'name', 'role', 'createdAt', 'lastLoginAt']
  })

  res.json({
    totals: {
      totalUsers,
      totalAdmins,
      totalWorkspaces,
      totalLinks,
      totalActiveLinks,
      totalQrCodes,
      totalEvents
    },
    recentUsers,
    signupsDisabled: env.feature.disableSignup
  })
})

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'email', 'name', 'role', 'createdAt', 'lastLoginAt']
  })

  res.json({ users })
})

const getWorkspaceUsage = async (workspaceId: string) => {
  const [links, activeLinks, qrCodes, members] = await Promise.all([
    Link.count({ where: { workspaceId } }),
    Link.count({ where: { workspaceId, status: 'active' } }),
    QrCode.count({ where: { workspaceId } }),
    WorkspaceMember.count({ where: { workspaceId } })
  ])
  return { links, activeLinks, qrCodes, members }
}

export const listWorkspaces = asyncHandler(async (_req: Request, res: Response) => {
  const workspaces = await Workspace.findAll({
    order: [['createdAt', 'DESC']],
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'name'] }]
  })

  const data = await Promise.all(
    workspaces.map(async workspace => {
      const usage = await getWorkspaceUsage(workspace.id)
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        planLimits: workspace.planLimits,
        isActive: workspace.isActive,
        createdAt: workspace.createdAt,
        owner: workspace.owner
          ? { id: workspace.owner.id, email: workspace.owner.email, name: workspace.owner.name }
          : null,
        usage
      }
    })
  )

  res.json({ workspaces: data })
})

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const parsed = updateWorkspaceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const workspace = await Workspace.findByPk(id)
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

  if (parsed.data.plan) {
    workspace.plan = parsed.data.plan
  }

  if (parsed.data.planLimits) {
    const existingLimits = (workspace.planLimits ?? {}) as Record<string, unknown>
    workspace.planLimits = {
      ...existingLimits,
      ...parsed.data.planLimits
    }
  }

  await workspace.save()
  const usage = await getWorkspaceUsage(workspace.id)

  res.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      planLimits: workspace.planLimits,
      isActive: workspace.isActive,
      createdAt: workspace.createdAt,
      usage
    }
  })
})

export const invites = asyncHandler(async (_req: Request, res: Response) => {
  const invites = await listInvites()
  res.json({ invites })
})

const inviteSchema = z.object({ code: z.string().trim().min(4).max(64).optional() })

export const createInvite = asyncHandler(async (req: Request, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  try {
    const invite = await createInviteCode({ code: parsed.data.code })
    res.status(201).json({ invite })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_CODE_TAKEN') {
      return res.status(409).json({ error: 'Invitation code already exists.' })
    }
    throw error
  }
})

const allowedIntervals: AggregationInterval[] = ['all', '1y', '3m', '1m', '1w', '1d', '12h', '6h', '1h', '30min', '15min', '5min', '1min']

const parseInterval = (value: unknown): AggregationInterval => {
  if (typeof value === 'string' && allowedIntervals.includes(value as AggregationInterval)) {
    return value as AggregationInterval
  }
  return '1m'
}

export const analytics = asyncHandler(async (req: Request, res: Response) => {
  const interval = parseInterval(req.query.period)
  const workspaceId = typeof req.query.workspaceId === 'string' && req.query.workspaceId.trim().length
    ? req.query.workspaceId.trim()
    : undefined
  const userId = typeof req.query.userId === 'string' && req.query.userId.trim().length
    ? req.query.userId.trim()
    : undefined
  const page = req.query.page ? Number(req.query.page) : undefined
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined
  const filters = parseAnalyticsFilters(req.query.filters)

  const analytics = await getAdminAnalytics({
    interval,
    page,
    pageSize,
    filters,
    workspaceId,
    userId
  })

  res.json({ analytics })
})
