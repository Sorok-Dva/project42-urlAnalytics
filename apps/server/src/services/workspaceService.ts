import { Workspace } from '../models/workspace'
import { Link } from '../models/link'
import { QrCode } from '../models/qrCode'

export const getWorkspace = async (workspaceId: string) => {
  const workspace = await Workspace.findByPk(workspaceId)
  if (!workspace) throw new Error('Workspace not found')
  return workspace
}

const resourceCounters = {
  links: async (workspaceId: string) => Link.count({ where: { workspaceId, status: 'active' } }),
  qrCodes: async (workspaceId: string) => QrCode.count({ where: { workspaceId } })
} as const

export const ensureWorkspaceLimit = async (
  workspaceId: string,
  resource: keyof typeof resourceCounters
) => {
  const workspace = await getWorkspace(workspaceId)
  const limit = Number((workspace.planLimits as Record<string, unknown>)[resource] ?? Infinity)
  if (!Number.isFinite(limit)) return true
  const usage = await resourceCounters[resource](workspaceId)
  if (usage >= limit) throw new Error(`Workspace limit reached for ${resource}`)
  return true
}
