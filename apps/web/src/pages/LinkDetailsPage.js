import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchLinkDetails, updateLinkRequest } from '../api/links';
import { fetchProjects } from '../api/projects';
import { fetchDomains } from '../api/domains';
import { useToast } from '../providers/ToastProvider';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import dayjs from '../lib/dayjs';
const buildShareUrl = (token) => {
    if (!token)
        return null;
    return `${import.meta.env.VITE_PUBLIC_BASE_URL}/share/link/${token}`;
};
export const LinkDetailsPage = () => {
    const { t } = useTranslation();
    const params = useParams();
    const queryClient = useQueryClient();
    const { push } = useToast();
    const linkId = params.linkId ?? '';
    const { data: link, isLoading } = useQuery({
        queryKey: ['link', linkId],
        enabled: Boolean(linkId),
        queryFn: () => fetchLinkDetails(linkId)
    });
    const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
    const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: fetchDomains });
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
    });
    const [geoRules, setGeoRules] = useState([]);
    useEffect(() => {
        if (!link)
            return;
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
        });
        const normalizedRules = Array.isArray(link.geoRules)
            ? link.geoRules.map(rule => {
                const source = rule;
                return {
                    priority: Number(source.priority ?? 0),
                    scope: (source.scope === 'continent' ? 'continent' : 'country'),
                    target: String(source.target ?? ''),
                    url: String(source.url ?? '')
                };
            })
            : [];
        setGeoRules(normalizedRules);
    }, [link]);
    const updateMutation = useMutation({
        mutationFn: (payload) => updateLinkRequest(linkId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            queryClient.invalidateQueries({ queryKey: ['link', linkId] });
            push({ title: 'Modifications enregistrées' });
        }
    });
    const filteredProjects = useMemo(() => projects ?? [], [projects]);
    const filteredDomains = useMemo(() => domains ?? [], [domains]);
    const handleSubmit = async (event) => {
        event.preventDefault();
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
        });
    };
    const handleGeoRuleChange = (index, field, value) => {
        setGeoRules(prev => prev.map((rule, current) => current === index
            ? {
                ...rule,
                [field]: field === 'priority' ? Number(value) : value
            }
            : rule));
    };
    const addGeoRule = () => {
        setGeoRules(prev => [...prev, { priority: prev.length, scope: 'country', target: '', url: '' }]);
    };
    const removeGeoRule = (index) => {
        setGeoRules(prev => prev.filter((_, current) => current !== index));
    };
    if (isLoading) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx(Skeleton, { className: "h-20" }), _jsx(Skeleton, { className: "h-64" }), _jsx(Skeleton, { className: "h-96" })] }));
    }
    if (!link) {
        return (_jsx(EmptyState, { title: "Aucun lien s\u00E9lectionn\u00E9", description: "Choisissez un lien dans la vue Deeplinks pour configurer ses options." }));
    }
    const shareUrl = buildShareUrl(link.publicStatsToken);
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold text-slate-100", children: link.slug }), _jsx("p", { className: "mt-1 text-sm text-slate-400", children: link.originalUrl }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-xs", children: [_jsx(StatusBadge, { label: link.status, tone: link.status === 'archived' ? 'warning' : 'success' }), _jsx(StatusBadge, { label: link.publicStats ? 'Public stats' : 'Private', tone: link.publicStats ? 'success' : 'neutral' }), shareUrl && _jsx("code", { className: "rounded bg-slate-800/80 px-3 py-1 text-slate-300", children: shareUrl })] })] }), _jsx("button", { type: "submit", className: "inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 hover:bg-accent/90", children: "Enregistrer" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(Card, { title: "Destination", description: "URL d'origine et slug accessible", children: _jsxs("div", { className: "grid gap-4", children: [_jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Original URL", _jsx("input", { value: form.originalUrl, onChange: event => setForm(prev => ({ ...prev, originalUrl: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Slug", _jsx("input", { value: form.slug, onChange: event => setForm(prev => ({ ...prev, slug: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Domaine", _jsxs("select", { value: form.domain, onChange: event => setForm(prev => ({ ...prev, domain: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none", children: [_jsx("option", { value: "", children: t('deeplinks.search') }), filteredDomains.map(domain => (_jsx("option", { value: domain.domain, children: domain.domain }, domain.id)))] })] })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Commentaire / Notes", _jsx("textarea", { value: form.comment, onChange: event => setForm(prev => ({ ...prev, comment: event.target.value })), rows: 3, className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] })] }) }), _jsx(Card, { title: "Destination secondaire", description: "Expirations et redirections alternatives", children: _jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Expiration date", _jsx("input", { type: "datetime-local", value: form.expireAt, onChange: event => setForm(prev => ({ ...prev, expireAt: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Max clicks", _jsx("input", { type: "number", value: form.maxClicks, onChange: event => setForm(prev => ({ ...prev, maxClicks: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Fallback URL", _jsx("input", { value: form.fallbackUrl, onChange: event => setForm(prev => ({ ...prev, fallbackUrl: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none" })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Projet", _jsxs("select", { value: form.projectId, onChange: event => setForm(prev => ({ ...prev, projectId: event.target.value })), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:border-accent focus:outline-none", children: [_jsx("option", { value: "", children: "Aucun projet" }), filteredProjects.map(project => (_jsx("option", { value: project.id, children: project.name }, project.id)))] })] })] }) })] }), _jsx(Card, { title: "Ciblage g\u00E9ographique", description: "Dirigez vos utilisateurs vers des URL diff\u00E9rentes selon leur origine", actions: _jsx("button", { type: "button", onClick: addGeoRule, className: "rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent", children: "Ajouter une r\u00E8gle" }), children: geoRules.length === 0 ? (_jsx(EmptyState, { title: "Aucune r\u00E8gle encore", description: "Ajoutez des r\u00E8gles de redirection par pays ou continent pour personnaliser l'exp\u00E9rience utilisateur.", action: _jsx("button", { type: "button", onClick: addGeoRule, className: "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white", children: "Nouvelle r\u00E8gle" }) })) : (_jsx("div", { className: "space-y-3", children: geoRules.map((rule, index) => (_jsxs("div", { className: "grid gap-3 rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 md:grid-cols-[120px_160px_1fr_100px]", children: [_jsxs("select", { value: rule.scope, onChange: event => handleGeoRuleChange(index, 'scope', event.target.value), className: "rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "country", children: "Country" }), _jsx("option", { value: "continent", children: "Continent" })] }), _jsx("input", { value: rule.target, onChange: event => handleGeoRuleChange(index, 'target', event.target.value), placeholder: rule.scope === 'country' ? 'FR' : 'EU', className: "rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100" }), _jsx("input", { value: rule.url, onChange: event => handleGeoRuleChange(index, 'url', event.target.value), placeholder: "https://example.fr", className: "rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100" }), _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("input", { type: "number", value: rule.priority, onChange: event => handleGeoRuleChange(index, 'priority', event.target.value), className: "w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-100" }), _jsx("button", { type: "button", onClick: () => removeGeoRule(index), className: "rounded-md border border-rose-500/60 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20", children: "Supprimer" })] })] }, index))) })) }), _jsx(Card, { title: "Statistiques publiques", description: "Partagez vos analytics en mode public ou gardez-les priv\u00E9s", children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-slate-200", children: "Statistiques publiques" }), _jsx("p", { className: "text-xs text-slate-400", children: "Activez pour g\u00E9n\u00E9rer une URL partageable en lecture seule." })] }), _jsx("button", { type: "button", onClick: () => setForm(prev => ({ ...prev, publicStats: !prev.publicStats })), className: `rounded-full px-4 py-1 text-xs font-semibold ${form.publicStats ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`, children: form.publicStats ? 'Statistiques publiques' : 'Statistiques privées' })] }), shareUrl ? (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-xs text-slate-300", children: [_jsx("span", { children: shareUrl }), _jsx("button", { type: "button", onClick: () => navigator.clipboard.writeText(shareUrl), className: "rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-accent", children: "Copier" })] })) : (_jsx("p", { className: "text-xs text-slate-500", children: "Une URL sera g\u00E9n\u00E9r\u00E9e apr\u00E8s enregistrement." }))] }) })] }));
};
