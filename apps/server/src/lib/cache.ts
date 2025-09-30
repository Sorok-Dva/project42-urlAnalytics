import NodeCache from 'node-cache'
import { env } from '../config/env'
import { Link } from '../models/link'

const slugCache = new NodeCache({ stdTTL: env.cacheTtl, checkperiod: env.cacheTtl })
const eventDedupCache = new NodeCache({ stdTTL: 30, checkperiod: 30 })

export const cacheLinkResolution = (key: string, link: Link) => {
  slugCache.set(key, link.toJSON())
}

export const getCachedLink = (key: string) => {
  const value = slugCache.get<Link>(key)
  return value ?? null
}

export const invalidateLink = (key: string) => {
  slugCache.del(key)
}

export const cacheStatsPreferences = new NodeCache({ stdTTL: env.cacheTtl * 2 })

export const registerEventFingerprint = (fingerprint: string) => {
  eventDedupCache.set(fingerprint, true, 30)
}

export const isDuplicateEvent = (fingerprint: string) => {
  return eventDedupCache.has(fingerprint)
}
