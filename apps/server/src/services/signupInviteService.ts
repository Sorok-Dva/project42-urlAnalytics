import { nanoid } from 'nanoid'
import { Transaction } from 'sequelize'
import { SignupInvite } from '../models/signupInvite'
import { User } from '../models/user'

const normalizeCode = (code: string) => code.trim().toUpperCase()

export const findActiveInviteByCode = async (code: string) => {
  const normalized = normalizeCode(code)
  return SignupInvite.findOne({ where: { code: normalized, usedAt: null } })
}

export const consumeInvite = async (
  inviteId: string,
  userId: string,
  transaction?: Transaction
) => {
  const [updated] = await SignupInvite.update(
    { usedAt: new Date(), usedById: userId },
    { where: { id: inviteId, usedAt: null }, transaction }
  )
  return updated > 0
}

export const listInvites = async () => {
  return SignupInvite.findAll({
    order: [['createdAt', 'DESC']],
    limit: 100,
    include: [{ model: User, as: 'usedBy', attributes: ['id', 'email', 'name'] }]
  })
}

export const createInviteCode = async ({ code }: { code?: string }) => {
  const generateCode = () => normalizeCode(code ?? nanoid(12))
  let candidate = generateCode()

  if (code) {
    const existing = await SignupInvite.findOne({ where: { code: candidate } })
    if (existing) throw new Error('INVITE_CODE_TAKEN')
  } else {
    // ensure uniqueness for generated codes
    let attempts = 0
    while (attempts < 5) {
      const existing = await SignupInvite.findOne({ where: { code: candidate } })
      if (!existing) break
      candidate = generateCode()
      attempts += 1
    }
  }

  const existing = await SignupInvite.findOne({ where: { code: candidate } })
  if (existing) {
    throw new Error('INVITE_CODE_TAKEN')
  }

  const invite = await SignupInvite.create({ code: candidate })
  return invite
}
