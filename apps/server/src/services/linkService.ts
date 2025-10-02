import { Op, type Order, UniqueConstraintError } from 'sequelize'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Link } from '../models/link'
import { env } from '../config/env'
import { Domain } from '../models/domain'
import { LinkEvent } from '../models/linkEvent'
import type { LinkEventAttributes } from '../models/linkEvent'
import { sequelize } from '../config/database'
import { cacheLinkResolution, getCachedLink, invalidateLink, isDuplicateEvent, registerEventFingerprint } from '../lib/cache'
import { resolveGeo, hashIp, mergeGeoResults, type GeoResult } from '../lib/geo'
import { parseUserAgent, isBotUserAgent } from '../lib/userAgent'
import { dispatchWebhooks } from '../lib/webhooks'
import { resolveInteractionType, getInteractionType, getInteractionLabel } from '../lib/interactionType'
import { ensureWorkspaceLimit } from './workspaceService'
import { publishAnalyticsEvent } from '../lib/eventBus'
import { AggregationInterval, ApiLinkSchema, type AnalyticsFilters } from '@p42/shared'
import {
  buildEventsFlow,
  buildTimeSeries,
  fetchEventsForInterval,
  getIntervalGranularity,
  summarizeByDimension
} from '../lib/analytics'

const linkCreationSchema = ApiLinkSchema.extend({
  domain: z.string().min(1).default(env.defaultDomain),
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
  const normalizedDomain = data.domain.trim().toLowerCase()
  const domain = await resolveDomainOrThrow(data.workspaceId, normalizedDomain)

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
  const normalizedDomain = domainName.trim().toLowerCase()
  const defaultDomain = env.defaultDomain.trim().toLowerCase()

  const domain = await Domain.findOne({
    where: {
      domain: normalizedDomain,
      [Op.or]: [{ workspaceId }, { workspaceId: null }]
    }
  })

  if (!domain) {
    if (normalizedDomain === defaultDomain) {
      try {
        const defaultDomain = await Domain.create({
          workspaceId: null,
          projectId: null,
          domain: normalizedDomain,
          status: 'verified',
          verificationToken: `default-${nanoid(10)}`,
          verifiedAt: new Date()
        })
        return defaultDomain
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          const existing = await Domain.findOne({ where: { domain: normalizedDomain } })
          if (existing) return existing
        }
        throw error
      }
    }
    throw new Error('Domain not found')
  }

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
  const defaultDomain = env.defaultDomain.trim().toLowerCase()
  const normalizedDomain = (domain ?? '').trim().toLowerCase() || defaultDomain

  let domainRecord = await Domain.findOne({ where: { domain: normalizedDomain } })
  if (!domainRecord && normalizedDomain !== defaultDomain) {
    domainRecord = await Domain.findOne({ where: { domain: defaultDomain } })
  }
  if (!domainRecord) return null

  const cacheKey = buildCacheKey(domainRecord.domain, slug)
  const cached = getCachedLink(cacheKey)
  if (cached) return Link.build(cached, { isNewRecord: false })

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
  query?: Record<string, unknown>
  geoOverride?: Partial<GeoResult>
}) => {
  const { link, ip, userAgent, referer, eventType, locale, doNotTrack, query, geoOverride } = params
  const { device, os, browser } = parseUserAgent(userAgent)
  const isBot = isBotUserAgent(userAgent)
  const interactionType = resolveInteractionType({ eventType, referer, isBot, userAgent })
  const geo = mergeGeoResults(ip ? await resolveGeo(ip) : null, geoOverride)
  const geoRedirect = evaluateGeoRules(link, geo.country, geo.continent)
  const ipHash = hashIp(ip)
  const fingerprint = ipHash ? `${link.id}:${ipHash}:${eventType}:${browser}:${new Date().getMinutes()}` : null
  const utm = extractUtmFromQuery(query) ?? (link.utm ?? null)

  const targetUrl = (() => {
    if (hasExpired(link)) return handleExpirationRedirect(link)
    if (geoRedirect) return geoRedirect
    return link.originalUrl
  })()

  if (doNotTrack || isBot || (fingerprint && isDuplicateEvent(fingerprint))) {
    if (fingerprint && !isDuplicateEvent(fingerprint)) registerEventFingerprint(fingerprint)
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
    metadata: {
      redirectTo: targetUrl,
      domain: params.domain,
      interactionType
    },
    utm
  })

  if (fingerprint) registerEventFingerprint(fingerprint)

  const serializedEvent = event.toJSON() as LinkEventAttributes

  await publishAnalyticsEvent({
    linkId: link.id,
    projectId: link.projectId,
    workspaceId: link.workspaceId,
    eventType,
    event: {
      ...serializedEvent,
      interactionType,
      occurredAt:
        serializedEvent.occurredAt instanceof Date
          ? serializedEvent.occurredAt.toISOString()
          : serializedEvent.occurredAt
    }
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

const extractUtmFromQuery = (query?: Record<string, unknown>) => {
  if (!query) return null

  const pick = (key: string) => {
    const value = query[key]
    if (Array.isArray(value)) return value[0] ? String(value[0]) : null
    if (typeof value === 'string') return value || null
    return value != null ? String(value) : null
  }

  const utm = {
    source: pick('utm_source'),
    medium: pick('utm_medium'),
    campaign: pick('utm_campaign'),
    content: pick('utm_content'),
    term: pick('utm_term')
  }

  const hasValue = Object.values(utm).some(value => value && value.length > 0)
  return hasValue ? utm : null
}

export const getLinkAnalytics = async (params: {
  workspaceId: string
  projectId?: string
  linkId?: string
  interval: AggregationInterval
  page?: number
  pageSize?: number
  filters?: AnalyticsFilters
}) => {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 25
  const events = await fetchEventsForInterval({ ...params, filters: params.filters })
  const timeSeries = buildTimeSeries(events, params.interval)
  const timeSeriesGranularity = getIntervalGranularity(params.interval)
  const offset = (page - 1) * pageSize
  const pagedEvents = events.slice(offset, offset + pageSize)
  const totalEvents = events.length
  const totalScans = events.filter(event => getInteractionType(event) === 'scan').length
  const totalClicks = totalEvents - totalScans

  const withPercentage = <T extends { total: number }>(items: Array<T & { value?: string; label?: string }>) =>
    items.map(item => ({
      ...item,
      percentage: totalEvents === 0 ? 0 : Math.round((item.total / totalEvents) * 10000) / 100
    }))

  const summarise = (dimension: keyof LinkEvent, options?: Parameters<typeof summarizeByDimension>[2]) =>
    withPercentage(summarizeByDimension(events, dimension, options))

  const normalizePercentage = (value: number) => (totalEvents === 0 ? 0 : Math.round((value / totalEvents) * 10000) / 100)

  const byCountry = summarise('country').map(item => ({
    ...item,
    code: /^[A-Za-z]{2,3}$/.test(item.value ?? '') ? (item.value ?? '').toUpperCase() : null
  }))
  const byCity = summarise('city')
  const byContinent = summarise('continent')
  const byDevice = summarise('device')
  const byOs = summarise('os')
  const byBrowser = summarise('browser')
  const byLanguage = summarise('language')
  const byReferer = summarise('referer')
  const eventTypeBuckets = new Map<string, { value: string; label: string; total: number }>()
  events.forEach(event => {
    const type = getInteractionType(event)
    const existing = eventTypeBuckets.get(type)
    if (existing) {
      existing.total += 1
    } else {
      eventTypeBuckets.set(type, { value: type, label: getInteractionLabel(type), total: 1 })
    }
  })
  const byEventType = withPercentage(Array.from(eventTypeBuckets.values()).sort((a, b) => b.total - a.total))

  const botBreakdown = withPercentage([
    { value: 'human', label: 'Humans', total: events.filter(event => !event.isBot).length },
    { value: 'bot', label: 'Bots', total: events.filter(event => event.isBot).length }
  ])

  const summarizeUtm = (key: 'source' | 'medium' | 'campaign' | 'content' | 'term') => {
    const bucket = new Map<string, { value: string; label: string; total: number }>()
    events.forEach(event => {
      const raw = event.utm?.[key] ?? null
      const value = raw && raw.trim().length > 0 ? raw : 'unknown'
      const label = value === 'unknown' ? 'Unknown' : value
      const existing = bucket.get(value)
      if (existing) {
        existing.total += 1
      } else {
        bucket.set(value, { value, label, total: 1 })
      }
    })
    return withPercentage(Array.from(bucket.values()).sort((a, b) => b.total - a.total))
  }

  const byUtmSource = summarizeUtm('source')
  const byUtmMedium = summarizeUtm('medium')
  const byUtmCampaign = summarizeUtm('campaign')
  const byUtmContent = summarizeUtm('content')
  const byUtmTerm = summarizeUtm('term')

  const weekdayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const weekdayBuckets = new Map<number, number>()
  const hourBuckets = new Map<number, number>()

  events.forEach(event => {
    const occurred = event.occurredAt instanceof Date ? event.occurredAt : new Date(event.occurredAt)
    const weekday = occurred.getUTCDay()
    weekdayBuckets.set(weekday, (weekdayBuckets.get(weekday) ?? 0) + 1)
    const hour = occurred.getUTCHours()
    hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1)
  })

  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]
  const byWeekday = weekdayOrder.map(index => ({
    value: index.toString(),
    label: weekdayNames[index],
    total: weekdayBuckets.get(index) ?? 0,
    percentage: normalizePercentage(weekdayBuckets.get(index) ?? 0)
  }))

  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    value: hour.toString(),
    label: `${hour.toString().padStart(2, '0')}h`,
    total: hourBuckets.get(hour) ?? 0,
    percentage: normalizePercentage(hourBuckets.get(hour) ?? 0)
  }))

  const geoCountry = byCountry
    .filter(item => item.value && item.value !== 'unknown')
    .map(item => ({
      value: item.value!,
      label: item.label!,
      total: item.total,
      percentage: item.percentage,
      code: item.code ?? null
    }))

  const cityBuckets = new Map<
    string,
    {
      value: string
      label: string
      country: string | null
      countryCode: string | null
      total: number
      latSum: number
      lonSum: number
    }
  >()

  events.forEach(event => {
    if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') return
    const rawCity = event.city && event.city.trim().length > 0 ? event.city : 'unknown'
    const rawCountry = event.country && event.country.trim().length > 0 ? event.country : null
    const key = `${rawCity}|${rawCountry ?? 'unknown'}`
    const existing = cityBuckets.get(key)
    if (existing) {
      existing.total += 1
      existing.latSum += event.latitude
      existing.lonSum += event.longitude
    } else {
      cityBuckets.set(key, {
        value: rawCity,
        label: rawCity === 'unknown' ? 'Unknown city' : rawCity,
        country: rawCountry,
        countryCode: rawCountry && /^[A-Za-z]{2,3}$/.test(rawCountry) ? rawCountry.toUpperCase() : null,
        total: 1,
        latSum: event.latitude,
        lonSum: event.longitude
      })
    }
  })

  const geoCities = withPercentage(
    Array.from(cityBuckets.values())
      .map(entry => ({
        value: entry.value,
        label: entry.label,
        country: entry.country,
        countryCode: entry.countryCode,
        total: entry.total,
        latitude: entry.latSum / entry.total,
        longitude: entry.lonSum / entry.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 250)
  )

  const appliedFilters = params.filters ?? {}
  const optionShouldPersist = (filterId: keyof AnalyticsFilters, value: string) => {
    const selected = appliedFilters[filterId]
    if (!selected) return false
    return selected.includes(value as never)
  }

  const toFilterOptions = (filterId: keyof AnalyticsFilters, items: Array<{ value?: string; label?: string; total: number; percentage: number }>) =>
    items
      .filter(item => item.total > 0 || (item.value && optionShouldPersist(filterId, item.value)))
      .map(item => ({
        value: item.value ?? 'unknown',
        label: item.label ?? 'Unknown',
        count: item.total,
        percentage: item.percentage
      }))
      .sort((a, b) => b.count - a.count)

  const availableFilters = [
    { id: 'eventType' as const, label: 'Type d\'événement', options: toFilterOptions('eventType', byEventType) },
    { id: 'device' as const, label: 'Appareil', options: toFilterOptions('device', byDevice) },
    { id: 'os' as const, label: 'Système', options: toFilterOptions('os', byOs) },
    { id: 'browser' as const, label: 'Navigateur', options: toFilterOptions('browser', byBrowser) },
    { id: 'language' as const, label: 'Langue', options: toFilterOptions('language', byLanguage) },
    { id: 'country' as const, label: 'Pays', options: toFilterOptions('country', byCountry) },
    { id: 'city' as const, label: 'Ville', options: toFilterOptions('city', byCity) },
    { id: 'continent' as const, label: 'Continent', options: toFilterOptions('continent', byContinent) },
    { id: 'referer' as const, label: 'Referer', options: toFilterOptions('referer', byReferer) },
    { id: 'isBot' as const, label: 'Type de trafic', options: toFilterOptions('isBot', botBreakdown) },
    { id: 'utmSource' as const, label: 'UTM Source', options: toFilterOptions('utmSource', byUtmSource) },
    { id: 'utmMedium' as const, label: 'UTM Medium', options: toFilterOptions('utmMedium', byUtmMedium) },
    { id: 'utmCampaign' as const, label: 'UTM Campaign', options: toFilterOptions('utmCampaign', byUtmCampaign) },
    { id: 'utmContent' as const, label: 'UTM Content', options: toFilterOptions('utmContent', byUtmContent) },
    { id: 'utmTerm' as const, label: 'UTM Term', options: toFilterOptions('utmTerm', byUtmTerm) }
  ]
    .map(group => ({ ...group, type: 'multi' as const }))
    .filter(group => group.options.length > 0)

  return {
    interval: params.interval,
    totalEvents,
    totalClicks,
    totalScans,
    timeSeries,
    timeSeriesGranularity,
    byCountry,
    byCity,
    byContinent,
    byDevice,
    byOs,
    byBrowser,
    byLanguage,
    byReferer,
    byEventType,
    byBotStatus: botBreakdown,
    byWeekday,
    byHour,
    byUtmSource,
    byUtmMedium,
    byUtmCampaign,
    byUtmContent,
    byUtmTerm,
    geo: {
      countries: geoCountry,
      cities: geoCities
    },
    eventsFlow: buildEventsFlow(pagedEvents),
    pagination: { page, pageSize },
    availableFilters,
    appliedFilters
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
    interval: AggregationInterval
  },
  format: 'csv' | 'json'
) => {
  const analytics = await getLinkAnalytics(params)
  if (format === 'json') return JSON.stringify(analytics, null, 2)

  const headers = ['timestamp', 'total']
  const rows = (analytics.timeSeries ?? []).map(row => `${row.timestamp},${row.total}`)
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
