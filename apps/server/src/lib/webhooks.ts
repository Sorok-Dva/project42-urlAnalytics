import crypto from 'crypto'
import { Webhook } from '../models/webhook'
import { env } from '../config/env'

type WebhookEvent = 'click.recorded' | 'scan.recorded'

type WebhookPayload = Record<string, unknown>

const signPayload = (secret: string, payload: WebhookPayload) => {
  const body = JSON.stringify(payload)
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return { body, signature }
}

const sendWebhook = async (webhook: Webhook, payload: WebhookPayload) => {
  const { body, signature } = signPayload(webhook.secret, payload)
  const response = await fetch(webhook.targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-P42-Signature': signature,
      'X-P42-Webhook-Id': webhook.id
    },
    body
  })
  return response.ok
}

export const dispatchWebhooks = async (
  workspaceId: string,
  event: WebhookEvent,
  payload: WebhookPayload
) => {
  const hooks = await Webhook.findAll({
    where: {
      workspaceId,
      isActive: true
    }
  })

  await Promise.all(
    hooks
      .filter(webhook => webhook.events.includes(event))
      .map(webhook => sendWebhook(webhook, { event, timestamp: new Date().toISOString(), data: payload }))
  )
}

export const buildTestWebhookPayload = () => ({
  event: 'click.recorded',
  timestamp: new Date().toISOString(),
  data: {
    message: 'This is a webhook test from P42 | MIR-ALPHA'
  }
})

export const verifyWebhookSignature = (signature: string, payload: string) => {
  const expected = crypto.createHmac('sha256', env.webhookSecret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
