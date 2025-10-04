import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchLinks,
  createLinkRequest,
  archiveLinkRequest,
  unarchiveLinkRequest,
  deleteLinkRequest,
  transferLinkRequest,
  transferLinksBulkRequest,
  updateLinkRequest
} from '../api/links'
import { useToast } from '../providers/ToastProvider'
import { fetchDomains } from '../api/domains'
import { getApiErrorMessage } from '../lib/apiError'
import type { Link } from '../types'
import { useAuth } from '../stores/auth'
import { fetchWorkspaceDomains, createWorkspaceRequest } from '../api/workspaces'
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
  Loader2,
  Edit3
} from 'lucide-react'

const DEFAULT_PAGE_SIZE = 25
type WorkspaceDomain = { id: string; domain: string; status: string }

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
  const [transferDomains, setTransferDomains] = useState<WorkspaceDomain[]>([])
  const [transferDomainsLoading, setTransferDomainsLoading] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState({ label: '', slug: '', originalUrl: '' })
  const [page, setPage] = useState(1)
  const pageSize = DEFAULT_PAGE_SIZE
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([])
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false)
  const [bulkTransferMode, setBulkTransferMode] = useState<'existing' | 'create'>('existing')
  const [bulkTransferWorkspaceId, setBulkTransferWorkspaceId] = useState('')
  const [bulkTransferDomain, setBulkTransferDomain] = useState('')
  const [bulkTransferDomains, setBulkTransferDomains] = useState<WorkspaceDomain[]>([])
  const [bulkTransferDomainsLoading, setBulkTransferDomainsLoading] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const selectAllRef = useRef<HTMLInputElement | null>(null)

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
    queryKey: ['links', workspaceId, search, status, sort, page, pageSize],
    enabled: Boolean(token && workspaceId),
    queryFn: () => fetchLinks({ search, status, sort, page, pageSize })
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
  const totalLinks = linksQuery.data?.total ?? 0
  const filteredLinks = linksQuery.data?.links ?? []
  const totalPages = Math.max(1, Math.ceil(totalLinks / pageSize))
  const pageStart = totalLinks === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = totalLinks === 0 ? 0 : Math.min(totalLinks, page * pageSize)
  const selectedCount = selectedLinkIds.length
  const hasSelection = selectedCount > 0
  const isPageSelected = filteredLinks.length > 0 && filteredLinks.every(link => selectedLinkIds.includes(link.id))
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLinkIds(prev => {
        const set = new Set(prev)
        filteredLinks.forEach(link => set.add(link.id))
        return Array.from(set)
      })
    } else {
      setSelectedLinkIds(prev => prev.filter(id => !filteredLinks.some(link => link.id === id)))
    }
  }

  const handleSelectLink = (linkId: string, checked: boolean) => {
    setSelectedLinkIds(prev => {
      if (checked) {
        if (prev.includes(linkId)) return prev
        return [...prev, linkId]
      }
      return prev.filter(id => id !== linkId)
    })
  }

  const clearSelection = () => {
    setSelectedLinkIds([])
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

  const mergeWithFallbackDomain = useCallback(
    (domains: WorkspaceDomain[]) => {
      if (!fallbackDomain) return domains
      const map = new Map<string, WorkspaceDomain>()
      domains.forEach(domain => map.set(domain.domain, domain))
      if (!map.has(fallbackDomain)) {
        map.set(fallbackDomain, { id: 'default-domain', domain: fallbackDomain, status: 'verified' })
      }
      return Array.from(map.values())
    },
    [fallbackDomain]
  )

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

  useEffect(() => {
    setPage(1)
  }, [search, status, sort, workspaceId])

  useEffect(() => {
    setSelectedLinkIds([])
  }, [workspaceId, status])

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil((linksQuery.data?.total ?? 0) / pageSize))
    if (page > nextTotalPages) {
      setPage(nextTotalPages)
    }
  }, [linksQuery.data?.total, page, pageSize])

  useEffect(() => {
    if (!hasSelection) {
      setBulkTransferOpen(false)
    }
  }, [hasSelection])

  useEffect(() => {
    if (!bulkTransferOpen) {
      setBulkTransferWorkspaceId('')
      setBulkTransferDomain('')
      setBulkTransferDomains([])
      setBulkTransferDomainsLoading(false)
      setNewWorkspaceName('')
      setBulkTransferMode(availableTargets.length > 0 ? 'existing' : 'create')
      return
    }

    if (availableTargets.length === 0) {
      setBulkTransferMode('create')
      setBulkTransferWorkspaceId('')
    } else if (bulkTransferMode === 'existing' && !bulkTransferWorkspaceId) {
      setBulkTransferWorkspaceId(availableTargets[0]?.id ?? '')
    }
  }, [bulkTransferOpen, availableTargets, bulkTransferMode, bulkTransferWorkspaceId])

  useEffect(() => {
    if (!bulkTransferOpen || bulkTransferMode !== 'existing') {
      if (!bulkTransferOpen) {
        setBulkTransferDomains([])
        setBulkTransferDomain('')
      }
      return
    }
    if (!bulkTransferWorkspaceId) {
      setBulkTransferDomains([])
      setBulkTransferDomain('')
      return
    }

    setBulkTransferDomainsLoading(true)
    fetchWorkspaceDomains(bulkTransferWorkspaceId)
      .then(domains => {
        const enriched = mergeWithFallbackDomain(domains as WorkspaceDomain[])
        setBulkTransferDomains(enriched)
        setBulkTransferDomain(current =>
          current && enriched.some(domain => domain.domain === current) ? current : enriched[0]?.domain ?? ''
        )
      })
      .catch(() => {
        push({ title: t('deeplinks.transfer.loadDomainsError') })
        setBulkTransferDomains([])
      })
      .finally(() => setBulkTransferDomainsLoading(false))
  }, [
    bulkTransferOpen,
    bulkTransferMode,
    bulkTransferWorkspaceId,
    mergeWithFallbackDomain,
    push,
      t
  ])

  useEffect(() => {
    if (bulkTransferMode === 'create') {
      setBulkTransferDomain('')
    }
  }, [bulkTransferMode])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasSelection && !isPageSelected && filteredLinks.length > 0
    }
  }, [hasSelection, isPageSelected, filteredLinks.length])

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

  const createWorkspaceMutation = useMutation({
    mutationFn: (name: string) => createWorkspaceRequest({ name }),
    onError: error => {
      push({ title: t('deeplinks.bulk.errors.createWorkspaceFailed'), description: getApiErrorMessage(error) })
    }
  })

  const bulkTransferMutation = useMutation({
    mutationFn: transferLinksBulkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.bulkTransferError.title'), description: getApiErrorMessage(error) })
    }
  })

  const inlineUpdateMutation = useMutation({
    mutationFn: (input: { id: string; payload: Record<string, unknown> }) =>
      updateLinkRequest(input.id, input.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({
        title: t('deeplinks.toast.updated.title'),
        description: t('deeplinks.toast.updated.description')
      })
      setEditingLinkId(null)
      setEditingForm({ label: '', slug: '', originalUrl: '' })
    },
    onError: error => {
      push({ title: t('deeplinks.toast.updateError.title'), description: getApiErrorMessage(error) })
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

  const availableTargets = useMemo(
    () => workspaces.filter(item => item.id !== workspaceId && item.memberStatus === 'active'),
    [workspaces, workspaceId]
  )

  const beginInlineEdit = useCallback(
    (link: Link) => {
      if (inlineUpdateMutation.isPending) return
      setEditingLinkId(link.id)
      setEditingForm({
        label: link.label ?? '',
        slug: link.slug,
        originalUrl: link.originalUrl
      })
    },
    [inlineUpdateMutation.isPending]
  )

  const cancelInlineEdit = useCallback(() => {
    setEditingLinkId(null)
    setEditingForm({ label: '', slug: '', originalUrl: '' })
  }, [])

  const saveInlineLink = useCallback(
    async (link: Link) => {
      const trimmed = {
        label: editingForm.label.trim(),
        slug: editingForm.slug.trim(),
        originalUrl: editingForm.originalUrl.trim()
      }

      if (!trimmed.originalUrl || !trimmed.slug) return
      if (
        trimmed.originalUrl === link.originalUrl &&
        trimmed.slug === link.slug &&
        trimmed.label === (link.label ?? '')
      ) {
        return
      }

      await inlineUpdateMutation.mutateAsync({
        id: link.id,
        payload: {
          originalUrl: trimmed.originalUrl,
          slug: trimmed.slug,
          label: trimmed.label ? trimmed.label : null
        }
      })
    },
    [editingForm, inlineUpdateMutation]
  )

  useEffect(() => {
    if (!editingLinkId) return
    const exists = filteredLinks.some(link => link.id === editingLinkId)
    if (!exists) {
      cancelInlineEdit()
    }
  }, [filteredLinks, editingLinkId, cancelInlineEdit])

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
        const enriched = mergeWithFallbackDomain(domains as WorkspaceDomain[])
        setTransferDomains(enriched)
        setTransferContext(current => ({
          ...current,
          domain: current.domain && enriched.some(domain => domain.domain === current.domain)
            ? current.domain
            : enriched[0]?.domain ?? ''
        }))
      })
      .catch(() => {
        push({ title: t('deeplinks.transfer.loadDomainsError') })
        setTransferDomains([])
      })
      .finally(() => setTransferDomainsLoading(false))
  }, [transferContext.link?.id, transferContext.workspaceId, push, t, mergeWithFallbackDomain])

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

  const submitBulkTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasSelection) return

    try {
      let targetWorkspaceId = bulkTransferWorkspaceId
      if (bulkTransferMode === 'create') {
        const trimmedName = newWorkspaceName.trim()
        if (!trimmedName) {
          push({ title: t('deeplinks.bulk.errors.nameRequired') })
          return
        }
        const workspace = await createWorkspaceMutation.mutateAsync(trimmedName)
        await refreshWorkspaces()
        targetWorkspaceId = workspace.id
        setBulkTransferWorkspaceId(workspace.id)
        setBulkTransferMode('existing')
      }

      if (!targetWorkspaceId) {
        push({ title: t('deeplinks.bulk.errors.workspaceRequired') })
        return
      }

      const count = selectedCount
      await bulkTransferMutation.mutateAsync({
        linkIds: selectedLinkIds,
        workspaceId: targetWorkspaceId,
        domain: bulkTransferDomain.trim() ? bulkTransferDomain.trim() : undefined
      })

      clearSelection()
      setBulkTransferOpen(false)
      setBulkTransferDomain('')
      setBulkTransferDomains([])
      setBulkTransferWorkspaceId('')
      setNewWorkspaceName('')
      push({
        title: t('deeplinks.toast.bulkTransferred.title'),
        description: t('deeplinks.toast.bulkTransferred.description', { count })
      })
    } catch (error) {
      // handled via mutation error callbacks
    }
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

      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-200">{t('deeplinks.count', { count: totalLinks })}</span>
          <span className="text-xs text-slate-400">
            {t('deeplinks.pagination.page', { page, totalPages })}
          </span>
        </div>
        {hasSelection && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
            <div>
              <p className="text-sm font-medium text-slate-100">
                {t('deeplinks.selection.title', { count: selectedCount })}
              </p>
              <p className="text-xs text-slate-400">{t('deeplinks.selection.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBulkTransferOpen(current => !current)}
                className="flex items-center gap-2 rounded-md border border-accent/60 px-3 py-2 text-sm text-accent transition hover:bg-accent/10"
              >
                <MoveRight className="h-4 w-4" />
                {bulkTransferOpen ? t('deeplinks.selection.closeTransfer') : t('deeplinks.selection.transfer')}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              >
                {t('deeplinks.selection.clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      {bulkTransferOpen && hasSelection && (
        <form
          onSubmit={submitBulkTransfer}
          className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 space-y-4"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-[200px] flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('deeplinks.bulk.destination')}
              </span>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  value="existing"
                  checked={bulkTransferMode === 'existing'}
                  onChange={() => setBulkTransferMode('existing')}
                  disabled={availableTargets.length === 0 && bulkTransferMode !== 'existing'}
                  className="h-4 w-4 border-slate-600 text-accent focus:ring-accent"
                />
                {t('deeplinks.bulk.useExisting')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  value="create"
                  checked={bulkTransferMode === 'create'}
                  onChange={() => setBulkTransferMode('create')}
                  className="h-4 w-4 border-slate-600 text-accent focus:ring-accent"
                />
                {t('deeplinks.bulk.createNew')}
              </label>
            </div>
            {bulkTransferMode === 'existing' ? (
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted">{t('deeplinks.bulk.targetWorkspace')}</label>
                <select
                  value={bulkTransferWorkspaceId}
                  onChange={event => setBulkTransferWorkspaceId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  disabled={availableTargets.length === 0}
                >
                  {availableTargets.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
                {availableTargets.length === 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    {t('deeplinks.bulk.noWorkspace')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted">{t('deeplinks.bulk.newWorkspaceName')}</label>
                <input
                  value={newWorkspaceName}
                  onChange={event => setNewWorkspaceName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  placeholder={t('deeplinks.bulk.newWorkspacePlaceholder')}
                />
              </div>
            )}
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted">{t('deeplinks.bulk.domain')}</label>
              {bulkTransferMode === 'existing' ? (
                bulkTransferDomainsLoading ? (
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('deeplinks.bulk.loadingDomains')}
                  </div>
                ) : bulkTransferDomains.length > 0 ? (
                  <select
                    value={bulkTransferDomain}
                    onChange={event => setBulkTransferDomain(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  >
                    {bulkTransferDomains.map(domain => (
                      <option key={`${domain.id}-${domain.domain}`} value={domain.domain}>
                        {domain.domain}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {t('deeplinks.bulk.noDomain')}
                  </div>
                )
              ) : (
                <input
                  value={bulkTransferDomain}
                  onChange={event => setBulkTransferDomain(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                  placeholder={t('deeplinks.bulk.domainPlaceholder')}
                />
              )}
              {bulkTransferMode === 'create' && (
                <p className="mt-2 text-xs text-slate-400">{t('deeplinks.bulk.domainHelp')}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {t('deeplinks.bulk.summary', { count: selectedCount })}
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
                disabled={
                  bulkTransferMutation.isPending ||
                  createWorkspaceMutation.isPending ||
                  (bulkTransferMode === 'existing' && !bulkTransferWorkspaceId)
                }
              >
                {bulkTransferMutation.isPending || createWorkspaceMutation.isPending
                  ? t('deeplinks.bulk.submitting')
                  : t('deeplinks.bulk.submit', { count: selectedCount })}
              </button>
              <button
                type="button"
                onClick={() => setBulkTransferOpen(false)}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead>
            <tr className="bg-slate-900/60">
              <th className="w-12 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isPageSelected && filteredLinks.length > 0}
                  onChange={event => toggleSelectAll(event.target.checked)}
                  disabled={filteredLinks.length === 0}
                  aria-checked={
                    hasSelection && !isPageSelected && filteredLinks.length > 0
                      ? 'mixed'
                      : isPageSelected && filteredLinks.length > 0
                        ? 'true'
                        : 'false'
                  }
                  aria-label={t('deeplinks.selection.selectAll')}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent focus:ring-accent"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.original')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.clicks')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">{t('deeplinks.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLinks.map(link => {
              const isEditing = editingLinkId === link.id
              const isSelected = selectedLinkIds.includes(link.id)
              const trimmedOriginalUrl = editingForm.originalUrl.trim()
              const trimmedSlug = editingForm.slug.trim()
              const trimmedLabel = editingForm.label.trim()
              const originalLabel = link.label ?? ''
              const hasInlineChanges =
                isEditing &&
                (trimmedOriginalUrl !== link.originalUrl || trimmedSlug !== link.slug || trimmedLabel !== originalLabel)
              const inlineSaving = inlineUpdateMutation.isPending && isEditing
              const canInlineSave =
                isEditing &&
                trimmedOriginalUrl.length > 0 &&
                trimmedSlug.length > 0 &&
                hasInlineChanges &&
                !inlineUpdateMutation.isPending

              const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (canInlineSave) {
                    saveInlineLink(link).catch(() => {})
                  }
                }
              }

              return (
                <tr
                  key={link.id}
                  className={`${isEditing ? 'bg-slate-800/30' : 'hover:bg-slate-800/40'} transition`}
                >
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={event => handleSelectLink(link.id, event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent focus:ring-accent"
                      aria-label={t('deeplinks.selection.checkbox', {
                        name: link.label ?? link.slug
                      })}
                    />
                  </td>
                  <td
                    className="px-4 py-3 font-medium text-slate-200"
                    onDoubleClick={() => {
                      if (!isEditing) beginInlineEdit(link)
                    }}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editingForm.label}
                          onChange={event => setEditingForm(prev => ({ ...prev, label: event.target.value }))}
                          onKeyDown={handleKeyDown}
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                          placeholder={t('deeplinks.form.labelPlaceholder')}
                        />
                        <input
                          value={editingForm.slug}
                          onChange={event => setEditingForm(prev => ({ ...prev, slug: event.target.value }))}
                          onKeyDown={handleKeyDown}
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
                          placeholder={t('deeplinks.form.slugPlaceholder')}
                        />
                      </div>
                    ) : (
                      <div className="cursor-pointer space-y-1" onDoubleClick={() => beginInlineEdit(link)}>
                        <div className="text-sm font-semibold text-slate-100">{link.label ?? link.slug}</div>
                        <div className="text-xs text-slate-400">{link.slug}</div>
                      </div>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-slate-300"
                    onDoubleClick={() => {
                      if (!isEditing) beginInlineEdit(link)
                    }}
                  >
                    {isEditing ? (
                      <input
                        value={editingForm.originalUrl}
                        onChange={event => setEditingForm(prev => ({ ...prev, originalUrl: event.target.value }))}
                        onKeyDown={handleKeyDown}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                        placeholder={t('deeplinks.form.originalUrlPlaceholder')}
                      />
                    ) : (
                      <span className="block max-w-[320px] truncate text-slate-300" title={link.originalUrl}>
                        {link.originalUrl}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{link.clickCount}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted">{statusLabels[link.status]}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => saveInlineLink(link).catch(() => {})}
                          className="flex items-center gap-1.5 rounded border border-emerald-500/50 px-3 py-1.5 text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!canInlineSave}
                        >
                          {inlineSaving ? t('common.saving') : t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelInlineEdit}
                          className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => beginInlineEdit(link)}
                          className="flex items-center gap-1.5 rounded border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-accent"
                        >
                          <Edit3 className="h-4 w-4" />
                          {t('deeplinks.actions.edit')}
                        </button>
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
                    )}
                  </td>
                </tr>
              )
            })}
            {linksLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
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
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  {t('deeplinks.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-900/60 px-4 py-3">
          <span className="text-xs text-slate-400">
            {totalLinks === 0
              ? t('deeplinks.pagination.empty')
              : t('deeplinks.pagination.range', { start: pageStart, end: pageEnd, total: totalLinks })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(1, current - 1))}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-accent disabled:opacity-60"
              disabled={!canGoPrev || linksLoading}
            >
              {t('deeplinks.pagination.previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-accent disabled:opacity-60"
              disabled={!canGoNext || linksLoading}
            >
              {t('deeplinks.pagination.next')}
            </button>
          </div>
        </div>
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
