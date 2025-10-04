import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { authenticateUser, issueToken, registerUser, getUserById } from '../services/authService'
import { WorkspaceMember } from '../models/workspaceMember'
import { env } from '../config/env'
import { listWorkspacesForUser } from '../services/workspaceService'
import { findActiveInviteByCode, consumeInvite } from '../services/signupInviteService'
import { sequelize } from '../config/database'

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, inviteCode } = req.body as {
    email: string
    password: string
    name: string
    inviteCode?: string
  }

  let invite: Awaited<ReturnType<typeof findActiveInviteByCode>> | null = null
  if (env.feature.disableSignup) {
    if (!inviteCode) {
      return res.status(403).json({ error: 'Sign-up is disabled for this instance.' })
    }
    invite = await findActiveInviteByCode(inviteCode)
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or already used invitation code.' })
    }
  } else if (inviteCode) {
    invite = await findActiveInviteByCode(inviteCode)
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or already used invitation code.' })
    }
  }

  try {
    const { user, workspace } = await sequelize.transaction(async transaction => {
      const registration = await registerUser({ email, password, name }, { transaction })

      if (invite) {
        const consumed = await consumeInvite(invite.id, registration.user.id, transaction)
        if (!consumed) {
          throw new Error('INVITE_ALREADY_USED')
        }
      }

      return registration
    })

    const token = issueToken(user, workspace.id)
    res.status(201).json({ token, user, workspace })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_ALREADY_USED') {
      return res.status(409).json({ error: 'This invitation code has already been used.' })
    }
    throw error
  }
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, workspaceId } = req.body
  const user = await authenticateUser({ email, password })
  await user.update({ lastLoginAt: new Date() })
  const memberships = await WorkspaceMember.findAll({ where: { userId: user.id } })
  const targetWorkspaceId = workspaceId ?? memberships[0]?.workspaceId
  if (!targetWorkspaceId) {
    const fullUser = await getUserById(user.id)
    return res.status(400).json({ error: 'No workspace available', user: fullUser })
  }
  const token = issueToken(user, targetWorkspaceId)
  const fullUser = await getUserById(user.id)
  const workspaces = await listWorkspacesForUser(user.id)
  res.json({ token, user: fullUser, workspaceId: targetWorkspaceId, workspaces })
})

export const current = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser || !req.workspaceId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const workspaces = await listWorkspacesForUser(req.currentUser.id)
  res.json({ user: req.currentUser, workspaceId: req.workspaceId, workspaces })
})

export const features = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ features: { disableSignup: env.feature.disableSignup } })
})

export const switchWorkspace = asyncHandler(async (req: Request, res: Response) => {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const { workspaceId } = req.body as { workspaceId?: string }
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' })

  const membership = await WorkspaceMember.findOne({
    where: { workspaceId, userId: req.currentUser.id, status: 'active' }
  })

  if (!membership) return res.status(404).json({ error: 'Workspace not found' })

  const token = issueToken(req.currentUser, workspaceId)
  res.json({ token, workspaceId })
})
