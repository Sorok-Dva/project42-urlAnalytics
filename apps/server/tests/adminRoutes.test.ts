import request from 'supertest'
import { describe, expect, test, beforeEach } from 'vitest'
import { createApp } from '../src/app'
import { User } from '../src/models/user'
import { SignupInvite } from '../src/models/signupInvite'

const app = createApp()

const registerUser = async (email: string) => {
  return request(app).post('/api/auth/register').send({
    email,
    password: 'password123',
    name: 'Test User'
  })
}

describe('admin routes', () => {
  beforeEach(async () => {
    await SignupInvite.destroy({ where: {} })
  })

  test('rejects non-admin users', async () => {
    const response = await registerUser('regular@test.local')
    expect(response.status).toBe(201)
    const token = response.body.token as string

    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)

    expect(stats.status).toBe(403)
  })

  test('allows admins to access stats and create invites', async () => {
    const response = await registerUser('admin@test.local')
    expect(response.status).toBe(201)
    const token = response.body.token as string
    const userId = response.body.user.id as string

    await User.update({ role: 'admin' }, { where: { id: userId } })

    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)

    expect(stats.status).toBe(200)
    expect(stats.body?.totals?.totalUsers).toBeGreaterThan(0)

    const createInvite = await request(app)
      .post('/api/admin/invites')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'ADMIN-CODE' })

    expect(createInvite.status).toBe(201)
    expect(createInvite.body?.invite?.code).toBe('ADMIN-CODE')

    const inviteRecord = await SignupInvite.findOne({ where: { code: 'ADMIN-CODE' } })
    expect(inviteRecord).not.toBeNull()
  })
})
