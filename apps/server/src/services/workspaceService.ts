import { nanoid } from 'nanoid'
import { Op, Transaction } from 'sequelize'
import { WorkspaceRole, WorkspaceSummary, WorkspaceMemberSummary, WorkspacePlanLimits, WorkspaceUsage } from '@p42/shared'
import { Workspace } from '../models/workspace'
import { Link } from '../models/link'
import { QrCode } from '../models/qrCode'
import { LinkEvent } from '../models/linkEvent'
import { WorkspaceMember } from '../models/workspaceMember'
import { User } from '../models/user'
import { Project } from '../models/project'
import { Domain } from '../models/domain'
import { Webhook } from '../models/webhook'
import { ApiKey } from '../models/apiKey'
import { sequelize } from '../config/database'

const withStatus = (error: Error, status: number) => {
  ;(error as any).status = status
  return error
}

export const getWorkspace = async (workspaceId: string) => {
  const workspace = await Workspace.findByPk(workspaceId)
  if (!workspace) throw withStatus(new Error('Workspace not found'), 404)
  return workspace
}

const resourceCounters = {
  links: async (workspaceId: string) => Link.count({ where: { workspaceId, status: 'active' } }),
  qrCodes: async (workspaceId: string) => QrCode.count({ where: { workspaceId } }),
  members: async (workspaceId: string) => WorkspaceMember.count({ where: { workspaceId } })
} as const

const DEFAULT_FREE_WORKSPACE_LIMIT = 1

const resolveWorkspaceLimitValue = (plan: string, limit?: number | null): number | undefined => {
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return limit
  }
  if (plan === 'free') {
    return DEFAULT_FREE_WORKSPACE_LIMIT
  }
  return undefined
}

export const getWorkspaceUsage = async (workspaceId: string): Promise<WorkspaceUsage> => {
  const [links, activeLinks, qrCodes, analytics] = await Promise.all([
    Link.count({ where: { workspaceId } }),
    Link.count({ where: { workspaceId, status: 'active' } }),
    QrCode.count({ where: { workspaceId } }),
    LinkEvent.count({ where: { workspaceId } })
  ])

  return { links, activeLinks, qrCodes, analytics }
}

export const ensureWorkspaceLimit = async (
  workspaceId: string,
  resource: keyof typeof resourceCounters
) => {
  const workspace = await getWorkspace(workspaceId)
  const planLimits = workspace.planLimits as WorkspacePlanLimits
  const limit = Number(planLimits?.[resource] ?? Infinity)
  if (!Number.isFinite(limit)) return true
  const usage = await resourceCounters[resource](workspaceId)
  if (usage >= limit) {
    throw withStatus(new Error(`Workspace limit reached for ${resource}`), 400)
  }
  return true
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const ensureUniqueSlug = async (base: string, excludeId?: string) => {
  let candidate = base || `ws-${nanoid(6)}`
  let suffix = 1

  while (
    await Workspace.findOne({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
      }
    })
  ) {
    candidate = `${base || `workspace`}-${suffix}`
    suffix += 1
  }

  return candidate
}

const ensureWorkspaceCreationAllowed = async (ownerId: string) => {
  const workspaces = await Workspace.findAll({ where: { ownerId } })
  const limitCandidates = workspaces
    .map(item => {
      const planLimits = item.planLimits as WorkspacePlanLimits | null
      const limit = planLimits?.workspaces
      return resolveWorkspaceLimitValue(item.plan, typeof limit === 'number' ? limit : undefined)
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const limit = limitCandidates.length > 0 ? Math.max(...limitCandidates) : undefined
  if (limit === undefined) return

  const ownedCount = workspaces.length
  if (ownedCount >= limit) {
    throw withStatus(new Error('Workspace creation limit reached'), 400)
  }
}

export const createWorkspace = async (payload: { ownerId: string; name: string }) => {
  const trimmed = payload.name?.trim()
  if (!trimmed) {
    throw withStatus(new Error('Workspace name is required'), 400)
  }

  const baseSlug = toSlug(trimmed)
  const slug = await ensureUniqueSlug(baseSlug)

  await ensureWorkspaceCreationAllowed(payload.ownerId)

  const ownerDefault = await Workspace.findOne({
    where: { ownerId: payload.ownerId },
    order: [['isDefault', 'DESC'], ['createdAt', 'ASC']]
  })

  const workspace = await Workspace.create({
    name: trimmed,
    slug,
    ownerId: payload.ownerId,
    plan: ownerDefault?.plan ?? 'free',
    planLimits: ownerDefault?.planLimits
      ? { ...(ownerDefault.planLimits as WorkspacePlanLimits) }
      : {
        links: 10,
        qrCodes: 500,
        members: 5,
        workspaces: 1
      },
    isDefault: false
  })

  await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId: payload.ownerId,
    role: 'owner',
    status: 'active'
  })

  return workspace
}

export const renameWorkspace = async (payload: { workspaceId: string; name: string }) => {
  const workspace = await getWorkspace(payload.workspaceId)
  const trimmed = payload.name?.trim()
  if (!trimmed) throw withStatus(new Error('Workspace name is required'), 400)

  const baseSlug = toSlug(trimmed)
  const slug = await ensureUniqueSlug(baseSlug, workspace.id)

  workspace.name = trimmed
  workspace.slug = slug
  await workspace.save()
  return workspace
}

export const listWorkspacesForUser = async (userId: string): Promise<WorkspaceSummary[]> => {
  const memberships = await WorkspaceMember.findAll({
    where: { userId },
    include: [{ model: Workspace, as: 'workspace' }],
    order: [['createdAt', 'ASC']]
  })

  return memberships
    .map(membership => {
      const workspace = membership.workspace
      if (!workspace) return null
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        planLimits: workspace.planLimits as WorkspacePlanLimits,
        isActive: workspace.isActive,
        role: membership.role,
        memberStatus: membership.status,
        isDefault: workspace.isDefault
      } satisfies WorkspaceSummary
    })
    .filter((item): item is WorkspaceSummary => Boolean(item))
}

export const listWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMemberSummary[]> => {
  const members = await WorkspaceMember.findAll({
    where: { workspaceId },
    include: [{ model: User, as: 'user' }],
    order: [['createdAt', 'ASC']]
  })

  return members.map(member => ({
    id: member.id,
    role: member.role,
    status: member.status,
    invitedById: member.invitedById,
    user: {
      id: member.user?.id ?? '',
      email: member.user?.email ?? '',
      name: member.user?.name ?? '',
      avatarUrl: member.user?.avatarUrl ?? null
    }
  }))
}

export const findWorkspaceMembership = async (workspaceId: string, userId: string) => {
  return WorkspaceMember.findOne({ where: { workspaceId, userId } })
}

export const inviteWorkspaceMember = async (payload: {
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedById: string
}) => {
  const workspace = await getWorkspace(payload.workspaceId)
  const email = payload.email?.trim().toLowerCase()
  if (!email) throw withStatus(new Error('Email is required'), 400)

  const user = await User.findOne({ where: { email } })
  if (!user) throw withStatus(new Error('User not found'), 404)
  if (user.id === payload.invitedById) {
    throw withStatus(new Error('You already belong to this workspace'), 400)
  }

  const existing = await WorkspaceMember.findOne({
    where: { workspaceId: workspace.id, userId: user.id }
  })

  if (existing) {
    existing.role = payload.role
    existing.status = 'active'
    existing.invitedById = payload.invitedById
    await existing.save()
    await existing.reload({ include: [{ model: User, as: 'user' }] })
    return existing
  }

  await ensureWorkspaceLimit(workspace.id, 'members')

  const membership = await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: payload.role,
    status: 'active',
    invitedById: payload.invitedById
  })
  await membership.reload({ include: [{ model: User, as: 'user' }] })
  return membership
}

export const findDefaultWorkspaceForOwner = async (
  ownerId: string,
  options: { excludeWorkspaceId?: string } = {}
) => {
  const { excludeWorkspaceId } = options
  const defaultWorkspace = await Workspace.findOne({
    where: {
      ownerId,
      isDefault: true,
      ...(excludeWorkspaceId ? { id: { [Op.ne]: excludeWorkspaceId } } : {})
    },
    order: [['createdAt', 'ASC']]
  })

  if (defaultWorkspace) return defaultWorkspace

  const fallback = await Workspace.findOne({
    where: {
      ownerId,
      ...(excludeWorkspaceId ? { id: { [Op.ne]: excludeWorkspaceId } } : {})
    },
    order: [['createdAt', 'ASC']]
  })
  return fallback
}

const destroyWorkspaceRecords = async (workspaceId: string, transaction: Transaction) => {
  await WorkspaceMember.destroy({ where: { workspaceId }, transaction })
  await Workspace.destroy({ where: { id: workspaceId }, transaction })
}

export const transferWorkspaceAssets = async (params: {
  sourceWorkspaceId: string
  targetWorkspaceId: string
}) => {
  const { sourceWorkspaceId, targetWorkspaceId } = params
  await sequelize.transaction(async transaction => {
    await Link.update(
      { workspaceId: targetWorkspaceId, projectId: null },
      { where: { workspaceId: sourceWorkspaceId }, transaction }
    )
    await QrCode.update(
      { workspaceId: targetWorkspaceId },
      { where: { workspaceId: sourceWorkspaceId }, transaction }
    )
    await LinkEvent.update(
      { workspaceId: targetWorkspaceId, softDeleted: false },
      { where: { workspaceId: sourceWorkspaceId }, transaction }
    )
    await Project.destroy({ where: { workspaceId: sourceWorkspaceId }, transaction })
    await Domain.destroy({ where: { workspaceId: sourceWorkspaceId }, transaction })
    await Webhook.destroy({ where: { workspaceId: sourceWorkspaceId }, transaction })
    await ApiKey.destroy({ where: { workspaceId: sourceWorkspaceId }, transaction })

    await destroyWorkspaceRecords(sourceWorkspaceId, transaction)
  })
}

export const purgeWorkspaceAssets = async (workspaceId: string) => {
  await sequelize.transaction(async transaction => {
    await LinkEvent.update(
      { softDeleted: true },
      { where: { workspaceId }, transaction }
    )
    await Link.destroy({ where: { workspaceId }, transaction })
    await QrCode.destroy({ where: { workspaceId }, transaction })
    await Project.destroy({ where: { workspaceId }, transaction })
    await Domain.destroy({ where: { workspaceId }, transaction })
    await Webhook.destroy({ where: { workspaceId }, transaction })
    await ApiKey.destroy({ where: { workspaceId }, transaction })

    await destroyWorkspaceRecords(workspaceId, transaction)
  })
}
