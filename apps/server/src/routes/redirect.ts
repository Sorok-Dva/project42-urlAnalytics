import { Router, type Router as ExpressRouter } from 'express'
import { resolveLinkForRedirect, recordLinkEvent } from '../services/linkService'
import { QrCode } from '../models/qrCode'
import { recordQrScan } from '../services/qrService'

const router: ExpressRouter = Router()

router.get('/:slug', async (req, res) => {
  const host = req.get('host') ?? ''
  const slug = req.params.slug
  const link = await resolveLinkForRedirect(host, slug)
  if (!link) {
    res.status(404).send('Not found')
    return
  }

  const { targetUrl } = await recordLinkEvent({
    link,
    domain: host,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
    referer: req.get('referer') ?? undefined,
    eventType: 'click',
    locale: req.acceptsLanguages()?.[0],
    doNotTrack: req.get('dnt') === '1'
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
    domain: req.get('host') ?? '',
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
    referer: req.get('referer') ?? undefined,
    eventType: 'scan',
    locale: req.acceptsLanguages()?.[0],
    doNotTrack: req.get('dnt') === '1'
  })
  res.redirect(302, targetUrl)
})

export default router
