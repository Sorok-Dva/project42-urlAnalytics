import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../stores/auth'
import {
  createWorkspaceRequest,
  fetchWorkspaceMembers,
  inviteWorkspaceMemberRequest,
  updateWorkspaceRequest
} from '../api/workspaces'
import type { WorkspaceMemberSummary, WorkspaceRole } from '../types'
import { useToast } from '../providers/ToastProvider'
import { Card } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'

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

  const selectedWorkspace = useMemo(
    () => workspaces.find(item => item.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  )

  useEffect(() => {
    if (selectedWorkspace) {
      setRenameValue(selectedWorkspace.name)
    }
  }, [selectedWorkspace?.id])

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-slate-100">Espaces de travail</h1>
        <p className="text-sm text-slate-400">
          Gérez vos espaces de travail, invitez votre équipe et ajustez vos limites de collaboration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Créer un espace de travail" description="Définissez un nouveau périmètre de collaboration">
          <form onSubmit={handleCreateWorkspace} className="space-y-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={event => setNewWorkspaceName(event.target.value)}
              placeholder="Nom de l'espace de travail"
              className="w-full rounded-lg border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
            />
            <button
              type="submit"
              disabled={creating}
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
                  <StatusBadge label={`Plan ${selectedWorkspace.plan}`} tone="neutral" />
                  <span>{selectedWorkspace.memberStatus === 'active' ? 'Membre actif' : 'En attente'}</span>
                </div>
                <p>Slug : {selectedWorkspace.slug}</p>
                <p>Limite membres : {selectedWorkspace.planLimits?.members ?? 'Illimitée'}</p>
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
    </div>
  )
}
