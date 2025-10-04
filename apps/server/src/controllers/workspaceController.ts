import { Request, Response } from 'express'
import { WorkspaceRole } from '@p42/shared'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import {
  createWorkspace,
  listWorkspacesForUser,
  listWorkspaceMembers,
  inviteWorkspaceMember,
  findWorkspaceMembership,
  getWorkspace,
  renameWorkspace,
  getWorkspaceUsage,
  transferWorkspaceAssets,
  purgeWorkspaceAssets,
  findDefaultWorkspaceForOwner,
  listActiveSubscriptionPlans,
  updateWorkspacePlanSelection
} from '../services/workspaceService'
import { listDomains } from '../services/domainService'

const planSelectionSchema = z.object({ planId: z.string().uuid() })

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaces = await listWorkspacesForUser(req.currentUser.id)
  res.json({ workspaces })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const { name } = req.body as { name?: string }
  const workspace = await createWorkspace({ ownerId: req.currentUser.id, name: name ?? '' })
  const summaries = await listWorkspacesForUser(req.currentUser.id)
  const summary =
    summaries.find(item => item.id === workspace.id) ?? {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      planLimits: workspace.planLimits,
      isActive: workspace.isActive,
      role: 'owner' as const,
      memberStatus: 'active' as const,
      isDefault: workspace.isDefault,
      planId: workspace.planId ?? null
    }
  res.status(201).json({ workspace: summary })
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspace = await getWorkspace(req.params.id)
  const membership = await findWorkspaceMembership(workspace.id, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  const usage = await getWorkspaceUsage(workspace.id)
  const summary = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    planLimits: workspace.planLimits,
    isActive: workspace.isActive,
    role: membership.role,
    memberStatus: membership.status,
    isDefault: workspace.isDefault,
    planId: workspace.planId ?? null,
    usage
  }
  res.json({ workspace: summary })
})

export const members = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  const members = await listWorkspaceMembers(workspaceId)
  res.json({ members })
})

export const invite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const { email, role } = req.body as { email?: string; role?: WorkspaceRole }
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  if (!['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const member = await inviteWorkspaceMember({
    workspaceId,
    email: email ?? '',
    role: role ?? 'member',
    invitedById: req.currentUser.id
  })

  res.status(201).json({
    member: {
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
    }
  })
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const { name } = req.body as { name?: string }
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  if (!['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const workspace = await renameWorkspace({ workspaceId, name: name ?? '' })
  res.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      planLimits: workspace.planLimits,
      isActive: workspace.isActive,
      role: membership.role,
      memberStatus: membership.status,
      planId: workspace.planId ?? null
    }
  })
})

export const domains = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })

  const domains = await listDomains(workspaceId)
  res.json({ domains })
})

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await listActiveSubscriptionPlans()
  res.json({ plans })
})

export const selectPlan = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  if (!['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only workspace owners can change the plan.' })
  }

  const parsed = planSelectionSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  const workspace = await updateWorkspacePlanSelection(workspaceId, parsed.data.planId)
  const usage = await getWorkspaceUsage(workspace.id)

  res.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      planLimits: workspace.planLimits,
      isActive: workspace.isActive,
      role: membership.role,
      memberStatus: membership.status,
      isDefault: workspace.isDefault,
      planId: workspace.planId ?? null,
      usage
    }
  })
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspaceId = req.params.id
  const membership = await findWorkspaceMembership(workspaceId, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  if (membership.role !== 'owner') {
    return res.status(403).json({ error: 'Only workspace owners can delete a workspace.' })
  }

  const workspace = await getWorkspace(workspaceId)
  if (workspace.isDefault) {
    return res.status(400).json({ error: 'Default workspace cannot be deleted.' })
  }

  const usage = await getWorkspaceUsage(workspaceId)
  const hasContent = usage.links > 0 || usage.qrCodes > 0 || usage.analytics > 0

  const { strategy, targetWorkspaceId } = (req.body ?? {}) as {
    strategy?: 'transfer' | 'purge'
    targetWorkspaceId?: string
  }

  if (!hasContent) {
    await purgeWorkspaceAssets(workspaceId)
    return res.status(200).json({ status: 'purged', workspaceId, strategy: 'purge' })
  }

  if (strategy === 'transfer') {
    let resolvedTarget = targetWorkspaceId?.trim()
    if (!resolvedTarget) {
      const fallback = await findDefaultWorkspaceForOwner(req.currentUser.id, { excludeWorkspaceId: workspaceId })
      if (!fallback) {
        return res.status(400).json({ error: 'No fallback workspace available for transfer.' })
      }
      resolvedTarget = fallback.id
    }

    if (resolvedTarget === workspaceId) {
      return res.status(400).json({ error: 'Target workspace must be different from the source workspace.' })
    }

    const targetMembership = await findWorkspaceMembership(resolvedTarget, req.currentUser.id)
    if (!targetMembership) {
      return res.status(404).json({ error: 'Target workspace not found.' })
    }

    if (!['owner', 'admin'].includes(targetMembership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions on target workspace.' })
    }

    await transferWorkspaceAssets({ sourceWorkspaceId: workspaceId, targetWorkspaceId: resolvedTarget })
    return res.status(200).json({ status: 'transferred', workspaceId, targetWorkspaceId: resolvedTarget })
  }

  if (strategy === 'purge') {
    await purgeWorkspaceAssets(workspaceId)
    return res.status(200).json({ status: 'purged', workspaceId })
  }

  return res.status(400).json({ error: 'Invalid deletion strategy for non-empty workspace.' })
})
