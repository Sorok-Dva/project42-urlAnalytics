import { Request, Response } from 'express'
import { WorkspaceRole } from '@p42/shared'
import { asyncHandler } from '../middleware/asyncHandler'
import {
  createWorkspace,
  listWorkspacesForUser,
  listWorkspaceMembers,
  inviteWorkspaceMember,
  findWorkspaceMembership,
  getWorkspace,
  renameWorkspace
} from '../services/workspaceService'
import { listDomains } from '../services/domainService'

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
      memberStatus: 'active' as const
    }
  res.status(201).json({ workspace: summary })
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const workspace = await getWorkspace(req.params.id)
  const membership = await findWorkspaceMembership(workspace.id, req.currentUser.id)
  if (!membership) return res.status(404).json({ error: 'Workspace not found' })
  const summary = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    planLimits: workspace.planLimits,
    isActive: workspace.isActive,
    role: membership.role,
    memberStatus: membership.status
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
      memberStatus: membership.status
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
