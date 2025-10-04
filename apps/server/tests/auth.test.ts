import request from 'supertest'
import { afterEach, describe, expect, test } from 'vitest'
import { createApp } from '../src/app'
import { env } from '../src/config/env'
import { SignupInvite } from '../src/models/signupInvite'

const app = createApp()

describe('auth routes', () => {
  afterEach(() => {
    env.feature.disableSignup = false
  })

  test('registers a user and returns token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'auth@test.local',
      password: 'password123',
      name: 'Auth Tester'
    })

    expect(response.status).toBe(201)
    expect(response.body.token).toBeTruthy()
    expect(response.body.user.email).toBe('auth@test.local')
    expect(response.body.workspace).toBeTruthy()
  })

  test('allows registration with invitation code when signup disabled', async () => {
    env.feature.disableSignup = true
    await SignupInvite.create({ code: 'INVITE-123' })

    const denied = await request(app).post('/api/auth/register').send({
      email: 'denied@test.local',
      password: 'password123',
      name: 'Denied User'
    })
    expect(denied.status).toBe(403)

    const response = await request(app).post('/api/auth/register').send({
      email: 'invited@test.local',
      password: 'password123',
      name: 'Invited User',
      inviteCode: 'invite-123'
    })

    expect(response.status).toBe(201)
    expect(response.body.token).toBeTruthy()

    const invite = await SignupInvite.findOne({ where: { code: 'INVITE-123' } })
    expect(invite?.usedAt).toBeTruthy()
    expect(invite?.usedById).toBeTruthy()
  })
})
