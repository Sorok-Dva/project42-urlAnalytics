import { nanoid } from 'nanoid'
import { Op } from 'sequelize'
import { WorkspaceRole, WorkspaceSummary, WorkspaceMemberSummary, WorkspacePlanLimits } from '@p42/shared'
import { Workspace } from '../models/workspace'
import { Link } from '../models/link'
import { QrCode } from '../models/qrCode'
import { WorkspaceMember } from '../models/workspaceMember'
import { User } from '../models/user'

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

export const createWorkspace = async (payload: { ownerId: string; name: string }) => {
  const trimmed = payload.name?.trim()
  if (!trimmed) {
    throw withStatus(new Error('Workspace name is required'), 400)
  }

  const baseSlug = toSlug(trimmed)
  const slug = await ensureUniqueSlug(baseSlug)

  const workspace = await Workspace.create({
    name: trimmed,
    slug,
    ownerId: payload.ownerId
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
        memberStatus: membership.status
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
