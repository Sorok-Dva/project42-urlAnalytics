import crypto from 'crypto'
import { WebServiceClient } from '@maxmind/geoip2-node'
import geoip from 'geoip-lite'
import type { IncomingHttpHeaders } from 'http'
import { env } from '../config/env'

export type GeoResult = {
  country: string | null
  city: string | null
  continent: string | null
  latitude: number | null
  longitude: number | null
}

export const emptyGeoResult: GeoResult = {
  country: null,
  city: null,
  continent: null,
  latitude: null,
  longitude: null
}

let client: WebServiceClient | null = null

const getClient = () => {
  if (client) return client
  if (!env.maxmind.accountId || !env.maxmind.licenseKey) return null
  client = new WebServiceClient(env.maxmind.accountId, env.maxmind.licenseKey)
  return client
}

const isIpv4MappedIpv6 = (input: string) => input.startsWith('::ffff:')

const normalizeIpForLookup = (ip: string) => {
  if (!ip) return ip
  const trimmed = ip.trim()
  if (isIpv4MappedIpv6(trimmed)) return trimmed.slice(7)
  return trimmed
}

const countryToContinentMap: Record<string, string> = {
  AD: 'EU', AE: 'AS', AF: 'AS', AG: 'NA', AI: 'NA', AL: 'EU', AM: 'AS', AO: 'AF', AQ: 'AN', AR: 'SA',
  AS: 'OC', AT: 'EU', AU: 'OC', AW: 'NA', AX: 'EU', AZ: 'AS', BA: 'EU', BB: 'NA', BD: 'AS', BE: 'EU',
  BF: 'AF', BG: 'EU', BH: 'AS', BI: 'AF', BJ: 'AF', BL: 'NA', BM: 'NA', BN: 'AS', BO: 'SA', BQ: 'NA',
  BR: 'SA', BS: 'NA', BT: 'AS', BV: 'AN', BW: 'AF', BY: 'EU', BZ: 'NA', CA: 'NA', CC: 'AS', CD: 'AF',
  CF: 'AF', CG: 'AF', CH: 'EU', CI: 'AF', CK: 'OC', CL: 'SA', CM: 'AF', CN: 'AS', CO: 'SA', CR: 'NA',
  CU: 'NA', CV: 'AF', CW: 'NA', CX: 'AS', CY: 'AS', CZ: 'EU', DE: 'EU', DJ: 'AF', DK: 'EU', DM: 'NA',
  DO: 'NA', DZ: 'AF', EC: 'SA', EE: 'EU', EG: 'AF', EH: 'AF', ER: 'AF', ES: 'EU', ET: 'AF', FI: 'EU',
  FJ: 'OC', FK: 'SA', FM: 'OC', FO: 'EU', FR: 'EU', GA: 'AF', GB: 'EU', GD: 'NA', GE: 'AS', GF: 'SA',
  GG: 'EU', GH: 'AF', GI: 'EU', GL: 'NA', GM: 'AF', GN: 'AF', GP: 'NA', GQ: 'AF', GR: 'EU', GS: 'AN',
  GT: 'NA', GU: 'OC', GW: 'AF', GY: 'SA', HK: 'AS', HM: 'AN', HN: 'NA', HR: 'EU', HT: 'NA', HU: 'EU',
  ID: 'AS', IE: 'EU', IL: 'AS', IM: 'EU', IN: 'AS', IO: 'AS', IQ: 'AS', IR: 'AS', IS: 'EU', IT: 'EU',
  JE: 'EU', JM: 'NA', JO: 'AS', JP: 'AS', KE: 'AF', KG: 'AS', KH: 'AS', KI: 'OC', KM: 'AF', KN: 'NA',
  KP: 'AS', KR: 'AS', KW: 'AS', KY: 'NA', KZ: 'AS', LA: 'AS', LB: 'AS', LC: 'NA', LI: 'EU', LK: 'AS',
  LR: 'AF', LS: 'AF', LT: 'EU', LU: 'EU', LV: 'EU', LY: 'AF', MA: 'AF', MC: 'EU', MD: 'EU', ME: 'EU',
  MF: 'NA', MG: 'AF', MH: 'OC', MK: 'EU', ML: 'AF', MM: 'AS', MN: 'AS', MO: 'AS', MP: 'OC', MQ: 'NA',
  MR: 'AF', MS: 'NA', MT: 'EU', MU: 'AF', MV: 'AS', MW: 'AF', MX: 'NA', MY: 'AS', MZ: 'AF', NA: 'AF',
  NC: 'OC', NE: 'AF', NF: 'OC', NG: 'AF', NI: 'NA', NL: 'EU', NO: 'EU', NP: 'AS', NR: 'OC', NU: 'OC',
  NZ: 'OC', OM: 'AS', PA: 'NA', PE: 'SA', PF: 'OC', PG: 'OC', PH: 'AS', PK: 'AS', PL: 'EU', PM: 'NA',
  PN: 'OC', PR: 'NA', PS: 'AS', PT: 'EU', PW: 'OC', PY: 'SA', QA: 'AS', RE: 'AF', RO: 'EU', RS: 'EU',
  RU: 'EU', RW: 'AF', SA: 'AS', SB: 'OC', SC: 'AF', SD: 'AF', SE: 'EU', SG: 'AS', SH: 'AF', SI: 'EU',
  SJ: 'EU', SK: 'EU', SL: 'AF', SM: 'EU', SN: 'AF', SO: 'AF', SR: 'SA', SS: 'AF', ST: 'AF', SV: 'NA',
  SX: 'NA', SY: 'AS', SZ: 'AF', TC: 'NA', TD: 'AF', TF: 'AN', TG: 'AF', TH: 'AS', TJ: 'AS', TK: 'OC',
  TL: 'AS', TM: 'AS', TN: 'AF', TO: 'OC', TR: 'AS', TT: 'NA', TV: 'OC', TW: 'AS', TZ: 'AF', UA: 'EU',
  UG: 'AF', UM: 'OC', US: 'NA', UY: 'SA', UZ: 'AS', VA: 'EU', VC: 'NA', VE: 'SA', VG: 'NA', VI: 'NA',
  VN: 'AS', VU: 'OC', WF: 'OC', WS: 'OC', YE: 'AS', YT: 'AF', ZA: 'AF', ZM: 'AF', ZW: 'AF'
}

const inferContinent = (country: string | null): string | null => {
  if (!country) return null
  const normalized = country.trim().toUpperCase()
  return countryToContinentMap[normalized] ?? null
}

function geoLiteLookup(ip: string): GeoResult | null {
  try {
    const result = geoip.lookup(normalizeIpForLookup(ip))
    if (!result) return null
    const [lat, lon] = result.ll ?? []
    const latitude = typeof lat === 'number' ? lat : null
    const longitude = typeof lon === 'number' ? lon : null

    return {
      country: result.country ?? null,
      city: result.city ?? null,
      continent: inferContinent(result.country ?? null),
      latitude,
      longitude
    }
  } catch (error) {
    return null
  }
}

export const resolveGeo = async (ip: string): Promise<GeoResult> => {
  const normalizedIp = normalizeIpForLookup(ip)
  const fallback = () => geoLiteLookup(normalizedIp) ?? { ...emptyGeoResult }

  const mmClient = getClient()
  if (!mmClient) {
    return fallback()
  }

  try {
    const response = await mmClient.city(normalizedIp)
    return {
      country: response.country?.isoCode ?? null,
      city: response.city?.names?.en ?? null,
      continent: response.continent?.code ?? null,
      latitude: response.location?.latitude ?? null,
      longitude: response.location?.longitude ?? null
    }
  } catch (error) {
    return fallback()
  }
}

export const hashIp = (ip: string | undefined) => {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip).digest('hex')
}

const headerValueToString = (value: string | string[] | undefined): string | null => {
  if (!value) return null
  return Array.isArray(value) ? value[0]?.trim() ?? null : value.trim() || null
}

const headerValueToNumber = (value: string | string[] | undefined): number | null => {
  const stringValue = headerValueToString(value)
  if (!stringValue) return null
  const parsed = Number(stringValue)
  return Number.isFinite(parsed) ? parsed : null
}

export const geoFromCloudflareHeaders = (headers: IncomingHttpHeaders): Partial<GeoResult> | null => {
  const country = headerValueToString(headers['cf-ipcountry'])
  const city = headerValueToString(headers['cf-ipcity'])
  const latitude = headerValueToNumber(headers['cf-iplatitude'])
  const longitude = headerValueToNumber(headers['cf-iplongitude'])
  const continentHeader = headerValueToString(headers['cf-ipcontinent'])

  if (!country && !city && latitude === null && longitude === null && !continentHeader) {
    return null
  }

  return {
    country: country ?? null,
    city: city ?? null,
    latitude,
    longitude,
    continent: (continentHeader ?? inferContinent(country ?? null)) ?? null
  }
}

export const mergeGeoResults = (
  ...sources: Array<Partial<GeoResult> | null | undefined>
): GeoResult => {
  return sources.reduce<GeoResult>((accumulator, source) => {
    if (!source) return accumulator
    const next: GeoResult = { ...accumulator }

    if (source.country !== undefined && source.country !== null) next.country = source.country
    if (source.city !== undefined && source.city !== null) next.city = source.city
    if (source.continent !== undefined && source.continent !== null) next.continent = source.continent
    if (source.latitude !== undefined && source.latitude !== null) next.latitude = source.latitude
    if (source.longitude !== undefined && source.longitude !== null) next.longitude = source.longitude

    return next
  }, { ...emptyGeoResult })
}
