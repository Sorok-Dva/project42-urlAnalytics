import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchLinkDetails, updateLinkRequest } from '../api/links'
import { fetchProjects } from '../api/projects'
import { fetchDomains } from '../api/domains'
import { useToast } from '../providers/ToastProvider'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import dayjs from '../lib/dayjs'

interface GeoRuleForm {
  priority: number
  scope: 'country' | 'continent'
  target: string
  url: string
}

const buildShareUrl = (token?: string | null) => {
  if (!token) return null
  return `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${token}`
}

export const LinkDetailsPage = () => {
  const { t } = useTranslation()
  const params = useParams<{ linkId: string }>()
  const queryClient = useQueryClient()
  const { push } = useToast()

  const linkId = params.linkId ?? ''

  const { data: link, isLoading } = useQuery({
    queryKey: ['link', linkId],
    enabled: Boolean(linkId),
    queryFn: () => fetchLinkDetails(linkId)
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: fetchDomains })

  const [form, setForm] = useState({
    originalUrl: '',
    slug: '',
    comment: '',
    domain: '',
    projectId: '',
    maxClicks: '',
    expireAt: '',
    fallbackUrl: '',
    publicStats: false
  })
  const [geoRules, setGeoRules] = useState<GeoRuleForm[]>([])

  useEffect(() => {
    if (!link) return
    setForm({
      originalUrl: link.originalUrl,
      slug: link.slug,
      comment: link.comment ?? '',
      domain: link.domain?.domain ?? '',
      projectId: link.projectId ?? '',
      maxClicks: link.maxClicks ? String(link.maxClicks) : '',
      expireAt: link.expirationAt ? dayjs(link.expirationAt).format('YYYY-MM-DDTHH:mm') : '',
      fallbackUrl: link.fallbackUrl ?? '',
      publicStats: Boolean(link.publicStats)
    })
    const normalizedRules = Array.isArray(link.geoRules)
      ? (link.geoRules as Array<GeoRuleForm | Record<string, unknown>>).map(rule => {
          const source = rule as Record<string, unknown>
          return {
            priority: Number((source.priority as number | string | undefined) ?? 0),
            scope: (source.scope === 'continent' ? 'continent' : 'country') as GeoRuleForm['scope'],
            target: String(source.target ?? ''),
            url: String(source.url ?? '')
          }
        })
      : []
    setGeoRules(normalizedRules)
  }, [link])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateLinkRequest(linkId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      queryClient.invalidateQueries({ queryKey: ['link', linkId] })
      push({ title: 'Modifications enregistrées' })
    }
  })

  const filteredProjects = useMemo(() => projects ?? [], [projects])
  const filteredDomains = useMemo(() => domains ?? [], [domains])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await updateMutation.mutateAsync({
      originalUrl: form.originalUrl,
      slug: form.slug,
      comment: form.comment,
      domain: form.domain,
      projectId: form.projectId || null,
      geoRules,
      expiration: {
        expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : undefined,
        maxClicks: form.maxClicks ? Number(form.maxClicks) : undefined,
        redirectUrl: form.fallbackUrl || undefined
      },
      publicStats: form.publicStats
    })
  }

  const handleGeoRuleChange = (index: number, field: keyof GeoRuleForm, value: string) => {
    setGeoRules(prev =>
      prev.map((rule, current) =>
        current === index
          ? {
              ...rule,
              [field]: field === 'priority' ? Number(value) : value
            }
          : rule
      )
    )
  }

  const addGeoRule = () => {
    setGeoRules(prev => [...prev, { priority: prev.length, scope: 'country', target: '', url: '' }])
  }

  const removeGeoRule = (index: number) => {
    setGeoRules(prev => prev.filter((_, current) => current !== index))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!link) {
    return (
      <EmptyState
        title="Aucun lien sélectionné"
        description="Choisissez un lien dans la vue Deeplinks pour configurer ses options."
      />
    )
  }

  const shareUrl = buildShareUrl(link.publicStatsToken)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">{link.slug}</h1>
          <p className="mt-1 text-sm text-slate-400">{link.originalUrl}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge label={link.status} tone={link.status === 'archived' ? 'warning' : 'success'} />
            <StatusBadge label={link.publicStats ? 'Public stats' : 'Private'} tone={link.publicStats ? 'success' : 'neutral'} />
            {shareUrl && <code className="rounded bg-slate-800/80 px-3 py-1 text-slate-300">{shareUrl}</code>}
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 hover:bg-accent/90"
        >
          Enregistrer
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Destination" description="URL d'origine et slug accessible" >
          <div className="grid gap-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Original URL
              <input
                value={form.originalUrl}
                onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Slug
                <input
                  value={form.slug}
                  onChange={event => setForm(prev => ({ ...prev, slug: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Domaine
                <select
                  value={form.domain}
                  onChange={event => setForm(prev => ({ ...prev, domain: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                >
                  <option value="">{t('deeplinks.search')}</option>
                  {filteredDomains.map(domain => (
                    <option key={domain.id} value={domain.domain}>
                      {domain.domain}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Commentaire / Notes
              <textarea
                value={form.comment}
                onChange={event => setForm(prev => ({ ...prev, comment: event.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        </Card>

        <Card title="Destination secondaire" description="Expirations et redirections alternatives">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Expiration date
                <input
                  type="datetime-local"
                  value={form.expireAt}
                  onChange={event => setForm(prev => ({ ...prev, expireAt: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Max clicks
                <input
                  type="number"
                  value={form.maxClicks}
                  onChange={event => setForm(prev => ({ ...prev, maxClicks: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                />
              </label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Fallback URL
              <input
                value={form.fallbackUrl}
                onChange={event => setForm(prev => ({ ...prev, fallbackUrl: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Projet
              <select
                value={form.projectId}
                onChange={event => setForm(prev => ({ ...prev, projectId: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="">Aucun projet</option>
                {filteredProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      </div>

      <Card
        title="Ciblage géographique"
        description="Dirigez vos utilisateurs vers des URL différentes selon leur origine"
        actions={
          <button
            type="button"
            onClick={addGeoRule}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent"
          >
            Ajouter une règle
          </button>
        }
      >
        {geoRules.length === 0 ? (
          <EmptyState
            title="Aucune règle encore"
            description="Ajoutez des règles de redirection par pays ou continent pour personnaliser l'expérience utilisateur."
            action={
              <button
                type="button"
                onClick={addGeoRule}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Nouvelle règle
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {geoRules.map((rule, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 md:grid-cols-[120px_160px_1fr_100px]">
                <select
                  value={rule.scope}
                  onChange={event => handleGeoRuleChange(index, 'scope', event.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                >
                  <option value="country">Country</option>
                  <option value="continent">Continent</option>
                </select>
                <input
                  value={rule.target}
                  onChange={event => handleGeoRuleChange(index, 'target', event.target.value)}
                  placeholder={rule.scope === 'country' ? 'FR' : 'EU'}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                />
                <input
                  value={rule.url}
                  onChange={event => handleGeoRuleChange(index, 'url', event.target.value)}
                  placeholder="https://example.fr"
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="number"
                    value={rule.priority}
                    onChange={event => handleGeoRuleChange(index, 'priority', event.target.value)}
                    className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeGeoRule(index)}
                    className="rounded-md border border-rose-500/60 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Statistiques publiques"
        description="Partagez vos analytics en mode public ou gardez-les privés"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Statistiques publiques</h4>
              <p className="text-xs text-slate-400">Activez pour générer une URL partageable en lecture seule.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, publicStats: !prev.publicStats }))}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                form.publicStats ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'
              }`}
            >
              {form.publicStats ? 'Statistiques publiques' : 'Statistiques privées'}
            </button>
          </div>
          {shareUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
              <span>{shareUrl}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent"
              >
                Copier
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Une URL sera générée après enregistrement.</p>
          )}
        </div>
      </Card>
    </form>
  )
}
