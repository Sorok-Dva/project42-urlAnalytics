import { useCallback, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '../components/MetricCard'
import { Card } from '../components/Card'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../providers/ToastProvider'
import { useAuth } from '../stores/auth'
import { getApiErrorMessage } from '../lib/apiError'
import {
  fetchAdminStats,
  fetchAdminWorkspaces,
  updateAdminWorkspace,
  fetchAdminInvites,
  createAdminInvite
} from '../api/admin'
import type { AdminStats, AdminWorkspaceSummary, SignupInviteSummary } from '../types'

const formatNumber = new Intl.NumberFormat()

export const AdminDashboardPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const user = useAuth(state => state.user)

  const { data: statsData, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats
  })

  const { data: workspacesData, isLoading: workspacesLoading } = useQuery<{ workspaces: AdminWorkspaceSummary[] }>({
    queryKey: ['admin', 'workspaces'],
    queryFn: fetchAdminWorkspaces
  })

  const { data: invitesData, isLoading: invitesLoading } = useQuery<{ invites: SignupInviteSummary[] }>({
    queryKey: ['admin', 'invites'],
    queryFn: fetchAdminInvites
  })

  const workspaces = workspacesData?.workspaces ?? []
  const invites = invitesData?.invites ?? []
  const stats = statsData ?? null

  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState({ plan: 'free', links: '', qrCodes: '', members: '', workspaces: '' })
  const [inviteCode, setInviteCode] = useState('')

  const getLimitLabel = useCallback(
    (value: unknown) => {
      if (value === null || value === undefined) return t('admin.workspaces.limits.unlimited', 'Unlimited')
      const numeric = Number(value)
      if (!Number.isFinite(numeric) || numeric <= 0) return t('admin.workspaces.limits.unlimited', 'Unlimited')
      return formatNumber.format(numeric)
    },
    [t]
  )

  const beginWorkspaceEdit = useCallback((workspace: AdminWorkspaceSummary) => {
    setEditingWorkspaceId(workspace.id)
    setEditingForm({
      plan: workspace.plan,
      links: workspace.planLimits?.links ? String(workspace.planLimits.links) : '',
      qrCodes: workspace.planLimits?.qrCodes ? String(workspace.planLimits.qrCodes) : '',
      members: workspace.planLimits?.members ? String(workspace.planLimits.members) : '',
      workspaces: workspace.planLimits?.workspaces ? String(workspace.planLimits.workspaces) : ''
    })
  }, [])

  const cancelWorkspaceEdit = useCallback(() => {
    setEditingWorkspaceId(null)
    setEditingForm({ plan: 'free', links: '', qrCodes: '', members: '', workspaces: '' })
  }, [])

  const updateWorkspaceMutation = useMutation({
    mutationFn: (params: {
      id: string
      payload: { plan?: 'free' | 'pro' | 'enterprise'; planLimits?: { links?: number; qrCodes?: number; members?: number; workspaces?: number } }
    }) => updateAdminWorkspace(params.id, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] })
      cancelWorkspaceEdit()
      push({ title: t('admin.workspaces.updated') })
    },
    onError: error => {
      push({ title: t('admin.workspaces.updateError'), description: getApiErrorMessage(error) })
    }
  })

  const createInviteMutation = useMutation({
    mutationFn: createAdminInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
      setInviteCode('')
      push({ title: t('admin.invites.created') })
    },
    onError: error => {
      push({ title: t('admin.invites.createError'), description: getApiErrorMessage(error) })
    }
  })

  const handleWorkspaceSave = useCallback(
    (workspace: AdminWorkspaceSummary) => {
      const payload: {
        plan?: 'free' | 'pro' | 'enterprise'
        planLimits?: { links?: number; qrCodes?: number; members?: number; workspaces?: number }
      } = {}
      if (editingForm.plan && editingForm.plan !== workspace.plan) {
        payload.plan = editingForm.plan as 'free' | 'pro' | 'enterprise'
      }

      const limits: { links?: number; qrCodes?: number; members?: number; workspaces?: number } = {}
      const parseLimit = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return undefined
        const parsed = Number(trimmed)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
      }

      const linksLimit = parseLimit(editingForm.links)
      const qrLimit = parseLimit(editingForm.qrCodes)
      const membersLimit = parseLimit(editingForm.members)
      const workspacesLimit = parseLimit(editingForm.workspaces)

      if (linksLimit !== undefined) limits.links = linksLimit
      if (qrLimit !== undefined) limits.qrCodes = qrLimit
      if (membersLimit !== undefined) limits.members = membersLimit
      if (workspacesLimit !== undefined) limits.workspaces = workspacesLimit

      if (Object.keys(limits).length > 0) {
        payload.planLimits = limits
      }

      if (!payload.plan && !payload.planLimits) {
        cancelWorkspaceEdit()
        return
      }

      updateWorkspaceMutation.mutate({ id: workspace.id, payload })
    },
    [cancelWorkspaceEdit, editingForm, updateWorkspaceMutation]
  )

  const handleInviteGenerate = useCallback(
    (custom?: string) => {
      createInviteMutation.mutate({ code: custom?.trim() ? custom.trim() : undefined })
    },
    [createInviteMutation]
  )

  const cards = useMemo(() => {
    if (!stats) return []
    const { totals } = stats
    return [
      { label: t('admin.stats.users'), value: formatNumber.format(totals.totalUsers) },
      { label: t('admin.stats.admins'), value: formatNumber.format(totals.totalAdmins) },
      { label: t('admin.stats.workspaces'), value: formatNumber.format(totals.totalWorkspaces) },
      { label: t('admin.stats.links'), value: formatNumber.format(totals.totalLinks) },
      { label: t('admin.stats.activeLinks'), value: formatNumber.format(totals.totalActiveLinks) },
      { label: t('admin.stats.qrCodes'), value: formatNumber.format(totals.totalQrCodes) },
      { label: t('admin.stats.events'), value: formatNumber.format(totals.totalEvents) }
    ]
  }, [stats, t])

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">{t('admin.title')}</h1>
          <p className="text-sm text-slate-400">{t('admin.subtitle')}</p>
        </div>
        {stats?.signupsDisabled && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            {t('admin.signupsDisabledNotice')}
          </div>
        )}
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(card => (
            <MetricCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}

      <Card title={t('admin.recentUsers.title')} description={t('admin.recentUsers.description')}>
        {stats?.recentUsers.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-800/60">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.recentUsers.name')}</th>
                  <th className="px-4 py-3">{t('admin.recentUsers.email')}</th>
                  <th className="px-4 py-3">{t('admin.recentUsers.role')}</th>
                  <th className="px-4 py-3">{t('admin.recentUsers.created')}</th>
                  <th className="px-4 py-3">{t('admin.recentUsers.lastLogin')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(entry => (
                  <tr key={entry.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3 font-medium text-slate-100">{entry.name}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.email}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.role === 'admin' ? t('admin.roles.admin') : t('admin.roles.user')}</td>
                    <td className="px-4 py-3 text-slate-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{entry.lastLoginAt ? new Date(entry.lastLoginAt).toLocaleString() : t('admin.recentUsers.never')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t('admin.recentUsers.empty')}</p>
        )}
      </Card>

      <Card title={t('admin.workspaces.title')} description={t('admin.workspaces.description')}>
        {workspacesLoading ? (
          <Skeleton className="h-64" />
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-slate-400">{t('admin.workspaces.empty')}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800/60">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.workspaces.columns.workspace')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.columns.plan')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.columns.limits')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.columns.usage')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.workspaces.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map(workspace => {
                  const isEditing = editingWorkspaceId === workspace.id
                  const isSaving = updateWorkspaceMutation.isPending && isEditing

                  return (
                    <tr key={workspace.id} className="border-t border-slate-800/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{workspace.name}</div>
                        <div className="text-xs text-slate-400">{workspace.slug}</div>
                        {workspace.owner && (
                          <div className="text-[11px] text-slate-500">{t('admin.workspaces.owner', { email: workspace.owner.email })}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <select
                            value={editingForm.plan}
                            onChange={event => setEditingForm(prev => ({ ...prev, plan: event.target.value }))}
                            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-accent focus:outline-none"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        ) : (
                          <span className="capitalize">{workspace.plan}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 text-xs">
                            <label className="flex items-center gap-2">
                              <span className="w-20 text-slate-400">{t('admin.workspaces.limits.links')}</span>
                              <input
                                type="number"
                                min={1}
                                value={editingForm.links}
                                onChange={event => setEditingForm(prev => ({ ...prev, links: event.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-accent focus:outline-none"
                                placeholder="∞"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="w-20 text-slate-400">{t('admin.workspaces.limits.qr')}</span>
                              <input
                                type="number"
                                min={1}
                                value={editingForm.qrCodes}
                                onChange={event => setEditingForm(prev => ({ ...prev, qrCodes: event.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-accent focus:outline-none"
                                placeholder="∞"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="w-20 text-slate-400">{t('admin.workspaces.limits.members')}</span>
                              <input
                                type="number"
                                min={1}
                                value={editingForm.members}
                                onChange={event => setEditingForm(prev => ({ ...prev, members: event.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-accent focus:outline-none"
                                placeholder="∞"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="w-20 text-slate-400">{t('admin.workspaces.limits.workspaces', 'Espaces de travail')}</span>
                              <input
                                type="number"
                                min={1}
                                value={editingForm.workspaces}
                                onChange={event => setEditingForm(prev => ({ ...prev, workspaces: event.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-accent focus:outline-none"
                                placeholder="∞"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs text-slate-400">
                            <div>{t('admin.workspaces.limits.links')}: {getLimitLabel(workspace.planLimits?.links)}</div>
                            <div>{t('admin.workspaces.limits.qr')}: {getLimitLabel(workspace.planLimits?.qrCodes)}</div>
                            <div>{t('admin.workspaces.limits.members')}: {getLimitLabel(workspace.planLimits?.members)}</div>
                            <div>
                              {t('admin.workspaces.limits.workspaces', 'Espaces de travail')}:{' '}
                              {getLimitLabel(workspace.planLimits?.workspaces)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <div>{t('admin.workspaces.usage.links', { usage: workspace.usage.links, total: getLimitLabel(workspace.planLimits?.links) })}</div>
                        <div>{t('admin.workspaces.usage.qr', { usage: workspace.usage.qrCodes, total: getLimitLabel(workspace.planLimits?.qrCodes) })}</div>
                        <div>{t('admin.workspaces.usage.members', { usage: workspace.usage.members, total: getLimitLabel(workspace.planLimits?.members) })}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-2 text-xs">
                            <button
                              onClick={() => handleWorkspaceSave(workspace)}
                              className="rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isSaving}
                            >
                              {isSaving ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              onClick={cancelWorkspaceEdit}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                              disabled={isSaving}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => beginWorkspaceEdit(workspace)}
                            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-accent"
                          >
                            {t('admin.workspaces.edit')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('admin.invites.title')} description={t('admin.invites.description')}>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={inviteCode}
            onChange={event => setInviteCode(event.target.value)}
            placeholder={t('admin.invites.placeholder') ?? ''}
            className="min-w-[200px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => handleInviteGenerate(inviteCode)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            disabled={createInviteMutation.isPending}
          >
            {createInviteMutation.isPending ? t('common.saving') : t('admin.invites.generate')}
          </button>
          <button
            onClick={() => handleInviteGenerate()}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-accent"
            disabled={createInviteMutation.isPending}
          >
            {t('admin.invites.generateRandom')}
          </button>
        </div>

        {invitesLoading ? (
          <Skeleton className="mt-4 h-40" />
        ) : invites.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{t('admin.invites.empty')}</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800/60">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.invites.code')}</th>
                  <th className="px-4 py-3">{t('admin.invites.status')}</th>
                  <th className="px-4 py-3">{t('admin.invites.generated')}</th>
                  <th className="px-4 py-3">{t('admin.invites.usedBy')}</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(invite => (
                  <tr key={invite.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3 font-mono text-sm">{invite.code}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {invite.usedAt ? t('admin.invites.statusUsed', { date: new Date(invite.usedAt).toLocaleString() }) : t('admin.invites.statusUnused')}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{invite.createdAt ? new Date(invite.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{invite.usedBy ? `${invite.usedBy.email}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
