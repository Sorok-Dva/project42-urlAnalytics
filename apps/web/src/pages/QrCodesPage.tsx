import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchQrCodes, createQrCode, downloadQrCode } from '../api/qr'
import { useToast } from '../providers/ToastProvider'
import { fetchLinks } from '../api/links'
import { fetchDomains } from '../api/domains'

export const QrCodesPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'url' | 'link'>('url')
  const [form, setForm] = useState({ name: '', originalUrl: '', linkId: '', design: 'dots', domain: '' })

  const qrQuery = useQuery({ queryKey: ['qr', search], queryFn: () => fetchQrCodes({ search }) })
  const linkQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) })
  const domainsQuery = useQuery({ queryKey: ['domains'], queryFn: fetchDomains })

  useEffect(() => {
    if (!form.domain && domainsQuery.data?.length) {
      setForm(prev => ({ ...prev, domain: domainsQuery.data[0].domain }))
    }
  }, [domainsQuery.data])

  const createMutation = useMutation({
    mutationFn: createQrCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr'] })
      setForm({ name: '', originalUrl: '', linkId: '', design: 'dots', domain: domainsQuery.data?.[0]?.domain ?? '' })
      push({ title: 'QR generated', description: 'Ready to share or download' })
    }
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name) return
    if (tab === 'url' && (!form.originalUrl || !form.domain)) return
    if (tab === 'link' && !form.linkId) return

    await createMutation.mutateAsync(
      tab === 'url'
        ? { name: form.name, originalUrl: form.originalUrl, domain: form.domain, design: { preset: form.design } }
        : { name: form.name, linkId: form.linkId, design: { preset: form.design } }
    )
  }

  const handleDownload = async (id: string, name: string) => {
    const svg = await downloadQrCode(id)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{t('qr.title')}</h2>
          <p className="text-sm text-muted">Branded QR codes with analytics</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={() => setTab('url')} className={`rounded-full px-4 py-1 ${tab === 'url' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`}>
            From URL
          </button>
          <button type="button" onClick={() => setTab('link')} className={`rounded-full px-4 py-1 ${tab === 'link' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`}>
            From Link
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs text-muted">Name</label>
            <input
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          {tab === 'url' ? (
            <>
              <div className="md:col-span-2">
                <label className="text-xs text-muted">Original URL</label>
                <input
                  value={form.originalUrl}
                  onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="text-xs text-muted">Link</label>
              <select
                value={form.linkId}
                onChange={event => setForm(prev => ({ ...prev, linkId: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select link</option>
                {linkQuery.data?.map(link => (
                  <option key={link.id} value={link.id}>
                    {link.slug}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted">Design</label>
            <select
              value={form.design}
              onChange={event => setForm(prev => ({ ...prev, design: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="dots">Dots</option>
              <option value="square">Square</option>
              <option value="mono">Mono</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={createMutation.isPending}>
            {t('qr.create')}
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {qrQuery.data?.map(qr => (
          <div key={qr.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">{qr.name}</h3>
              <span className="text-xs text-muted">{qr.totalScans} scans</span>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-800/60 p-6 text-center text-sm text-muted">
              Preview unavailable in CLI
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => handleDownload(qr.id, qr.name)} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent">
                Download
              </button>
              <button onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_PUBLIC_BASE_URL ?? ''}/qr/${qr.code}`)} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent">
                Copy link
              </button>
            </div>
          </div>
        ))}
        {qrQuery.data?.length === 0 && <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted">No QR codes yet</div>}
      </div>
    </div>
  )
}
