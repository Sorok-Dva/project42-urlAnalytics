import type { AnalyticsFilters } from '@p42/shared'

export const ALLOWED_FILTER_KEYS: Array<keyof AnalyticsFilters> = [
  'eventType',
  'device',
  'os',
  'browser',
  'language',
  'country',
  'city',
  'continent',
  'referer',
  'isBot',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm'
]

export const parseAnalyticsFilters = (value: unknown): AnalyticsFilters | undefined => {
  if (!value) return undefined
  try {
    const raw =
      typeof value === 'string'
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>)
    if (!raw || typeof raw !== 'object') return undefined

    const result: AnalyticsFilters = {}

    ALLOWED_FILTER_KEYS.forEach(key => {
      const entry = raw[key as string]
      if (!entry) return
      const toArray = Array.isArray(entry) ? entry : [entry]
      const normalized = toArray
        .map(item => (typeof item === 'string' ? item : item != null ? String(item) : undefined))
        .filter((item): item is string => Boolean(item))
      if (normalized.length === 0) return

      if (key === 'isBot') {
        const mapped = normalized
          .map(value => {
            const lower = value.toLowerCase()
            if (lower === 'bot') return 'bot' as const
            if (lower === 'human') return 'human' as const
            return undefined
          })
          .filter((value): value is 'bot' | 'human' => Boolean(value))
        if (mapped.length > 0) {
          result[key] = mapped
        }
      } else {
        result[key] = normalized
      }
    })

    return Object.keys(result).length > 0 ? result : undefined
  } catch (error) {
    return undefined
  }
}
