import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLinks, createLinkRequest, archiveLinkRequest, unarchiveLinkRequest, deleteLinkRequest } from '../api/links';
import { useToast } from '../providers/ToastProvider';
import { fetchDomains } from '../api/domains';
import { getApiErrorMessage } from '../lib/apiError';
const sortOptions = [
    { value: 'recent', label: 'Most recent' },
    { value: 'performance', label: 'Performance' },
    { value: 'old', label: 'Most old' }
];
export const DeeplinksPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { push } = useToast();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [sort, setSort] = useState('recent');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ originalUrl: '', slug: '', domain: '' });
    const linksQuery = useQuery({
        queryKey: ['links', search, status, sort],
        queryFn: () => fetchLinks({ search, status, sort })
    });
    const domainsQuery = useQuery({ queryKey: ['domains'], queryFn: fetchDomains });
    const fallbackDomain = import.meta.env.VITE_DEFAULT_DOMAIN ?? 'url.p-42.fr';
    const publicBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL;
    const buildShortUrl = (link) => {
        const baseCandidate = link.domain?.domain || publicBaseUrl || fallbackDomain;
        if (!baseCandidate)
            return link.slug;
        const withProtocol = baseCandidate.startsWith('http') ? baseCandidate : `https://${baseCandidate}`;
        const normalized = withProtocol.replace(/\/+$/, '');
        return `${normalized}/${link.slug}`;
    };
    const handleCopy = async (link) => {
        const shortUrl = buildShortUrl(link);
        try {
            await navigator.clipboard.writeText(shortUrl);
            push({ title: t('deeplinks.copySuccess', 'Link copied'), description: shortUrl });
        }
        catch (error) {
            push({ title: t('deeplinks.copyError', 'Copy failed'), description: String(error) });
        }
    };
    const domainOptions = useMemo(() => {
        const provided = domainsQuery.data ?? [];
        if (!fallbackDomain)
            return provided;
        const map = new Map();
        provided.forEach(option => map.set(option.domain, option));
        if (!map.has(fallbackDomain)) {
            map.set(fallbackDomain, { id: 'default-domain', domain: fallbackDomain, status: 'verified' });
        }
        return Array.from(map.values());
    }, [domainsQuery.data, fallbackDomain]);
    const defaultDomain = domainOptions[0]?.domain ?? '';
    useEffect(() => {
        if (!form.domain && defaultDomain) {
            setForm(prev => ({ ...prev, domain: defaultDomain }));
        }
    }, [defaultDomain, form.domain]);
    const createMutation = useMutation({
        mutationFn: createLinkRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            setShowForm(false);
            setForm({ originalUrl: '', slug: '', domain: defaultDomain ?? '' });
            push({ title: 'Link created', description: 'Your short link is live' });
        },
        onError: error => {
            push({ title: 'Erreur lors de la création', description: getApiErrorMessage(error) });
        }
    });
    const archiveMutation = useMutation({
        mutationFn: archiveLinkRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            push({ title: 'Link archived' });
        },
        onError: error => {
            push({ title: 'Impossible d\'archiver', description: getApiErrorMessage(error) });
        }
    });
    const unarchiveMutation = useMutation({
        mutationFn: unarchiveLinkRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            push({ title: 'Link restored' });
        },
        onError: error => {
            push({ title: 'Impossible de restaurer', description: getApiErrorMessage(error) });
        }
    });
    const deleteMutation = useMutation({
        mutationFn: deleteLinkRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            push({ title: 'Link deleted' });
        },
        onError: error => {
            push({ title: 'Suppression impossible', description: getApiErrorMessage(error) });
        }
    });
    const filteredLinks = useMemo(() => linksQuery.data ?? [], [linksQuery.data]);
    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.originalUrl || !form.domain)
            return;
        await createMutation.mutateAsync({
            originalUrl: form.originalUrl,
            slug: form.slug || undefined,
            domain: form.domain,
            publicStats: false
        });
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('deeplinks.title') }), _jsx("p", { className: "text-sm text-muted", children: "Manage, filter and organise your links" })] }), _jsxs("div", { className: "ml-auto flex gap-2", children: [_jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: t('deeplinks.search'), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" }), _jsxs("select", { value: status, onChange: event => setStatus(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "archived", children: "Archived" }), _jsx("option", { value: "deleted", children: "Removed" })] }), _jsx("select", { value: sort, onChange: event => setSort(event.target.value), className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100", children: sortOptions.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { onClick: () => setShowForm(current => !current), className: "rounded-md bg-accent px-3 py-2 text-sm font-medium text-white", children: t('deeplinks.create') })] })] }), showForm && (_jsxs("form", { onSubmit: handleCreate, className: "grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 md:grid-cols-4", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs text-muted", children: "Original URL" }), _jsx("input", { value: form.originalUrl, onChange: event => setForm(prev => ({ ...prev, originalUrl: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", placeholder: "https://..." })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Slug" }), _jsx("input", { value: form.slug, onChange: event => setForm(prev => ({ ...prev, slug: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", placeholder: "my-awesome-link" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Domain" }), _jsx("select", { value: form.domain, onChange: event => setForm(prev => ({ ...prev, domain: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: domainOptions.map(domain => (_jsx("option", { value: domain.domain, children: domain.domain }, domain.id))) })] }), _jsxs("div", { className: "md:col-span-4 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowForm(false), className: "rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200", children: "Cancel" }), _jsx("button", { type: "submit", className: "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white", disabled: createMutation.isPending, children: "Save" })] })] })), _jsx("div", { className: "overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-800/60 text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-900/60", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-slate-300", children: "Slug" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-slate-300", children: "Original URL" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-slate-300", children: "Clicks" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-slate-300", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold text-slate-300", children: "Actions" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-800/60", children: [filteredLinks.map(link => (_jsxs("tr", { className: "hover:bg-slate-800/40", children: [_jsx("td", { className: "px-4 py-3 font-medium text-slate-200", children: link.slug }), _jsx("td", { className: "px-4 py-3 text-slate-300", children: link.originalUrl }), _jsx("td", { className: "px-4 py-3 text-slate-300", children: link.clickCount }), _jsx("td", { className: "px-4 py-3 text-xs uppercase text-muted", children: link.status }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [_jsx("button", { onClick: () => navigate(`/deeplinks/${link.id}`), className: "rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent", children: "Details" }), _jsx("button", { onClick: () => navigate(`/statistics/${link.id}`), className: "rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent", children: "Stats" }), _jsx("button", { onClick: () => handleCopy(link), className: "rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-accent", children: "Copy" }), link.status !== 'archived' ? (_jsx("button", { onClick: () => archiveMutation.mutate(link.id), className: "rounded border border-slate-700 px-2 py-1 text-yellow-300 hover:border-yellow-500", children: "Archive" })) : (_jsx("button", { onClick: () => unarchiveMutation.mutate(link.id), className: "rounded border border-slate-700 px-2 py-1 text-green-300 hover:border-green-500", children: "Unarchive" })), _jsx("button", { onClick: () => deleteMutation.mutate(link.id), className: "rounded border border-red-500/60 px-2 py-1 text-red-300 hover:bg-red-500/20", children: "Delete" })] }) })] }, link.id))), filteredLinks.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-6 text-center text-sm text-muted", children: "No links for this view" }) }))] })] }) })] }));
};
