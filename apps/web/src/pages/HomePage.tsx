import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DashboardTimeRange } from '@p42/shared'
import { fetchOverview } from '../api/dashboard'
import { MetricCard } from '../components/MetricCard'
import { LineChart } from '../components/LineChart'
import { IntervalSelector } from '../components/IntervalSelector'
import { Card } from '../components/Card'
import { Skeleton } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../stores/auth'
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics'
import dayjs from '../lib/dayjs'
import { Link2, QrCode, BarChart3, ArrowRight } from 'lucide-react'
import { ApiError } from '../lib/apiError'

const onboardingSteps = [
  'Connect your first domain',
  'Create a short link',
  'Share analytics with your team',
  'Generate a branded QR code'
]

type ChartGranularity = 'second' | 'minute' | 'hour' | 'day' | 'month'

interface OverviewResponse {
  metrics: {
    numberOfLinks: number
    totalClicks: number
  }
  range: DashboardTimeRange
  recentClicks: Array<{ timestamp: string; total: number }>
  recentClicksGranularity?: ChartGranularity
  events?: Array<{
    id: string
    eventType?: string
    interactionType?: string
    linkId?: string
    projectId?: string
    device?: string | null
    country?: string | null
    referer?: string | null
    occurredAt: string
  }>
}

const formatInteractionLabel = (value: string) => {
  switch (value) {
    case 'scan':
      return 'Scan'
    case 'direct':
      return 'Direct'
    case 'api':
      return 'API'
    case 'bot':
      return 'Bot'
    case 'click':
      return 'Click'
    default:
      return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

const getInteractionTone = (value: string): 'neutral' | 'success' | 'warning' | 'danger' => {
  if (value === 'scan') return 'warning'
  if (value === 'bot') return 'danger'
  if (value === 'api') return 'neutral'
  if (value === 'direct' || value === 'click') return 'success'
  return 'neutral'
}

export const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, workspaceId, logout } = useAuth()
  const [range, setRange] = useState<DashboardTimeRange>('7d')

  const queryEnabled = Boolean(token)

  const rooms = useMemo(() => (workspaceId ? [`workspace:${workspaceId}`] : []), [workspaceId])

  const { data, isLoading, isFetching, error } = useQuery<OverviewResponse, ApiError>({
    queryKey: ['overview', range],
    queryFn: () => fetchOverview(range),
    enabled: queryEnabled,
    retry: false
  })

  useEffect(() => {
    if (error?.status === 401) {
      logout()
      queryClient.removeQueries({ queryKey: ['overview'] })
    }
  }, [error, logout, queryClient])

  const invalidateOverview = useCallback(() => {
    if (!queryEnabled) return
    queryClient.invalidateQueries({ queryKey: ['overview', range] })
  }, [queryClient, range, queryEnabled])

  useRealtimeAnalytics(queryEnabled ? rooms : [], invalidateOverview)

  const loading = (!queryEnabled && !data) || (queryEnabled && (isLoading || isFetching))

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const chartData = Array.isArray(data?.recentClicks) ? data.recentClicks : []
  const granularity: ChartGranularity = data?.recentClicksGranularity ?? 'minute'
  const rangeTotal = chartData.reduce((sum, point) => sum + point.total, 0)
  const recentEvents = data?.events ?? []

  if (!data) {
    return (
      <EmptyState
        title="Bienvenue sur Deeplinks Insight"
        description="Commencez par créer votre premier lien court pour alimenter les analytics en temps réel."
        action={
          <button
            onClick={() => navigate('/deeplinks')}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Créer un lien
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-100">{t('home.welcome')}</h2>
          <p className="text-sm text-slate-400">Monitor the pulse of your links in real time.</p>
        </div>
        <IntervalSelector value={range} onChange={setRange} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label={t('home.numberOfLinks')} value={data.metrics?.numberOfLinks ?? 0} />
        <MetricCard label={t('home.totalClicks')} value={data.metrics?.totalClicks ?? 0} />
        <MetricCard
          label={t('home.recentClicks')}
          value={rangeTotal}
          action={
            <button
              onClick={() => navigate('/statistics')}
              className="rounded-md border border-accent/40 px-3 py-1 text-xs text-accent hover:bg-accent/10"
            >
              {t('home.viewAnalytics')}
            </button>
          }
        />
      </div>

      <Card
        title="Actions rapides"
        description="Accès direct aux outils essentiels"
        actions={<button onClick={() => navigate('/deeplinks')} className="text-xs text-accent hover:underline">Aller aux liens</button>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => navigate('/deeplinks?create=true')}
            className="group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent/20 p-2 text-accent">
                <Link2 className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-100">Créer un deeplink</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Générer un lien court et tracké en quelques secondes.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs text-accent/80 group-hover:text-accent">
              Commencer
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            onClick={() => navigate('/qr')}
            className="group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-400">
                <QrCode className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-100">Créer un QR Code</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Créez une version scannable et brandée de vos liens.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-400/80 group-hover:text-emerald-300">
              Designer
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            onClick={() => navigate('/statistics')}
            className="group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-500/15 p-2 text-blue-400">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-100">Voir les statistiques</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Analysez les performances en temps réel et les tendances.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs text-blue-400/80 group-hover:text-blue-300">
              Explorer
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </Card>

      <Card
        title={t('home.recentClicks')}
        description="Trafic consolidé sur la période sélectionnée"
        actions={<span className="text-xs text-slate-500">Realtime socket feed</span>}
      >
        <LineChart data={chartData} granularity={granularity} total={rangeTotal} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pulse feed" description="Derniers événements enregistrés">
          <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
            {recentEvents.length === 0 && <p className="text-sm text-slate-400">Aucun événement pour le moment.</p>}
            {recentEvents.map(event => {
              const rawType = (event.interactionType ?? event.eventType ?? 'event').toLowerCase()
              const badgeTone = getInteractionTone(rawType)
              return (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 shadow-sm">
                  <div>
                    <StatusBadge label={formatInteractionLabel(rawType)} tone={badgeTone} />
                    <p className="mt-2 text-sm text-slate-200">{event.linkId?.slice(0, 6) ?? 'link'} • {event.device ?? 'unknown device'}</p>
                    <p className="text-xs text-slate-500">{event.country ?? '??'} • {event.referer ?? 'direct'}</p>
                  </div>
                  <span className="text-xs text-slate-400">{dayjs(event.occurredAt).fromNow()}</span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title={t('home.onboarding')} description="Suivez votre checklist">
          <ul className="space-y-3">
            {onboardingSteps.map(step => (
              <li key={step} className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-500">•</span>
                <span className="text-sm text-slate-200">{step}</span>
                <button className="ml-auto text-xs text-accent hover:underline">Mark as done</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
