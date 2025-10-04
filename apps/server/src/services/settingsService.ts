import { AppSetting } from '../models/appSetting'

const cache = new Map<string, unknown>()

export const getSetting = async <T = unknown>(key: string, fallback?: T): Promise<T | undefined> => {
  if (cache.has(key)) {
    return cache.get(key) as T
  }

  const setting = await AppSetting.findByPk(key)
  if (!setting) {
    if (fallback !== undefined) {
      cache.set(key, fallback)
    }
    return fallback
  }

  cache.set(key, setting.value as T)
  return setting.value as T
}

export const getNumericSetting = async (key: string, fallback: number): Promise<number> => {
  const value = await getSetting<number>(key, fallback)
  if (value === undefined || value === null) return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export const setSettings = async (payload: Record<string, unknown>) => {
  const entries = Object.entries(payload)
  for (const [key, value] of entries) {
    await AppSetting.upsert({ key, value })
    cache.set(key, value)
  }
}

export const getAllSettings = async (): Promise<Record<string, unknown>> => {
  const settings = await AppSetting.findAll()
  settings.forEach(setting => cache.set(setting.key, setting.value))
  return settings.reduce<Record<string, unknown>>((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})
}

export const clearSettingsCache = () => cache.clear()
