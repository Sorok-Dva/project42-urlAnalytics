import QRCode from 'qrcode'
import { nanoid } from 'nanoid'
import { QrCode } from '../models/qrCode'
import { Link } from '../models/link'
import { buildCacheKey, createLink } from './linkService'
import { ensureWorkspaceLimit } from './workspaceService'
import { cacheLinkResolution } from '../lib/cache'

export const listQrCodes = async (workspaceId: string, filters?: { search?: string }) => {
  const where: Record<string, unknown> = { workspaceId }
  if (filters?.search) where['name'] = filters.search
  return QrCode.findAll({ where, order: [['createdAt', 'DESC']] })
}

export const createQrForLink = async (payload: {
  workspaceId: string
  projectId?: string | null
  linkId: string
  name: string
  design: Record<string, unknown>
  createdById: string
}) => {
  const link = await Link.findByPk(payload.linkId)
  if (!link) throw new Error('Link not found')

  await ensureWorkspaceLimit(payload.workspaceId, 'qrCodes')
  const code = nanoid(10)
  const qr = await QrCode.create({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId ?? link.projectId,
    linkId: link.id,
    name: payload.name,
    code,
    design: payload.design,
    createdById: payload.createdById
  })

  return {
    qr,
    svg: await generateQrSvg(`${code}`, payload.design)
  }
}

export const createQrFromUrl = async (payload: {
  workspaceId: string
  projectId?: string | null
  name: string
  originalUrl: string
  domain: string
  slug?: string
  createdById: string
  design: Record<string, unknown>
}) => {
  const link = await createLink({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId ?? null,
    domain: payload.domain,
    slug: payload.slug ?? nanoid(6),
    originalUrl: payload.originalUrl,
    createdById: payload.createdById,
    geoRules: [],
    publicStats: false
  })

  await ensureWorkspaceLimit(payload.workspaceId, 'qrCodes')
  const code = nanoid(10)
  const qr = await QrCode.create({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId ?? null,
    linkId: link.id,
    name: payload.name,
    code,
    design: payload.design,
    createdById: payload.createdById
  })

  cacheLinkResolution(buildCacheKey(payload.domain, link.slug), link)

  return {
    qr,
    svg: await generateQrSvg(`${code}`, payload.design)
  }
}

export const generateQrSvg = async (content: string, design: Record<string, unknown>) => {
  const options = {
    color: {
      dark: (design.foreground as string) ?? '#000000',
      light: (design.background as string) ?? '#ffffff00'
    },
    width: 512
  }
  return QRCode.toString(content, { type: 'svg', ...options })
}

export const recordQrScan = async (qrCode: QrCode) => {
  await qrCode.increment('totalScans')
}
