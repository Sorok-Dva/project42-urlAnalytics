import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AggregationInterval } from '@p42/shared'
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

const onboardingSteps = [
  'Connect your first domain',
  'Create a short link',
  'Share analytics with your team',
  'Generate a branded QR code'
]

const intervalToDays: Record<AggregationInterval, number> = {
  all: 9999,
  '1y': 365,
  '3m': 90,
  '1m': 30,
  '1w': 7,
  '1d': 1
}

export const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { workspaceId } = useAuth()
  const [interval, setInterval] = useState<AggregationInterval>('1m')

  const { data, isLoading } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview })

  useRealtimeAnalytics(workspaceId ? [`workspace:${workspaceId}`] : [], () => {
    queryClient.invalidateQueries({ queryKey: ['overview'] })
  })

  const chartData = useMemo(() => {
    if (!data?.recentClicks) return [] as Array<{ timestamp: string; total: number }>
    const days = intervalToDays[interval]
    if (interval === 'all') return data.recentClicks
    return data.recentClicks.filter((point: { timestamp: string; total: number }) =>
      dayjs(point.timestamp).isAfter(dayjs().subtract(days, 'day'))
    )
  }, [data, interval])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Bienvenue sur MIR-ALPHA"
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

  const recentEvents = data.events ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-100">{t('home.welcome')}</h2>
          <p className="text-sm text-slate-400">Monitor the pulse of your links in real time.</p>
        </div>
        <IntervalSelector value={interval} onChange={setInterval} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label={t('home.numberOfLinks')} value={data.metrics?.numberOfLinks ?? 0} />
        <MetricCard label={t('home.totalClicks')} value={data.metrics?.totalClicks ?? 0} />
        <MetricCard
          label={t('home.recentClicks')}
          value={chartData.at(-1)?.total ?? 0}
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
        title={t('home.recentClicks')}
        description="Trafic consolidé sur la période sélectionnée"
        actions={<span className="text-xs text-slate-500">Realtime socket feed</span>}
      >
        <LineChart data={chartData} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pulse feed" description="Derniers événements enregistrés">
          <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
            {recentEvents.length === 0 && <p className="text-sm text-slate-400">Aucun événement pour le moment.</p>}
            {recentEvents.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 shadow-sm">
                <div>
                  <StatusBadge label={event.eventType ?? 'event'} tone={event.eventType === 'scan' ? 'warning' : 'success'} />
                  <p className="mt-2 text-sm text-slate-200">{event.linkId?.slice(0, 6) ?? 'link'} • {event.device ?? 'unknown device'}</p>
                  <p className="text-xs text-slate-500">{event.country ?? '??'} • {event.referer ?? 'direct'}</p>
                </div>
                <span className="text-xs text-slate-400">{dayjs(event.occurredAt).fromNow()}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={t('home.onboarding')} description="Suivez votre checklist MIR-ALPHA">
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
