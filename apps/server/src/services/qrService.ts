import QRCode from 'qrcode'
import { nanoid } from 'nanoid'
import { QrCode } from '../models/qrCode'
import { Link } from '../models/link'
import { Project } from '../models/project'
import { sequelize } from '../config/database'
import { buildCacheKey, createLink } from './linkService'
import { ensureWorkspaceLimit, findWorkspaceMembership } from './workspaceService'
import { cacheLinkResolution } from '../lib/cache'

const withStatus = (error: Error, status: number) => {
  ;(error as any).status = status
  return error
}

export const listQrCodes = async (workspaceId: string, filters?: { search?: string }) => {
  const where: Record<string, unknown> = { workspaceId }
  if (filters?.search) where['name'] = filters.search
  return QrCode.findAll({ where, order: [['createdAt', 'DESC']] })
}

const defaultDesign = () => ({
  modules: 'dots-classic',
  pilotCenter: 'rounded',
  pilotBorder: 'rounded',
  foreground: '#111827',
  background: 'transparent',
  logo: { type: 'p42', value: null }
})

export const createQrForLink = async (payload: {
  workspaceId: string
  projectId?: string | null
  linkId: string
  name: string
  design?: Record<string, unknown>
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
    design: payload.design ?? defaultDesign(),
    createdById: payload.createdById
  })

  const design = (qr.design as Record<string, unknown>) ?? defaultDesign()

  return {
    qr,
    svg: await generateQrSvg(`${code}`, design)
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
  design?: Record<string, unknown>
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
  const design = payload.design ?? defaultDesign()
  const qr = await QrCode.create({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId ?? null,
    linkId: link.id,
    name: payload.name,
    code,
    design,
    createdById: payload.createdById
  })

  cacheLinkResolution(buildCacheKey(payload.domain, link.slug), link)

  return {
    qr,
    svg: await generateQrSvg(`${code}`, design)
  }
}

export const transferQrCodeToWorkspace = async (payload: {
  qrId: string
  sourceWorkspaceId: string
  targetWorkspaceId: string
  requestedById: string
  linkId?: string | null
  projectId?: string | null
}) => {
  if (payload.sourceWorkspaceId === payload.targetWorkspaceId) {
    throw withStatus(new Error('QR code already belongs to this workspace'), 400)
  }

  const qr = await QrCode.findOne({
    where: { id: payload.qrId, workspaceId: payload.sourceWorkspaceId }
  })

  if (!qr) throw withStatus(new Error('QR code not found'), 404)

  const membership = await findWorkspaceMembership(payload.targetWorkspaceId, payload.requestedById)
  if (!membership || membership.status !== 'active' || membership.role === 'viewer') {
    throw withStatus(new Error('You do not have access to the target workspace'), 403)
  }

  await ensureWorkspaceLimit(payload.targetWorkspaceId, 'qrCodes')

  let nextLinkId: string | null = typeof payload.linkId !== 'undefined' ? payload.linkId : qr.linkId
  if (nextLinkId) {
    const link = await Link.findOne({ where: { id: nextLinkId, workspaceId: payload.targetWorkspaceId } })
    if (!link) {
      throw withStatus(new Error('Link not found in target workspace'), 404)
    }
  }

  if (nextLinkId === null) {
    nextLinkId = null
  }

  let nextProjectId: string | null = null
  if (typeof payload.projectId !== 'undefined') {
    if (payload.projectId !== null) {
      const project = await Project.findOne({
        where: { id: payload.projectId, workspaceId: payload.targetWorkspaceId }
      })
      if (!project) throw withStatus(new Error('Project not found in target workspace'), 404)
      nextProjectId = project.id
    }
  }

  if (nextProjectId) {
    const existingProject = await Project.findOne({
      where: { id: nextProjectId, workspaceId: payload.targetWorkspaceId }
    })
    if (!existingProject) throw withStatus(new Error('Project not found in target workspace'), 404)
  }

  await sequelize.transaction(async transaction => {
    qr.workspaceId = payload.targetWorkspaceId
    qr.projectId = nextProjectId
    qr.linkId = nextLinkId
    await qr.save({ transaction })
  })

  await qr.reload()
  return qr
}

const normalizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (trimmed.toLowerCase() === 'transparent') return '#ffffff00'
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed
  }
  return fallback
}

export const generateQrSvg = async (content: string, design: Record<string, unknown>) => {
  const options = {
    color: {
      dark: normalizeHexColor(design.foreground, '#000000'),
      light: normalizeHexColor(design.background, '#ffffff00')
    },
    width: 512
  }
  return QRCode.toString(content, { type: 'svg', ...options })
}

export const recordQrScan = async (qrCode: QrCode) => {
  await qrCode.increment('totalScans')
}
