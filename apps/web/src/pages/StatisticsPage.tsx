import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../stores/auth'
import type { AggregationInterval } from '@p42/shared'
import { fetchLinks, fetchLinkDetails, toggleLinkPublicStats, exportLinkStats } from '../api/links'
import { fetchProjects } from '../api/projects'
import { fetchEventsAnalytics } from '../api/events'
import { LineChart } from '../components/LineChart'
import { IntervalSelector } from '../components/IntervalSelector'
import { DataTable } from '../components/DataTable'
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics'
import dayjs from '../lib/dayjs'

export const StatisticsPage = () => {
  const { t } = useTranslation()
  const params = useParams<{ linkId?: string }>()
  const queryClient = useQueryClient()
  const { workspaceId } = useAuth()
  const [interval, setInterval] = useState<AggregationInterval>('1m')
  const [selectedLink, setSelectedLink] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const linksQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  useEffect(() => {
    if (params.linkId) {
      setSelectedLink(params.linkId)
    }
  }, [params.linkId])

  const analyticsQuery = useQuery({
    queryKey: ['analytics', selectedProject, selectedLink, interval],
    queryFn: () =>
      fetchEventsAnalytics({
        period: interval,
        projectId: selectedProject !== 'all' ? selectedProject : undefined,
        linkId: selectedLink !== 'all' ? selectedLink : undefined
      })
  })

  const rooms = [
    workspaceId ? `workspace:${workspaceId}` : null,
    selectedLink !== 'all' ? `link:${selectedLink}` : null,
    selectedProject !== 'all' ? `project:${selectedProject}` : null
  ].filter(Boolean) as string[]

  useRealtimeAnalytics(rooms, event => {
    if (selectedLink !== 'all' && event.linkId !== selectedLink) return
    if (selectedProject !== 'all' && event.projectId !== selectedProject) return
    analyticsQuery.refetch()
  })

  const linkDetailsQuery = useQuery({
    queryKey: ['link', selectedLink],
    enabled: selectedLink !== 'all',
    queryFn: () => fetchLinkDetails(selectedLink)
  })

  const analytics = analyticsQuery.data
  const linkDetails = linkDetailsQuery.data

  const scanCount = useMemo(() => {
    if (!analytics?.eventsFlow) return 0
    return (analytics.eventsFlow ?? []).filter(event => event.eventType === 'scan').length
  }, [analytics])

  const handleExport = async (format: 'csv' | 'json') => {
    if (selectedLink === 'all') return
    const content = await exportLinkStats(selectedLink, format)
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `link-analytics-${selectedLink}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleTogglePublic = async () => {
    if (selectedLink === 'all' || !linkDetails) return
    await toggleLinkPublicStats(selectedLink, !linkDetails.publicStats)
    await queryClient.invalidateQueries({ queryKey: ['link', selectedLink] })
  }

  if (!selectedLink || analyticsQuery.isLoading || !analytics) {
    return <div className="text-muted">Loading analytics...</div>
  }

  const topCountries = (analytics.byCountry ?? []).slice(0, 5)
  const topCities = (analytics.byCity ?? []).slice(0, 5)
  const topContinents = (analytics.byContinent ?? []).slice(0, 5)
  const topDevices = (analytics.byDevice ?? []).slice(0, 4)
  const topOs = (analytics.byOs ?? []).slice(0, 4)
  const topBrowsers = (analytics.byBrowser ?? []).slice(0, 4)
  const topLanguages = (analytics.byLanguage ?? []).slice(0, 6)
  const topReferers = (analytics.byReferer ?? []).slice(0, 6)
  const eventsFlow = (analytics.eventsFlow ?? []).slice(0, 10)

  const shareUrl =
    selectedLink !== 'all' && linkDetails?.publicStats && linkDetails.publicStatsToken
      ? `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${linkDetails.publicStatsToken}`
      : selectedLink === 'all'
        ? 'N/A'
        : 'Private'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('statistics.title')}</h2>
          <p className="text-sm text-muted">Deep insights per link</p>
        </div>
        <IntervalSelector value={interval} onChange={setInterval} />
        <select
          value={selectedLink}
          onChange={event => setSelectedLink(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">{t('statistics.allLinks', 'All links')}</option>
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
          <option value="all">{t('statistics.allProjects', 'All projects')}</option>
          {projectsQuery.data?.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleTogglePublic}
          className={`rounded-md px-3 py-2 text-sm ${selectedLink === 'all' ? 'border border-slate-700 text-slate-500 cursor-not-allowed' : linkDetails?.publicStats ? 'bg-accent/20 text-accent' : 'border border-slate-700 text-slate-300'}`}
          disabled={selectedLink === 'all'}
        >
          {t('statistics.makePublic')}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted">
          <span>{t('statistics.share')}</span>
          <code className="rounded bg-slate-800 px-2 py-1 text-slate-300">{shareUrl}</code>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('home.recentClicks')}</h3>
          <div className="flex gap-2">
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
        <LineChart data={analytics.timeSeries ?? []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-slate-200">{t('statistics.topCountries')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topCountries.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-slate-200">{t('statistics.topCities')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topCities.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-slate-200">{t('statistics.topContinents')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topContinents.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.devices')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topDevices.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.os')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topOs.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.browsers')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topBrowsers.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.languages')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topLanguages.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.clickOrigins')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topReferers.map(item => (
              <li key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-muted">{item.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.scans')}</h4>
          <p className="mt-1 text-3xl font-semibold text-accent">{scanCount}</p>
          <p className="text-xs text-muted">QR code engagements</p>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold">{t('statistics.eventsFlow')}</h4>
          <DataTable
            data={eventsFlow}
            columns={[
              { key: 'occurredAt', label: 'Date', render: row => dayjs(row.occurredAt).format('DD MMM HH:mm') },
              { key: 'device', label: 'Device' },
              { key: 'country', label: 'Country' },
              { key: 'referer', label: 'Referer' }
            ]}
            emptyMessage="No events yet"
          />
        </div>
      </div>
    </div>
  )
}
