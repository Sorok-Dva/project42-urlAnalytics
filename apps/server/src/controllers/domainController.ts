import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import {
  addDomain,
  assignDomainToProject,
  domainDnsInstructions,
  listDomains,
  verifyDomain
} from '../services/domainService'

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const domains = await listDomains(req.workspaceId)
  res.json({ domains })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const domain = await addDomain({
    workspaceId: req.workspaceId,
    domain: req.body.domain,
    projectId: req.body.projectId
  })
  res.status(201).json({ domain, instructions: domainDnsInstructions(domain) })
})

export const verify = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const domain = await verifyDomain({
    workspaceId: req.workspaceId,
    domainId: req.params.id,
    token: req.body.token
  })
  res.json({ domain })
})

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const domain = await assignDomainToProject({
    domainId: req.params.id,
    projectId: req.body.projectId ?? null
  })
  res.json({ domain })
})
