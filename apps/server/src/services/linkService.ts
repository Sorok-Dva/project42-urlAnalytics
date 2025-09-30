import { Op, type Order } from 'sequelize'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Link } from '../models/link'
import { env } from '../config/env'
import { Domain } from '../models/domain'
import { LinkEvent } from '../models/linkEvent'
import { sequelize } from '../config/database'
import { cacheLinkResolution, getCachedLink, invalidateLink, isDuplicateEvent, registerEventFingerprint } from '../lib/cache'
import { resolveGeo, hashIp } from '../lib/geo'
import { parseUserAgent, isBotUserAgent } from '../lib/userAgent'
import { dispatchWebhooks } from '../lib/webhooks'
import { ensureWorkspaceLimit } from './workspaceService'
import { analyticsEmitter } from '../lib/events'
import { AggregationInterval, ApiLinkSchema } from '@p42/shared'
import { buildEventsFlow, buildTimeSeries, fetchEventsForInterval, summarizeByDimension } from '../lib/analytics'

const linkCreationSchema = ApiLinkSchema.extend({
  slug: z.string().min(3).optional(),
  workspaceId: z.string().uuid(),
  createdById: z.string().uuid()
})

const linkUpdateSchema = ApiLinkSchema.partial().extend({
  workspaceId: z.string().uuid(),
  linkId: z.string().uuid()
})

export const buildCacheKey = (domain: string, slug: string) => `${domain}:${slug}`

export const getLinkByToken = async (token: string) => {
  return Link.findOne({ where: { publicStatsToken: token, publicStats: true } })
}

export const createLink = async (payload: z.infer<typeof linkCreationSchema>) => {
  const data = linkCreationSchema.parse(payload)
  const slug = data.slug || nanoid(8)
  const domain = await resolveDomainOrThrow(data.workspaceId, data.domain)

  await ensureWorkspaceLimit(data.workspaceId, 'links')
  return sequelize.transaction(async transaction => {
    const existing = await Link.findOne({
      where: {
        workspaceId: data.workspaceId,
        domainId: domain.id,
        slug
      },
      transaction
    })
    if (existing) throw new Error('Slug already exists for domain')

    const link = await Link.create(
      {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        domainId: domain.id,
        slug,
        originalUrl: data.originalUrl,
        comment: data.comment ?? null,
        geoRules: data.geoRules,
        expirationAt: data.expiration?.expireAt ? new Date(data.expiration.expireAt) : null,
        maxClicks: data.expiration?.maxClicks ?? null,
        fallbackUrl: data.expiration?.redirectUrl ?? null,
        publicStats: data.publicStats,
        publicStatsToken: data.publicStats ? nanoid(12) : null,
        metadata: {},
        utm: extractUtmParams(data.originalUrl),
        createdById: data.createdById
      },
      { transaction }
    )

    cacheLinkResolution(buildCacheKey(domain.domain, slug), link)
    return link
  })
}

export const getLinkById = async (workspaceId: string, linkId: string) => {
  return Link.findOne({
    where: { id: linkId, workspaceId },
    include: [{ model: Domain, as: 'domain' }]
  })
}

export const updateLink = async (payload: z.infer<typeof linkUpdateSchema>) => {
  const data = linkUpdateSchema.parse(payload)
  const link = await Link.findByPk(data.linkId)
  if (!link) throw new Error('Link not found')

  const domainRecord = await Domain.findByPk(link.domainId ?? undefined)
  const currentDomain = domainRecord?.domain

  await ensureWorkspaceLimit(data.workspaceId, 'links')
  return sequelize.transaction(async transaction => {
    if (data.domain && !currentDomain) {
      const targetDomain = await resolveDomainOrThrow(link.workspaceId, data.domain)
      link.domainId = targetDomain.id
    } else if (data.domain && data.domain !== currentDomain) {
      const targetDomain = await resolveDomainOrThrow(link.workspaceId, data.domain)
      link.domainId = targetDomain.id
    }

    const domainName = data.domain ?? currentDomain
    if (!domainName) throw new Error('Domain not found')

    if (data.slug) {
      const duplicate = await Link.findOne({
        where: {
          workspaceId: link.workspaceId,
          domainId: link.domainId,
          slug: data.slug,
          id: { [Op.ne]: link.id }
        },
        transaction
      })
      if (duplicate) throw new Error('Slug already exists for domain')
      link.slug = data.slug
    }

    if (data.originalUrl) {
      link.originalUrl = data.originalUrl
      link.utm = extractUtmParams(data.originalUrl)
    }
    if (typeof data.comment !== 'undefined') link.comment = data.comment
    if (typeof data.publicStats !== 'undefined') link.publicStats = data.publicStats
    if (data.geoRules) link.geoRules = data.geoRules
    if (data.expiration) {
      link.expirationAt = data.expiration.expireAt ? new Date(data.expiration.expireAt) : null
      link.maxClicks = data.expiration.maxClicks ?? null
      link.fallbackUrl = data.expiration.redirectUrl ?? null
    }

    await link.save({ transaction })

    const cacheKey = buildCacheKey(domainName, link.slug)
    invalidateLink(cacheKey)
    cacheLinkResolution(cacheKey, link)
    return link
  })
}

export const listLinks = async (
  workspaceId: string,
  filters: {
    status?: 'active' | 'archived' | 'deleted'
    projectId?: string
    search?: string
    sort?: 'recent' | 'performance' | 'old'
  }
) => {
  const where: any = { workspaceId }
  if (filters.status) where.status = filters.status
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.search) {
    (where as any)[Op.or] = [
      { slug: { [Op.like]: `%${filters.search}%` } },
      { originalUrl: { [Op.like]: `%${filters.search}%` } },
      { comment: { [Op.like]: `%${filters.search}%` } }
    ]
  }

  const order: Order = (() => {
    switch (filters.sort) {
      case 'performance':
        return [['clickCount', 'DESC']] as Order
      case 'old':
        return [['createdAt', 'ASC']] as Order
      default:
        return [['createdAt', 'DESC']] as Order
    }
  })()

  return Link.findAll({ where, order, include: [{ model: Domain, as: 'domain' }] })
}

const resolveDomainOrThrow = async (workspaceId: string, domainName: string) => {
  const domain = await Domain.findOne({
    where: {
      workspaceId,
      domain: domainName
    }
  })

  if (!domain) throw new Error('Domain not found')
  if (domain.status !== 'verified') throw new Error('Domain not verified')
  return domain
}

const extractUtmParams = (url: string) => {
  try {
    const parsed = new URL(url)
    return {
      source: parsed.searchParams.get('utm_source'),
      medium: parsed.searchParams.get('utm_medium'),
      campaign: parsed.searchParams.get('utm_campaign'),
      content: parsed.searchParams.get('utm_content'),
      term: parsed.searchParams.get('utm_term')
    }
  } catch (error) {
    return {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null
    }
  }
}

const evaluateGeoRules = (link: Link, country: string | null, continent: string | null) => {
  if (!link.geoRules?.length) return null
  const sorted = [...link.geoRules].sort((a, b) => a.priority - b.priority)
  for (const rule of sorted) {
    if (rule.scope === 'country' && rule.target === country) return rule.url
    if (rule.scope === 'continent' && rule.target === continent) return rule.url
  }
  return null
}

const hasExpired = (link: Link) => {
  if (link.expirationAt && new Date() > link.expirationAt) return true
  if (link.maxClicks && link.clickCount >= link.maxClicks) return true
  return false
}

const handleExpirationRedirect = (link: Link) => {
  return link.fallbackUrl ?? link.originalUrl
}

export const resolveLinkForRedirect = async (domain: string, slug: string) => {
  const cacheKey = buildCacheKey(domain, slug)
  const cached = getCachedLink(cacheKey)
  if (cached) return Link.build(cached, { isNewRecord: false })

  const domainRecord = await Domain.findOne({ where: { domain } })
  if (!domainRecord) return null
  const link = await Link.findOne({
    where: {
      domainId: domainRecord.id,
      slug,
      status: 'active'
    }
  })
  if (!link) return null
  cacheLinkResolution(cacheKey, link)
  return link
}

export const recordLinkEvent = async (params: {
  link: Link
  domain: string
  ip?: string
  userAgent?: string
  referer?: string
  eventType: 'click' | 'scan'
  locale?: string
  doNotTrack?: boolean
}) => {
  const { link, ip, userAgent, referer, eventType, locale, doNotTrack } = params
  const { device, os, browser } = parseUserAgent(userAgent)
  const isBot = isBotUserAgent(userAgent)
  const geo = await resolveGeo(ip ?? '')
  const geoRedirect = evaluateGeoRules(link, geo.country, geo.continent)
  const ipHash = hashIp(ip)
  const fingerprint = `${link.id}:${ipHash ?? 'unknown'}:${eventType}:${browser}:${new Date().getMinutes()}`

  const targetUrl = (() => {
    if (hasExpired(link)) return handleExpirationRedirect(link)
    if (geoRedirect) return geoRedirect
    return link.originalUrl
  })()

  if (doNotTrack || isBot || (fingerprint && isDuplicateEvent(fingerprint))) {
    if (!isDuplicateEvent(fingerprint) && fingerprint) registerEventFingerprint(fingerprint)
    return { targetUrl, event: null }
  }

  const event = await LinkEvent.create({
    workspaceId: link.workspaceId,
    projectId: link.projectId,
    linkId: link.id,
    eventType,
    referer: referer ?? null,
    device,
    os,
    browser,
    language: locale ?? null,
    country: geo.country,
    city: geo.city,
    continent: geo.continent,
    latitude: geo.latitude,
    longitude: geo.longitude,
    isBot,
    ipHash,
    userAgent: userAgent ?? null,
    occurredAt: new Date(),
    utm: link.utm
  })

  if (fingerprint) registerEventFingerprint(fingerprint)

  analyticsEmitter.emit('link-event', {
    linkId: link.id,
    projectId: link.projectId,
    workspaceId: link.workspaceId,
    eventType,
    event
  })
  await link.increment('clickCount')
  await dispatchWebhooks(link.workspaceId, eventType === 'scan' ? 'scan.recorded' : 'click.recorded', {
    linkId: link.id,
    eventId: event.id,
    occurredAt: event.occurredAt.toISOString()
  })

  return {
    targetUrl,
    event
  }
}

export const getLinkAnalytics = async (params: {
  workspaceId: string
  projectId?: string
  linkId?: string
  interval: typeof AggregationInterval[number]
  page?: number
  pageSize?: number
}) => {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 25
  const events = await fetchEventsForInterval(params)
  const timeSeries = buildTimeSeries(events, params.interval)
  const offset = (page - 1) * pageSize
  const pagedEvents = events.slice(offset, offset + pageSize)

  return {
    interval: params.interval,
    totalEvents: events.length,
    timeSeries,
    byCountry: summarizeByDimension(events, 'country'),
    byCity: summarizeByDimension(events, 'city'),
    byContinent: summarizeByDimension(events, 'continent'),
    byDevice: summarizeByDimension(events, 'device'),
    byOs: summarizeByDimension(events, 'os'),
    byBrowser: summarizeByDimension(events, 'browser'),
    byLanguage: summarizeByDimension(events, 'language'),
    byReferer: summarizeByDimension(events, 'referer'),
    eventsFlow: buildEventsFlow(pagedEvents),
    pagination: { page, pageSize }
  }
}

export const togglePublicStats = async (linkId: string, enabled: boolean) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  link.publicStats = enabled
  link.publicStatsToken = enabled ? link.publicStatsToken ?? nanoid(16) : null
  await link.save()
  return link
}

export const exportLinkAnalytics = async (
  params: {
    workspaceId: string
    projectId?: string
    linkId?: string
    interval: typeof AggregationInterval[number]
  },
  format: 'csv' | 'json'
) => {
  const analytics = await getLinkAnalytics(params)
  if (format === 'json') return JSON.stringify(analytics, null, 2)

  const headers = ['timestamp', 'total']
  const rows = analytics.timeSeries.map(row => `${row.timestamp},${row.total}`)
  return [headers.join(','), ...rows].join('\n')
}

export const archiveLink = async (linkId: string) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  link.status = 'archived'
  await link.save()
  return link
}

export const unarchiveLink = async (linkId: string) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  link.status = 'active'
  await link.save()
  return link
}

export const deleteLink = async (linkId: string) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  link.status = 'deleted'
  await link.save()
  return link
}

export const moveLinkToProject = async (linkId: string, projectId: string | null) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  link.projectId = projectId
  await link.save()
  return link
}

export const duplicateLink = async (linkId: string, overrides?: Partial<{ slug: string }>) => {
  const link = await Link.findByPk(linkId)
  if (!link) throw new Error('Link not found')
  const domain = await Domain.findByPk(link.domainId ?? undefined)
  if (!domain) throw new Error('Domain not found')

  const slug = overrides?.slug ?? `${link.slug}-${nanoid(5)}`
  const duplicate = await Link.create({
    workspaceId: link.workspaceId,
    projectId: link.projectId,
    domainId: link.domainId,
    slug,
    originalUrl: link.originalUrl,
    comment: link.comment,
    status: 'active',
    geoRules: link.geoRules,
    expirationAt: link.expirationAt,
    maxClicks: link.maxClicks,
    clickCount: 0,
    fallbackUrl: link.fallbackUrl,
    publicStats: link.publicStats,
    metadata: link.metadata,
    utm: link.utm,
    createdById: link.createdById
  })

  cacheLinkResolution(buildCacheKey(domain.domain, slug), duplicate)
  return duplicate
}

export const getLinkShareUrl = (link: Link) => {
  if (!link.publicStats || !link.publicStatsToken) return null
  return `${env.publicBaseUrl}/share/link/${link.publicStatsToken}`
}
