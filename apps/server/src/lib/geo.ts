import crypto from 'crypto'
import { WebServiceClient } from '@maxmind/geoip2-node'
import { env } from '../config/env'

type GeoResult = {
  country: string | null
  city: string | null
  continent: string | null
  latitude: number | null
  longitude: number | null
}

let client: WebServiceClient | null = null

const getClient = () => {
  if (client) return client
  if (!env.maxmind.accountId || !env.maxmind.licenseKey) return null
  client = new WebServiceClient(env.maxmind.accountId, env.maxmind.licenseKey)
  return client
}

export const resolveGeo = async (ip: string): Promise<GeoResult> => {
  const mmClient = getClient()
  if (!mmClient) {
    return {
      country: null,
      city: null,
      continent: null,
      latitude: null,
      longitude: null
    }
  }

  try {
    const response = await mmClient.city(ip)
    return {
      country: response.country?.isoCode ?? null,
      city: response.city?.names?.en ?? null,
      continent: response.continent?.code ?? null,
      latitude: response.location?.latitude ?? null,
      longitude: response.location?.longitude ?? null
    }
  } catch (error) {
    return {
      country: null,
      city: null,
      continent: null,
      latitude: null,
      longitude: null
    }
  }
}

export const hashIp = (ip: string | undefined) => {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip).digest('hex')
}
