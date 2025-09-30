import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import {
  createProject,
  getProjectShareUrl,
  listProjects,
  toggleProjectPublicStats
} from '../services/projectService'

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const projects = await listProjects(req.workspaceId)
  res.json({ projects })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId || !req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const project = await createProject({
    workspaceId: req.workspaceId,
    ownerId: req.currentUser.id,
    name: req.body.name,
    description: req.body.description
  })
  res.status(201).json({ project })
})

export const makePublic = asyncHandler(async (req: Request, res: Response) => {
  const project = await toggleProjectPublicStats(req.params.id, req.body.enabled)
  const shareUrl = getProjectShareUrl(project)
  res.json({ project, shareUrl })
})
