import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { Webhook } from '../models/webhook'
import { dispatchWebhooks, buildTestWebhookPayload } from '../lib/webhooks'

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId || !req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const webhook = await Webhook.create({
    workspaceId: req.workspaceId,
    name: req.body.name,
    targetUrl: req.body.targetUrl,
    secret: req.body.secret,
    events: req.body.events,
    createdById: req.currentUser.id,
    isActive: true
  })
  res.status(201).json({ webhook })
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const webhooks = await Webhook.findAll({ where: { workspaceId: req.workspaceId } })
  res.json({ webhooks })
})

export const test = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const payload = buildTestWebhookPayload()
  await dispatchWebhooks(req.workspaceId, 'click.recorded', payload.data)
  res.json({ success: true })
})
