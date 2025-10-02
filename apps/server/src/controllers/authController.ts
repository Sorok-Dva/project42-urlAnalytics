import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { authenticateUser, issueToken, registerUser, getUserById } from '../services/authService'
import { WorkspaceMember } from '../models/workspaceMember'
import { env } from '../config/env'

export const register = asyncHandler(async (req: Request, res: Response) => {
  if (env.feature.disableSignup) {
    return res.status(403).json({ error: 'Sign-up is disabled for this instance.' })
  }
  const { email, password, name } = req.body
  const { user, workspace } = await registerUser({ email, password, name })
  const token = issueToken(user, workspace.id)
  res.status(201).json({ token, user, workspace })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, workspaceId } = req.body
  const user = await authenticateUser({ email, password })
  const memberships = await WorkspaceMember.findAll({ where: { userId: user.id } })
  const targetWorkspaceId = workspaceId ?? memberships[0]?.workspaceId
  if (!targetWorkspaceId) {
    const fullUser = await getUserById(user.id)
    return res.status(400).json({ error: 'No workspace available', user: fullUser })
  }
  const token = issueToken(user, targetWorkspaceId)
  const fullUser = await getUserById(user.id)
  res.json({ token, user: fullUser, workspaceId: targetWorkspaceId })
})

export const current = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.currentUser, workspaceId: req.workspaceId })
})

export const features = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ features: { disableSignup: env.feature.disableSignup } })
})
