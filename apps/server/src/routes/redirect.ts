import { Router, type Router as ExpressRouter, type Request } from 'express'
import { resolveLinkForRedirect, recordLinkEvent } from '../services/linkService'
import { geoFromCloudflareHeaders } from '../lib/geo'
import { QrCode } from '../models/qrCode'
import { recordQrScan } from '../services/qrService'
import { env } from '../config/env'

const router: ExpressRouter = Router()

const extractClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) return forwarded[0]?.trim()
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0]?.trim()
  }
  const cfConnectingIp = req.headers['cf-connecting-ip']
  if (Array.isArray(cfConnectingIp)) return cfConnectingIp[0]?.trim()
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.length) {
    return cfConnectingIp.trim()
  }
  return req.ip
}

const normalizeHost = (host: string | undefined) => {
  const fallback = env.defaultDomain.trim().toLowerCase()
  if (!host) return fallback
  const sanitized = host.split(':')[0]?.toLowerCase() ?? ''
  if (!sanitized || sanitized === 'localhost' || sanitized === '127.0.0.1') {
    return fallback
  }
  return sanitized
}

router.get('/:slug', async (req, res) => {
  const host = normalizeHost(req.hostname || req.get('host') || '')
  const slug = req.params.slug
  const link = await resolveLinkForRedirect(host, slug)
  if (!link) {
    res.status(404).send('Not found')
    return
  }

  const { targetUrl } = await recordLinkEvent({
    link,
    domain: host,
    ip: extractClientIp(req),
    userAgent: req.get('user-agent') ?? undefined,
    referer: req.get('referer') ?? undefined,
    eventType: 'click',
    locale: req.acceptsLanguages()?.[0],
    doNotTrack: req.get('dnt') === '1',
    query: req.query as Record<string, unknown>,
    geoOverride: geoFromCloudflareHeaders(req.headers) ?? undefined
  })

  res.redirect(302, targetUrl)
})

router.get('/qr/:code', async (req, res) => {
  const qr = await QrCode.findOne({ where: { code: req.params.code } })
  if (!qr) {
    res.status(404).send('QR not found')
    return
  }
  if (!qr.linkId) {
    res.status(400).send('QR not linked')
    return
  }
  const link = await (qr as any).getLink?.()
  if (!link) {
    res.status(404).send('Link not found')
    return
  }

  await recordQrScan(qr)
  const { targetUrl } = await recordLinkEvent({
    link,
    domain: normalizeHost(req.hostname || req.get('host') || ''),
    ip: extractClientIp(req),
    userAgent: req.get('user-agent') ?? undefined,
    referer: req.get('referer') ?? undefined,
    eventType: 'scan',
    locale: req.acceptsLanguages()?.[0],
    doNotTrack: req.get('dnt') === '1',
    query: req.query as Record<string, unknown>,
    geoOverride: geoFromCloudflareHeaders(req.headers) ?? undefined
  })
  res.redirect(302, targetUrl)
})

export default router
