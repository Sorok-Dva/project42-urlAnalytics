import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { Transaction } from 'sequelize'
import { User } from '../models/user'
import { Workspace } from '../models/workspace'
import { WorkspaceMember } from '../models/workspaceMember'
import { SubscriptionPlan } from '../models/subscriptionPlan'
import { env } from '../config/env'
import { computeWorkspacePlanLimits } from './workspaceService'

const tokenExpiry = '30d'

type JwtPayload = {
  sub: string
  workspaceId: string
}

export const registerUser = async (
  payload: {
    email: string
    password: string
    name: string
  },
  options: { transaction?: Transaction } = {}
) => {
  const { transaction } = options
  const existing = await User.findOne({ where: { email: payload.email } })
  if (existing) throw new Error('Email already in use')

  const passwordHash = await bcrypt.hash(payload.password, 10)
  const user = await User.create({
    email: payload.email.toLowerCase(),
    passwordHash,
    name: payload.name,
    role: 'user',
    avatarUrl: null,
    timezone: 'UTC'
  }, { transaction })

  const defaultPlan = await SubscriptionPlan.findOne({
    where: { isDefault: true, isActive: true },
    order: [['createdAt', 'ASC']]
  })

  const planLimits = await computeWorkspacePlanLimits(defaultPlan)

  const workspace = await Workspace.create({
    name: 'Personnel',
    slug: `ws-${nanoid(10)}`,
    ownerId: user.id,
    plan: defaultPlan?.slug ?? 'free',
    planId: defaultPlan?.id ?? null,
    planLimits,
    isActive: true,
    isDefault: true
  }, { transaction })

  await WorkspaceMember.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: 'owner'
  }, { transaction })

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
