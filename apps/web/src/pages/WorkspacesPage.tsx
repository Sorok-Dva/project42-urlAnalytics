import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../stores/auth'
import {
  createWorkspaceRequest,
  fetchWorkspaceMembers,
  inviteWorkspaceMemberRequest,
  updateWorkspaceRequest,
  fetchWorkspaceDetail,
  deleteWorkspaceRequest
} from '../api/workspaces'
import type { WorkspaceDetail, WorkspaceMemberSummary, WorkspaceRole } from '../types'
import { useToast } from '../providers/ToastProvider'
import { Card } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { WorkspacePlanDialog } from '../components/WorkspacePlanDialog'
import { getPlanDisplayName, resolveLinkLimit, resolveWorkspaceLimit } from '../lib/planLimits'

const roleLabels: Record<WorkspaceRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
  viewer: 'Lecteur'
}

export const WorkspacesPage = () => {
  const workspaceId = useAuth(state => state.workspaceId)
  const workspaces = useAuth(state => state.workspaces)
  const refreshWorkspaces = useAuth(state => state.refreshWorkspaces)
  const { push } = useToast()

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(workspaceId)
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | null>(null)
  const [workspaceDetailLoading, setWorkspaceDetailLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStrategy, setDeleteStrategy] = useState<'transfer' | 'purge'>('transfer')
  const [deleteTargetWorkspaceId, setDeleteTargetWorkspaceId] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [planDialogWorkspaceId, setPlanDialogWorkspaceId] = useState<string | null>(null)

  const primaryWorkspace = useMemo(
    () => workspaces.find(item => item.id === workspaceId) ?? workspaces[0] ?? null,
    [workspaces, workspaceId]
  )

  const selectedWorkspace = useMemo(
    () => workspaces.find(item => item.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  )

  const planDialogWorkspace = useMemo(
    () => (planDialogWorkspaceId ? workspaces.find(item => item.id === planDialogWorkspaceId) ?? null : null),
    [planDialogWorkspaceId, workspaces]
  )

  const workspaceLimit = useMemo(
    () => resolveWorkspaceLimit(primaryWorkspace),
    [primaryWorkspace?.plan, primaryWorkspace?.planLimits?.workspaces]
  )

  const linkLimitPerWorkspace = useMemo(
    () => resolveLinkLimit(primaryWorkspace),
    [primaryWorkspace?.plan, primaryWorkspace?.planLimits?.links]
  )

  const workspaceCount = workspaces.length
  const workspaceLimitReached = workspaceLimit !== undefined && workspaceCount >= workspaceLimit
  const workspaceUsageLabel = workspaceLimit !== undefined ? `${workspaceCount}/${workspaceLimit}` : `${workspaceCount}`
  const planLabel = primaryWorkspace ? getPlanDisplayName(primaryWorkspace.plan) : '—'
  const linkLimitLabel = linkLimitPerWorkspace !== undefined ? `${linkLimitPerWorkspace}` : 'illimitée'
  const workspaceUsageText = workspaceLimit !== undefined ? workspaceUsageLabel : `${workspaceCount} (illimité)`
  const selectedUsage = workspaceDetail?.usage ?? { links: 0, activeLinks: 0, qrCodes: 0, analytics: 0 }
  const selectedIsDefault = selectedWorkspace?.isDefault ?? false
  const workspaceIsEmpty = selectedUsage.links === 0 && selectedUsage.qrCodes === 0 && selectedUsage.analytics === 0
  const canUpgradePrimary = primaryWorkspace ? ['owner', 'admin'].includes(primaryWorkspace.role) : false

  const transferableTargets = useMemo(
    () =>
      workspaces.filter(
        workspace =>
          workspace.id !== selectedWorkspaceId && ['owner', 'admin'].includes(workspace.role)
      ),
    [workspaces, selectedWorkspaceId]
  )

  const defaultWorkspace = useMemo(
    () => workspaces.find(workspace => workspace.isDefault && workspace.id !== selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId]
  )

  useEffect(() => {
    if (workspaceId) {
      setSelectedWorkspaceId(workspaceId)
    }
  }, [workspaceId])

  useEffect(() => {
    if (workspaces.length === 0) {
      refreshWorkspaces().catch(() => push({ title: 'Impossible de charger les espaces de travail' }))
    }
  }, [workspaces.length, refreshWorkspaces, push])

  useEffect(() => {
    if (!selectedWorkspaceId) return
    setLoadingMembers(true)
    fetchWorkspaceMembers(selectedWorkspaceId)
      .then(data => setMembers(data))
      .catch(() => push({ title: 'Impossible de charger les membres' }))
      .finally(() => setLoadingMembers(false))
  }, [selectedWorkspaceId, push])

  useEffect(() => {
    if (selectedWorkspace) {
      setRenameValue(selectedWorkspace.name)
    }
  }, [selectedWorkspace?.id])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceDetail(null)
      return
    }
    setWorkspaceDetailLoading(true)
    fetchWorkspaceDetail(selectedWorkspaceId)
      .then(detail => setWorkspaceDetail(detail))
      .catch(() => push({ title: 'Impossible de charger les informations du workspace' }))
      .finally(() => setWorkspaceDetailLoading(false))
  }, [selectedWorkspaceId, push])

  const canManageSelected = selectedWorkspace && ['owner', 'admin'].includes(selectedWorkspace.role)

  const handleRenameWorkspace = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedWorkspaceId || !renameValue.trim()) return
    try {
      setRenaming(true)
      await updateWorkspaceRequest(selectedWorkspaceId, { name: renameValue.trim() })
      await refreshWorkspaces()
      push({ title: 'Espace de travail mis à jour', description: 'Le nom a été modifié.' })
    } catch (error) {
      push({ title: 'Renommage impossible', description: 'Vous ne disposez pas des droits nécessaires.' })
    } finally {
      setRenaming(false)
    }
  }

  const handleCreateWorkspace = async (event: FormEvent) => {
    event.preventDefault()
    const name = newWorkspaceName.trim()
    if (!name) return
    if (workspaceLimitReached) {
      push({ title: 'Limite atteinte', description: 'Votre plan actuel ne permet pas de créer d’autres espaces.' })
      return
    }
    try {
      setCreating(true)
      const workspace = await createWorkspaceRequest({ name })
      await refreshWorkspaces()
      setSelectedWorkspaceId(workspace.id)
      setNewWorkspaceName('')
      push({ title: 'Espace de travail créé', description: `${workspace.name} est maintenant disponible.` })
    } catch (error) {
      push({ title: 'Création impossible', description: 'Veuillez réessayer plus tard.' })
    } finally {
      setCreating(false)
    }
  }

  const handleInviteMember = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedWorkspaceId) return
    const email = inviteEmail.trim()
    if (!email) return
    try {
      setInviting(true)
      const member = await inviteWorkspaceMemberRequest(selectedWorkspaceId, {
        email,
        role: inviteRole
      })
      setMembers(current => {
        const exists = current.find(item => item.id === member.id)
        if (exists) {
          return current.map(item => (item.id === member.id ? member : item))
        }
        return [...current, member]
      })
      setInviteEmail('')
      push({ title: 'Invitation envoyée', description: `${member.user.email} rejoint l'espace de travail.` })
    } catch (error) {
      push({ title: 'Invitation impossible', description: 'Vérifiez l’adresse email et vos droits.' })
    } finally {
      setInviting(false)
    }
  }

  const handleOpenDeleteDialog = () => {
    if (!selectedWorkspaceId || !canManageSelected) return
    const defaultTarget = transferableTargets[0]?.id ?? defaultWorkspace?.id ?? ''
    setDeleteStrategy(workspaceIsEmpty ? 'purge' : 'transfer')
    setDeleteTargetWorkspaceId(defaultTarget)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeleting(false)
  }

  const handleConfirmDelete = async () => {
    if (!selectedWorkspaceId) return
    try {
      setDeleting(true)
      const workspaceName = selectedWorkspace?.name ?? 'workspace'
      const payload = workspaceIsEmpty
        ? { strategy: 'purge' as const }
        : deleteStrategy === 'transfer'
          ? { strategy: 'transfer' as const, targetWorkspaceId: deleteTargetWorkspaceId || undefined }
          : { strategy: 'purge' as const }

      const response = await deleteWorkspaceRequest(selectedWorkspaceId, payload)
      await refreshWorkspaces()
      setMembers([])
      setWorkspaceDetail(null)
      setDeleteDialogOpen(false)
      const fallbackId =
        response.targetWorkspaceId ??
        (defaultWorkspace && defaultWorkspace.id !== selectedWorkspaceId ? defaultWorkspace.id : undefined) ??
        workspaces.find(workspace => workspace.id !== selectedWorkspaceId)?.id ??
        null
      setSelectedWorkspaceId(fallbackId)
      push({
        title: response.status === 'transferred' ? 'Espace transféré' : 'Espace supprimé',
        description:
          response.status === 'transferred'
            ? `${workspaceName} a été transféré vers un autre workspace.`
            : `${workspaceName} a été supprimé.`
      })
    } catch (error) {
      push({ title: 'Suppression impossible', description: 'Veuillez réessayer plus tard.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-slate-100">Espaces de travail</h1>
        <p className="text-sm text-slate-400">
          Gérez vos espaces de travail, invitez votre équipe et ajustez vos limites de collaboration.
        </p>
      </div>

      {primaryWorkspace && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs text-slate-400">
            <p className="text-sm font-semibold text-slate-100">Plan {planLabel}</p>
            <p>
              Espaces utilisés : <span className="font-medium text-slate-100">{workspaceUsageText}</span>
            </p>
            <p>
              Limite de liens par espace : <span className="font-medium text-slate-100">{linkLimitLabel}</span>
            </p>
            {workspaceLimitReached && (
              <p className="font-medium text-amber-300">
                Limite atteinte : mettez votre plan à niveau pour augmenter votre capacité.
              </p>
            )}
            {workspaceLimitReached && canUpgradePrimary && primaryWorkspace && (
              <button
                type="button"
                onClick={() => setPlanDialogWorkspaceId(primaryWorkspace.id)}
                className="mt-2 inline-flex items-center justify-center rounded-md border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
              >
                Ajuster mon plan
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Créer un espace de travail" description="Définissez un nouveau périmètre de collaboration">
          {workspaceLimitReached && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Votre plan {planLabel} autorise déjà le maximum d’espaces de travail.
            </div>
          )}
          {workspaceLimitReached && canUpgradePrimary && primaryWorkspace && (
            <button
              type="button"
              onClick={() => setPlanDialogWorkspaceId(primaryWorkspace.id)}
              className="mb-3 w-full rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
            >
              Choisir un plan supérieur
            </button>
          )}
          <form onSubmit={handleCreateWorkspace} className="space-y-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={event => setNewWorkspaceName(event.target.value)}
              placeholder="Nom de l'espace de travail"
              className="w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={workspaceLimitReached}
            />
            <button
              type="submit"
              disabled={creating || workspaceLimitReached}
              className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? 'Création en cours...' : 'Créer'}
            </button>
          </form>
        </Card>

        <Card title="Espaces disponibles" description="Sélectionnez l’espace que vous souhaitez gérer">
          <div className="space-y-3">
            <select
              value={selectedWorkspaceId ?? ''}
              onChange={event => setSelectedWorkspaceId(event.target.value)}
              className="w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
            >
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            {selectedWorkspace && (
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <StatusBadge label={`Plan ${getPlanDisplayName(selectedWorkspace.plan)}`} tone="neutral" />
                  <span>{selectedWorkspace.memberStatus === 'active' ? 'Membre actif' : 'En attente'}</span>
                </div>
                <p>Slug : {selectedWorkspace.slug}</p>
                <p>Limite membres : {selectedWorkspace.planLimits?.members ?? 'Illimitée'}</p>
                {canManageSelected && (
                  <button
                    type="button"
                    onClick={() => setPlanDialogWorkspaceId(selectedWorkspace.id)}
                    className="mt-3 w-full rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
                  >
                    Ajuster le plan et les limites
                  </button>
                )}
                {canManageSelected && (
                  <form onSubmit={handleRenameWorkspace} className="mt-3 flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={event => setRenameValue(event.target.value)}
                      className="flex-1 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      placeholder="Nouveau nom"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-accent/40 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/10"
                      disabled={renaming}
                    >
                      {renaming ? 'Enregistrement...' : 'Renommer'}
                    </button>
                  </form>
                )}
                <div className="mt-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-3 text-xs">
                  {workspaceDetailLoading ? (
                    <p className="text-slate-500">Chargement des usages...</p>
                  ) : (
                    <div className="space-y-1">
                      <p>
                        Liens : <span className="font-semibold text-slate-100">{selectedUsage.links}</span>
                      </p>
                      <p>
                        QR codes : <span className="font-semibold text-slate-100">{selectedUsage.qrCodes}</span>
                      </p>
                      <p>
                        Événements analytiques :{' '}
                        <span className="font-semibold text-slate-100">{selectedUsage.analytics}</span>
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleOpenDeleteDialog}
                  disabled={selectedIsDefault || workspaceDetailLoading || !canManageSelected}
                  className="mt-3 w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedIsDefault
                    ? 'Le workspace par défaut ne peut pas être supprimé'
                    : !canManageSelected
                      ? "Vous n'avez pas les droits pour supprimer ce workspace"
                    : 'Supprimer ce workspace'}
                </button>
              </div>
            )}
          </div>
        </Card>

        <Card title="Inviter un membre" description="Ajoutez un collaborateur existant à cet espace de travail">
          <form onSubmit={handleInviteMember} className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={event => setInviteEmail(event.target.value)}
              placeholder="email@exemple.com"
              className="w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
              disabled={!selectedWorkspaceId}
            />
            <select
              value={inviteRole}
              onChange={event => setInviteRole(event.target.value as WorkspaceRole)}
              className="w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
            >
              {Object.keys(roleLabels).map(role => (
                <option key={role} value={role}>
                  {roleLabels[role as WorkspaceRole]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedWorkspaceId || inviting}
              className="w-full rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {inviting ? 'Invitation en cours...' : 'Inviter'}
            </button>
          </form>
        </Card>
      </div>

      <Card title="Membres" description="Personnes ayant accès à l'espace de travail sélectionné">
        {loadingMembers ? (
          <p className="text-sm text-slate-400">Chargement des membres...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun membre pour le moment.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800/60">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-t border-slate-800/60 bg-slate-900/40">
                    <td className="px-4 py-3 font-medium text-slate-100">{member.user.name}</td>
                    <td className="px-4 py-3 text-slate-300">{member.user.email}</td>
                    <td className="px-4 py-3 text-slate-300">{roleLabels[member.role]}</td>
                    <td className="px-4 py-3 text-slate-300">{member.status === 'active' ? 'Actif' : 'En attente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <WorkspacePlanDialog
        open={planDialogWorkspaceId !== null}
        workspaceId={planDialogWorkspaceId}
        workspaceName={planDialogWorkspace?.name}
        currentPlanId={planDialogWorkspace?.planId ?? null}
        currentPlanSlug={planDialogWorkspace?.plan}
        onClose={() => setPlanDialogWorkspaceId(null)}
        onSuccess={workspace => {
          refreshWorkspaces().catch(() => undefined)
          if (workspace.id === selectedWorkspaceId) {
            setWorkspaceDetail(workspace)
          }
        }}
      />

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Supprimer l'espace de travail</h2>
                <p className="text-xs text-slate-400">
                  Cette action est irréversible. Choisissez l'option qui convient pour gérer les données de cet espace.
                </p>
              </div>
              <button
                onClick={handleCloseDeleteDialog}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-accent hover:text-accent"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Récapitulatif</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-slate-800/60 bg-slate-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Liens</p>
                  <p className="text-lg font-semibold text-slate-100">{selectedUsage.links}</p>
                </div>
                <div className="rounded-md border border-slate-800/60 bg-slate-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">QR codes</p>
                  <p className="text-lg font-semibold text-slate-100">{selectedUsage.qrCodes}</p>
                </div>
                <div className="rounded-md border border-slate-800/60 bg-slate-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Analytics</p>
                  <p className="text-lg font-semibold text-slate-100">{selectedUsage.analytics}</p>
                </div>
              </div>
            </div>

            {workspaceIsEmpty ? (
              <p className="mt-4 text-xs text-slate-400">
                Ce workspace est vide. La suppression retirera simplement l'espace de travail de votre compte.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <p>
                  Ce workspace contient des données. Choisissez entre transférer les ressources ou tout supprimer.
                </p>
                <label className={`flex flex-col gap-2 rounded-lg border p-3 transition ${
                  deleteStrategy === 'transfer' ? 'border-accent/60 bg-accent/10' : 'border-slate-800/60 bg-slate-900/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-accent"
                      checked={deleteStrategy === 'transfer'}
                      onChange={() => {
                        setDeleteStrategy('transfer')
                        if (!deleteTargetWorkspaceId) {
                          setDeleteTargetWorkspaceId(
                            transferableTargets[0]?.id ?? defaultWorkspace?.id ?? ''
                          )
                        }
                      }}
                    />
                    <span className="font-semibold text-slate-100">Transférer vers un autre workspace</span>
                  </div>
                  {deleteStrategy === 'transfer' && (
                    transferableTargets.length > 0 ? (
                      <select
                        value={deleteTargetWorkspaceId}
                        onChange={event => setDeleteTargetWorkspaceId(event.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
                      >
                        {transferableTargets.map(workspace => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.name}
                          </option>
                        ))}
                        {defaultWorkspace &&
                          transferableTargets.every(target => target.id !== defaultWorkspace.id) && (
                            <option value={defaultWorkspace.id}>{defaultWorkspace.name}</option>
                          )}
                      </select>
                    ) : (
                      <p className="text-slate-400">
                        Aucun workspace éligible trouvé. Les données seront transférées automatiquement vers votre espace "{defaultWorkspace?.name ?? 'Personnel'}".
                      </p>
                    )
                  )}
                </label>
                <label className={`flex flex-col gap-2 rounded-lg border p-3 transition ${
                  deleteStrategy === 'purge' || workspaceIsEmpty
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-slate-800/60 bg-slate-900/70'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-red-500"
                      checked={deleteStrategy === 'purge' || workspaceIsEmpty}
                      onChange={() => setDeleteStrategy('purge')}
                    />
                    <span className="font-semibold text-red-300">Tout supprimer définitivement</span>
                  </div>
                  <p className="text-slate-400">
                    Tous les liens, QR codes et membres seront supprimés. Les statistiques seront conservées pour l'admin mais marquées comme archivées.
                  </p>
                </label>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                onClick={handleCloseDeleteDialog}
                className="rounded-md border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-accent hover:text-accent"
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={
                  deleting ||
                  (deleteStrategy === 'transfer' && !workspaceIsEmpty && !deleteTargetWorkspaceId)
                }
                className="rounded-md border border-red-500/60 bg-red-500/20 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? 'Traitement...' : workspaceIsEmpty || deleteStrategy === 'purge' ? 'Tout supprimer' : 'Transférer et supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
