import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createApp } from '../src/app'

const app = createApp()

describe('auth routes', () => {
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
})
