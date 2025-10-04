import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import { AggregationInterval, WorkspacePlanLimits } from '@p42/shared'
import { asyncHandler } from '../middleware/asyncHandler'
import { env } from '../config/env'
import { User } from '../models/user'
import { Workspace } from '../models/workspace'
import { WorkspaceMember } from '../models/workspaceMember'
import { Link } from '../models/link'
import { LinkEvent } from '../models/linkEvent'
import { QrCode } from '../models/qrCode'
import { SubscriptionPlan } from '../models/subscriptionPlan'
import { LinkAddon } from '../models/linkAddon'
import { createInviteCode, listInvites } from '../services/signupInviteService'
import { parseAnalyticsFilters } from '../lib/analyticsFilters'
import { getAdminAnalytics } from '../services/linkService'
import { clearSettingsCache, getAllSettings, setSettings } from '../services/settingsService'
import { computeWorkspacePlanLimits } from '../services/workspaceService'

const updateWorkspaceSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
  planLimits: z
    .object({
      links: z.number().int().positive().optional(),
      qrCodes: z.number().int().positive().optional(),
      members: z.number().int().positive().optional(),
      workspaces: z.number().int().positive().optional()
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
      const owner = workspace.get('owner') as User | undefined
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        planLimits: workspace.planLimits,
        isActive: workspace.isActive,
        planId: workspace.planId ?? null,
        createdAt: workspace.createdAt,
        owner: owner
          ? { id: owner.id, email: owner.email, name: owner.name }
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

  let defaultsFromPlan: WorkspacePlanLimits | null = null

  if (parsed.data.planId !== undefined) {
    let plan: SubscriptionPlan | null = null
    if (parsed.data.planId) {
      plan = await SubscriptionPlan.findByPk(parsed.data.planId)
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' })
      }
    }

    workspace.planId = plan?.id ?? null
    workspace.plan = plan?.slug ?? 'custom'
    defaultsFromPlan = await computeWorkspacePlanLimits(plan)
    workspace.planLimits = defaultsFromPlan
  }

  if (parsed.data.planLimits) {
    const existingLimits =
      defaultsFromPlan ?? ((workspace.planLimits ?? {}) as WorkspacePlanLimits)

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
      planId: workspace.planId ?? null,
      createdAt: workspace.createdAt,
      usage
    }
  })
})

const subscriptionPlanInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().min(3).max(8).default('EUR'),
  workspaceLimit: z.number().int().positive().nullable().optional(),
  linkLimitPerWorkspace: z.number().int().positive().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
})

const subscriptionPlanUpdateSchema = subscriptionPlanInputSchema.partial().refine(
  data => Object.keys(data).length > 0,
  'Payload cannot be empty'
)

const linkAddonInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  additionalLinks: z.number().int().positive(),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().min(3).max(8).default('EUR'),
  isActive: z.boolean().optional()
})

const linkAddonUpdateSchema = linkAddonInputSchema.partial().refine(
  data => Object.keys(data).length > 0,
  'Payload cannot be empty'
)

const settingsSchema = z
  .object({
    defaults: z
      .object({
        workspaceLimit: z.number().int().positive().optional(),
        linkLimit: z.number().int().positive().optional(),
        qrLimit: z.number().int().positive().optional(),
        membersLimit: z.number().int().positive().optional()
      })
      .optional()
  })
  .partial()

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

export const listSubscriptionPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await SubscriptionPlan.findAll({ order: [['createdAt', 'ASC']] })
  res.json({ plans })
})

export const createSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const parsed = subscriptionPlanInputSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const payload = parsed.data

  const existing = await SubscriptionPlan.findOne({ where: { slug: payload.slug } })
  if (existing) {
    return res.status(409).json({ error: 'Slug already exists' })
  }

  const plan = await SubscriptionPlan.create({
    slug: payload.slug,
    name: payload.name,
    description: payload.description ?? null,
    priceCents: payload.priceCents,
    currency: payload.currency,
    workspaceLimit: payload.workspaceLimit ?? null,
    linkLimitPerWorkspace: payload.linkLimitPerWorkspace ?? null,
    isDefault: Boolean(payload.isDefault),
    isActive: payload.isActive ?? true
  })

  if (plan.isDefault) {
    await SubscriptionPlan.update({ isDefault: false }, { where: { id: { [Op.ne]: plan.id } } })
  }

  res.status(201).json({ plan })
})

export const updateSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const parsed = subscriptionPlanUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const plan = await SubscriptionPlan.findByPk(id)
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' })
  }

  const data = parsed.data

  if (data.slug && data.slug !== plan.slug) {
    const existing = await SubscriptionPlan.findOne({ where: { slug: data.slug, id: { [Op.ne]: id } } })
    if (existing) {
      return res.status(409).json({ error: 'Slug already exists' })
    }
    plan.slug = data.slug
  }

  if (data.name) plan.name = data.name
  if (data.description !== undefined) plan.description = data.description ?? null
  if (data.priceCents !== undefined) plan.priceCents = data.priceCents
  if (data.currency) plan.currency = data.currency
  if (data.workspaceLimit !== undefined) plan.workspaceLimit = data.workspaceLimit ?? null
  if (data.linkLimitPerWorkspace !== undefined) plan.linkLimitPerWorkspace = data.linkLimitPerWorkspace ?? null
  if (data.isActive !== undefined) plan.isActive = data.isActive
  if (data.isDefault !== undefined) plan.isDefault = data.isDefault

  await plan.save()

  if (plan.isDefault) {
    await SubscriptionPlan.update({ isDefault: false }, { where: { id: { [Op.ne]: plan.id } } })
  }

  if (data.workspaceLimit !== undefined || data.linkLimitPerWorkspace !== undefined || data.slug) {
    const workspaces = await Workspace.findAll({ where: { planId: plan.id } })
    const planDefaults = await computeWorkspacePlanLimits(plan)
    await Promise.all(
      workspaces.map(async workspace => {
        const limits = { ...(workspace.planLimits as WorkspacePlanLimits | null ?? {}) }
        if ('links' in planDefaults) {
          limits.links = planDefaults.links
        } else {
          delete limits.links
        }

        if ('workspaces' in planDefaults) {
          limits.workspaces = planDefaults.workspaces
        } else {
          delete limits.workspaces
        }

        return workspace.update({ planLimits: limits, plan: plan.slug })
      })
    )
  }

  res.json({ plan })
})

export const deleteSubscriptionPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const plan = await SubscriptionPlan.findByPk(id)
  if (!plan) return res.status(404).json({ error: 'Plan not found' })
  if (plan.isDefault) {
    return res.status(400).json({ error: 'Default plan cannot be deleted.' })
  }

  const usage = await Workspace.count({ where: { planId: id } })
  if (usage > 0) {
    return res.status(400).json({ error: 'Plan is currently assigned to workspaces.' })
  }

  await plan.destroy()
  res.status(204).send()
})

export const listLinkAddons = asyncHandler(async (_req: Request, res: Response) => {
  const addons = await LinkAddon.findAll({ order: [['createdAt', 'ASC']] })
  res.json({ addons })
})

export const createLinkAddon = asyncHandler(async (req: Request, res: Response) => {
  const parsed = linkAddonInputSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const addon = await LinkAddon.create({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    additionalLinks: parsed.data.additionalLinks,
    priceCents: parsed.data.priceCents,
    currency: parsed.data.currency,
    isActive: parsed.data.isActive ?? true
  })

  res.status(201).json({ addon })
})

export const updateLinkAddon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const parsed = linkAddonUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const addon = await LinkAddon.findByPk(id)
  if (!addon) return res.status(404).json({ error: 'Addon not found' })

  const data = parsed.data
  if (data.name) addon.name = data.name
  if (data.description !== undefined) addon.description = data.description ?? null
  if (data.additionalLinks !== undefined) addon.additionalLinks = data.additionalLinks
  if (data.priceCents !== undefined) addon.priceCents = data.priceCents
  if (data.currency) addon.currency = data.currency
  if (data.isActive !== undefined) addon.isActive = data.isActive

  await addon.save()
  res.json({ addon })
})

export const deleteLinkAddon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const addon = await LinkAddon.findByPk(id)
  if (!addon) return res.status(404).json({ error: 'Addon not found' })
  await addon.destroy()
  res.status(204).send()
})

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getAllSettings()
  res.json({ settings })
})

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const parsed = settingsSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const updates: Record<string, unknown> = {}
  const defaults = parsed.data.defaults ?? {}
  if (defaults.workspaceLimit !== undefined) updates['defaults.workspaceLimit'] = defaults.workspaceLimit
  if (defaults.linkLimit !== undefined) updates['defaults.linkLimit'] = defaults.linkLimit
  if (defaults.qrLimit !== undefined) updates['defaults.qrLimit'] = defaults.qrLimit
  if (defaults.membersLimit !== undefined) updates['defaults.membersLimit'] = defaults.membersLimit

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No settings provided' })
  }

  await setSettings(updates)
  clearSettingsCache()

  res.json({ settings: await getAllSettings() })
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
