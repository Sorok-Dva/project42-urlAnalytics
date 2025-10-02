import type { LinkEvent } from '../models/linkEvent'

export type InteractionType = 'click' | 'scan' | 'direct' | 'api' | 'bot'

const CLI_USER_AGENT_PATTERNS = [
  /curl/i,
  /wget/i,
  /httpie/i,
  /python-requests/i,
  /libcurl/i,
  /powershell/i,
  /postman/i,
  /insomnia/i,
  /restsharp/i,
  /okhttp/i,
  /axios/i,
  /node-fetch/i,
  /go-http-client/i,
  /libwww-perl/i,
  /httpclient/i
]

const KNOWN_TYPES = new Set<InteractionType>(['click', 'scan', 'direct', 'api', 'bot'])

const normalizeString = (value?: string | null) => value?.trim().toLowerCase() ?? ''

export const resolveInteractionType = (input: {
  eventType: 'click' | 'scan'
  referer?: string | null
  isBot?: boolean
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}): InteractionType => {
  const metadataRecord = (input.metadata ?? null) as { interactionType?: unknown } | null
  const metadataValue = metadataRecord?.interactionType
  const rawMetadataType = typeof metadataValue === 'string' ? normalizeString(metadataValue) : ''

  if (rawMetadataType && KNOWN_TYPES.has(rawMetadataType as InteractionType)) {
    return rawMetadataType as InteractionType
  }

  if (input.eventType === 'scan') return 'scan'
  if (input.isBot) return 'bot'

  const userAgent = normalizeString(input.userAgent)
  if (CLI_USER_AGENT_PATTERNS.some(pattern => pattern.test(userAgent))) {
    return 'api'
  }

  const referer = normalizeString(input.referer)
  if (!referer || referer === 'direct' || referer === 'unknown' || referer === '-') {
    return 'direct'
  }

  return 'click'
}

export const getInteractionType = (event: LinkEvent): InteractionType =>
  resolveInteractionType({
    eventType: event.eventType,
    referer: event.referer,
    isBot: event.isBot,
    userAgent: event.userAgent,
    metadata: event.metadata
  })

export const getInteractionLabel = (type: InteractionType) => {
  switch (type) {
    case 'scan':
      return 'Scans'
    case 'direct':
      return 'Direct'
    case 'api':
      return 'API'
    case 'bot':
      return 'Bots'
    case 'click':
    default:
      return 'Clicks'
  }
}
