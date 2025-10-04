import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchLinks,
  createLinkRequest,
  archiveLinkRequest,
  unarchiveLinkRequest,
  deleteLinkRequest,
  transferLinkRequest
} from '../api/links'
import { useToast } from '../providers/ToastProvider'
import { fetchDomains } from '../api/domains'
import { getApiErrorMessage } from '../lib/apiError'
import type { Link } from '../types'
import { useAuth } from '../stores/auth'
import { fetchWorkspaceDomains } from '../api/workspaces'
import { Skeleton } from '../components/Skeleton'
import {
  Eye,
  BarChart3,
  Copy as CopyIcon,
  MoveRight,
  Archive as ArchiveIcon,
  RotateCcw,
  Trash2,
  PlusCircle,
  Loader2
} from 'lucide-react'

export const DeeplinksPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'archived' | 'deleted'>('active')
  const [sort, setSort] = useState('recent')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ originalUrl: '', slug: '', domain: '', label: '' })
  const [transferContext, setTransferContext] = useState<{
    link: Link | null
    workspaceId: string
    domain: string
  }>({ link: null, workspaceId: '', domain: '' })
  const [transferDomains, setTransferDomains] = useState<Array<{ id: string; domain: string; status: string }>>([])
  const [transferDomainsLoading, setTransferDomainsLoading] = useState(false)

  const workspaces = useAuth(state => state.workspaces)
  const workspaceId = useAuth(state => state.workspaceId)
  const token = useAuth(state => state.token)
  const refreshWorkspaces = useAuth(state => state.refreshWorkspaces)

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: t('deeplinks.sort.recent') },
      { value: 'performance', label: t('deeplinks.sort.performance') },
      { value: 'old', label: t('deeplinks.sort.old') }
    ],
    [t]
  )

  const statusOptions = useMemo(
    () => [
      { value: 'active', label: t('deeplinks.status.active') },
      { value: 'archived', label: t('deeplinks.status.archived') },
      { value: 'deleted', label: t('deeplinks.status.deleted') }
    ],
    [t]
  )

  const linksQuery = useQuery({
    queryKey: ['links', workspaceId, search, status, sort],
    enabled: Boolean(token && workspaceId),
    queryFn: () => fetchLinks({ search, status, sort })
  })
  const domainsQuery = useQuery({
    queryKey: ['domains', workspaceId],
    enabled: Boolean(token && workspaceId),
    queryFn: fetchDomains
  })
  const fallbackDomain = import.meta.env.VITE_DEFAULT_DOMAIN ?? 'p-42.fr'
  const publicBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL
  const domainsLoading = domainsQuery.isLoading
  const linksLoading = linksQuery.isLoading || linksQuery.isFetching

  const buildShortUrl = (link: Link) => {
    const baseCandidate = link.domain?.domain || publicBaseUrl || fallbackDomain
    if (!baseCandidate) return link.slug
    const withProtocol = baseCandidate.startsWith('http') ? baseCandidate : `https://${baseCandidate}`
    const normalized = withProtocol.replace(/\/+$/, '')
    return `${normalized}/${link.slug}`
  }

  const handleCopy = async (link: Link) => {
    const shortUrl = buildShortUrl(link)
    try {
      await navigator.clipboard.writeText(shortUrl)
      push({ title: t('deeplinks.copySuccess'), description: shortUrl })
    } catch (error) {
      push({ title: t('deeplinks.copyError'), description: String(error) })
    }
  }

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
    if (!domainsLoading && !form.domain && defaultDomain) {
      setForm(prev => ({ ...prev, domain: defaultDomain }))
    }
  }, [defaultDomain, form.domain, domainsLoading])

  useEffect(() => {
    if (workspaces.length <= 1) {
      refreshWorkspaces().catch(() => {
        push({ title: 'Impossible de charger les espaces de travail' })
      })
    }
  }, [workspaces.length, refreshWorkspaces, push])

  const createMutation = useMutation({
    mutationFn: createLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      setShowForm(false)
      setForm({ originalUrl: '', slug: '', domain: defaultDomain ?? '', label: '' })
      push({
        title: t('deeplinks.toast.created.title'),
        description: t('deeplinks.toast.created.description')
      })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.createError.title'), description: getApiErrorMessage(error) })
    }
  })

  const archiveMutation = useMutation({
    mutationFn: archiveLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: t('deeplinks.toast.archived.title') })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.archiveError.title'), description: getApiErrorMessage(error) })
    }
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: t('deeplinks.toast.unarchived.title') })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.unarchiveError.title'), description: getApiErrorMessage(error) })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: t('deeplinks.toast.deleted.title') })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.deleteError.title'), description: getApiErrorMessage(error) })
    }
  })

  const statusLabels = useMemo(
    () => ({
      active: t('deeplinks.status.active'),
      archived: t('deeplinks.status.archived'),
      deleted: t('deeplinks.status.deleted')
    }),
    [t]
  )

  const filteredLinks = useMemo(() => linksQuery.data ?? [], [linksQuery.data])

  const availableTargets = useMemo(
    () => workspaces.filter(item => item.id !== workspaceId && item.memberStatus === 'active'),
    [workspaces, workspaceId]
  )

  useEffect(() => {
    if (!transferContext.link) {
      setTransferDomains([])
      setTransferDomainsLoading(false)
      return
    }
    if (!availableTargets.some(target => target.id === transferContext.workspaceId)) {
      setTransferContext(current => ({
        ...current,
        workspaceId: availableTargets[0]?.id ?? ''
      }))
    }
  }, [availableTargets, transferContext.link])

  useEffect(() => {
    if (!transferContext.link || !transferContext.workspaceId) {
      setTransferDomains([])
      return
    }
    setTransferDomainsLoading(true)
    fetchWorkspaceDomains(transferContext.workspaceId)
      .then(domains => {
        setTransferDomains(domains)
        setTransferContext(current => ({
          ...current,
          domain: current.domain && domains.some(domain => domain.domain === current.domain)
            ? current.domain
            : domains[0]?.domain ?? ''
        }))
      })
      .catch(() => {
        push({ title: t('deeplinks.transfer.loadDomainsError') })
        setTransferDomains([])
      })
      .finally(() => setTransferDomainsLoading(false))
  }, [transferContext.link?.id, transferContext.workspaceId, push, t])

  const transferMutation = useMutation({
    mutationFn: (input: { linkId: string; payload: { workspaceId: string; domain?: string } }) =>
      transferLinkRequest(input.linkId, input.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      setTransferContext({ link: null, workspaceId: '', domain: '' })
      push({
        title: t('deeplinks.toast.transferred.title'),
        description: t('deeplinks.toast.transferred.description')
      })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.transferError.title'), description: getApiErrorMessage(error) })
    }
  })

  const beginTransfer = (link: Link) => {
    if (availableTargets.length === 0) {
      push({ title: t('deeplinks.transfer.noWorkspace') })
      return
    }
    setTransferContext({
      link,
      workspaceId: availableTargets[0]?.id ?? '',
      domain: link.domain?.domain ?? ''
    })
  }

  const cancelTransfer = () => setTransferContext({ link: null, workspaceId: '', domain: '' })

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!transferContext.link || !transferContext.workspaceId) return

    await transferMutation.mutateAsync({
      linkId: transferContext.link.id,
      payload: {
        workspaceId: transferContext.workspaceId,
        domain: transferContext.domain.trim() ? transferContext.domain.trim() : undefined
      }
    })
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.originalUrl || !form.domain) return
    await createMutation.mutateAsync({
      originalUrl: form.originalUrl,
      slug: form.slug || undefined,
      domain: form.domain,
      publicStats: false,
      label: form.label.trim() ? form.label.trim() : undefined
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{t('deeplinks.title')}</h2>
          <p className="text-sm text-muted">{t('deeplinks.subtitle')}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('deeplinks.search')}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <select
            value={status}
            onChange={event => setStatus(event.target.value as typeof status)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={event => setSort(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(current => !current)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            <PlusCircle className="h-4 w-4" />
            {t('deeplinks.create')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted">{t('deeplinks.form.originalUrl')}</label>
            <input
              value={form.originalUrl}
              onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={t('deeplinks.form.originalUrlPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs text-muted">{t('deeplinks.form.label')}</label>
            <input
              value={form.label}
              onChange={event => setForm(prev => ({ ...prev, label: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={t('deeplinks.form.labelPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs text-muted">{t('deeplinks.form.slug')}</label>
            <input
              value={form.slug}
              onChange={event => setForm(prev => ({ ...prev, slug: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={t('deeplinks.form.slugPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs text-muted">{t('deeplinks.form.domain')}</label>
            {domainsLoading ? (
              <Skeleton className="mt-1 h-10" />
            ) : (
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
            )}
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead>
            <tr className="bg-slate-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.original')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.clicks')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLinks.map(link => (
              <tr key={link.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-slate-200">
                  <div className="text-sm font-semibold text-slate-100">{link.label ?? link.slug}</div>
                  <div className="text-xs text-slate-400">{link.slug}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">{link.originalUrl}</td>
                <td className="px-4 py-3 text-slate-300">{link.clickCount}</td>
                <td className="px-4 py-3 text-xs uppercase text-muted">{statusLabels[link.status]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/deeplinks/${link.id}`)}
                      className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                    >
                      <Eye className="h-4 w-4" />
                      {t('deeplinks.actions.details')}
                    </button>
                    <button
                      onClick={() => navigate(`/statistics/${link.id}`)}
                      className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                    >
                      <BarChart3 className="h-4 w-4" />
                      {t('deeplinks.actions.stats')}
                    </button>
                    <button
                      onClick={() => handleCopy(link)}
                      className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                    >
                      <CopyIcon className="h-4 w-4" />
                      {t('deeplinks.actions.copy')}
                    </button>
                    {availableTargets.length > 0 && (
                      <button
                        onClick={() => beginTransfer(link)}
                        className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                      >
                        <MoveRight className="h-4 w-4" />
                        {t('deeplinks.actions.transfer')}
                      </button>
                    )}
                    {link.status !== 'archived' ? (
                      <button
                        onClick={() => archiveMutation.mutate(link.id)}
                        className="flex items-center gap-1.5 rounded border border-amber-500/50 px-3 py-1.5 text-amber-200 transition hover:border-amber-500 hover:bg-amber-500/10"
                      >
                        <ArchiveIcon className="h-4 w-4" />
                        {t('deeplinks.actions.archive')}
                      </button>
                    ) : (
                      <button
                        onClick={() => unarchiveMutation.mutate(link.id)}
                        className="flex items-center gap-1.5 rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('deeplinks.actions.unarchive')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(link.id)}
                      className="flex items-center gap-1.5 rounded border border-red-500/50 px-3 py-1.5 text-red-300 transition hover:border-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('deeplinks.actions.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {linksLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <div className="space-y-3">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                </td>
              </tr>
            )}
            {!linksLoading && filteredLinks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  {t('deeplinks.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
    </div>

    {transferContext.link && (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold text-slate-100">
          {t('deeplinks.transfer.title', {
            name: transferContext.link.label ?? transferContext.link.slug
          })}
        </h3>
        <p className="mt-1 text-xs text-slate-400">{t('deeplinks.transfer.description')}</p>
        <form onSubmit={submitTransfer} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted">{t('deeplinks.transfer.targetWorkspace')}</label>
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
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-muted">{t('deeplinks.transfer.domain')}</label>
            {transferDomainsLoading ? (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('deeplinks.transfer.loadingDomains')}
              </div>
            ) : transferDomains.length > 0 ? (
              <select
                value={transferContext.domain}
                onChange={event =>
                  setTransferContext(current => ({ ...current, domain: event.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
              >
                {transferDomains.map(domain => (
                  <option key={`${domain.id}-${domain.domain}`} value={domain.domain}>
                    {domain.domain}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {t('deeplinks.transfer.noDomain')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
              disabled={
                transferMutation.isPending ||
                !transferContext.workspaceId ||
                transferDomainsLoading ||
                (transferDomains.length === 0 && transferContext.domain.trim().length === 0)
              }
            >
              {transferMutation.isPending ? t('deeplinks.transfer.submitting') : t('deeplinks.transfer.confirm')}
            </button>
            <button
              type="button"
              onClick={cancelTransfer}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    )}
  </div>
)
}
