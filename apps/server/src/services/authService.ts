import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { User } from '../models/user'
import { Workspace } from '../models/workspace'
import { WorkspaceMember } from '../models/workspaceMember'
import { Domain } from '../models/domain'
import { env } from '../config/env'

const tokenExpiry = '7d'

type JwtPayload = {
  sub: string
  workspaceId: string
}

export const registerUser = async (payload: {
  email: string
  password: string
  name: string
}) => {
  const existing = await User.findOne({ where: { email: payload.email } })
  if (existing) throw new Error('Email already in use')

  const passwordHash = await bcrypt.hash(payload.password, 10)
  const user = await User.create({
    email: payload.email.toLowerCase(),
    passwordHash,
    name: payload.name,
    avatarUrl: null,
    timezone: 'UTC'
  })

  const workspace = await Workspace.create({
    name: `${payload.name} workspace`,
    slug: `ws-${nanoid(10)}`,
    ownerId: user.id,
    plan: 'free',
    planLimits: {
      links: 1000,
      qrCodes: 500,
      members: 5
    },
    isActive: true
  })

  await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: 'owner'
  })

  await Domain.create({
    workspaceId: workspace.id,
    projectId: null,
    domain: env.defaultDomain,
    status: 'verified',
    verificationToken: `auto-${nanoid(8)}`,
    verifiedAt: new Date()
  })

  return { user, workspace }
}

export const authenticateUser = async (payload: { email: string; password: string }) => {
  const user = await User.findOne({ where: { email: payload.email.toLowerCase() } })
  if (!user || !user.passwordHash) throw new Error('Invalid credentials')
  const valid = await bcrypt.compare(payload.password, user.passwordHash)
  if (!valid) throw new Error('Invalid credentials')
  return user
}

export const issueToken = (user: User, workspaceId: string) => {
  const payload: JwtPayload = {
    sub: user.id,
    workspaceId
  }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: tokenExpiry })
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload
}

export const getUserById = async (id: string) => {
  return User.findByPk(id, {
    include: [{ model: WorkspaceMember, as: 'memberships' }]
  })
}

export const listWorkspacesForUser = async (userId: string) => {
  const memberships = await WorkspaceMember.findAll({
    where: { userId },
    include: [{ model: Workspace, as: 'workspace' }]
  })
  return memberships.map(member => (member as any).workspace)
}
