import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchOverview } from '../api/dashboard';
import { MetricCard } from '../components/MetricCard';
import { LineChart } from '../components/LineChart';
import { IntervalSelector } from '../components/IntervalSelector';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../stores/auth';
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics';
import dayjs from '../lib/dayjs';
import { Link2, QrCode, BarChart3, ArrowRight } from 'lucide-react';
const onboardingSteps = [
    'Connect your first domain',
    'Create a short link',
    'Share analytics with your team',
    'Generate a branded QR code'
];
const intervalToDays = {
    all: 9999,
    '1y': 365,
    '3m': 90,
    '1m': 30,
    '1w': 7,
    '1d': 1
};
export const HomePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { workspaceId } = useAuth();
    const [interval, setInterval] = useState('1m');
    const { data, isLoading } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview });
    useRealtimeAnalytics(workspaceId ? [`workspace:${workspaceId}`] : [], () => {
        queryClient.invalidateQueries({ queryKey: ['overview'] });
    });
    const chartData = useMemo(() => {
        if (!data?.recentClicks)
            return [];
        const days = intervalToDays[interval];
        if (interval === 'all')
            return data.recentClicks;
        return data.recentClicks.filter((point) => dayjs(point.timestamp).isAfter(dayjs().subtract(days, 'day')));
    }, [data, interval]);
    if (isLoading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx(Skeleton, { className: "h-24" }), _jsx(Skeleton, { className: "h-80" }), _jsx(Skeleton, { className: "h-72" })] }));
    }
    if (!data) {
        return (_jsx(EmptyState, { title: "Bienvenue sur MIR-ALPHA", description: "Commencez par cr\u00E9er votre premier lien court pour alimenter les analytics en temps r\u00E9el.", action: _jsx("button", { onClick: () => navigate('/deeplinks'), className: "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white", children: "Cr\u00E9er un lien" }) }));
    }
    const recentEvents = data.events ?? [];
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-semibold text-slate-100", children: t('home.welcome') }), _jsx("p", { className: "text-sm text-slate-400", children: "Monitor the pulse of your links in real time." })] }), _jsx(IntervalSelector, { value: interval, onChange: setInterval })] }), _jsxs("div", { className: "grid gap-6 md:grid-cols-3", children: [_jsx(MetricCard, { label: t('home.numberOfLinks'), value: data.metrics?.numberOfLinks ?? 0 }), _jsx(MetricCard, { label: t('home.totalClicks'), value: data.metrics?.totalClicks ?? 0 }), _jsx(MetricCard, { label: t('home.recentClicks'), value: chartData.at(-1)?.total ?? 0, action: _jsx("button", { onClick: () => navigate('/statistics'), className: "rounded-md border border-accent/40 px-3 py-1 text-xs text-accent hover:bg-accent/10", children: t('home.viewAnalytics') }) })] }), _jsx(Card, { title: "Actions rapides", description: "Acc\u00E8s direct aux outils essentiels", actions: _jsx("button", { onClick: () => navigate('/deeplinks'), className: "text-xs text-accent hover:underline", children: "Aller aux liens" }), children: _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("button", { onClick: () => navigate('/deeplinks?create=true'), className: "group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "rounded-full bg-accent/20 p-2 text-accent", children: _jsx(Link2, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm font-semibold text-slate-100", children: "Cr\u00E9er un deeplink" })] }), _jsx("p", { className: "mt-3 text-xs text-slate-400", children: "G\u00E9n\u00E9rer un lien court et track\u00E9 en quelques secondes." }), _jsxs("span", { className: "mt-4 inline-flex items-center gap-2 text-xs text-accent/80 group-hover:text-accent", children: ["Commencer", _jsx(ArrowRight, { className: "h-4 w-4" })] })] }), _jsxs("button", { onClick: () => navigate('/qr'), className: "group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "rounded-full bg-emerald-500/15 p-2 text-emerald-400", children: _jsx(QrCode, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm font-semibold text-slate-100", children: "Cr\u00E9er un QR Code" })] }), _jsx("p", { className: "mt-3 text-xs text-slate-400", children: "Cr\u00E9ez une version scannable et brand\u00E9e de vos liens." }), _jsxs("span", { className: "mt-4 inline-flex items-center gap-2 text-xs text-emerald-400/80 group-hover:text-emerald-300", children: ["Designer", _jsx(ArrowRight, { className: "h-4 w-4" })] })] }), _jsxs("button", { onClick: () => navigate('/statistics'), className: "group flex h-full flex-col items-start justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-left transition hover:border-accent/60 hover:bg-slate-900/70", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "rounded-full bg-blue-500/15 p-2 text-blue-400", children: _jsx(BarChart3, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm font-semibold text-slate-100", children: "Voir les statistiques" })] }), _jsx("p", { className: "mt-3 text-xs text-slate-400", children: "Analysez les performances en temps r\u00E9el et les tendances." }), _jsxs("span", { className: "mt-4 inline-flex items-center gap-2 text-xs text-blue-400/80 group-hover:text-blue-300", children: ["Explorer", _jsx(ArrowRight, { className: "h-4 w-4" })] })] })] }) }), _jsx(Card, { title: t('home.recentClicks'), description: "Trafic consolid\u00E9 sur la p\u00E9riode s\u00E9lectionn\u00E9e", actions: _jsx("span", { className: "text-xs text-slate-500", children: "Realtime socket feed" }), children: _jsx(LineChart, { data: chartData }) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(Card, { title: "Pulse feed", description: "Derniers \u00E9v\u00E9nements enregistr\u00E9s", children: _jsxs("div", { className: "max-h-80 space-y-3 overflow-y-auto pr-2", children: [recentEvents.length === 0 && _jsx("p", { className: "text-sm text-slate-400", children: "Aucun \u00E9v\u00E9nement pour le moment." }), recentEvents.map((event) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 shadow-sm", children: [_jsxs("div", { children: [_jsx(StatusBadge, { label: event.eventType ?? 'event', tone: event.eventType === 'scan' ? 'warning' : 'success' }), _jsxs("p", { className: "mt-2 text-sm text-slate-200", children: [event.linkId?.slice(0, 6) ?? 'link', " \u2022 ", event.device ?? 'unknown device'] }), _jsxs("p", { className: "text-xs text-slate-500", children: [event.country ?? '??', " \u2022 ", event.referer ?? 'direct'] })] }), _jsx("span", { className: "text-xs text-slate-400", children: dayjs(event.occurredAt).fromNow() })] }, event.id)))] }) }), _jsx(Card, { title: t('home.onboarding'), description: "Suivez votre checklist MIR-ALPHA", children: _jsx("ul", { className: "space-y-3", children: onboardingSteps.map(step => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3", children: [_jsx("span", { className: "inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-500", children: "\u2022" }), _jsx("span", { className: "text-sm text-slate-200", children: step }), _jsx("button", { className: "ml-auto text-xs text-accent hover:underline", children: "Mark as done" })] }, step))) }) })] })] }));
};
