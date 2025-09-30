import crypto from 'crypto'
import { Domain } from '../models/domain'
import { Project } from '../models/project'
import { env } from '../config/env'

export const listDomains = async (workspaceId: string) => {
  return Domain.findAll({ where: { workspaceId }, order: [['createdAt', 'DESC']] })
}

export const addDomain = async (payload: { workspaceId: string; domain: string; projectId?: string | null }) => {
  const verificationToken = crypto.randomBytes(12).toString('hex')
  return Domain.create({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId ?? null,
    domain: payload.domain,
    status: 'pending',
    verificationToken,
    verifiedAt: null
  })
}

export const verifyDomain = async (payload: { workspaceId: string; domainId: string; token: string }) => {
  const domain = await Domain.findOne({
    where: {
      id: payload.domainId,
      workspaceId: payload.workspaceId
    }
  })
  if (!domain) throw new Error('Domain not found')
  if (domain.verificationToken !== payload.token) throw new Error('Invalid token')
  domain.status = 'verified'
  domain.verifiedAt = new Date()
  await domain.save()
  return domain
}

export const assignDomainToProject = async (payload: { domainId: string; projectId: string | null }) => {
  const domain = await Domain.findByPk(payload.domainId)
  if (!domain) throw new Error('Domain not found')
  domain.projectId = payload.projectId
  await domain.save()
  return domain
}

export const domainDnsInstructions = (domain: Domain) => {
  const records = [
    {
      type: 'A',
      host: '@',
      value: '203.0.113.42',
      ttl: 300
    },
    {
      type: 'TXT',
      host: `_p42-challenge.${domain.domain}`,
      value: domain.verificationToken,
      ttl: 300
    }
  ]

  return {
    domain: domain.domain,
    records,
    verificationUrl: `${env.publicBaseUrl}/domains/${domain.id}/verify`
  }
}
