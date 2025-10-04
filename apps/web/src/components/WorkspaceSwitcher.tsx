import { useEffect, useState } from 'react'
import { useAuth } from '../stores/auth'
import { useToast } from '../providers/ToastProvider'

export const WorkspaceSwitcher = () => {
  const workspaces = useAuth(state => state.workspaces)
  const workspaceId = useAuth(state => state.workspaceId)
  const switchWorkspace = useAuth(state => state.switchWorkspace)
  const refreshWorkspaces = useAuth(state => state.refreshWorkspaces)
  const token = useAuth(state => state.token)
  const [isSwitching, setIsSwitching] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    if (token && workspaces.length === 0) {
      refreshWorkspaces().catch(() => {
        push({ title: 'Impossible de charger les espaces de travail' })
      })
    }
  }, [token, workspaces.length, refreshWorkspaces, push])

  if (!workspaceId) return null

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = event.target.value
    if (!targetId || targetId === workspaceId) return
    try {
      setIsSwitching(true)
      await switchWorkspace(targetId)
      push({ title: 'Espace de travail actif mis à jour' })
    } catch (error) {
      push({ title: "Impossible de changer d'espace de travail" })
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Espace de travail actif
      </label>
      <select
        value={workspaceId}
        onChange={handleChange}
        disabled={isSwitching || workspaces.length <= 1}
        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {workspaces.map(workspace => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      {workspaces.length <= 1 && (
        <p className="text-[11px] text-slate-500">Créez un nouvel espace de travail pour collaborer avec d’autres membres.</p>
      )}
    </div>
  )
}
