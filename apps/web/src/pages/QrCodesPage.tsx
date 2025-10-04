import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchQrCodes, createQrCode, deleteQrCode, transferQrCodeRequest } from '../api/qr'
import { useToast } from '../providers/ToastProvider'
import { fetchAllLinks } from '../api/links'
import { fetchDomains } from '../api/domains'
import { getApiErrorMessage } from '../lib/apiError'
import { QrPreview } from '../components/QrPreview'
import { sanitizeDesign, downloadQr } from '../lib/qrDesign'
import type { QrCodeSummary, QrDesign } from '../types'
import { useAuth } from '../stores/auth'

export const QrCodesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const workspaces = useAuth(state => state.workspaces)
  const workspaceId = useAuth(state => state.workspaceId)
  const token = useAuth(state => state.token)
  const refreshWorkspaces = useAuth(state => state.refreshWorkspaces)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'url' | 'link'>('link')
  const [form, setForm] = useState({ name: '', originalUrl: '', linkId: '', domain: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [transferContext, setTransferContext] = useState<{
    qr: QrCodeSummary | null
    workspaceId: string
    linkId: string
  }>({ qr: null, workspaceId: '', linkId: '' })

  const baseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? window.location.origin

  const qrQuery = useQuery({
    queryKey: ['qr', workspaceId, search],
    enabled: Boolean(token && workspaceId),
    queryFn: () => fetchQrCodes({ search })
  })
  const linkQuery = useQuery({
    queryKey: ['links', workspaceId, 'for-qr'],
    enabled: Boolean(token && workspaceId),
    queryFn: () => fetchAllLinks({ status: 'active' })
  })
  const domainsQuery = useQuery({
    queryKey: ['domains', workspaceId],
    enabled: Boolean(token && workspaceId),
    queryFn: fetchDomains
  })
  const fallbackDomain = import.meta.env.VITE_DEFAULT_DOMAIN ?? 'p-42.fr'

  const domainOptions = useMemo(() => {
    const provided = domainsQuery.data ?? []
    if (!fallbackDomain) return provided
    const map = new Map<string, { id: string; domain: string; status?: string }>()
    provided.forEach(option => map.set(option.domain, option))
    if (!map.has(fallbackDomain)) {
      map.set(fallbackDomain, { id: 'default-domain', domain: fallbackDomain, status: 'verified' })
    }
    return Array.from(map.values())
  }, [domainsQuery.data, fallbackDomain])

  const defaultDomain = domainOptions[0]?.domain ?? ''

  useEffect(() => {
    if (!form.domain && defaultDomain) {
      setForm(prev => ({ ...prev, domain: defaultDomain }))
    }
  }, [defaultDomain, form.domain])

  useEffect(() => {
    if (workspaces.length <= 1) {
      refreshWorkspaces().catch(() => push({ title: 'Impossible de charger les espaces de travail' }))
    }
  }, [workspaces.length, refreshWorkspaces, push])

  const createMutation = useMutation({
    mutationFn: createQrCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr'] })
      setForm({ name: '', originalUrl: '', linkId: '', domain: defaultDomain ?? '' })
      push({ title: 'QR généré', description: 'Disponible pour partage ou téléchargement' })
    },
    onError: error => {
      push({ title: 'Impossible de générer le QR', description: getApiErrorMessage(error) })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteQrCode(id),
    onMutate: async id => {
      setDeletingId(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr'] })
      push({ title: 'QR supprimé', description: 'Le QR code a été supprimé définitivement.' })
    },
    onError: error => {
      push({ title: 'Suppression impossible', description: getApiErrorMessage(error) })
    },
    onSettled: () => {
      setDeletingId(null)
    }
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name) return
    if (tab === 'url') {
      if (!form.originalUrl || !form.domain) return
      await createMutation.mutateAsync({ name: form.name, originalUrl: form.originalUrl, domain: form.domain })
    } else {
      if (!form.linkId) return
      await createMutation.mutateAsync({ name: form.name, linkId: form.linkId })
    }
  }

  const handleDownload = async (qr: QrCodeSummary, format: 'png' | 'jpg' | 'svg') => {
    const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`
    await downloadQr(sanitizeDesign(qr.design as QrDesign), target, format, qr.name)
  }

  const handleCopy = async (qr: QrCodeSummary) => {
    const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`
    try {
      await navigator.clipboard.writeText(target)
      push({ title: t('deeplinks.copySuccess'), description: target })
    } catch (error) {
      push({ title: t('deeplinks.copyError'), description: String(error) })
    }
  }

  const handleDelete = async (qr: QrCodeSummary) => {
    const confirmed = window.confirm(`Supprimer le QR code "${qr.name}" ? Cette action est irréversible.`)
    if (!confirmed) return
    try {
      await deleteMutation.mutateAsync(qr.id)
    } catch (error) {
      // handled via onError toast
    }
  }

  const availableTargets = useMemo(
    () => workspaces.filter(item => item.id !== workspaceId && item.memberStatus === 'active'),
    [workspaces, workspaceId]
  )

  useEffect(() => {
    if (!transferContext.qr) return
    if (!availableTargets.some(target => target.id === transferContext.workspaceId)) {
      setTransferContext(current => ({ ...current, workspaceId: availableTargets[0]?.id ?? '' }))
    }
  }, [availableTargets, transferContext.qr])

  const transferMutation = useMutation({
    mutationFn: (input: { qrId: string; payload: { workspaceId: string; linkId?: string | null } }) =>
      transferQrCodeRequest(input.qrId, input.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr'] })
      setTransferContext({ qr: null, workspaceId: '', linkId: '' })
      push({ title: 'QR transféré', description: 'Le QR code a été déplacé.' })
    },
    onError: error => {
      push({ title: 'Transfert impossible', description: getApiErrorMessage(error) })
    }
  })

  const beginTransfer = (qr: QrCodeSummary) => {
    setTransferContext({ qr, workspaceId: availableTargets[0]?.id ?? '', linkId: '' })
  }

  const cancelTransfer = () => setTransferContext({ qr: null, workspaceId: '', linkId: '' })

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!transferContext.qr || !transferContext.workspaceId) return

    await transferMutation.mutateAsync({
      qrId: transferContext.qr.id,
      payload: {
        workspaceId: transferContext.workspaceId,
        linkId: transferContext.linkId.trim() ? transferContext.linkId.trim() : null
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{t('qr.title')}</h2>
          <p className="text-sm text-muted">Générez des QR codes personnalisés en temps réel</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Rechercher"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`rounded-full px-4 py-1 ${tab === 'link' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`}
          >
            Depuis un lien
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`rounded-full px-4 py-1 ${tab === 'url' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`}
          >
            Depuis une URL
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs text-muted">Nom</label>
            <input
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          {tab === 'url' ? (
            <>
              <div className="md:col-span-2">
                <label className="text-xs text-muted">URL d'origine</label>
                <input
                  value={form.originalUrl}
                  onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Domaine</label>
                <select
                  value={form.domain}
                  onChange={event => setForm(prev => ({ ...prev, domain: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  {domainOptions.map(domain => (
                    <option key={domain.id} value={domain.domain}>
                      {domain.domain}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="text-xs text-muted">Lien</label>
              <select
                value={form.linkId}
                onChange={event => setForm(prev => ({ ...prev, linkId: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Sélectionner un lien</option>
                {linkQuery.data?.map(link => (
                  <option key={link.id} value={link.id}>
                    {link.slug}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={createMutation.isPending}>
            {t('qr.create')}
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {qrQuery.data?.map(qr => {
          const design = sanitizeDesign(qr.design as QrDesign)
          const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`
          return (
            <div key={qr.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">{qr.name}</h3>
                <span className="text-xs text-muted">{qr.totalScans} scans</span>
              </div>
              <div className="mt-3 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <QrPreview data={target} design={design} size={140} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownload(qr, 'png')}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent"
                >
                  Télécharger PNG
                </button>
                <button
                  onClick={() => handleDownload(qr, 'jpg')}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent"
                >
                  Télécharger JPG
                </button>
                <button
                  onClick={() => handleDownload(qr, 'svg')}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent"
                >
                  Télécharger SVG
                </button>
                <button
                  onClick={() => handleCopy(qr)}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent"
                >
                  Copier le lien
                </button>
                <button
                  onClick={() => navigate(`/qr-codes/${qr.id}/design`)}
                  className="rounded-md border border-accent px-3 py-2 text-xs text-accent hover:bg-accent/10"
                >
                  Personnaliser
                </button>
                {availableTargets.length > 0 && (
                  <button
                    onClick={() => beginTransfer(qr)}
                    className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent"
                  >
                    Transférer
                  </button>
                )}
                <button
                  onClick={() => handleDelete(qr)}
                  className="rounded-md border border-rose-500/50 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deletingId === qr.id && deleteMutation.isPending}
                >
                  {deletingId === qr.id && deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          )
        })}
        {qrQuery.data?.length === 0 && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted">
            Aucun QR code pour le moment
          </div>
        )}
      </div>

      {transferContext.qr && (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold text-slate-100">Transférer le QR « {transferContext.qr.name} »</h3>
          <p className="mt-1 text-xs text-slate-400">
            Sélectionnez l'espace de travail de destination. Indiquez un identifiant de lien pour relier le QR après transfert (optionnel).
          </p>
          <form onSubmit={submitTransfer} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted">Espace de travail cible</label>
              <select
                value={transferContext.workspaceId}
                onChange={event =>
                  setTransferContext(current => ({ ...current, workspaceId: event.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
              >
                {availableTargets.map(workspace => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted">Lien cible (optionnel)</label>
              <input
                value={transferContext.linkId}
                onChange={event =>
                  setTransferContext(current => ({ ...current, linkId: event.target.value }))
                }
                placeholder="ID du lien dans le workspace cible"
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
                disabled={transferMutation.isPending || !transferContext.workspaceId}
              >
                {transferMutation.isPending ? 'Transfert...' : 'Confirmer'}
              </button>
              <button
                type="button"
                onClick={cancelTransfer}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default QrCodesPage
