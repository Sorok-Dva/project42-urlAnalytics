import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  updateAdminWorkspace,
  fetchLinkAddons,
  createLinkAddon,
  updateLinkAddon,
  deleteLinkAddon,
  fetchAppSettings,
  updateAppSettings,
  fetchAdminInvites,
  createAdminInvite
} from '../api/admin'
import type {
  AdminStats,
  AdminWorkspaceSummary,
  SubscriptionPlan,
  LinkAddon,
  SignupInviteSummary,
  AppSettingsMap
} from '../types'
import { getPlanDisplayName } from '../lib/planLimits'

const formatNumber = new Intl.NumberFormat()

const centsToEuros = (value: number) => (value / 100).toFixed(2)
const eurosToCents = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

const getSettingValue = (map: AppSettingsMap, key: string) => {
  const raw = map[key]
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'number') return String(raw)
  return String(raw)
}

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

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: SubscriptionPlan[] }>({
    queryKey: ['admin', 'subscriptionPlans'],
    queryFn: fetchSubscriptionPlans
  })

  const { data: addonsData, isLoading: addonsLoading } = useQuery<{ addons: LinkAddon[] }>({
    queryKey: ['admin', 'linkAddons'],
    queryFn: fetchLinkAddons
  })

  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: AppSettingsMap }>({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAppSettings
  })

  const { data: invitesData, isLoading: invitesLoading } = useQuery<{ invites: SignupInviteSummary[] }>({
    queryKey: ['admin', 'invites'],
    queryFn: fetchAdminInvites
  })

  const [inviteCode, setInviteCode] = useState('')
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null)
  const [editingWorkspaceForm, setEditingWorkspaceForm] = useState({
    planId: '',
    links: '',
    members: '',
    qrCodes: '',
    workspaces: ''
  })
  const [newPlanForm, setNewPlanForm] = useState({
    slug: '',
    name: '',
    description: '',
    price: '0',
    currency: 'EUR',
    workspaceLimit: '',
    linkLimit: '',
    isDefault: false,
    isActive: true
  })
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanForm, setEditingPlanForm] = useState({
    slug: '',
    name: '',
    description: '',
    price: '0',
    currency: 'EUR',
    workspaceLimit: '',
    linkLimit: '',
    isDefault: false,
    isActive: true
  })

  const [newAddonForm, setNewAddonForm] = useState({
    name: '',
    description: '',
    additionalLinks: '',
    price: '0',
    currency: 'EUR',
    isActive: true
  })
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null)
  const [editingAddonForm, setEditingAddonForm] = useState({
    name: '',
    description: '',
    additionalLinks: '',
    price: '0',
    currency: 'EUR',
    isActive: true
  })

  const [settingsForm, setSettingsForm] = useState({
    workspaceLimit: '',
    linkLimit: '',
    qrLimit: '',
    membersLimit: ''
  })

  useEffect(() => {
    if (!settingsData?.settings) return
    setSettingsForm({
      workspaceLimit: getSettingValue(settingsData.settings, 'defaults.workspaceLimit'),
      linkLimit: getSettingValue(settingsData.settings, 'defaults.linkLimit'),
      qrLimit: getSettingValue(settingsData.settings, 'defaults.qrLimit'),
      membersLimit: getSettingValue(settingsData.settings, 'defaults.membersLimit')
    })
  }, [settingsData?.settings])

  const workspaces = workspacesData?.workspaces ?? []
  const plans = plansData?.plans ?? []
  const addons = addonsData?.addons ?? []
  const invites = invitesData?.invites ?? []
  const stats = statsData ?? null

  const planDictionary = useMemo(() => {
    const map = new Map<string, SubscriptionPlan>()
    plans.forEach(plan => map.set(plan.id, plan))
    return map
  }, [plans])

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { planId?: string | null; planLimits?: { links?: number; members?: number; qrCodes?: number; workspaces?: number } } }) =>
      updateAdminWorkspace(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] })
      setEditingWorkspaceId(null)
      push({ title: t('admin.workspaces.updated', 'Workspace mis à jour') })
    },
    onError: error => {
      push({ title: t('admin.workspaces.updateError', 'Mise à jour impossible'), description: getApiErrorMessage(error) })
    }
  })

  const handleWorkspaceEdit = (workspace: AdminWorkspaceSummary) => {
    setEditingWorkspaceId(workspace.id)
    setEditingWorkspaceForm({
      planId: workspace.planId ?? '',
      links: workspace.planLimits?.links != null ? String(workspace.planLimits.links) : '',
      members: workspace.planLimits?.members != null ? String(workspace.planLimits.members) : '',
      qrCodes: workspace.planLimits?.qrCodes != null ? String(workspace.planLimits.qrCodes) : '',
      workspaces: workspace.planLimits?.workspaces != null ? String(workspace.planLimits.workspaces) : ''
    })
  }

  const cancelWorkspaceEdit = () => {
    setEditingWorkspaceId(null)
  }

  const parseLimitValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined
    return Math.floor(numeric)
  }

  const submitWorkspaceUpdate = (workspace: AdminWorkspaceSummary) => {
    if (!editingWorkspaceId) return

    const planSelection = editingWorkspaceForm.planId.trim()
    const normalizedPlanId = planSelection ? planSelection : null
    const currentPlanId = workspace.planId ?? null

    const payload: { planId?: string | null; planLimits?: { links?: number; members?: number; qrCodes?: number; workspaces?: number } } = {}

    if (normalizedPlanId !== currentPlanId) {
      payload.planId = normalizedPlanId
    }

    const limitsPayload: { links?: number; members?: number; qrCodes?: number; workspaces?: number } = {}
    const linksValue = parseLimitValue(editingWorkspaceForm.links)
    if (linksValue !== undefined) limitsPayload.links = linksValue
    const membersValue = parseLimitValue(editingWorkspaceForm.members)
    if (membersValue !== undefined) limitsPayload.members = membersValue
    const qrValue = parseLimitValue(editingWorkspaceForm.qrCodes)
    if (qrValue !== undefined) limitsPayload.qrCodes = qrValue
    const workspacesValue = parseLimitValue(editingWorkspaceForm.workspaces)
    if (workspacesValue !== undefined) limitsPayload.workspaces = workspacesValue

    if (Object.keys(limitsPayload).length > 0) {
      payload.planLimits = limitsPayload
    }

    if (payload.planId === undefined && !payload.planLimits) {
      setEditingWorkspaceId(null)
      return
    }

    updateWorkspaceMutation.mutate({ id: workspace.id, payload })
  }

  const createPlanMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] })
      setNewPlanForm({
        slug: '',
        name: '',
        description: '',
        price: '0',
        currency: 'EUR',
        workspaceLimit: '',
        linkLimit: '',
        isDefault: false,
        isActive: true
      })
      push({ title: t('admin.plans.created', 'Plan créé') })
    },
    onError: error => {
      push({ title: t('admin.plans.createError', 'Création impossible'), description: getApiErrorMessage(error) })
    }
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<SubscriptionPlan, 'id'>> }) =>
      updateSubscriptionPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] })
      setEditingPlanId(null)
      push({ title: t('admin.plans.updated', 'Plan mis à jour') })
    },
    onError: error => {
      push({ title: t('admin.plans.updateError', 'Mise à jour impossible'), description: getApiErrorMessage(error) })
    }
  })

  const deletePlanMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptionPlans'] })
      push({ title: t('admin.plans.deleted', 'Plan supprimé') })
    },
    onError: error => {
      push({ title: t('admin.plans.deleteError', 'Suppression impossible'), description: getApiErrorMessage(error) })
    }
  })

  const createAddonMutation = useMutation({
    mutationFn: createLinkAddon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'linkAddons'] })
      setNewAddonForm({ name: '', description: '', additionalLinks: '', price: '0', currency: 'EUR', isActive: true })
      push({ title: t('admin.addons.created', 'Pack créé') })
    },
    onError: error => {
      push({ title: t('admin.addons.createError', 'Création impossible'), description: getApiErrorMessage(error) })
    }
  })

  const updateAddonMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<LinkAddon, 'id'>> }) => updateLinkAddon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'linkAddons'] })
      setEditingAddonId(null)
      push({ title: t('admin.addons.updated', 'Pack mis à jour') })
    },
    onError: error => {
      push({ title: t('admin.addons.updateError', 'Mise à jour impossible'), description: getApiErrorMessage(error) })
    }
  })

  const deleteAddonMutation = useMutation({
    mutationFn: deleteLinkAddon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'linkAddons'] })
      push({ title: t('admin.addons.deleted', 'Pack supprimé') })
    },
    onError: error => {
      push({ title: t('admin.addons.deleteError', 'Suppression impossible'), description: getApiErrorMessage(error) })
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: response => {
      queryClient.setQueryData(['admin', 'settings'], response)
      push({ title: t('admin.settings.updated', 'Paramètres mis à jour') })
    },
    onError: error => {
      push({ title: t('admin.settings.updateError', 'Mise à jour impossible'), description: getApiErrorMessage(error) })
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

  if (!user || user.role !== 'admin') {
    return null
  }

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const handlePlanEdit = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id)
    setEditingPlanForm({
      slug: plan.slug,
      name: plan.name,
      description: plan.description ?? '',
      price: centsToEuros(plan.priceCents),
      currency: plan.currency,
      workspaceLimit: plan.workspaceLimit != null ? String(plan.workspaceLimit) : '',
      linkLimit: plan.linkLimitPerWorkspace != null ? String(plan.linkLimitPerWorkspace) : '',
      isDefault: plan.isDefault,
      isActive: plan.isActive
    })
  }

  const submitPlanUpdate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingPlanId) return
    const payload: Partial<Omit<SubscriptionPlan, 'id'>> = {
      slug: editingPlanForm.slug.trim(),
      name: editingPlanForm.name.trim(),
      description: editingPlanForm.description.trim() ? editingPlanForm.description.trim() : null,
      priceCents: eurosToCents(editingPlanForm.price),
      currency: editingPlanForm.currency.trim() || 'EUR',
      workspaceLimit: editingPlanForm.workspaceLimit.trim() ? Number(editingPlanForm.workspaceLimit) : null,
      linkLimitPerWorkspace: editingPlanForm.linkLimit.trim() ? Number(editingPlanForm.linkLimit) : null,
      isDefault: editingPlanForm.isDefault,
      isActive: editingPlanForm.isActive
    }
    updatePlanMutation.mutate({ id: editingPlanId, payload })
  }

  const submitPlanCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newPlanForm.slug.trim() || !newPlanForm.name.trim()) {
      push({ title: t('admin.plans.validation', 'Renseignez un identifiant et un nom de plan.') })
      return
    }
    createPlanMutation.mutate({
      slug: newPlanForm.slug.trim(),
      name: newPlanForm.name.trim(),
      description: newPlanForm.description.trim() ? newPlanForm.description.trim() : undefined,
      priceCents: eurosToCents(newPlanForm.price),
      currency: newPlanForm.currency.trim() || 'EUR',
      workspaceLimit: newPlanForm.workspaceLimit.trim() ? Number(newPlanForm.workspaceLimit) : undefined,
      linkLimitPerWorkspace: newPlanForm.linkLimit.trim() ? Number(newPlanForm.linkLimit) : undefined,
      isDefault: newPlanForm.isDefault,
      isActive: newPlanForm.isActive
    })
  }

  const submitAddonUpdate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingAddonId) return
    const payload: Partial<Omit<LinkAddon, 'id'>> = {
      name: editingAddonForm.name.trim() || undefined,
      description: editingAddonForm.description.trim() ? editingAddonForm.description.trim() : null,
      additionalLinks: editingAddonForm.additionalLinks.trim()
        ? Number(editingAddonForm.additionalLinks)
        : undefined,
      priceCents: eurosToCents(editingAddonForm.price),
      currency: editingAddonForm.currency.trim() || 'EUR',
      isActive: editingAddonForm.isActive
    }
    updateAddonMutation.mutate({ id: editingAddonId, payload })
  }

  const submitAddonCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newAddonForm.name.trim() || !newAddonForm.additionalLinks.trim()) {
      push({ title: t('admin.addons.validation', 'Renseignez un nom et un volume de liens.') })
      return
    }
    createAddonMutation.mutate({
      name: newAddonForm.name.trim(),
      description: newAddonForm.description.trim() ? newAddonForm.description.trim() : undefined,
      additionalLinks: Number(newAddonForm.additionalLinks),
      priceCents: eurosToCents(newAddonForm.price),
      currency: newAddonForm.currency.trim() || 'EUR',
      isActive: newAddonForm.isActive
    })
  }

  const submitSettings = (event: React.FormEvent) => {
    event.preventDefault()
    const defaults: Record<string, number> = {}
    if (settingsForm.workspaceLimit.trim()) defaults.workspaceLimit = Number(settingsForm.workspaceLimit)
    if (settingsForm.linkLimit.trim()) defaults.linkLimit = Number(settingsForm.linkLimit)
    if (settingsForm.qrLimit.trim()) defaults.qrLimit = Number(settingsForm.qrLimit)
    if (settingsForm.membersLimit.trim()) defaults.membersLimit = Number(settingsForm.membersLimit)

    if (Object.keys(defaults).length === 0) {
      push({ title: t('admin.settings.noChanges', 'Aucune modification à enregistrer') })
      return
    }

    updateSettingsMutation.mutate({ defaults })
  }

  const submitInvite = (event: React.FormEvent) => {
    event.preventDefault()
    if (!inviteCode.trim()) {
      createInviteMutation.mutate({})
      return
    }
    createInviteMutation.mutate({ code: inviteCode.trim() })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">{t('admin.title')}</h1>
          <p className="text-sm text-slate-400">{t('admin.subtitle')}</p>
        </div>
        {statsData?.signupsDisabled && (
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

      <Card title={t('admin.workspaces.title', 'Espaces de travail')} description={t('admin.workspaces.description', 'Vue d’ensemble des espaces et plans actifs')}>
        {workspacesLoading ? (
          <Skeleton className="h-40" />
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-slate-400">{t('admin.workspaces.empty', 'Aucun workspace trouvé.')}</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-slate-800/60">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.workspaces.name', 'Nom')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.plan', 'Plan')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.usage.links', 'Liens')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.usage.members', 'Membres')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.usage.qrCodes', 'QR')}</th>
                  <th className="px-4 py-3">{t('admin.workspaces.limits.workspaces', 'Espaces')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map(workspace => {
                  const isEditing = editingWorkspaceId === workspace.id
                  const planEntry = workspace.planId ? planDictionary.get(workspace.planId) : undefined
                  const planLabel = planEntry ? planEntry.name : getPlanDisplayName(workspace.plan)
                  const planSlug = planEntry?.slug ?? workspace.plan
                  const linkLimitValue = workspace.planLimits?.links as number | undefined
                  const memberLimitValue = workspace.planLimits?.members as number | undefined
                  const qrLimitValue = workspace.planLimits?.qrCodes as number | undefined
                  const workspaceLimitValue = workspace.planLimits?.workspaces as number | undefined
                  const displayLimit = (value?: number) =>
                    typeof value === 'number' && Number.isFinite(value)
                      ? formatNumber.format(value)
                      : t('admin.workspaces.limits.unlimited', 'Illimité')

                  return (
                    <tr key={workspace.id} className="border-t border-slate-800/60 bg-slate-900/40">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-100">{workspace.name}</div>
                        <div className="text-xs text-slate-500">{workspace.slug}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatNumber.format(workspace.usage.links)} {t('admin.workspaces.usage.linksShort', 'liens')} · {formatNumber.format(workspace.usage.members)} {t('admin.workspaces.usage.membersShort', 'membres')}
                        </div>
                        {workspace.owner && (
                          <div className="text-xs text-slate-500">{workspace.owner.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {isEditing ? (
                          <select
                            value={editingWorkspaceForm.planId}
                            onChange={event => setEditingWorkspaceForm(prev => ({ ...prev, planId: event.target.value }))}
                            className="w-40 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            disabled={updateWorkspaceMutation.isPending}
                          >
                            <option value="">{t('admin.workspaces.plan.custom', 'Personnalisé')}</option>
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.slug})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-200">{planLabel}</div>
                            <div className="text-xs text-slate-500">{planSlug}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editingWorkspaceForm.links}
                            onChange={event => setEditingWorkspaceForm(prev => ({ ...prev, links: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            placeholder={t('admin.workspaces.limitPlaceholder', 'Ex: 100')}
                            disabled={updateWorkspaceMutation.isPending}
                          />
                        ) : (
                          displayLimit(linkLimitValue)
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editingWorkspaceForm.members}
                            onChange={event => setEditingWorkspaceForm(prev => ({ ...prev, members: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            placeholder={t('admin.workspaces.limitPlaceholder', 'Ex: 10')}
                            disabled={updateWorkspaceMutation.isPending}
                          />
                        ) : (
                          displayLimit(memberLimitValue)
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editingWorkspaceForm.qrCodes}
                            onChange={event => setEditingWorkspaceForm(prev => ({ ...prev, qrCodes: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            placeholder={t('admin.workspaces.limitPlaceholder', 'Ex: 500')}
                            disabled={updateWorkspaceMutation.isPending}
                          />
                        ) : (
                          displayLimit(qrLimitValue)
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editingWorkspaceForm.workspaces}
                            onChange={event => setEditingWorkspaceForm(prev => ({ ...prev, workspaces: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            placeholder={t('admin.workspaces.limitPlaceholder', 'Ex: 3')}
                            disabled={updateWorkspaceMutation.isPending}
                          />
                        ) : (
                          displayLimit(workspaceLimitValue)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitWorkspaceUpdate(workspace)}
                              className="rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={updateWorkspaceMutation.isPending}
                            >
                              {updateWorkspaceMutation.isPending ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              type="button"
                              onClick={cancelWorkspaceEdit}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={updateWorkspaceMutation.isPending}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleWorkspaceEdit(workspace)}
                            className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={updateWorkspaceMutation.isPending}
                          >
                            {t('common.edit', 'Modifier')}
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

      <Card title={t('admin.plans.title', 'Plans d’abonnement')} description={t('admin.plans.description', 'Définissez les capacités et tarifs des plans disponibles')}>
        {plansLoading ? (
          <Skeleton className="h-40" />
        ) : plans.length === 0 ? (
          <p className="text-sm text-slate-400">{t('admin.plans.empty', 'Aucun plan configuré pour le moment.')}</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-slate-800/60">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.plans.table.name', 'Nom')}</th>
                  <th className="px-4 py-3">{t('admin.plans.table.slug', 'Identifiant')}</th>
                  <th className="px-4 py-3">{t('admin.plans.table.price', 'Prix')}</th>
                  <th className="px-4 py-3">{t('admin.plans.table.workspaceLimit', 'Espaces')}</th>
                  <th className="px-4 py-3">{t('admin.plans.table.linkLimit', 'Liens / espace')}</th>
                  <th className="px-4 py-3">{t('admin.common.status', 'Statut')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => {
                  const isEditing = editingPlanId === plan.id
                  return (
                    <tr key={plan.id} className="border-t border-slate-800/60 bg-slate-900/40">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editingPlanForm.name}
                            onChange={event => setEditingPlanForm(prev => ({ ...prev, name: event.target.value }))}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : (
                          <span className="font-semibold text-slate-100">{plan.name}</span>
                        )}
                        <div className="text-xs text-slate-500">
                          {isEditing ? (
                            <textarea
                              value={editingPlanForm.description}
                              onChange={event => setEditingPlanForm(prev => ({ ...prev, description: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                              rows={2}
                            />
                          ) : (
                            plan.description || t('admin.plans.noDescription', 'Sans description')
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <input
                            value={editingPlanForm.slug}
                            onChange={event => setEditingPlanForm(prev => ({ ...prev, slug: event.target.value }))}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : (
                          plan.slug
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingPlanForm.price}
                              onChange={event => setEditingPlanForm(prev => ({ ...prev, price: event.target.value }))}
                              className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                            <input
                              value={editingPlanForm.currency}
                              onChange={event => setEditingPlanForm(prev => ({ ...prev, currency: event.target.value }))}
                              className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                          </div>
                        ) : (
                          `${centsToEuros(plan.priceCents)} ${plan.currency}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <input
                            value={editingPlanForm.workspaceLimit}
                            onChange={event => setEditingPlanForm(prev => ({ ...prev, workspaceLimit: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : plan.workspaceLimit != null ? (
                          formatNumber.format(plan.workspaceLimit)
                        ) : (
                          t('admin.workspaces.limits.unlimited', 'Illimité')
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <input
                            value={editingPlanForm.linkLimit}
                            onChange={event => setEditingPlanForm(prev => ({ ...prev, linkLimit: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : plan.linkLimitPerWorkspace != null ? (
                          formatNumber.format(plan.linkLimitPerWorkspace)
                        ) : (
                          t('admin.workspaces.limits.unlimited', 'Illimité')
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <div>
                          {plan.isDefault ? t('admin.plans.default', 'Par défaut') : t('admin.plans.optional', 'Optionnel')}
                        </div>
                        <div>{plan.isActive ? t('admin.common.active', 'Actif') : t('admin.common.disabled', 'Inactif')}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={submitPlanUpdate}
                              className="rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                              disabled={updatePlanMutation.isPending}
                            >
                              {updatePlanMutation.isPending ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlanId(null)}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                              disabled={updatePlanMutation.isPending}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => handlePlanEdit(plan)}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                            >
                              {t('common.edit', 'Modifier')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePlanMutation.mutate(plan.id)}
                              className="rounded border border-red-500/60 px-3 py-1.5 text-red-200 transition hover:border-red-400"
                              disabled={plan.isDefault || deletePlanMutation.isPending}
                            >
                              {t('common.delete', 'Supprimer')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={submitPlanCreate} className="mt-6 grid gap-3 rounded-lg border border-slate-800/60 bg-slate-900/50 p-4 md:grid-cols-2">
          <h3 className="md:col-span-2 text-sm font-semibold text-slate-100">{t('admin.plans.createTitle', 'Créer un plan')}</h3>
          <input
            value={newPlanForm.slug}
            onChange={event => setNewPlanForm(prev => ({ ...prev, slug: event.target.value }))}
            placeholder={t('admin.plans.slugPlaceholder', 'Identifiant (ex: premium)')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <input
            value={newPlanForm.name}
            onChange={event => setNewPlanForm(prev => ({ ...prev, name: event.target.value }))}
            placeholder={t('admin.plans.namePlaceholder', 'Nom du plan')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            value={newPlanForm.description}
            onChange={event => setNewPlanForm(prev => ({ ...prev, description: event.target.value }))}
            placeholder={t('admin.plans.descriptionPlaceholder', 'Description optionnelle')}
            className="md:col-span-2 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <input
              value={newPlanForm.price}
              onChange={event => setNewPlanForm(prev => ({ ...prev, price: event.target.value }))}
              placeholder="0"
              className="w-24 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={newPlanForm.currency}
              onChange={event => setNewPlanForm(prev => ({ ...prev, currency: event.target.value }))}
              className="w-20 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <span className="text-xs text-slate-400">{t('admin.plans.priceHint', 'Prix mensuel (EUR)')}</span>
          </div>
          <input
            value={newPlanForm.workspaceLimit}
            onChange={event => setNewPlanForm(prev => ({ ...prev, workspaceLimit: event.target.value }))}
            placeholder={t('admin.plans.workspaceLimitPlaceholder', 'Espaces max')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <input
            value={newPlanForm.linkLimit}
            onChange={event => setNewPlanForm(prev => ({ ...prev, linkLimit: event.target.value }))}
            placeholder={t('admin.plans.linkLimitPlaceholder', 'Liens par espace')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={newPlanForm.isDefault}
              onChange={event => setNewPlanForm(prev => ({ ...prev, isDefault: event.target.checked }))}
              className="h-4 w-4"
            />
            {t('admin.plans.markDefault', 'Définir comme plan par défaut')}
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={newPlanForm.isActive}
              onChange={event => setNewPlanForm(prev => ({ ...prev, isActive: event.target.checked }))}
              className="h-4 w-4"
            />
            {t('admin.plans.markActive', 'Plan actif')}
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Card>

      <Card title={t('admin.addons.title', 'Packs d’extension de liens')} description={t('admin.addons.description', 'Configurez les packs de liens supplémentaires disponibles à l’achat')}>
        {addonsLoading ? (
          <Skeleton className="h-32" />
        ) : addons.length === 0 ? (
          <p className="text-sm text-slate-400">{t('admin.addons.empty', 'Aucun pack disponible.')}</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-slate-800/60">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.addons.table.name', 'Nom')}</th>
                  <th className="px-4 py-3">{t('admin.addons.table.links', 'Liens supplémentaires')}</th>
                  <th className="px-4 py-3">{t('admin.addons.table.price', 'Prix')}</th>
                  <th className="px-4 py-3">{t('admin.common.status', 'Statut')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {addons.map(addon => {
                  const isEditing = editingAddonId === addon.id
                  return (
                    <tr key={addon.id} className="border-t border-slate-800/60 bg-slate-900/40">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editingAddonForm.name}
                            onChange={event => setEditingAddonForm(prev => ({ ...prev, name: event.target.value }))}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : (
                          <span className="font-semibold text-slate-100">{addon.name}</span>
                        )}
                        <div className="text-xs text-slate-500">
                          {isEditing ? (
                            <textarea
                              value={editingAddonForm.description}
                              onChange={event => setEditingAddonForm(prev => ({ ...prev, description: event.target.value }))}
                              rows={2}
                              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                          ) : (
                            addon.description || t('admin.addons.noDescription', 'Sans description')
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <input
                            value={editingAddonForm.additionalLinks}
                            onChange={event => setEditingAddonForm(prev => ({ ...prev, additionalLinks: event.target.value }))}
                            className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          />
                        ) : (
                          formatNumber.format(addon.additionalLinks)
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingAddonForm.price}
                              onChange={event => setEditingAddonForm(prev => ({ ...prev, price: event.target.value }))}
                              className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                            <input
                              value={editingAddonForm.currency}
                              onChange={event => setEditingAddonForm(prev => ({ ...prev, currency: event.target.value }))}
                              className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                          </div>
                        ) : (
                          `${centsToEuros(addon.priceCents)} ${addon.currency}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {addon.isActive ? t('admin.common.active', 'Actif') : t('admin.common.disabled', 'Inactif')}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={submitAddonUpdate}
                              className="rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                              disabled={updateAddonMutation.isPending}
                            >
                              {updateAddonMutation.isPending ? t('common.saving') : t('common.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAddonId(null)}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                              disabled={updateAddonMutation.isPending}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddonId(addon.id)
                                setEditingAddonForm({
                                  name: addon.name,
                                  description: addon.description ?? '',
                                  additionalLinks: String(addon.additionalLinks),
                                  price: centsToEuros(addon.priceCents),
                                  currency: addon.currency,
                                  isActive: addon.isActive
                                })
                              }}
                              className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                            >
                              {t('common.edit', 'Modifier')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAddonMutation.mutate(addon.id)}
                              className="rounded border border-red-500/60 px-3 py-1.5 text-red-200 transition hover:border-red-400"
                              disabled={deleteAddonMutation.isPending}
                            >
                              {t('common.delete', 'Supprimer')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={submitAddonCreate} className="mt-6 grid gap-3 rounded-lg border border-slate-800/60 bg-slate-900/50 p-4 md:grid-cols-2">
          <h3 className="md:col-span-2 text-sm font-semibold text-slate-100">{t('admin.addons.createTitle', 'Créer un pack')}</h3>
          <input
            value={newAddonForm.name}
            onChange={event => setNewAddonForm(prev => ({ ...prev, name: event.target.value }))}
            placeholder={t('admin.addons.namePlaceholder', 'Nom du pack')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            value={newAddonForm.description}
            onChange={event => setNewAddonForm(prev => ({ ...prev, description: event.target.value }))}
            placeholder={t('admin.addons.descriptionPlaceholder', 'Description optionnelle')}
            className="md:col-span-2 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            rows={2}
          />
          <input
            value={newAddonForm.additionalLinks}
            onChange={event => setNewAddonForm(prev => ({ ...prev, additionalLinks: event.target.value }))}
            placeholder={t('admin.addons.linksPlaceholder', 'Liens supplémentaires')}
            className="rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex items-center gap-2">
            <input
              value={newAddonForm.price}
              onChange={event => setNewAddonForm(prev => ({ ...prev, price: event.target.value }))}
              placeholder="0"
              className="w-24 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <input
              value={newAddonForm.currency}
              onChange={event => setNewAddonForm(prev => ({ ...prev, currency: event.target.value }))}
              className="w-20 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={newAddonForm.isActive}
              onChange={event => setNewAddonForm(prev => ({ ...prev, isActive: event.target.checked }))}
              className="h-4 w-4"
            />
            {t('admin.addons.markActive', 'Pack actif')}
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              disabled={createAddonMutation.isPending}
            >
              {createAddonMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Card>

      <Card title={t('admin.settings.title', 'Paramètres par défaut')} description={t('admin.settings.description', 'Définissez les limites applicables par défaut aux nouveaux espaces')}> 
        {settingsLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <form onSubmit={submitSettings} className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              {t('admin.settings.workspaceLimit', 'Limite de workspaces par compte (plan gratuit)')}
              <input
                value={settingsForm.workspaceLimit}
                onChange={event => setSettingsForm(prev => ({ ...prev, workspaceLimit: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              {t('admin.settings.linkLimit', 'Limite de liens par workspace (plan gratuit)')}
              <input
                value={settingsForm.linkLimit}
                onChange={event => setSettingsForm(prev => ({ ...prev, linkLimit: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              {t('admin.settings.qrLimit', 'Limite de QR codes par workspace')}
              <input
                value={settingsForm.qrLimit}
                onChange={event => setSettingsForm(prev => ({ ...prev, qrLimit: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              {t('admin.settings.membersLimit', 'Limite de membres par workspace')}
              <input
                value={settingsForm.membersLimit}
                onChange={event => setSettingsForm(prev => ({ ...prev, membersLimit: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title={t('admin.invites.title')} description={t('admin.invites.description')}>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={inviteCode}
            onChange={event => setInviteCode(event.target.value)}
            placeholder={t('admin.invites.placeholder', 'Code personnalisé (optionnel)')}
            className="w-full max-w-sm rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
            disabled={createInviteMutation.isPending}
          >
            {createInviteMutation.isPending ? t('common.saving') : t('admin.invites.generate')}
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-800/60">
          {invitesLoading ? (
            <Skeleton className="h-24" />
          ) : invites.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">{t('admin.invites.empty')}</p>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.invites.code')}</th>
                  <th className="px-4 py-3">{t('admin.invites.createdAt')}</th>
                  <th className="px-4 py-3">{t('admin.invites.usedBy')}</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(invite => (
                  <tr key={invite.id} className="border-t border-slate-800/60 bg-slate-900/40">
                    <td className="px-4 py-3 font-semibold text-slate-100">{invite.code}</td>
                    <td className="px-4 py-3 text-slate-400">{invite.createdAt ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {invite.usedBy ? `${invite.usedBy.name} (${invite.usedBy.email})` : t('admin.invites.notUsed', 'Non utilisé')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
