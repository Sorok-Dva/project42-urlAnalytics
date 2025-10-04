import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import { createApp } from '../src/app'

const app = createApp()

let ownerToken: string
let ownerWorkspaceId: string
const ownerCredentials = {
  email: 'owner@test.local',
  password: 'password123'
}

beforeEach(async () => {
  const response = await request(app).post('/api/auth/register').send({
    email: ownerCredentials.email,
    password: ownerCredentials.password,
    name: 'Owner User'
  })

  ownerToken = response.body.token
  ownerWorkspaceId = response.body.workspace.id
})

describe('workspace routes', () => {
  test('creates a workspace and lists memberships', async () => {
    const createResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Team Rocket' })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.workspace).toMatchObject({
      name: 'Team Rocket',
      role: 'owner',
      memberStatus: 'active'
    })

    const listResponse = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.workspaces).toHaveLength(2)
  })

  test('allows renaming a workspace', async () => {
    const response = await request(app)
      .patch(`/api/workspaces/${ownerWorkspaceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Nouveau Nom' })

    expect(response.status).toBe(200)
    expect(response.body.workspace.name).toBe('Nouveau Nom')

    const listResponse = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.workspaces[0].name).toBe('Nouveau Nom')
    expect(listResponse.body.workspaces[0].slug).toContain('nouveau')
  })

  test('switches workspace and invites an existing user', async () => {
    const workspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Analytics Lab' })

    const workspaceId = workspaceResponse.body.workspace.id as string

    const switchResponse = await request(app)
      .post('/api/auth/switch')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ workspaceId })

    expect(switchResponse.status).toBe(200)
    ownerToken = switchResponse.body.token

    const collaboratorResponse = await request(app).post('/api/auth/register').send({
      email: 'collab@test.local',
      password: 'password123',
      name: 'Collab User'
    })

    expect(collaboratorResponse.status).toBe(201)

    const inviteResponse = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'collab@test.local', role: 'member' })

    expect(inviteResponse.status).toBe(201)
    expect(inviteResponse.body.member).toMatchObject({
      role: 'member',
      status: 'active'
    })
    expect(inviteResponse.body.member.user.email).toBe('collab@test.local')

    const membersResponse = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(membersResponse.status).toBe(200)
    expect(membersResponse.body.members).toHaveLength(2)
    expect(membersResponse.body.members[1].user.email).toBe('collab@test.local')
  })

  test('rejects inviting unknown users', async () => {
    const workspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Growth Squad' })

    const workspaceId = workspaceResponse.body.workspace.id as string

    const inviteResponse = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'unknown@test.local', role: 'member' })

    expect(inviteResponse.status).toBe(404)
  })

  test('transfers links and qr codes between workspaces', async () => {
    const createWorkspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Target Workspace' })

    expect(createWorkspaceResponse.status).toBe(201)
    const targetWorkspaceId = createWorkspaceResponse.body.workspace.id as string

    const domainsResponse = await request(app)
      .get(`/api/workspaces/${targetWorkspaceId}/domains`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(domainsResponse.status).toBe(200)
    expect(Array.isArray(domainsResponse.body.domains)).toBe(true)

    const createLinkResponse = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        domain: 'test.local',
        originalUrl: 'https://example.com',
        slug: 'transfer-link',
        publicStats: false
      })

    expect(createLinkResponse.status).toBe(201)
    const linkId = createLinkResponse.body.link.id as string

    const createQrResponse = await request(app)
      .post('/api/qr')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'QR Transfer', linkId })

    expect(createQrResponse.status).toBe(201)
    const qrId = createQrResponse.body.qr.id as string

    const transferLinkResponse = await request(app)
      .post(`/api/links/${linkId}/transfer`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ workspaceId: targetWorkspaceId })

    expect(transferLinkResponse.status).toBe(200)
    expect(transferLinkResponse.body.link.workspaceId).toBe(targetWorkspaceId)

    const targetLogin = await request(app).post('/api/auth/login').send({
      email: ownerCredentials.email,
      password: ownerCredentials.password,
      workspaceId: targetWorkspaceId
    })

    expect(targetLogin.status).toBe(200)
    const targetToken = targetLogin.body.token as string

    const targetLinks = await request(app)
      .get('/api/links')
      .set('Authorization', `Bearer ${targetToken}`)

    expect(targetLinks.status).toBe(200)
    expect(targetLinks.body.links.some((link: any) => link.id === linkId)).toBe(true)

    const targetQrList = await request(app)
      .get('/api/qr')
      .set('Authorization', `Bearer ${targetToken}`)

    expect(targetQrList.status).toBe(200)
    expect(targetQrList.body.qrCodes.length).toBe(1)

    const transferQrResponse = await request(app)
      .post(`/api/qr/${qrId}/transfer`)
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ workspaceId: ownerWorkspaceId, linkId: null })

    expect(transferQrResponse.status).toBe(200)
    expect(transferQrResponse.body.qr.workspaceId).toBe(ownerWorkspaceId)

    const ownerLogin = await request(app).post('/api/auth/login').send({
      email: ownerCredentials.email,
      password: ownerCredentials.password,
      workspaceId: ownerWorkspaceId
    })

    expect(ownerLogin.status).toBe(200)
    const refreshedOwnerToken = ownerLogin.body.token as string

    const ownerQrList = await request(app)
      .get('/api/qr')
      .set('Authorization', `Bearer ${refreshedOwnerToken}`)

    expect(ownerQrList.status).toBe(200)
    expect(ownerQrList.body.qrCodes.length).toBe(1)
    expect(ownerQrList.body.qrCodes[0].id).toBe(qrId)
    expect(ownerQrList.body.qrCodes[0].linkId).toBeNull()
  })
})
