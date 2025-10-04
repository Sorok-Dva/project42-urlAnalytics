import type { WorkspaceSummary } from '../types'

const planDisplayLabels: Record<string, string> = {
  free: 'Freemium',
  pro: 'Premium',
  enterprise: 'Entreprise'
}

const humanize = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

export const getPlanDisplayName = (plan: string) => planDisplayLabels[plan] ?? humanize(plan)

export const normalizeLimit = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return numeric
}

type WorkspacePlanContext = Pick<WorkspaceSummary, 'plan' | 'planLimits'> | null | undefined

export const resolveWorkspaceLimit = (workspace: WorkspacePlanContext): number | undefined => {
  if (!workspace) return undefined
  const configured = normalizeLimit(workspace.planLimits?.workspaces)
  if (configured !== undefined) return configured
  return workspace.plan === 'free' ? 1 : undefined
}

export const resolveLinkLimit = (workspace: WorkspacePlanContext): number | undefined => {
  if (!workspace) return undefined
  const configured = normalizeLimit(workspace.planLimits?.links)
  if (configured !== undefined) return configured
  return workspace.plan === 'free' ? 10 : undefined
}
