import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, RefreshCcw, ChevronDown } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { fetchLinks, fetchLinkDetails, toggleLinkPublicStats, exportLinkStats } from '../api/links';
import { fetchProjects } from '../api/projects';
import { fetchEventsAnalytics } from '../api/events';
import { LineChart } from '../components/LineChart';
import { DataTable } from '../components/DataTable';
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics';
import dayjs from '../lib/dayjs';
import { MetricCard } from '../components/MetricCard';
import { BreakdownCard } from '../components/BreakdownCard';
import { FilterSelect } from '../components/FilterSelect';
import { FilterAccordionSection } from '../components/FilterAccordionSection';
import { GeoAnalyticsMap } from '../components/GeoAnalyticsMap';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LabelList, PieChart as RechartsPieChart, Pie, Cell, Legend, CartesianGrid, YAxis } from 'recharts';
const numberFormatter = new Intl.NumberFormat('fr-FR');
const timeSeriesOptions = [
    { key: '1m', label: '1 min' },
    { key: '5m', label: '5 min' },
    { key: '15m', label: '15 min' },
    { key: '30m', label: '30 min' },
    { key: '1h', label: '1 h' },
    { key: '6h', label: '6 h' },
    { key: '12h', label: '12 h' },
    { key: 'hourly', label: '24 h' },
    { key: 'daily', label: '30 jours' },
    { key: 'monthly', label: '12 mois' }
];
const timeSeriesDurations = {
    '1m': { amount: 1, unit: 'minute' },
    '5m': { amount: 5, unit: 'minute' },
    '15m': { amount: 15, unit: 'minute' },
    '30m': { amount: 30, unit: 'minute' },
    '1h': { amount: 1, unit: 'hour' },
    '6h': { amount: 6, unit: 'hour' },
    '12h': { amount: 12, unit: 'hour' },
    hourly: { amount: 24, unit: 'hour' },
    daily: { amount: 30, unit: 'day' },
    monthly: { amount: 12, unit: 'month' }
};
const timeSeriesRefreshIntervals = {
    '1m': 60000,
    '5m': 5 * 60000,
    '15m': 15 * 60000,
    '30m': 30 * 60000,
    '1h': 60 * 60000,
    '6h': 6 * 60 * 60000,
    '12h': 12 * 60 * 60000,
    hourly: 60 * 60000,
    daily: 24 * 60 * 60000,
    monthly: 30 * 24 * 60 * 60000
};
const chartPalette = ['#38bdf8', '#7f5af0', '#ec4899', '#f97316', '#22c55e', '#facc15', '#a855f7', '#14b8a6'];
const serializeFilters = (filters) => {
    const pairs = [];
    Object.keys(filters).forEach(key => {
        const values = filters[key];
        if (!Array.isArray(values) || values.length === 0)
            return;
        const normalized = values
            .map(value => String(value))
            .sort((a, b) => a.localeCompare(b));
        pairs.push([key, normalized]);
    });
    if (pairs.length === 0)
        return undefined;
    const ordered = pairs.sort(([a], [b]) => a.localeCompare(b));
    const normalized = ordered.reduce((acc, [key, values]) => {
        acc[key] = values;
        return acc;
    }, {});
    return JSON.stringify(normalized);
};
const percentageFormatter = (value) => `${value.toFixed(1)}%`;
const trafficSegments = [
    { value: 'all', label: 'Tout' },
    { value: 'human', label: 'Humain' },
    { value: 'bot', label: 'Bot' }
];
const intervalOptions = [
    { value: '1d', label: '24 h' },
    { value: '1w', label: '7 jours' },
    { value: '1m', label: '30 jours' },
    { value: '3m', label: '90 jours' },
    { value: '1y', label: '12 mois' },
    { value: 'all', label: 'Tout' }
];
const HourlyChart = ({ data }) => (_jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: data ?? [], margin: { top: 24, right: 12, left: 0, bottom: 8 }, children: [_jsx(XAxis, { dataKey: "label", stroke: "#64748b", tickLine: false, axisLine: false, interval: 1, fontSize: 12 }), _jsx(Tooltip, { cursor: { fill: '#0f172a' }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, labelStyle: { color: '#e2e8f0' }, formatter: (value, _name, payload) => [`${numberFormatter.format(value)} (${percentageFormatter(payload?.payload?.percentage ?? 0)})`, 'Hits'] }), _jsx(Bar, { dataKey: "total", radius: [6, 6, 0, 0], fill: "#38bdf8", children: _jsx(LabelList, { dataKey: "total", position: "top", formatter: (value, _entry, index) => {
                            const percentage = Array.isArray(data) && data[index] ? data[index].percentage ?? 0 : 0;
                            return `${numberFormatter.format(value)} (${percentageFormatter(percentage)})`;
                        }, style: { fill: '#e2e8f0', fontSize: 10 } }) })] }) }) }));
const WeekdayChart = ({ data }) => (_jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: data ?? [], margin: { top: 24, right: 12, left: 0, bottom: 8 }, children: [_jsx(XAxis, { dataKey: "label", stroke: "#64748b", tickLine: false, axisLine: false, fontSize: 12 }), _jsx(Tooltip, { cursor: { fill: '#0f172a' }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, labelStyle: { color: '#e2e8f0' }, formatter: (value, _name, payload) => [`${numberFormatter.format(value)} (${percentageFormatter(payload?.payload?.percentage ?? 0)})`, 'Hits'] }), _jsx(Bar, { dataKey: "total", radius: [6, 6, 0, 0], fill: "#7f5af0", children: _jsx(LabelList, { dataKey: "total", position: "top", formatter: (value, _entry, index) => {
                            const percentage = Array.isArray(data) && data[index] ? data[index].percentage ?? 0 : 0;
                            return `${numberFormatter.format(value)} (${percentageFormatter(percentage)})`;
                        }, style: { fill: '#e2e8f0', fontSize: 10 } }) })] }) }) }));
export const StatisticsPage = () => {
    const { t } = useTranslation();
    const params = useParams();
    const queryClient = useQueryClient();
    const { workspaceId, token } = useAuth();
    const [interval, setInterval] = useState('1m');
    const [selectedTimeSeries, setSelectedTimeSeries] = useState('hourly');
    const [selectedLink, setSelectedLink] = useState('all');
    const [selectedProject, setSelectedProject] = useState('all');
    const [filters, setFilters] = useState({});
    const [trafficSegment, setTrafficSegment] = useState('all');
    const [hideLocalReferrers, setHideLocalReferrers] = useState(false);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const serializedFilters = useMemo(() => serializeFilters(filters), [filters]);
    const linksQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }), enabled: Boolean(token) });
    const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects, enabled: Boolean(token) });
    useEffect(() => {
        if (params.linkId) {
            setSelectedLink(params.linkId);
        }
    }, [params.linkId]);
    const analyticsQuery = useQuery({
        queryKey: ['analytics', selectedProject, selectedLink, interval, serializedFilters],
        enabled: Boolean(token && workspaceId),
        queryFn: () => fetchEventsAnalytics({
            period: interval,
            projectId: selectedProject !== 'all' ? selectedProject : undefined,
            linkId: selectedLink !== 'all' ? selectedLink : undefined,
            filters: serializedFilters
        })
    });
    const { refetch: refetchAnalytics } = analyticsQuery;
    const handleTimeSeriesSelect = useCallback((key) => {
        setSelectedTimeSeries(key);
        refetchAnalytics();
    }, [refetchAnalytics]);
    const refreshInterval = timeSeriesRefreshIntervals[selectedTimeSeries] ?? null;
    useEffect(() => {
        if (refreshInterval == null)
            return;
        if (typeof window === 'undefined')
            return;
        const timerId = window.setInterval(() => {
            refetchAnalytics();
        }, refreshInterval);
        return () => window.clearInterval(timerId);
    }, [refreshInterval, refetchAnalytics]);
    const rooms = useMemo(() => {
        return [
            workspaceId ? `workspace:${workspaceId}` : null,
            selectedLink !== 'all' ? `link:${selectedLink}` : null,
            selectedProject !== 'all' ? `project:${selectedProject}` : null
        ].filter(Boolean);
    }, [workspaceId, selectedLink, selectedProject]);
    useRealtimeAnalytics(rooms, event => {
        if (selectedLink !== 'all' && event.linkId !== selectedLink)
            return;
        if (selectedProject !== 'all' && event.projectId !== selectedProject)
            return;
        analyticsQuery.refetch();
    });
    const linkDetailsQuery = useQuery({
        queryKey: ['link', selectedLink],
        enabled: selectedLink !== 'all',
        queryFn: () => fetchLinkDetails(selectedLink)
    });
    const analytics = analyticsQuery.data;
    const filteredTimeSeries = useMemo(() => {
        const series = analytics?.timeSeries ?? [];
        if (series.length === 0)
            return { data: [], total: 0 };
        const duration = timeSeriesDurations[selectedTimeSeries];
        if (!duration) {
            const total = series.reduce((acc, point) => acc + point.total, 0);
            return { data: series, total };
        }
        const threshold = dayjs().subtract(duration.amount, duration.unit);
        const filtered = series.filter(point => {
            const timestamp = dayjs(point.timestamp);
            return timestamp.isAfter(threshold) || timestamp.isSame(threshold);
        });
        const dataset = filtered.length > 0 ? filtered : series;
        const total = dataset.reduce((acc, point) => acc + point.total, 0);
        return { data: dataset, total };
    }, [analytics?.timeSeries, selectedTimeSeries]);
    const timeGranularity = useMemo(() => {
        if (['1m', '5m', '15m', '30m'].includes(selectedTimeSeries))
            return 'minute';
        if (['1h', '6h', '12h', 'hourly'].includes(selectedTimeSeries))
            return 'hour';
        if (selectedTimeSeries === 'daily')
            return 'day';
        if (selectedTimeSeries === 'monthly')
            return 'month';
        return 'minute';
    }, [selectedTimeSeries]);
    const filterGroups = useMemo(() => analytics?.availableFilters ?? [], [analytics?.availableFilters]);
    const filterGroupMap = useMemo(() => {
        return new Map(filterGroups.map(group => [group.id, group]));
    }, [filterGroups]);
    const getFilterOptions = useCallback((groupId) => filterGroupMap.get(groupId)?.options ?? [], [filterGroupMap]);
    const getFilterValues = useCallback((groupId) => Array.isArray(filters[groupId]) ? filters[groupId] : [], [filters]);
    const appliedFilters = filters;
    useEffect(() => {
        const availableFilters = analytics?.availableFilters;
        if (!availableFilters)
            return;
        setFilters(current => {
            const next = { ...current };
            let hasChanged = false;
            availableFilters.forEach(group => {
                const selected = next[group.id];
                if (!selected)
                    return;
                const allowed = new Set(group.options.map(option => option.value));
                const filtered = selected.filter(value => allowed.has(value));
                if (filtered.length !== selected.length) {
                    hasChanged = true;
                    if (filtered.length === 0) {
                        delete next[group.id];
                    }
                    else {
                        next[group.id] = filtered;
                    }
                }
            });
            return hasChanged ? next : current;
        });
    }, [analytics?.availableFilters]);
    const handleTrafficSegmentChange = useCallback((segment) => {
        setTrafficSegment(segment);
        setFilters(prev => {
            const next = { ...prev };
            if (segment === 'all') {
                delete next.isBot;
            }
            else {
                next.isBot = [segment];
            }
            return next;
        });
    }, []);
    const toggleHideLocalReferrers = useCallback(() => {
        setHideLocalReferrers(prev => !prev);
    }, []);
    const handleResetAllFilters = useCallback(() => {
        setFilters({});
        setInterval('1m');
        setTrafficSegment('all');
        setHideLocalReferrers(false);
        setAdvancedFiltersOpen(false);
    }, []);
    const handleToggleFilter = useCallback((groupId, value) => {
        setFilters(prev => {
            const currentValues = new Set(Array.isArray(prev[groupId]) ? prev[groupId] : []);
            if (currentValues.has(value)) {
                currentValues.delete(value);
            }
            else {
                currentValues.add(value);
            }
            const next = { ...prev };
            if (currentValues.size === 0) {
                delete next[groupId];
            }
            else {
                next[groupId] = Array.from(currentValues);
            }
            return next;
        });
    }, []);
    const handleSetFilterValues = useCallback((groupId, values) => {
        setFilters(prev => {
            const next = { ...prev };
            if (values.length === 0) {
                delete next[groupId];
            }
            else {
                next[groupId] = values;
            }
            return next;
        });
    }, []);
    useEffect(() => {
        const botFilter = filters.isBot;
        if (!Array.isArray(botFilter) || botFilter.length === 0) {
            if (trafficSegment !== 'all') {
                setTrafficSegment('all');
            }
            return;
        }
        if (botFilter.length === 1) {
            if (botFilter[0] === 'bot' && trafficSegment !== 'bot') {
                setTrafficSegment('bot');
                return;
            }
            if (botFilter[0] === 'human' && trafficSegment !== 'human') {
                setTrafficSegment('human');
                return;
            }
        }
        if (trafficSegment !== 'all') {
            setTrafficSegment('all');
        }
    }, [filters.isBot, trafficSegment]);
    useEffect(() => {
        if (!hideLocalReferrers)
            return;
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        if (!host)
            return;
        setFilters(prev => {
            const referers = prev.referer;
            if (!Array.isArray(referers) || referers.length === 0)
                return prev;
            const filtered = referers.filter(value => !value.includes(host));
            if (filtered.length === referers.length)
                return prev;
            const next = { ...prev };
            if (filtered.length === 0) {
                delete next.referer;
            }
            else {
                next.referer = filtered;
            }
            return next;
        });
    }, [hideLocalReferrers]);
    const linkDetails = linkDetailsQuery.data;
    const handleExport = async (format) => {
        if (selectedLink === 'all')
            return;
        const content = await exportLinkStats(selectedLink, format);
        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const element = document.createElement('a');
        element.href = url;
        element.download = `link-analytics-${selectedLink}.${format}`;
        element.click();
        URL.revokeObjectURL(url);
    };
    const handleTogglePublic = async () => {
        if (selectedLink === 'all' || !linkDetails)
            return;
        await toggleLinkPublicStats(selectedLink, !linkDetails.publicStats);
        await queryClient.invalidateQueries({ queryKey: ['link', selectedLink] });
    };
    const activeFilterChips = useMemo(() => {
        if (!analytics?.availableFilters)
            return [];
        return analytics.availableFilters.flatMap(group => {
            const selected = appliedFilters[group.id];
            if (!selected || selected.length === 0)
                return [];
            const labelByValue = new Map(group.options.map(option => [option.value, option.label]));
            return selected.map(value => ({
                groupId: group.id,
                value,
                label: `${group.label} · ${labelByValue.get(value) ?? value}`
            }));
        });
    }, [analytics?.availableFilters, appliedFilters]);
    const botStatusMap = useMemo(() => {
        const map = new Map();
        (analytics?.byBotStatus ?? []).forEach(item => map.set(item.value, item));
        return map;
    }, [analytics?.byBotStatus]);
    const eventTypeBreakdown = analytics?.byEventType ?? [];
    const trafficTypeBreakdown = analytics?.byBotStatus ?? [];
    const topReferers = useMemo(() => (analytics?.byReferer ?? []).slice(0, 5), [analytics?.byReferer]);
    const isLoading = analyticsQuery.isLoading || !analytics;
    const shareUrl = selectedLink !== 'all' && linkDetails?.publicStats && linkDetails.publicStatsToken
        ? `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${linkDetails.publicStatsToken}`
        : selectedLink === 'all'
            ? 'N/A'
            : 'Privé';
    if (!selectedLink || isLoading) {
        return _jsx("div", { className: "text-muted", children: t('statistics.loading', 'Chargement des statistiques...') });
    }
    const totalEvents = analytics.totalEvents ?? 0;
    const totalClicks = analytics.totalClicks ?? 0;
    const totalScans = analytics.totalScans ?? 0;
    const clicksRatio = totalEvents === 0 ? 0 : (totalClicks / totalEvents) * 100;
    const scansRatio = totalEvents === 0 ? 0 : (totalScans / totalEvents) * 100;
    const humanStats = botStatusMap.get('human');
    const botStats = botStatusMap.get('bot');
    const humanRatio = humanStats?.percentage ?? (totalEvents === 0 ? 0 : ((totalEvents - (botStats?.total ?? 0)) / totalEvents) * 100);
    const botRatio = botStats?.percentage ?? (totalEvents === 0 ? 0 : ((botStats?.total ?? 0) / totalEvents) * 100);
    const uniqueCountries = analytics.geo?.countries.length ?? 0;
    const uniqueCities = analytics.geo?.cities.length ?? 0;
    const localizedCoverage = Math.min(100, (analytics.geo?.countries ?? []).reduce((acc, item) => acc + item.percentage, 0));
    const cityCoverage = Math.min(100, (analytics.geo?.cities ?? []).reduce((acc, item) => acc + item.percentage, 0));
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
    ];
    const eventsFlow = analytics.eventsFlow ?? [];
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('statistics.title') }), _jsx("p", { className: "text-sm text-muted", children: t('statistics.subtitle', 'Analyse complète des évènements') })] }), _jsx("div", { className: "flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/40 bg-slate-900/60 p-1", children: timeSeriesOptions.map(option => (_jsx("button", { type: "button", onClick: () => handleTimeSeriesSelect(option.key), className: `px-3 py-1 text-xs transition ${selectedTimeSeries === option.key
                                ? 'rounded-md bg-blue-500/40 text-white shadow-inner shadow-blue-500/20'
                                : 'rounded-md text-blue-200 hover:text-white'}`, children: option.label }, option.key))) }), _jsxs("select", { value: selectedLink, onChange: event => setSelectedLink(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "all", children: t('statistics.allLinks', 'Tous les liens') }), linksQuery.data?.map(link => (_jsx("option", { value: link.id, children: link.slug }, link.id)))] }), _jsxs("select", { value: selectedProject, onChange: event => setSelectedProject(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "all", children: t('statistics.allProjects', 'Tous les projets') }), projectsQuery.data?.map(project => (_jsx("option", { value: project.id, children: project.name }, project.id)))] }), _jsx("button", { onClick: handleTogglePublic, className: `rounded-md px-3 py-2 text-sm ${selectedLink === 'all'
                            ? 'border border-slate-700 text-slate-500 cursor-not-allowed'
                            : linkDetails?.publicStats
                                ? 'bg-accent/20 text-accent'
                                : 'border border-slate-700 text-slate-300'}`, disabled: selectedLink === 'all', children: t('statistics.makePublic') }), _jsxs("div", { className: "ml-auto flex flex-col gap-1 text-xs text-muted", children: [_jsx("span", { children: t('statistics.share') }), _jsx("code", { className: "rounded bg-slate-800 px-2 py-1 text-slate-300", children: shareUrl })] })] }), _jsxs("div", { className: "rounded-2xl border border-blue-500/30 bg-gradient-to-r from-black/60 to-blue-900/20 p-5 shadow-inner shadow-blue-500/10", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold text-white", children: "Dashboard Analytics Super Admin" }), _jsx("p", { className: "text-sm text-blue-200 mt-1", children: "Explorez les m\u00E9triques cl\u00E9s : filtres dynamiques, graphiques d\u00E9taill\u00E9s et cartographie interactive." })] }), _jsxs("div", { className: "flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3", children: [_jsxs("button", { type: "button", onClick: handleResetAllFilters, className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-500/40 text-blue-200 transition hover:bg-blue-900/30 disabled:opacity-70", disabled: analyticsQuery.isFetching, children: [_jsx(RefreshCcw, { className: "h-4 w-4" }), "R\u00E9initialiser"] }), _jsx("p", { className: "text-xs text-blue-300/80", children: "Les filtres se mettent \u00E0 jour automatiquement." })] })] }), _jsxs("div", { className: "mt-6 space-y-6", children: [_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-blue-200", children: "Filtres rapides" }), _jsx("p", { className: "mt-1 text-xs text-blue-300/80", children: "Ajustez rapidement les crit\u00E8res principaux avant d'affiner avec les options avanc\u00E9es." })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsxs("div", { className: "flex flex-col gap-2 text-sm text-blue-100", children: [_jsx("span", { className: "font-medium uppercase tracking-wide text-xs text-blue-300", children: "P\u00E9riode" }), _jsx("div", { className: "flex flex-wrap gap-2 rounded-lg border border-blue-500/40 bg-slate-900/60 p-1", children: intervalOptions.map(option => (_jsx("button", { type: "button", onClick: () => setInterval(option.value), className: `flex-1 rounded-md px-3 py-1 text-xs transition ${interval === option.value
                                                                ? 'bg-blue-500/40 text-white shadow-inner shadow-blue-500/20'
                                                                : 'text-blue-200 hover:text-white'}`, children: option.label }, option.value))) })] }), _jsxs("div", { className: "flex flex-col gap-2 text-sm text-blue-100", children: [_jsx("span", { className: "font-medium uppercase tracking-wide text-xs text-blue-300", children: "Trafic" }), _jsx("div", { className: "flex items-center gap-1 rounded-lg border border-blue-500/40 bg-slate-900/60 p-1", children: trafficSegments.map(option => (_jsx("button", { type: "button", onClick: () => handleTrafficSegmentChange(option.value), className: `flex-1 rounded-md px-3 py-1 text-xs transition ${trafficSegment === option.value
                                                                ? 'bg-blue-500/40 text-white shadow-inner shadow-blue-500/20'
                                                                : 'text-blue-200 hover:text-white'}`, children: option.label }, option.value))) })] }), _jsx(FilterSelect, { label: "Pays", options: getFilterOptions('country'), value: getFilterValues('country'), onChange: values => handleSetFilterValues('country', values), placeholder: "S\u00E9lectionner des pays" }), _jsx(FilterSelect, { label: "Villes", options: getFilterOptions('city'), value: getFilterValues('city'), onChange: values => handleSetFilterValues('city', values), placeholder: "Rechercher des villes" }), _jsx(FilterSelect, { label: "Sources", options: getFilterOptions('referer'), value: getFilterValues('referer'), onChange: values => handleSetFilterValues('referer', values), placeholder: "S\u00E9lectionner des sources" }), _jsx(FilterSelect, { label: "Appareils", options: getFilterOptions('device'), value: getFilterValues('device'), onChange: values => handleSetFilterValues('device', values), placeholder: "Types d'appareils" }), _jsx(FilterSelect, { label: "Syst\u00E8mes d'exploitation", options: getFilterOptions('os'), value: getFilterValues('os'), onChange: values => handleSetFilterValues('os', values), placeholder: "S\u00E9lectionner des OS" }), _jsx(FilterSelect, { label: "Navigateurs", options: getFilterOptions('browser'), value: getFilterValues('browser'), onChange: values => handleSetFilterValues('browser', values), placeholder: "S\u00E9lectionner des navigateurs" }), _jsx(FilterSelect, { label: "Langues", options: getFilterOptions('language'), value: getFilterValues('language'), onChange: values => handleSetFilterValues('language', values), placeholder: "S\u00E9lectionner des langues" }), _jsxs("div", { className: "flex items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-slate-900/50 p-3 text-blue-100", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium uppercase tracking-wide text-blue-300", children: "R\u00E9f\u00E9rers externes" }), _jsx("span", { className: "text-[11px] text-blue-300/80", children: "Masquer les referrers venant du site lui-m\u00EAme." })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": hideLocalReferrers, onClick: toggleHideLocalReferrers, className: `relative h-6 w-11 rounded-full border transition ${hideLocalReferrers ? 'border-blue-500/70 bg-blue-500/40' : 'border-blue-500/30 bg-slate-900/80'}`, children: _jsx("span", { className: `absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-transform ${hideLocalReferrers ? 'translate-x-6' : 'translate-x-1'}` }) })] })] })] }), _jsxs("section", { className: "rounded-xl border border-blue-500/30 bg-slate-900/40 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-blue-200", children: "Filtres avanc\u00E9s" }), _jsx("p", { className: "text-xs text-blue-300/80", children: "D\u00E9ployez les sections ci-dessous pour segmenter plus finement." })] }), _jsxs("button", { type: "button", onClick: () => setAdvancedFiltersOpen(prev => !prev), className: "flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-medium text-blue-200 transition hover:bg-blue-900/30", "aria-expanded": advancedFiltersOpen, children: [advancedFiltersOpen ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés', _jsx(ChevronDown, { className: `h-3 w-3 transition-transform ${advancedFiltersOpen ? 'rotate-180' : ''}` })] })] }), advancedFiltersOpen && (_jsxs("div", { className: "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2", children: [_jsxs(FilterAccordionSection, { title: "\u00C9v\u00E8nements & trafic", contentClassName: "space-y-4", children: [_jsx(FilterSelect, { label: "Type d'\u00E9v\u00E8nement", options: getFilterOptions('eventType'), value: getFilterValues('eventType'), onChange: values => handleSetFilterValues('eventType', values), placeholder: "Clicks, scans, ..." }), _jsx(FilterSelect, { label: "Trafic", options: getFilterOptions('isBot'), value: getFilterValues('isBot'), onChange: values => handleSetFilterValues('isBot', values), placeholder: "Bot ou humain" })] }), _jsxs(FilterAccordionSection, { title: "Localisation avanc\u00E9e", contentClassName: "space-y-4", children: [_jsx(FilterSelect, { label: "Continents", options: getFilterOptions('continent'), value: getFilterValues('continent'), onChange: values => handleSetFilterValues('continent', values), placeholder: "Rechercher des continents" }), _jsx(FilterSelect, { label: "Pays", options: getFilterOptions('country'), value: getFilterValues('country'), onChange: values => handleSetFilterValues('country', values), placeholder: "Pays cibl\u00E9s" })] }), _jsxs(FilterAccordionSection, { title: "Technologies", contentClassName: "grid grid-cols-1 gap-4", children: [_jsx(FilterSelect, { label: "Appareils", options: getFilterOptions('device'), value: getFilterValues('device'), onChange: values => handleSetFilterValues('device', values), placeholder: "Type d'appareil" }), _jsx(FilterSelect, { label: "OS", options: getFilterOptions('os'), value: getFilterValues('os'), onChange: values => handleSetFilterValues('os', values), placeholder: "Syst\u00E8mes" }), _jsx(FilterSelect, { label: "Navigateurs", options: getFilterOptions('browser'), value: getFilterValues('browser'), onChange: values => handleSetFilterValues('browser', values), placeholder: "Navigateurs" }), _jsx(FilterSelect, { label: "Langues", options: getFilterOptions('language'), value: getFilterValues('language'), onChange: values => handleSetFilterValues('language', values), placeholder: "Langues utilisateurs" })] }), _jsxs(FilterAccordionSection, { title: "Campagnes & UTM", contentClassName: "grid grid-cols-1 gap-4", children: [_jsx(FilterSelect, { label: "UTM Source", options: getFilterOptions('utmSource'), value: getFilterValues('utmSource'), onChange: values => handleSetFilterValues('utmSource', values), placeholder: "utm_source" }), _jsx(FilterSelect, { label: "UTM Medium", options: getFilterOptions('utmMedium'), value: getFilterValues('utmMedium'), onChange: values => handleSetFilterValues('utmMedium', values), placeholder: "utm_medium" }), _jsx(FilterSelect, { label: "UTM Campaign", options: getFilterOptions('utmCampaign'), value: getFilterValues('utmCampaign'), onChange: values => handleSetFilterValues('utmCampaign', values), placeholder: "utm_campaign" }), _jsx(FilterSelect, { label: "UTM Content", options: getFilterOptions('utmContent'), value: getFilterValues('utmContent'), onChange: values => handleSetFilterValues('utmContent', values), placeholder: "utm_content" }), _jsx(FilterSelect, { label: "UTM Term", options: getFilterOptions('utmTerm'), value: getFilterValues('utmTerm'), onChange: values => handleSetFilterValues('utmTerm', values), placeholder: "utm_term" })] })] }))] })] })] }), activeFilterChips.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 text-xs", children: activeFilterChips.map(item => (_jsxs("button", { onClick: () => handleToggleFilter(item.groupId, item.value), className: "group flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent transition hover:bg-accent/20", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-slate-200", children: "\u00D7" })] }, `${item.groupId}-${item.value}`))) })), _jsx("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: metricCards.map(card => (_jsx(MetricCard, { label: card.label, value: card.value, trend: card.trend }, card.label))) }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "mb-4 text-sm font-semibold text-slate-200", children: "R\u00E9partition des \u00E9v\u00E8nements" }), eventTypeBreakdown.length > 0 ? (_jsx("div", { className: "h-60", children: _jsx(ResponsiveContainer, { children: _jsxs(RechartsPieChart, { children: [_jsx(Tooltip, { cursor: false, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, itemStyle: { color: '#e2e8f0' }, formatter: (value, _name, entry) => {
                                                    const raw = typeof value === 'number' ? value : Number(value ?? 0);
                                                    const percentage = percentageFormatter(entry?.payload?.percentage ?? 0);
                                                    return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? ''];
                                                } }), _jsx(Legend, { verticalAlign: "bottom", height: 36, wrapperStyle: { color: '#94a3b8', fontSize: 11 } }), _jsx(Pie, { data: eventTypeBreakdown, dataKey: "total", nameKey: "label", innerRadius: 50, outerRadius: 80, paddingAngle: 4, children: eventTypeBreakdown.map((entry, index) => (_jsx(Cell, { fill: chartPalette[index % chartPalette.length] }, entry.value ?? index))) })] }) }) })) : (_jsx("div", { className: "flex h-60 items-center justify-center text-sm text-muted", children: "Aucune donn\u00E9e disponible" }))] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "mb-4 text-sm font-semibold text-slate-200", children: "Trafic bot / humain" }), trafficTypeBreakdown.length > 0 ? (_jsx("div", { className: "h-60", children: _jsx(ResponsiveContainer, { children: _jsxs(RechartsPieChart, { children: [_jsx(Tooltip, { cursor: false, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, itemStyle: { color: '#e2e8f0' }, formatter: (value, _name, entry) => {
                                                    const raw = typeof value === 'number' ? value : Number(value ?? 0);
                                                    const percentage = percentageFormatter(entry?.payload?.percentage ?? 0);
                                                    return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? ''];
                                                } }), _jsx(Legend, { verticalAlign: "bottom", height: 36, wrapperStyle: { color: '#94a3b8', fontSize: 11 } }), _jsx(Pie, { data: trafficTypeBreakdown, dataKey: "total", nameKey: "label", innerRadius: 50, outerRadius: 80, paddingAngle: 8, children: trafficTypeBreakdown.map((entry, index) => (_jsx(Cell, { fill: chartPalette[index % chartPalette.length] }, entry.value ?? index))) })] }) }) })) : (_jsx("div", { className: "flex h-60 items-center justify-center text-sm text-muted", children: "Aucune donn\u00E9e disponible" }))] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "mb-4 text-sm font-semibold text-slate-200", children: "Top referers" }), topReferers.length > 0 ? (_jsx("div", { className: "h-60", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: topReferers, layout: "vertical", margin: { top: 8, right: 16, left: 0, bottom: 8 }, children: [_jsx(CartesianGrid, { stroke: "#1e293b", horizontal: false, strokeDasharray: "3 3" }), _jsx(XAxis, { type: "number", tick: { fill: '#94a3b8', fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { dataKey: "label", type: "category", width: 140, tick: { fill: '#94a3b8', fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(Tooltip, { cursor: { fill: '#0f172a' }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, formatter: (value, _name, entry) => {
                                                    const raw = typeof value === 'number' ? value : Number(value ?? 0);
                                                    const percentage = percentageFormatter(entry?.payload?.percentage ?? 0);
                                                    return [`${numberFormatter.format(raw)} (${percentage})`, entry?.payload?.label ?? ''];
                                                } }), _jsx(Bar, { dataKey: "total", fill: "#38bdf8", radius: [0, 6, 6, 0] })] }) }) })) : (_jsx("div", { className: "flex h-60 items-center justify-center text-sm text-muted", children: "Pas de referers" }))] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-4", children: _jsxs("h3", { className: "flex items-center gap-2 text-lg font-semibold text-white", children: [_jsx(BarChart3, { className: "h-4 w-4 text-blue-300" }), t('home.recentClicks')] }) }), _jsxs("div", { className: "mb-4 flex flex-wrap justify-end gap-2", children: [_jsx("button", { onClick: () => handleExport('csv'), disabled: selectedLink === 'all', className: `rounded-md border px-3 py-1 text-xs ${selectedLink === 'all'
                                    ? 'cursor-not-allowed border-slate-800 text-slate-600'
                                    : 'border-slate-700 text-slate-200 hover:border-accent'}`, children: t('statistics.exportCsv') }), _jsx("button", { onClick: () => handleExport('json'), disabled: selectedLink === 'all', className: `rounded-md border px-3 py-1 text-xs ${selectedLink === 'all'
                                    ? 'cursor-not-allowed border-slate-800 text-slate-600'
                                    : 'border-slate-700 text-slate-200 hover:border-accent'}`, children: t('statistics.exportJson') })] }), _jsx(LineChart, { data: filteredTimeSeries.data, total: filteredTimeSeries.total, granularity: timeGranularity })] }), analytics.geo && (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-200", children: "Carte de chaleur mondiale" }), _jsx("p", { className: "text-xs text-muted", children: "Gradients proportionnels aux hits; zoom pour d\u00E9tailler les villes" })] }), _jsx(GeoAnalyticsMap, { countries: analytics.geo.countries, cities: analytics.geo.cities, totalEvents: analytics.totalEvents })] })), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "Pays", items: analytics.byCountry ?? [] }), _jsx(BreakdownCard, { title: "Villes", items: analytics.byCity ?? [] }), _jsx(BreakdownCard, { title: "Continents", items: analytics.byContinent ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "Appareils", items: analytics.byDevice ?? [] }), _jsx(BreakdownCard, { title: "Syst\u00E8mes", items: analytics.byOs ?? [] }), _jsx(BreakdownCard, { title: "Navigateurs", items: analytics.byBrowser ?? [] })] }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-2 xl:grid-cols-4", children: [_jsx(BreakdownCard, { title: "Langues", items: analytics.byLanguage ?? [] }), _jsx(BreakdownCard, { title: "Origine du trafic", items: analytics.byReferer ?? [] }), _jsx(BreakdownCard, { title: "Type d'\u00E9v\u00E8nement", items: analytics.byEventType ?? [] }), _jsx(BreakdownCard, { title: "Type de trafic", items: analytics.byBotStatus ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "UTM Source", items: analytics.byUtmSource ?? [] }), _jsx(BreakdownCard, { title: "UTM Medium", items: analytics.byUtmMedium ?? [] }), _jsx(BreakdownCard, { title: "UTM Campaign", items: analytics.byUtmCampaign ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(BreakdownCard, { title: "UTM Content", items: analytics.byUtmContent ?? [] }), _jsx(BreakdownCard, { title: "UTM Term", items: analytics.byUtmTerm ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: "R\u00E9partition horaire (UTC)" }), _jsx(HourlyChart, { data: analytics.byHour })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: "Jours de la semaine" }), _jsx(WeekdayChart, { data: analytics.byWeekday })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.eventsFlow') }), _jsx(DataTable, { data: eventsFlow, columns: [
                            { key: 'occurredAt', label: 'Date', render: row => dayjs(row.occurredAt).format('DD MMM HH:mm') },
                            { key: 'eventType', label: 'Évènement', render: row => row.eventType?.toUpperCase() ?? 'N/A' },
                            {
                                key: 'device',
                                label: 'Appareil',
                                render: row => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { children: row.device ?? 'Inconnu' }), _jsx("div", { className: "text-xs text-slate-400", children: [row.os, row.browser].filter(Boolean).join(' · ') || '—' })] }))
                            },
                            {
                                key: 'country',
                                label: 'Localisation',
                                render: row => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { children: [row.city, row.country]
                                                .filter(Boolean)
                                                .map(value => String(value))
                                                .join(' · ') || 'Unknown' }), typeof row.latitude === 'number' && typeof row.longitude === 'number' && (_jsxs("div", { className: "text-xs text-slate-400", children: [row.latitude.toFixed(3), ", ", row.longitude.toFixed(3)] }))] }))
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
                                render: row => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { children: row.referer ?? 'Direct' }), row.utm && (_jsx("div", { className: "text-xs text-slate-400", children: (() => {
                                                const utmRecord = row.utm;
                                                const entries = ['source', 'medium', 'campaign', 'content', 'term']
                                                    .map(key => {
                                                    const value = utmRecord?.[key];
                                                    return value ? `${key}: ${value}` : null;
                                                })
                                                    .filter(Boolean);
                                                return entries.length > 0 ? entries.join(' · ') : '—';
                                            })() }))] }))
                            },
                            {
                                key: 'metadata',
                                label: 'Métadonnées',
                                render: row => {
                                    if (!row.metadata || Object.keys(row.metadata).length === 0)
                                        return '—';
                                    const serialized = JSON.stringify(row.metadata);
                                    return _jsx("span", { className: "truncate text-xs text-slate-300", children: serialized.length > 80 ? `${serialized.slice(0, 80)}…` : serialized });
                                }
                            }
                        ], emptyMessage: "Aucun \u00E9v\u00E8nement enregistr\u00E9" })] })] }));
};
