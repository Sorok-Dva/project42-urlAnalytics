import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { createQrForLink, createQrFromUrl, generateQrSvg, listQrCodes } from '../services/qrService'
import { QrCode } from '../models/qrCode'

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId) return res.status(401).json({ error: 'Unauthorized' })
  const qrs = await listQrCodes(req.workspaceId, { search: req.query.search as string })
  res.json({ qrCodes: qrs })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.workspaceId || !req.currentUser) return res.status(401).json({ error: 'Unauthorized' })
  const { linkId, name, design, originalUrl, domain, slug, projectId } = req.body
  if (linkId) {
    const result = await createQrForLink({
      workspaceId: req.workspaceId,
      projectId,
      linkId,
      name,
      design,
      createdById: req.currentUser.id
    })
    res.status(201).json(result)
    return
  }

  if (!originalUrl || !domain) {
    res.status(400).json({ error: 'originalUrl and domain are required when linkId is absent' })
    return
  }

  const result = await createQrFromUrl({
    workspaceId: req.workspaceId,
    projectId,
    name,
    originalUrl,
    domain,
    slug,
    createdById: req.currentUser.id,
    design
  })
  res.status(201).json(result)
})

export const download = asyncHandler(async (req: Request, res: Response) => {
  const qr = await QrCode.findByPk(req.params.id)
  if (!qr) return res.status(404).json({ error: 'QR code not found' })
  const svg = await generateQrSvg(qr.code, qr.design)
  res.setHeader('Content-Type', 'image/svg+xml')
  res.send(svg)
})
