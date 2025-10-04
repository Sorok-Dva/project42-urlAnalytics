import { Transaction } from 'sequelize'
import { SignupInvite } from '../models/signupInvite'

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
