import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createApp } from '../src/app'

const app = createApp()

describe('link routes', () => {
  test('creates a link and records analytics on redirect', async () => {
    const register = await request(app).post('/api/auth/register').send({
      email: 'links@test.local',
      password: 'password123',
      name: 'Links Tester'
    })
    expect(register.status).toBe(201)
    const token = register.body.token

    const createResponse = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send({
        domain: 'test.local',
        originalUrl: 'https://example.com/resource',
        label: 'Homepage redirect',
        projectId: null,
        publicStats: true
      })

    expect(createResponse.status).toBe(201)
    const linkId = createResponse.body.link.id
    const slug = createResponse.body.link.slug
    expect(createResponse.body.link.label).toBe('Homepage redirect')

    const redirectResponse = await request(app)
      .get(`/${slug}`)
      .set('Host', 'test.local')

    expect(redirectResponse.status).toBe(302)
    expect(redirectResponse.headers.location).toBe('https://example.com/resource')

    const statsResponse = await request(app)
      .get(`/api/links/${linkId}/stats`)
      .set('Authorization', `Bearer ${token}`)
      .query({ interval: '1d' })

    expect(statsResponse.status).toBe(200)
    expect(statsResponse.body.analytics.totalEvents).toBeGreaterThanOrEqual(1)
    expect(statsResponse.body.analytics.byDevice.length).toBeGreaterThanOrEqual(1)
    expect(statsResponse.body.analytics.pagination.page).toBe(1)
  })
})
