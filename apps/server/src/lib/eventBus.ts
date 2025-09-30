import { EventEmitter } from 'events'
import Redis from 'ioredis'
import { env } from '../config/env'

type AnalyticsEventPayload = {
  linkId: string
  projectId: string | null
  workspaceId: string
  eventType: 'click' | 'scan'
  event: {
    id: string
    occurredAt: string
    [key: string]: unknown
  }
}

const CHANNEL = 'analytics:events'
const emitter = new EventEmitter()

let publisher: Redis | null = null
let subscriber: Redis | null = null
let redisDisabled = false

const disableRedis = (error?: unknown) => {
  if (redisDisabled) return
  redisDisabled = true
  if (error) {
    console.error('[eventBus] redis disabled', error)
  }
  if (publisher) {
    publisher.removeAllListeners()
    publisher.disconnect()
  }
  if (subscriber) {
    subscriber.removeAllListeners()
    subscriber.disconnect()
  }
  publisher = null
  subscriber = null
}

const bootstrapRedis = () => {
  if (redisDisabled || !env.redisUrl || publisher || subscriber) return

  const options = {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null
  }

  publisher = new Redis(env.redisUrl, options)
  subscriber = new Redis(env.redisUrl, options)

  const handleError = (error: unknown) => {
    disableRedis(error)
  }

  publisher.on('error', handleError)
  subscriber.on('error', handleError)

  publisher.connect().catch(handleError)
  subscriber.connect().catch(handleError)

  subscriber.on('ready', () => {
    if (!subscriber) return
    subscriber.subscribe(CHANNEL).catch(handleError)
  })

  subscriber.on('message', (_, message) => {
    if (redisDisabled) return
    try {
      const payload = JSON.parse(message)
      emitter.emit('analytics:event', payload)
    } catch (error) {
      console.error('[eventBus] failed to parse payload', error)
    }
  })
}

export const publishAnalyticsEvent = async (payload: AnalyticsEventPayload) => {
  bootstrapRedis()
  emitter.emit('analytics:event', payload)
  if (publisher && !redisDisabled && publisher.status === 'ready') {
    try {
      await publisher.publish(CHANNEL, JSON.stringify(payload))
    } catch (error) {
      disableRedis(error)
    }
  }
}

export const subscribeAnalyticsEvents = (
  handler: (payload: AnalyticsEventPayload) => void
) => {
  bootstrapRedis()
  emitter.on('analytics:event', handler)
  return () => emitter.off('analytics:event', handler)
}
