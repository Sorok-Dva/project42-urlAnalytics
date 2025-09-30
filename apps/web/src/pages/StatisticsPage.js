import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';
import { fetchLinks, fetchLinkDetails, toggleLinkPublicStats, exportLinkStats } from '../api/links';
import { fetchProjects } from '../api/projects';
import { fetchEventsAnalytics } from '../api/events';
import { LineChart } from '../components/LineChart';
import { IntervalSelector } from '../components/IntervalSelector';
import { DataTable } from '../components/DataTable';
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics';
import dayjs from '../lib/dayjs';
import { MetricCard } from '../components/MetricCard';
import { BreakdownCard } from '../components/BreakdownCard';
import { AnalyticsFiltersPanel } from '../components/AnalyticsFiltersPanel';
import { GeoAnalyticsMap } from '../components/GeoAnalyticsMap';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LabelList } from 'recharts';
const numberFormatter = new Intl.NumberFormat('fr-FR');
const serializeFilters = (filters) => {
    const entries = Object.entries(filters)
        .filter(([, values]) => Array.isArray(values) && values.length > 0)
        .map(([key, values]) => [key, [...values].sort((a, b) => a.localeCompare(b))])
        .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0)
        return undefined;
    const normalized = entries.reduce((acc, [key, values]) => {
        acc[key] = values;
        return acc;
    }, {});
    return JSON.stringify(normalized);
};
const percentageFormatter = (value) => `${value.toFixed(1)}%`;
const HourlyChart = ({ data }) => (_jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: data ?? [], margin: { top: 24, right: 12, left: 0, bottom: 8 }, children: [_jsx(XAxis, { dataKey: "label", stroke: "#64748b", tickLine: false, axisLine: false, interval: 1, fontSize: 12 }), _jsx(Tooltip, { cursor: { fill: '#0f172a' }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, labelStyle: { color: '#e2e8f0' }, formatter: (value, _name, payload) => [`${numberFormatter.format(value)} (${percentageFormatter(payload?.payload?.percentage ?? 0)})`, 'Hits'] }), _jsx(Bar, { dataKey: "total", radius: [6, 6, 0, 0], fill: "#38bdf8", children: _jsx(LabelList, { dataKey: "total", position: "top", formatter: (value, _entry, index) => {
                            const percentage = data && typeof index === 'number' ? data[index]?.percentage ?? 0 : 0;
                            return `${numberFormatter.format(value)} (${percentageFormatter(percentage)})`;
                        }, style: { fill: '#e2e8f0', fontSize: 10 } }) })] }) }) }));
const WeekdayChart = ({ data }) => (_jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: data ?? [], margin: { top: 24, right: 12, left: 0, bottom: 8 }, children: [_jsx(XAxis, { dataKey: "label", stroke: "#64748b", tickLine: false, axisLine: false, fontSize: 12 }), _jsx(Tooltip, { cursor: { fill: '#0f172a' }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, labelStyle: { color: '#e2e8f0' }, formatter: (value, _name, payload) => [`${numberFormatter.format(value)} (${percentageFormatter(payload?.payload?.percentage ?? 0)})`, 'Hits'] }), _jsx(Bar, { dataKey: "total", radius: [6, 6, 0, 0], fill: "#7f5af0", children: _jsx(LabelList, { dataKey: "total", position: "top", formatter: (value, _entry, index) => {
                            const percentage = data && typeof index === 'number' ? data[index]?.percentage ?? 0 : 0;
                            return `${numberFormatter.format(value)} (${percentageFormatter(percentage)})`;
                        }, style: { fill: '#e2e8f0', fontSize: 10 } }) })] }) }) }));
export const StatisticsPage = () => {
    const { t } = useTranslation();
    const params = useParams();
    const queryClient = useQueryClient();
    const { workspaceId } = useAuth();
    const [interval, setInterval] = useState('1m');
    const [selectedLink, setSelectedLink] = useState('all');
    const [selectedProject, setSelectedProject] = useState('all');
    const [filters, setFilters] = useState({});
    const serializedFilters = useMemo(() => serializeFilters(filters), [filters]);
    const linksQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) });
    const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
    useEffect(() => {
        if (params.linkId) {
            setSelectedLink(params.linkId);
        }
    }, [params.linkId]);
    const analyticsQuery = useQuery({
        queryKey: ['analytics', selectedProject, selectedLink, interval, serializedFilters],
        queryFn: () => fetchEventsAnalytics({
            period: interval,
            projectId: selectedProject !== 'all' ? selectedProject : undefined,
            linkId: selectedLink !== 'all' ? selectedLink : undefined,
            filters: serializedFilters
        })
    });
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
    const appliedFilters = filters;
    useEffect(() => {
        if (!analytics?.availableFilters)
            return;
        setFilters(current => {
            const next = { ...current };
            let hasChanged = false;
            analytics.availableFilters.forEach(group => {
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
    const handleClearGroup = useCallback((groupId) => {
        setFilters(prev => {
            if (!prev[groupId])
                return prev;
            const next = { ...prev };
            delete next[groupId];
            return next;
        });
    }, []);
    const handleClearAllFilters = useCallback(() => {
        setFilters({});
    }, []);
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
    const isLoading = analyticsQuery.isLoading || !analytics;
    if (!selectedLink || isLoading) {
        return _jsx("div", { className: "text-muted", children: t('statistics.loading', 'Chargement des statistiques...') });
    }
    const shareUrl = selectedLink !== 'all' && linkDetails?.publicStats && linkDetails.publicStatsToken
        ? `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${linkDetails.publicStatsToken}`
        : selectedLink === 'all'
            ? 'N/A'
            : 'Privé';
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
    const totalEvents = analytics.totalEvents ?? 0;
    const totalClicks = analytics.totalClicks ?? 0;
    const totalScans = analytics.totalScans ?? 0;
    const clicksRatio = totalEvents === 0 ? 0 : (totalClicks / totalEvents) * 100;
    const scansRatio = totalEvents === 0 ? 0 : (totalScans / totalEvents) * 100;
    const botStatusMap = useMemo(() => {
        const map = new Map();
        (analytics.byBotStatus ?? []).forEach(item => map.set(item.value, item));
        return map;
    }, [analytics.byBotStatus]);
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
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("section", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('statistics.title') }), _jsx("p", { className: "text-sm text-muted", children: t('statistics.subtitle', 'Analyse complète des évènements') })] }), _jsx(IntervalSelector, { value: interval, onChange: setInterval }), _jsxs("select", { value: selectedLink, onChange: event => setSelectedLink(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "all", children: t('statistics.allLinks', 'Tous les liens') }), linksQuery.data?.map(link => (_jsx("option", { value: link.id, children: link.slug }, link.id)))] }), _jsxs("select", { value: selectedProject, onChange: event => setSelectedProject(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "all", children: t('statistics.allProjects', 'Tous les projets') }), projectsQuery.data?.map(project => (_jsx("option", { value: project.id, children: project.name }, project.id)))] }), _jsx("button", { onClick: handleTogglePublic, className: `rounded-md px-3 py-2 text-sm ${selectedLink === 'all'
                            ? 'border border-slate-700 text-slate-500 cursor-not-allowed'
                            : linkDetails?.publicStats
                                ? 'bg-accent/20 text-accent'
                                : 'border border-slate-700 text-slate-300'}`, disabled: selectedLink === 'all', children: t('statistics.makePublic') }), _jsxs("div", { className: "ml-auto flex flex-col gap-1 text-xs text-muted", children: [_jsx("span", { children: t('statistics.share') }), _jsx("code", { className: "rounded bg-slate-800 px-2 py-1 text-slate-300", children: shareUrl })] })] }), _jsx(AnalyticsFiltersPanel, { groups: analytics.availableFilters ?? [], active: appliedFilters, onToggle: handleToggleFilter, onClearGroup: handleClearGroup, onClearAll: handleClearAllFilters }), activeFilterChips.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 text-xs", children: activeFilterChips.map(item => (_jsxs("button", { onClick: () => handleToggleFilter(item.groupId, item.value), className: "group flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent transition hover:bg-accent/20", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-slate-200", children: "\u00D7" })] }, `${item.groupId}-${item.value}`))) })), _jsx("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: metricCards.map(card => (_jsx(MetricCard, { label: card.label, value: card.value, trend: card.trend }, card.label))) }), _jsxs("section", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold", children: t('home.recentClicks') }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleExport('csv'), disabled: selectedLink === 'all', className: `rounded-md border px-3 py-1 text-xs ${selectedLink === 'all'
                                            ? 'cursor-not-allowed border-slate-800 text-slate-600'
                                            : 'border-slate-700 text-slate-200 hover:border-accent'}`, children: t('statistics.exportCsv') }), _jsx("button", { onClick: () => handleExport('json'), disabled: selectedLink === 'all', className: `rounded-md border px-3 py-1 text-xs ${selectedLink === 'all'
                                            ? 'cursor-not-allowed border-slate-800 text-slate-600'
                                            : 'border-slate-700 text-slate-200 hover:border-accent'}`, children: t('statistics.exportJson') })] })] }), _jsx(LineChart, { data: analytics.timeSeries ?? [], total: analytics.totalEvents })] }), analytics.geo && (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-200", children: "Carte de chaleur mondiale" }), _jsx("p", { className: "text-xs text-muted", children: "Gradients proportionnels aux hits; zoom pour d\u00E9tailler les villes" })] }), _jsx(GeoAnalyticsMap, { countries: analytics.geo.countries, cities: analytics.geo.cities, totalEvents: analytics.totalEvents })] })), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "Pays", items: analytics.byCountry ?? [] }), _jsx(BreakdownCard, { title: "Villes", items: analytics.byCity ?? [] }), _jsx(BreakdownCard, { title: "Continents", items: analytics.byContinent ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "Appareils", items: analytics.byDevice ?? [] }), _jsx(BreakdownCard, { title: "Syst\u00E8mes", items: analytics.byOs ?? [] }), _jsx(BreakdownCard, { title: "Navigateurs", items: analytics.byBrowser ?? [] })] }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-2 xl:grid-cols-4", children: [_jsx(BreakdownCard, { title: "Langues", items: analytics.byLanguage ?? [] }), _jsx(BreakdownCard, { title: "Origine du trafic", items: analytics.byReferer ?? [] }), _jsx(BreakdownCard, { title: "Type d'\u00E9v\u00E8nement", items: analytics.byEventType ?? [] }), _jsx(BreakdownCard, { title: "Type de trafic", items: analytics.byBotStatus ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(BreakdownCard, { title: "UTM Source", items: analytics.byUtmSource ?? [] }), _jsx(BreakdownCard, { title: "UTM Medium", items: analytics.byUtmMedium ?? [] }), _jsx(BreakdownCard, { title: "UTM Campaign", items: analytics.byUtmCampaign ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(BreakdownCard, { title: "UTM Content", items: analytics.byUtmContent ?? [] }), _jsx(BreakdownCard, { title: "UTM Term", items: analytics.byUtmTerm ?? [] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: "R\u00E9partition horaire (UTC)" }), _jsx(HourlyChart, { data: analytics.byHour })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: "Jours de la semaine" }), _jsx(WeekdayChart, { data: analytics.byWeekday })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.eventsFlow') }), _jsx(DataTable, { data: eventsFlow, columns: [
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
