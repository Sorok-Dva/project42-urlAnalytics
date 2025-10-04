import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { getApiErrorMessage } from '../lib/apiError'
import { useAuth } from '../stores/auth'

const initialFormState = {
  originalUrl: '',
  slug: '',
  label: '',
  comment: '',
  domain: '',
  projectId: '',
  maxClicks: '',
  expireAt: '',
  fallbackUrl: '',
  publicStats: false
}

const serializeFormState = (
  state: typeof initialFormState,
  geoRules: GeoRuleForm[]
) => {
  const normalizedGeoRules = geoRules.map(rule => ({
    priority: Number(rule.priority) || 0,
    scope: rule.scope,
    target: rule.target.trim(),
    url: rule.url.trim()
  }))

  return JSON.stringify({
    form: {
      ...state,
      label: state.label.trim(),
      slug: state.slug.trim(),
      originalUrl: state.originalUrl.trim(),
      comment: state.comment.trim(),
      domain: state.domain,
      projectId: state.projectId,
      maxClicks: state.maxClicks?.toString().trim() ?? '',
      expireAt: state.expireAt ?? '',
      fallbackUrl: state.fallbackUrl.trim(),
      publicStats: state.publicStats
    },
    geoRules: normalizedGeoRules
  })
}

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const workspaceId = useAuth(state => state.workspaceId)

  const linkId = params.linkId ?? ''

  const { data: link, isLoading } = useQuery({
    queryKey: ['link', workspaceId, linkId],
    enabled: Boolean(linkId && workspaceId),
    queryFn: () => fetchLinkDetails(linkId)
  })
  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: fetchProjects
  })
  const { data: domains } = useQuery({
    queryKey: ['domains', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: fetchDomains
  })
  const fallbackDomain = import.meta.env.VITE_DEFAULT_DOMAIN ?? 'p-42.fr'

  const [form, setForm] = useState(initialFormState)
  const [geoRules, setGeoRules] = useState<GeoRuleForm[]>([])
  const [initialSnapshot, setInitialSnapshot] = useState('')

  useEffect(() => {
    if (!link) return
    const nextForm = {
      originalUrl: link.originalUrl,
      slug: link.slug,
      label: link.label ?? '',
      comment: link.comment ?? '',
      domain: link.domain?.domain ?? '',
      projectId: link.projectId ?? '',
      maxClicks: link.maxClicks ? String(link.maxClicks) : '',
      expireAt: link.expirationAt ? dayjs(link.expirationAt).format('YYYY-MM-DDTHH:mm') : '',
      fallbackUrl: link.fallbackUrl ?? '',
      publicStats: Boolean(link.publicStats)
    }
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
    setForm(nextForm)
    setGeoRules(normalizedRules)
    setInitialSnapshot(serializeFormState(nextForm, normalizedRules))
  }, [link])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateLinkRequest(linkId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
      queryClient.invalidateQueries({ queryKey: ['link', linkId] })
      push({ title: 'Modifications enregistrées' })
    },
    onError: error => {
      push({ title: 'Sauvegarde impossible', description: getApiErrorMessage(error) })
    }
  })

  const filteredProjects = useMemo(() => projects ?? [], [projects])
  const filteredDomains = useMemo(() => {
    const list = domains ?? []
    if (!fallbackDomain) return list
    const map = new Map<string, { id: string; domain: string; status?: string }>()
    list.forEach(domain => map.set(domain.domain, domain))
    if (!map.has(fallbackDomain)) {
      map.set(fallbackDomain, { id: 'default-domain', domain: fallbackDomain, status: 'verified' })
    }
    return Array.from(map.values())
  }, [domains, fallbackDomain])

  const statusLabels = useMemo(
    () => ({
      active: t('deeplinks.status.active'),
      archived: t('deeplinks.status.archived'),
      deleted: t('deeplinks.status.deleted')
    }),
    [t]
  )

  const currentSnapshot = useMemo(() => serializeFormState(form, geoRules), [form, geoRules])
  const isDirty = useMemo(() => initialSnapshot !== '' && currentSnapshot !== initialSnapshot, [currentSnapshot, initialSnapshot])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await updateMutation.mutateAsync({
        originalUrl: form.originalUrl.trim(),
        slug: form.slug.trim(),
        label: form.label.trim() ? form.label.trim() : null,
        comment: form.comment,
        domain: form.domain,
        projectId: form.projectId || null,
        geoRules,
        expiration: {
          expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : undefined,
          maxClicks: form.maxClicks ? Number(form.maxClicks) : undefined,
          redirectUrl: form.fallbackUrl ? form.fallbackUrl.trim() : undefined
        },
        publicStats: form.publicStats
      })

      const trimmedForm = {
        ...form,
        originalUrl: form.originalUrl.trim(),
        slug: form.slug.trim(),
        label: form.label.trim(),
        comment: form.comment.trim(),
        fallbackUrl: form.fallbackUrl.trim(),
        maxClicks: form.maxClicks ? form.maxClicks.trim() : ''
      }
      setForm(trimmedForm)
      setInitialSnapshot(serializeFormState(trimmedForm, geoRules))
    } catch (error) {
      // handled by mutation onError
    }
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
          <h1 className="text-3xl font-semibold text-slate-100">{link.label ?? link.slug}</h1>
          <p className="mt-1 text-sm text-slate-400">{link.slug}</p>
          <p className="text-xs text-slate-500">{link.originalUrl}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge
              label={statusLabels[link.status] ?? link.status}
              tone={link.status === 'archived' ? 'warning' : 'success'}
            />
            <StatusBadge
              label={link.publicStats ? 'Statistiques publiques' : 'Statistiques privées'}
              tone={link.publicStats ? 'success' : 'neutral'}
            />
            {shareUrl && <code className="rounded bg-slate-800/80 px-3 py-1 text-slate-300">{shareUrl}</code>}
          </div>
        </div>
        {isDirty ? (
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 hover:bg-accent/90 disabled:opacity-70"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/deeplinks')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent hover:text-accent"
          >
            {t('deeplinks.actions.back')}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Destination" description="URL d'origine et slug accessible" >
          <div className="grid gap-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              URL d'origine
              <input
                value={form.originalUrl}
                onChange={event => setForm(prev => ({ ...prev, originalUrl: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Libellé
                <input
                  value={form.label}
                  onChange={event => setForm(prev => ({ ...prev, label: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                  placeholder="Nom lisible"
                />
              </label>
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
                  <option value="">Sélectionner un domaine</option>
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
                Date d'expiration
                <input
                  type="datetime-local"
                  value={form.expireAt}
                  onChange={event => setForm(prev => ({ ...prev, expireAt: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Clics maximum
                <input
                  type="number"
                  value={form.maxClicks}
                  onChange={event => setForm(prev => ({ ...prev, maxClicks: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none"
                />
              </label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              URL de secours
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
                  <option value="country">Pays</option>
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
