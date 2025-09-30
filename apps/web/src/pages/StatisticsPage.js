import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';
import { fetchLinks, fetchLinkAnalytics, fetchLinkDetails, toggleLinkPublicStats, exportLinkStats } from '../api/links';
import { fetchProjects } from '../api/projects';
import { LineChart } from '../components/LineChart';
import { IntervalSelector } from '../components/IntervalSelector';
import { DataTable } from '../components/DataTable';
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics';
import dayjs from '../lib/dayjs';
export const StatisticsPage = () => {
    const { t } = useTranslation();
    const params = useParams();
    const queryClient = useQueryClient();
    const { workspaceId } = useAuth();
    const [interval, setInterval] = useState('1m');
    const [selectedLink, setSelectedLink] = useState(null);
    const linksQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) });
    const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
    useEffect(() => {
        if (params.linkId) {
            setSelectedLink(params.linkId);
        }
        else if (!selectedLink && linksQuery.data?.length) {
            setSelectedLink(linksQuery.data[0].id);
        }
    }, [params.linkId, linksQuery.data, selectedLink]);
    const analyticsQuery = useQuery({
        queryKey: ['analytics', selectedLink, interval],
        enabled: !!selectedLink,
        queryFn: () => fetchLinkAnalytics(selectedLink, { interval })
    });
    useRealtimeAnalytics([workspaceId ? `workspace:${workspaceId}` : null, selectedLink ? `link:${selectedLink}` : null].filter(Boolean), () => analyticsQuery.refetch());
    const linkDetailsQuery = useQuery({
        queryKey: ['link', selectedLink],
        enabled: !!selectedLink,
        queryFn: () => fetchLinkDetails(selectedLink)
    });
    const analytics = analyticsQuery.data;
    const linkDetails = linkDetailsQuery.data;
    const scanCount = useMemo(() => {
        if (!analytics?.eventsFlow)
            return 0;
        return (analytics.eventsFlow ?? []).filter(event => event.eventType === 'scan').length;
    }, [analytics]);
    const handleExport = async (format) => {
        if (!selectedLink)
            return;
        const content = await exportLinkStats(selectedLink, format);
        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `link-analytics-${selectedLink}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const handleTogglePublic = async () => {
        if (!selectedLink || !linkDetails)
            return;
        await toggleLinkPublicStats(selectedLink, !linkDetails.publicStats);
        await queryClient.invalidateQueries({ queryKey: ['link', selectedLink] });
    };
    if (!selectedLink || analyticsQuery.isLoading || !analytics) {
        return _jsx("div", { className: "text-muted", children: "Loading analytics..." });
    }
    const topCountries = (analytics.byCountry ?? []).slice(0, 5);
    const topCities = (analytics.byCity ?? []).slice(0, 5);
    const topContinents = (analytics.byContinent ?? []).slice(0, 5);
    const topDevices = (analytics.byDevice ?? []).slice(0, 4);
    const topOs = (analytics.byOs ?? []).slice(0, 4);
    const topBrowsers = (analytics.byBrowser ?? []).slice(0, 4);
    const topLanguages = (analytics.byLanguage ?? []).slice(0, 6);
    const topReferers = (analytics.byReferer ?? []).slice(0, 6);
    const eventsFlow = (analytics.eventsFlow ?? []).slice(0, 10);
    const shareUrl = linkDetails?.publicStats && linkDetails.publicStatsToken
        ? `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${linkDetails.publicStatsToken}`
        : 'Private';
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('statistics.title') }), _jsx("p", { className: "text-sm text-muted", children: "Deep insights per link" })] }), _jsx(IntervalSelector, { value: interval, onChange: setInterval }), _jsx("select", { value: selectedLink ?? '', onChange: event => setSelectedLink(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: linksQuery.data?.map(link => (_jsx("option", { value: link.id, children: link.slug }, link.id))) }), _jsx("select", { className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: projectsQuery.data?.map(project => (_jsx("option", { value: project.id, children: project.name }, project.id))) }), _jsx("button", { onClick: handleTogglePublic, className: `rounded-md px-3 py-2 text-sm ${linkDetails?.publicStats ? 'bg-accent/20 text-accent' : 'border border-slate-700 text-slate-300'}`, children: t('statistics.makePublic') }), _jsxs("div", { className: "ml-auto flex items-center gap-2 text-xs text-muted", children: [_jsx("span", { children: t('statistics.share') }), _jsx("code", { className: "rounded bg-slate-800 px-2 py-1 text-slate-300", children: shareUrl })] })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold", children: t('home.recentClicks') }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleExport('csv'), className: "rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent", children: t('statistics.exportCsv') }), _jsx("button", { onClick: () => handleExport('json'), className: "rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent", children: t('statistics.exportJson') })] })] }), _jsx(LineChart, { data: analytics.timeSeries ?? [] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: t('statistics.topCountries') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topCountries.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: t('statistics.topCities') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topCities.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: t('statistics.topContinents') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topContinents.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.devices') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topDevices.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.os') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topOs.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.browsers') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topBrowsers.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.languages') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topLanguages.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.clickOrigins') }), _jsx("ul", { className: "mt-3 space-y-2 text-sm", children: topReferers.map(item => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: item.label }), _jsx("span", { className: "text-muted", children: item.total })] }, item.label))) })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.scans') }), _jsx("p", { className: "mt-1 text-3xl font-semibold text-accent", children: scanCount }), _jsx("p", { className: "text-xs text-muted", children: "QR code engagements" })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsx("h4", { className: "text-sm font-semibold", children: t('statistics.eventsFlow') }), _jsx(DataTable, { data: eventsFlow, columns: [
                                    { key: 'occurredAt', label: 'Date', render: row => dayjs(row.occurredAt).format('DD MMM HH:mm') },
                                    { key: 'device', label: 'Device' },
                                    { key: 'country', label: 'Country' },
                                    { key: 'referer', label: 'Referer' }
                                ], emptyMessage: "No events yet" })] })] })] }));
};
