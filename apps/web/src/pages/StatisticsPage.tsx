import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BarChart3, RefreshCcw, ChevronDown } from 'lucide-react'
import { useAuth } from '../stores/auth'
import type { AnalyticsAggregation, AnalyticsFilters } from '../types'
import { fetchLinks, fetchLinkDetails, toggleLinkPublicStats, exportLinkStats } from '../api/links'
import { fetchProjects } from '../api/projects'
import { fetchEventsAnalytics } from '../api/events'
import { DataTable } from '../components/DataTable'
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics'
import dayjs from '../lib/dayjs'
import { MetricCard } from '../components/MetricCard'
import { BreakdownCard } from '../components/BreakdownCard'
import { FilterSelect } from '../components/FilterSelect'
import { FilterAccordionSection } from '../components/FilterAccordionSection'
import { GeoAnalyticsMap } from '../components/GeoAnalyticsMap'
import {
  ResponsiveContainer,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts'
import { LineChart } from '../components/LineChart'
import type { AnalyticsFilterGroup } from '../types'
import type { AggregationInterval } from '@p42/shared'

const numberFormatter = new Intl.NumberFormat('fr-FR')

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

type TimeSeriesKey = AggregationInterval

const timeSeriesOptions = [
  { key: '1min', label: '1 min', granularity: 'second' as const },
  { key: '5min', label: '5 min', granularity: 'second' as const },
  { key: '15min', label: '15 min', granularity: 'second' as const },
  { key: '30min', label: '30 min', granularity: 'second' as const },
  { key: '1h', label: '1 h', granularity: 'minute' as const },
  { key: '6h', label: '6 h', granularity: 'minute' as const },
  { key: '12h', label: '12 h', granularity: 'hour' as const },
  { key: '1d', label: '24 h', granularity: 'hour' as const },
  { key: '1w', label: '7 jours', granularity: 'hour' as const },
  { key: '1m', label: '30 jours', granularity: 'day' as const },
  { key: '3m', label: '3 mois', granularity: 'day' as const },
  { key: '1y', label: '12 mois', granularity: 'month' as const },
  { key: 'all', label: 'Tout', granularity: 'month' as const }
] as const satisfies ReadonlyArray<{ key: TimeSeriesKey; label: string; granularity: 'second' | 'minute' | 'hour' | 'day' | 'month' }>

const timeSeriesDurations: Record<TimeSeriesKey, { amount: number; unit: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year' } | null> = {
  all: null,
  '1y': { amount: 1, unit: 'year' },
  '3m': { amount: 3, unit: 'month' },
  '1m': { amount: 1, unit: 'month' },
  '1w': { amount: 7, unit: 'day' },
  '1d': { amount: 1, unit: 'day' },
  '12h': { amount: 12, unit: 'hour' },
  '6h': { amount: 6, unit: 'hour' },
  '1h': { amount: 1, unit: 'hour' },
  '30min': { amount: 30, unit: 'minute' },
  '15min': { amount: 15, unit: 'minute' },
  '5min': { amount: 5, unit: 'minute' },
  '1min': { amount: 60, unit: 'second' }
}

const timeSeriesRefreshIntervals: Record<TimeSeriesKey, number | null> = {
  all: null,
  '1y': null,
  '3m': null,
  '1m': 12 * 60 * 60_000,
  '1w': 6 * 60 * 60_000,
  '1d': 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '6h': 3 * 60 * 60_000,
  '1h': 60 * 60_000,
  '30min': 30 * 60_000,
  '15min': 15 * 60_000,
  '5min': 5 * 60_000,
  '1min': 60_000
}

const chartPalette = ['#38bdf8', '#7f5af0', '#ec4899', '#f97316', '#22c55e', '#facc15', '#a855f7', '#14b8a6'] as const

const serializeFilters = (filters: AnalyticsFilters) => {
  const pairs: Array<[string, string[]]> = []

  ;(Object.keys(filters) as Array<keyof AnalyticsFilters>).forEach(key => {
    const values = filters[key]
    if (!Array.isArray(values) || values.length === 0) return
    const normalized = values
      .map(value => String(value))
      .sort((a, b) => a.localeCompare(b))
    pairs.push([key as string, normalized])
  })

  if (pairs.length === 0) return undefined

  const ordered = pairs.sort(([a], [b]) => a.localeCompare(b))
  const normalized = ordered.reduce<Record<string, string[]>>((acc, [key, values]) => {
    acc[key] = values
    return acc
  }, {})
  return JSON.stringify(normalized)
}

const percentageFormatter = (value: number) => `${value.toFixed(1)}%`

const trafficSegments: Array<{ value: 'all' | 'bot' | 'human'; label: string }> = [
  { value: 'all', label: 'Tout' },
  { value: 'human', label: 'Humain' },
  { value: 'bot', label: 'Bot' }
]

const HourlyChart = ({ data }: { data: AnalyticsAggregation['byHour'] }) => {
  const dataset = Array.isArray(data) ? data : []
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RechartsBarChart data={dataset} margin={{ top: 12, left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(59,130,246,0.08)' }}
            contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
            formatter={(value: number | string, _name, entry) => {
              const raw = typeof value === 'number' ? value : Number(value ?? 0)
              const percentage = percentageFormatter(entry?.payload?.percentage ?? 0)
              return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? '']
            }}
          />
          <Bar dataKey="total" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

const WeekdayChart = ({ data }: { data: AnalyticsAggregation['byWeekday'] }) => {
  const dataset = Array.isArray(data) ? data : []
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RechartsBarChart data={dataset} margin={{ top: 12, left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(124,58,237,0.08)' }}
            contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
            formatter={(value: number | string, _name, entry) => {
              const raw = typeof value === 'number' ? value : Number(value ?? 0)
              const percentage = percentageFormatter(entry?.payload?.percentage ?? 0)
              return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? '']
            }}
          />
          <Bar dataKey="total" fill="#7f5af0" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const StatisticsPage = () => {
  const { t } = useTranslation()
  const params = useParams<{ linkId?: string }>()
  const queryClient = useQueryClient()
  const { workspaceId, token } = useAuth()

  const [selectedTimeSeries, setSelectedTimeSeries] = useState<TimeSeriesKey>('1d')
  const [selectedLink, setSelectedLink] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [trafficSegment, setTrafficSegment] = useState<'all' | 'bot' | 'human'>('all')
  const [hideLocalReferrers, setHideLocalReferrers] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const serializedFilters = useMemo(() => serializeFilters(filters), [filters])

  const linksQuery = useQuery({
    queryKey: ['links', workspaceId, 'statistics'],
    queryFn: () => fetchLinks({ status: 'active' }),
    enabled: Boolean(token && workspaceId)
  })
  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId, 'statistics'],
    queryFn: fetchProjects,
    enabled: Boolean(token && workspaceId)
  })

  useEffect(() => {
    if (params.linkId) {
      setSelectedLink(params.linkId)
    }
  }, [params.linkId])

  const analyticsQuery = useQuery({
    queryKey: ['analytics', workspaceId, selectedProject, selectedLink, serializedFilters, selectedTimeSeries],
    enabled: Boolean(token && workspaceId),
    queryFn: () =>
      fetchEventsAnalytics({
        projectId: selectedProject !== 'all' ? selectedProject : undefined,
        linkId: selectedLink !== 'all' ? selectedLink : undefined,
        filters: serializedFilters,
        period: selectedTimeSeries
      })
  })

  const { refetch: refetchAnalytics } = analyticsQuery

  const handleTimeSeriesSelect = useCallback((key: TimeSeriesKey) => {
    setSelectedTimeSeries(key)
  }, [])

  const refreshInterval = timeSeriesRefreshIntervals[selectedTimeSeries] ?? null

  useEffect(() => {
    if (refreshInterval == null) return
    if (typeof window === 'undefined') return
    const timerId = window.setInterval(() => {
      refetchAnalytics()
    }, refreshInterval)
    return () => window.clearInterval(timerId)
  }, [refreshInterval, refetchAnalytics])

  const rooms = useMemo(() => {
    return [
      workspaceId ? `workspace:${workspaceId}` : null,
      selectedLink !== 'all' ? `link:${selectedLink}` : null,
      selectedProject !== 'all' ? `project:${selectedProject}` : null
    ].filter(Boolean) as string[]
  }, [workspaceId, selectedLink, selectedProject])

  useRealtimeAnalytics(rooms, event => {
    if (selectedLink !== 'all' && event.linkId !== selectedLink) return
    if (selectedProject !== 'all' && event.projectId !== selectedProject) return
    analyticsQuery.refetch()
  })

  const linkDetailsQuery = useQuery({
    queryKey: ['link', workspaceId, selectedLink],
    enabled: selectedLink !== 'all' && Boolean(workspaceId),
    queryFn: () => fetchLinkDetails(selectedLink)
  })

  const analytics = analyticsQuery.data

  const filteredTimeSeries = useMemo(() => {
    const series = analytics?.timeSeries ?? []
    if (series.length === 0) return { data: [] as typeof series, total: 0 }
    const duration = timeSeriesDurations[selectedTimeSeries]
    if (!duration) {
      const total = series.reduce((acc, point) => acc + point.total, 0)
      return { data: series, total }
    }
    const threshold = dayjs().subtract(duration.amount, duration.unit)
    const filtered = series.filter(point => {
      const timestamp = dayjs(point.timestamp)
      return timestamp.isAfter(threshold) || timestamp.isSame(threshold)
    })
    const dataset = filtered.length > 0 ? filtered : series
    const total = dataset.reduce((acc, point) => acc + point.total, 0)
    return { data: dataset, total }
  }, [analytics?.timeSeries, selectedTimeSeries])
  const timeSeriesOptionMap = useMemo(() => new Map(timeSeriesOptions.map(option => [option.key, option])), [])
  const selectedTimeSeriesMeta = timeSeriesOptionMap.get(selectedTimeSeries)
  const chartGranularity = analytics?.timeSeriesGranularity ?? selectedTimeSeriesMeta?.granularity ?? 'minute'
  const filterGroups = useMemo<AnalyticsFilterGroup[]>(() => analytics?.availableFilters ?? [], [analytics?.availableFilters])

  const filterGroupMap = useMemo(() => {
    return new Map(filterGroups.map(group => [group.id, group]))
  }, [filterGroups])

  const getFilterOptions = useCallback(
    (groupId: keyof AnalyticsFilters) => filterGroupMap.get(groupId)?.options ?? [],
    [filterGroupMap]
  )

  const getFilterValues = useCallback(
    (groupId: keyof AnalyticsFilters) =>
      Array.isArray(filters[groupId]) ? (filters[groupId] as string[]) : [],
    [filters]
  )

  const appliedFilters = filters

  useEffect(() => {
    const availableFilters = analytics?.availableFilters
    if (!availableFilters) return
    setFilters(current => {
      const next: AnalyticsFilters = { ...current }
      let hasChanged = false
      availableFilters.forEach(group => {
        const selected = next[group.id]
        if (!selected) return
        const allowed = new Set(group.options.map(option => option.value))
        const filtered = (selected as string[]).filter(value => allowed.has(value))
        if (filtered.length !== selected.length) {
          hasChanged = true
          if (filtered.length === 0) {
            delete next[group.id]
          } else {
            next[group.id] = filtered as never
          }
        }
      })
      return hasChanged ? next : current
    })
  }, [analytics?.availableFilters])

  const handleTrafficSegmentChange = useCallback((segment: 'all' | 'bot' | 'human') => {
    setTrafficSegment(segment)
    setFilters(prev => {
      const next = { ...prev }
      if (segment === 'all') {
        delete next.isBot
      } else {
        next.isBot = [segment] as never
      }
      return next
    })
  }, [])

  const toggleHideLocalReferrers = useCallback(() => {
    setHideLocalReferrers(prev => !prev)
  }, [])

  const handleResetAllFilters = useCallback(() => {
    setFilters({})
    setTrafficSegment('all')
    setHideLocalReferrers(false)
  }, [])

  const handleToggleFilter = useCallback((groupId: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => {
      const currentValues = new Set<string>(Array.isArray(prev[groupId]) ? (prev[groupId] as string[]) : [])
      if (currentValues.has(value)) {
        currentValues.delete(value)
      } else {
        currentValues.add(value)
      }
      const next: AnalyticsFilters = { ...prev }
      if (currentValues.size === 0) {
        delete next[groupId]
      } else {
        next[groupId] = Array.from(currentValues) as never
      }
      return next
    })
  }, [])

  const handleSetFilterValues = useCallback((groupId: keyof AnalyticsFilters, values: string[]) => {
    setFilters(prev => {
      const next: AnalyticsFilters = { ...prev }
      if (values.length === 0) {
        delete next[groupId]
      } else {
        next[groupId] = values as never
      }
      return next
    })
  }, [])

  useEffect(() => {
    const botFilter = filters.isBot
    if (!Array.isArray(botFilter) || botFilter.length === 0) {
      if (trafficSegment !== 'all') {
        setTrafficSegment('all')
      }
      return
    }
    if (botFilter.length === 1) {
      if (botFilter[0] === 'bot' && trafficSegment !== 'bot') {
        setTrafficSegment('bot')
        return
      }
      if (botFilter[0] === 'human' && trafficSegment !== 'human') {
        setTrafficSegment('human')
        return
      }
    }
    if (trafficSegment !== 'all') {
      setTrafficSegment('all')
    }
  }, [filters.isBot, trafficSegment])

  useEffect(() => {
    if (!hideLocalReferrers) return
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    if (!host) return
    setFilters(prev => {
      const referers = prev.referer
      if (!Array.isArray(referers) || referers.length === 0) return prev
      const filtered = referers.filter(value => !value.includes(host))
      if (filtered.length === referers.length) return prev
      const next = { ...prev }
      if (filtered.length === 0) {
        delete next.referer
      } else {
        next.referer = filtered as never
      }
      return next
    })
  }, [hideLocalReferrers])

  const linkDetails = linkDetailsQuery.data

  const handleExport = async (format: 'csv' | 'json') => {
    if (selectedLink === 'all') return
    const content = await exportLinkStats(selectedLink, format)
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `link-analytics-${selectedLink}.${format}`
    element.click()
    URL.revokeObjectURL(url)
  }

  const handleTogglePublic = async () => {
    if (selectedLink === 'all' || !linkDetails) return
    await toggleLinkPublicStats(selectedLink, !linkDetails.publicStats)
    await queryClient.invalidateQueries({ queryKey: ['link', selectedLink] })
  }

  const activeFilterChips = useMemo(() => {
    if (!analytics?.availableFilters) return [] as Array<{ groupId: keyof AnalyticsFilters; value: string; label: string }>
    return analytics.availableFilters.flatMap(group => {
      const selected = appliedFilters[group.id]
      if (!selected || selected.length === 0) return []
      const labelByValue = new Map(group.options.map(option => [option.value, option.label]))
      return (selected as string[]).map(value => ({
        groupId: group.id,
        value,
        label: `${group.label} · ${labelByValue.get(value) ?? value}`
      }))
    })
  }, [analytics?.availableFilters, appliedFilters])

  const activeFilterCount = activeFilterChips.length
  const filtersSummary =
    activeFilterCount === 0
      ? 'Aucun filtre actif'
      : `${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''}`
  const toggleLabel = filtersOpen
    ? 'Masquer les filtres'
    : activeFilterCount > 0
      ? `Afficher les filtres (${activeFilterCount})`
      : 'Afficher les filtres'

  const botStatusMap = useMemo(() => {
    const map = new Map<string, NonNullable<AnalyticsAggregation['byBotStatus']>[number]>()
    ;(analytics?.byBotStatus ?? []).forEach(item => map.set(item.value, item))
    return map
  }, [analytics?.byBotStatus])

  const eventTypeBreakdown = analytics?.byEventType ?? []
  const trafficTypeBreakdown = analytics?.byBotStatus ?? []
  const topReferers = useMemo(() => (analytics?.byReferer ?? []).slice(0, 5), [analytics?.byReferer])

  const isLoading = analyticsQuery.isLoading || !analytics

  const shareUrl =
    selectedLink !== 'all' && linkDetails?.publicStats && linkDetails.publicStatsToken
      ? `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${linkDetails.publicStatsToken}`
      : selectedLink === 'all'
        ? 'N/A'
        : 'Privé'

  if (!selectedLink || isLoading) {
    return <div className="text-muted">{t('statistics.loading', 'Chargement des statistiques...')}</div>
  }

  const totalEvents = analytics.totalEvents ?? 0
  const totalClicks = analytics.totalClicks ?? 0
  const totalScans = analytics.totalScans ?? 0
  const clicksRatio = totalEvents === 0 ? 0 : (totalClicks / totalEvents) * 100
  const scansRatio = totalEvents === 0 ? 0 : (totalScans / totalEvents) * 100


  const humanStats = botStatusMap.get('human')
  const botStats = botStatusMap.get('bot')
  const humanRatio = humanStats?.percentage ?? (totalEvents === 0 ? 0 : ((totalEvents - (botStats?.total ?? 0)) / totalEvents) * 100)
  const botRatio = botStats?.percentage ?? (totalEvents === 0 ? 0 : ((botStats?.total ?? 0) / totalEvents) * 100)

  const uniqueCountries = analytics.geo?.countries.length ?? 0
  const uniqueCities = analytics.geo?.cities.length ?? 0
  const localizedCoverage = Math.min(
    100,
    (analytics.geo?.countries ?? []).reduce((acc, item) => acc + item.percentage, 0)
  )
  const cityCoverage = Math.min(
    100,
    (analytics.geo?.cities ?? []).reduce((acc, item) => acc + item.percentage, 0)
  )

  const metricCards = [
    {
      label: 'Total hits',
      value: numberFormatter.format(totalEvents),
      trend: totalEvents > 0 ? `${percentageFormatter(100)} des évènements` : undefined
    },
    {
      label: 'Clicks',
      value: numberFormatter.format(totalClicks),
      trend: `${percentageFormatter(clicksRatio)} des évènements`
    },
    {
      label: 'Scans',
      value: numberFormatter.format(totalScans),
      trend: `${percentageFormatter(scansRatio)} des évènements`
    },
    {
      label: 'Trafic humain',
      value: numberFormatter.format(humanStats?.total ?? totalEvents - (botStats?.total ?? 0)),
      trend: `${percentageFormatter(humanRatio)} des hits`
    },
    {
      label: 'Trafic bot',
      value: numberFormatter.format(botStats?.total ?? 0),
      trend: `${percentageFormatter(botRatio)} des hits`
    },
    {
      label: 'Pays uniques',
      value: numberFormatter.format(uniqueCountries),
      trend: uniqueCountries > 0 ? `${percentageFormatter(localizedCoverage)} des hits localisés` : undefined
    },
    {
      label: 'Villes uniques',
      value: numberFormatter.format(uniqueCities),
      trend: uniqueCities > 0 ? `${percentageFormatter(cityCoverage)} des hits localisés` : undefined
    }
  ]

  const eventsFlow = analytics.eventsFlow ?? []

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('statistics.title')}</h2>
          <p className="text-sm text-muted">{t('statistics.subtitle', 'Analyse complète des évènements')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/40 bg-slate-900/60 p-1">
          {timeSeriesOptions.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleTimeSeriesSelect(option.key)}
              className={`px-3 py-1 text-xs transition ${
                selectedTimeSeries === option.key
                  ? 'rounded-md bg-blue-500/40 text-white shadow-inner shadow-blue-500/20'
                  : 'rounded-md text-blue-200 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          value={selectedLink}
          onChange={event => setSelectedLink(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">{t('statistics.allLinks', 'Tous les liens')}</option>
          {linksQuery.data?.map(link => (
            <option key={link.id} value={link.id}>
              {link.slug}
            </option>
          ))}
        </select>
        <select
          value={selectedProject}
          onChange={event => setSelectedProject(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">{t('statistics.allProjects', 'Tous les projets')}</option>
          {projectsQuery.data?.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleTogglePublic}
          className={`rounded-md px-3 py-2 text-sm ${
            selectedLink === 'all'
              ? 'border border-slate-700 text-slate-500 cursor-not-allowed'
              : linkDetails?.publicStats
                ? 'bg-accent/20 text-accent'
                : 'border border-slate-700 text-slate-300'
          }`}
          disabled={selectedLink === 'all'}
        >
          {t('statistics.makePublic')}
        </button>
        <div className="ml-auto flex flex-col gap-1 text-xs text-muted">
          <span>{t('statistics.share')}</span>
          <code className="rounded bg-slate-800 px-2 py-1 text-slate-300">{shareUrl}</code>
        </div>
      </section>

      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-black/60 to-blue-900/20 p-5 shadow-inner shadow-blue-500/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Filtres des deeplinks</h1>
            <p className="mt-1 text-sm text-blue-200">
              Explorez les métriques clés : filtres dynamiques, graphiques détaillés et cartographie interactive.
            </p>
            <p className="mt-3 text-xs text-blue-300/80">{filtersSummary}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(prev => !prev)}
              className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-xs text-blue-200 transition hover:bg-blue-900/30"
              aria-expanded={filtersOpen}
              aria-controls="statistics-filters-panel"
            >
              <span>{toggleLabel}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-blue-200 transition hover:bg-blue-900/30 disabled:opacity-70"
              disabled={analyticsQuery.isFetching}
            >
              <RefreshCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
        </div>
        <div
          id="statistics-filters-panel"
          className={`grid overflow-hidden transition-all duration-300 ${
            filtersOpen ? 'mt-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
          aria-hidden={!filtersOpen}
        >
          <div className="min-h-0 space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Filtres rapides</h2>
                <p className="mt-1 text-xs text-blue-300/80">Ajustez rapidement les critères principaux avant d'affiner avec les options avancées.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col gap-2 text-sm text-blue-100">
                  <span className="font-medium uppercase tracking-wide text-xs text-blue-300">Trafic</span>
                  <div className="flex items-center gap-1 rounded-lg border border-blue-500/40 bg-slate-900/60 p-1">
                    {trafficSegments.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleTrafficSegmentChange(option.value)}
                        className={`flex-1 rounded-md px-3 py-1 text-xs transition ${
                          trafficSegment === option.value
                            ? 'bg-blue-500/40 text-white shadow-inner shadow-blue-500/20'
                            : 'text-blue-200 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <FilterSelect
                  label="Pays"
                  options={getFilterOptions('country')}
                  value={getFilterValues('country')}
                  onChange={values => handleSetFilterValues('country', values)}
                  placeholder="Sélectionner des pays"
                />
                <FilterSelect
                  label="Villes"
                  options={getFilterOptions('city')}
                  value={getFilterValues('city')}
                  onChange={values => handleSetFilterValues('city', values)}
                  placeholder="Rechercher des villes"
                />
                <FilterSelect
                  label="Sources"
                  options={getFilterOptions('referer')}
                  value={getFilterValues('referer')}
                  onChange={values => handleSetFilterValues('referer', values)}
                  placeholder="Sélectionner des sources"
                />
                <FilterSelect
                  label="Appareils"
                  options={getFilterOptions('device')}
                  value={getFilterValues('device')}
                  onChange={values => handleSetFilterValues('device', values)}
                  placeholder="Types d'appareils"
                />
                <FilterSelect
                  label="Systèmes d'exploitation"
                  options={getFilterOptions('os')}
                  value={getFilterValues('os')}
                  onChange={values => handleSetFilterValues('os', values)}
                  placeholder="Sélectionner des OS"
                />
                <FilterSelect
                  label="Navigateurs"
                  options={getFilterOptions('browser')}
                  value={getFilterValues('browser')}
                  onChange={values => handleSetFilterValues('browser', values)}
                  placeholder="Sélectionner des navigateurs"
                />
                <FilterSelect
                  label="Langues"
                  options={getFilterOptions('language')}
                  value={getFilterValues('language')}
                  onChange={values => handleSetFilterValues('language', values)}
                  placeholder="Sélectionner des langues"
                />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-slate-900/50 p-3 text-blue-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-blue-300">Référers externes</span>
                    <span className="text-[11px] text-blue-300/80">Masquer les referrers venant du site lui-même.</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideLocalReferrers}
                    onClick={toggleHideLocalReferrers}
                    className={`relative h-6 w-11 rounded-full border transition ${
                      hideLocalReferrers ? 'border-blue-500/70 bg-blue-500/40' : 'border-blue-500/30 bg-slate-900/80'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                        hideLocalReferrers ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <FilterAccordionSection
                title="Filtres avancés"
                description="Ciblez précisément vos évènements (UTM, bots, langues…)"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FilterSelect
                    label="Langues"
                    options={getFilterOptions('language')}
                    value={getFilterValues('language')}
                    onChange={values => handleSetFilterValues('language', values)}
                    placeholder="Langues utilisateurs"
                  />
                  <FilterSelect
                    label="Continent"
                    options={getFilterOptions('continent')}
                    value={getFilterValues('continent')}
                    onChange={values => handleSetFilterValues('continent', values)}
                    placeholder="Continent"
                  />
                  <FilterSelect
                    label="UTM Source"
                    options={getFilterOptions('utmSource')}
                    value={getFilterValues('utmSource')}
                    onChange={values => handleSetFilterValues('utmSource', values)}
                    placeholder="utm_source"
                  />
                  <FilterSelect
                    label="UTM Medium"
                    options={getFilterOptions('utmMedium')}
                    value={getFilterValues('utmMedium')}
                    onChange={values => handleSetFilterValues('utmMedium', values)}
                    placeholder="utm_medium"
                  />
                  <FilterSelect
                    label="UTM Campaign"
                    options={getFilterOptions('utmCampaign')}
                    value={getFilterValues('utmCampaign')}
                    onChange={values => handleSetFilterValues('utmCampaign', values)}
                    placeholder="utm_campaign"
                  />
                  <FilterSelect
                    label="UTM Content"
                    options={getFilterOptions('utmContent')}
                    value={getFilterValues('utmContent')}
                    onChange={values => handleSetFilterValues('utmContent', values)}
                    placeholder="utm_content"
                  />
                  <FilterSelect
                    label="UTM Term"
                    options={getFilterOptions('utmTerm')}
                    value={getFilterValues('utmTerm')}
                    onChange={values => handleSetFilterValues('utmTerm', values)}
                    placeholder="utm_term"
                  />
                </div>
              </FilterAccordionSection>
            </section>
            <p className="text-xs text-blue-300/80">Les filtres se mettent à jour automatiquement.</p>
          </div>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {activeFilterChips.map(item => (
            <button
              key={`${item.groupId}-${item.value}`}
              onClick={() => handleToggleFilter(item.groupId, item.value)}
              className="group flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent transition hover:bg-accent/20"
            >
              <span>{item.label}</span>
              <span className="text-slate-200">×</span>
            </button>
          ))}
        </div>
  )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => (
          <MetricCard key={card.label} label={card.label} value={card.value} trend={card.trend} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <BarChart3 className="h-4 w-4 text-blue-300" />
              {t('home.recentClicks')}
            </h3>
            <p className="text-xs text-slate-400">
              {numberFormatter.format(filteredTimeSeries.total)} évènements · {selectedTimeSeriesMeta?.label ?? ''}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={selectedLink === 'all'}
              className={`rounded-md border px-3 py-1 text-xs ${
                selectedLink === 'all'
                  ? 'cursor-not-allowed border-slate-800 text-slate-600'
                  : 'border-slate-700 text-slate-200 hover:border-accent'
              }`}
            >
              {t('statistics.exportCsv')}
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={selectedLink === 'all'}
              className={`rounded-md border px-3 py-1 text-xs ${
                selectedLink === 'all'
                  ? 'cursor-not-allowed border-slate-800 text-slate-600'
                  : 'border-slate-700 text-slate-200 hover:border-accent'
              }`}
            >
              {t('statistics.exportJson')}
            </button>
          </div>
        </div>
        {filteredTimeSeries.data.length > 0 ? (
          <LineChart data={filteredTimeSeries.data} granularity={chartGranularity} total={filteredTimeSeries.total} />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted">Aucune donnée temporelle</div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="mb-4 text-sm font-semibold text-slate-200">Répartition des évènements</h4>
          {eventTypeBreakdown.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer>
                <RechartsPieChart>
                  <Tooltip
                    cursor={false}
                    contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number | string, _name, entry) => {
                      const raw = typeof value === 'number' ? value : Number(value ?? 0)
                      const percentage = percentageFormatter(entry?.payload?.percentage ?? 0)
                      return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? '']
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ color: '#94a3b8', fontSize: 11 }}
                  />
                  <Pie
                    data={eventTypeBreakdown}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {eventTypeBreakdown.map((entry, index) => (
                      <Cell key={entry.value ?? index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-muted">Aucune donnée disponible</div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="mb-4 text-sm font-semibold text-slate-200">Trafic bot / humain</h4>
          {trafficTypeBreakdown.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer>
                <RechartsPieChart>
                  <Tooltip
                    cursor={false}
                    contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number | string, _name, entry) => {
                      const raw = typeof value === 'number' ? value : Number(value ?? 0)
                      const percentage = percentageFormatter(entry?.payload?.percentage ?? 0)
                      return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? '']
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ color: '#94a3b8', fontSize: 11 }}
                  />
                  <Pie
                    data={trafficTypeBreakdown}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={8}
                  >
                    {trafficTypeBreakdown.map((entry, index) => (
                      <Cell key={entry.value ?? index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-muted">Aucune donnée disponible</div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="mb-4 text-sm font-semibold text-slate-200">Top referers</h4>
          {topReferers.length > 0 ? (
            <div className="h-60">
              <ResponsiveContainer>
                <RechartsPieChart>
                  <Tooltip
                    cursor={false}
                    contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
                    formatter={(value: number | string, _name, entry) => {
                      const raw = typeof value === 'number' ? value : Number(value ?? 0)
                      const percentage = percentageFormatter(entry?.payload?.percentage ?? 0)
                      return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? '']
                    }}
                  />
                  <Legend verticalAlign="bottom" height={32} wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                  <Pie data={topReferers} dataKey="total" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {topReferers.map((entry, index) => (
                      <Cell key={entry.value ?? index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-muted">Pas de referers</div>
          )}
        </div>
      </section>

      {analytics.geo && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">Carte de chaleur mondiale</h3>
            <p className="text-xs text-muted">Gradients proportionnels aux hits; zoom pour détailler les villes</p>
          </div>
          <GeoAnalyticsMap
            countries={analytics.geo.countries}
            cities={analytics.geo.cities}
            totalEvents={analytics.totalEvents}
          />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard title="Pays" items={analytics.byCountry ?? []} />
        <BreakdownCard title="Villes" items={analytics.byCity ?? []} />
        <BreakdownCard title="Continents" items={analytics.byContinent ?? []} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard title="Appareils" items={analytics.byDevice ?? []} variant="pie" />
        <BreakdownCard title="Systèmes" items={analytics.byOs ?? []} variant="pie" />
        <BreakdownCard title="Navigateurs" items={analytics.byBrowser ?? []} variant="pie" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <BreakdownCard title="Langues" items={analytics.byLanguage ?? []} variant="pie" />
        <BreakdownCard title="Origine du trafic" items={analytics.byReferer ?? []} variant="pie" />
        <BreakdownCard title="Type d'évènement" items={analytics.byEventType ?? []} variant="pie" />
        <BreakdownCard title="Type de trafic" items={analytics.byBotStatus ?? []} variant="pie" />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard title="UTM Source" items={analytics.byUtmSource ?? []} variant="pie" />
        <BreakdownCard title="UTM Medium" items={analytics.byUtmMedium ?? []} variant="pie" />
        <BreakdownCard title="UTM Campaign" items={analytics.byUtmCampaign ?? []} variant="pie" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard title="UTM Content" items={analytics.byUtmContent ?? []} variant="pie" />
        <BreakdownCard title="UTM Term" items={analytics.byUtmTerm ?? []} variant="pie" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-slate-200">Répartition horaire (UTC)</h4>
          <HourlyChart data={analytics.byHour} />
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-slate-200">Jours de la semaine</h4>
          <WeekdayChart data={analytics.byWeekday} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <h4 className="text-sm font-semibold">{t('statistics.eventsFlow')}</h4>
        <DataTable
          data={eventsFlow}
          columns={[
            { key: 'occurredAt', label: 'Date', render: row => dayjs(row.occurredAt).format('DD MMM HH:mm') },
            {
              key: 'eventType',
              label: 'Évènement',
              render: row => {
                const meta = row?.metadata as { interactionType?: unknown } | null | undefined
                const rawType =
                  (typeof row?.interactionType === 'string' ? row.interactionType : undefined) ??
                  (typeof meta?.interactionType === 'string' ? meta.interactionType : undefined) ??
                  (typeof row?.eventType === 'string' ? row.eventType : undefined)
                return rawType ? formatInteractionLabel(rawType.toLowerCase()) : 'N/A'
              }
            },
            {
              key: 'device',
              label: 'Appareil',
              render: row => (
                <div className="space-y-1">
                  <div>{row.device ?? 'Inconnu'}</div>
                  <div className="text-xs text-slate-400">
                    {[row.os, row.browser].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              )
            },
            {
              key: 'country',
              label: 'Localisation',
              render: row =>
                (
                  <div className="space-y-1">
                    <div>
                      {[row.city, row.country]
                        .filter(Boolean)
                        .map(value => String(value))
                        .join(' · ') || 'Unknown'}
                    </div>
                    {typeof row.latitude === 'number' && typeof row.longitude === 'number' && (
                      <div className="text-xs text-slate-400">{row.latitude.toFixed(3)}, {row.longitude.toFixed(3)}</div>
                    )}
                  </div>
                )
            },
            { key: 'language', label: 'Langue', render: row => row.language ?? '—' },
            {
              key: 'isBot',
              label: 'Trafic',
              render: row => (row.isBot ? 'Bot' : 'Humain')
            },
            {
              key: 'referer',
              label: 'Referer',
              render: row => (
                <div className="space-y-1">
                  <div>{row.referer ?? 'Direct'}</div>
                  {row.utm && (
                    <div className="text-xs text-slate-400">
                      {(() => {
                        const utmRecord = row.utm as Record<string, string | null>
                        const entries = (['source', 'medium', 'campaign', 'content', 'term'] as const)
                          .map(key => {
                            const value = utmRecord?.[key]
                            return value ? `${key}: ${value}` : null
                          })
                          .filter(Boolean)
                        return entries.length > 0 ? entries.join(' · ') : '—'
                      })()}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'metadata',
              label: 'Métadonnées',
              render: row => {
                if (!row.metadata || Object.keys(row.metadata).length === 0) return '—'
                const serialized = JSON.stringify(row.metadata)
                return <span className="truncate text-xs text-slate-300">{serialized.length > 80 ? `${serialized.slice(0, 80)}…` : serialized}</span>
              }
            }
          ]}
          emptyMessage="Aucun évènement enregistré"
        />
      </section>
    </div>
  )
}
