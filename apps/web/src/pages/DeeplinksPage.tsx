import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchLinks, createLinkRequest, archiveLinkRequest, unarchiveLinkRequest, deleteLinkRequest } from '../api/links'
import { useToast } from '../providers/ToastProvider'
import { fetchDomains } from '../api/domains'

const sortOptions = [
  { value: 'recent', label: 'Most recent' },
  { value: 'performance', label: 'Performance' },
  { value: 'old', label: 'Most old' }
]

export const DeeplinksPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'archived' | 'deleted'>('active')
  const [sort, setSort] = useState('recent')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ originalUrl: '', slug: '', domain: '' })

  const linksQuery = useQuery({
    queryKey: ['links', search, status, sort],
    queryFn: () => fetchLinks({ search, status, sort })
  })
  const domainsQuery = useQuery({ queryKey: ['domains'], queryFn: fetchDomains })

  useEffect(() => {
    if (!form.domain && domainsQuery.data?.length) {
      setForm(prev => ({ ...prev, domain: domainsQuery.data[0].domain }))
    }
  }, [domainsQuery.data])

  const createMutation = useMutation({
    mutationFn: createLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      setShowForm(false)
      setForm({ originalUrl: '', slug: '', domain: domainsQuery.data?.[0]?.domain ?? '' })
      push({ title: 'Link created', description: 'Your short link is live' })
    }
  })

  const archiveMutation = useMutation({
    mutationFn: archiveLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: 'Link archived' })
    }
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: 'Link restored' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      push({ title: 'Link deleted' })
    }
  })

  const filteredLinks = useMemo(() => linksQuery.data ?? [], [linksQuery.data])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.originalUrl || !form.domain) return
    await createMutation.mutateAsync({
      originalUrl: form.originalUrl,
      slug: form.slug || undefined,
      domain: form.domain,
      publicStats: false
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{t('deeplinks.title')}</h2>
          <p className="text-sm text-muted">Manage, filter and organise your links</p>
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
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="deleted">Removed</option>
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
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            {t('deeplinks.create')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted">Original URL</label>
            <input
              value={form.originalUrl}
              onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs text-muted">Slug</label>
            <input
              value={form.slug}
              onChange={event => setForm(prev => ({ ...prev, slug: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="my-awesome-link"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Domain</label>
            <select
              value={form.domain}
              onChange={event => setForm(prev => ({ ...prev, domain: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {domainsQuery.data?.map(domain => (
                <option key={domain.id} value={domain.domain}>
                  {domain.domain}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200">
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={createMutation.isPending}>
              Save
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead>
            <tr className="bg-slate-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Original URL</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Clicks</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLinks.map(link => (
              <tr key={link.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-slate-200">{link.slug}</td>
                <td className="px-4 py-3 text-slate-300">{link.originalUrl}</td>
                <td className="px-4 py-3 text-slate-300">{link.clickCount}</td>
                <td className="px-4 py-3 text-xs uppercase text-muted">{link.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button onClick={() => navigate(`/deeplinks/${link.id}`)} className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent">
                      Details
                    </button>
                    <button onClick={() => navigate(`/statistics/${link.id}`)} className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent">
                      Stats
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_PUBLIC_BASE_URL ?? ''}/${link.slug}`)}
                      className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent"
                    >
                      Copy
                    </button>
                    {link.status !== 'archived' ? (
                      <button onClick={() => archiveMutation.mutate(link.id)} className="rounded border border-slate-700 px-2 py-1 text-yellow-300 hover:border-yellow-500">
                        Archive
                      </button>
                    ) : (
                      <button onClick={() => unarchiveMutation.mutate(link.id)} className="rounded border border-slate-700 px-2 py-1 text-green-300 hover:border-green-500">
                        Unarchive
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(link.id)} className="rounded border border-red-500/60 px-2 py-1 text-red-300 hover:bg-red-500/20">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredLinks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  No links for this view
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
