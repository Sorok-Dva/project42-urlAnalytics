import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchQrCodes, createQrCode } from '../api/qr';
import { useToast } from '../providers/ToastProvider';
import { fetchLinks } from '../api/links';
import { fetchDomains } from '../api/domains';
import { getApiErrorMessage } from '../lib/apiError';
import { QrPreview } from '../components/QrPreview';
import { sanitizeDesign, downloadQr } from '../lib/qrDesign';
export const QrCodesPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { push } = useToast();
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('link');
    const [form, setForm] = useState({ name: '', originalUrl: '', linkId: '', domain: '' });
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin;
    const qrQuery = useQuery({ queryKey: ['qr', search], queryFn: () => fetchQrCodes({ search }) });
    const linkQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) });
    const domainsQuery = useQuery({ queryKey: ['domains'], queryFn: fetchDomains });
    const fallbackDomain = import.meta.env.VITE_DEFAULT_DOMAIN ?? 'url.p42.fr';
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
        mutationFn: createQrCode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr'] });
            setForm({ name: '', originalUrl: '', linkId: '', domain: defaultDomain ?? '' });
            push({ title: 'QR généré', description: 'Disponible pour partage ou téléchargement' });
        },
        onError: error => {
            push({ title: 'Impossible de générer le QR', description: getApiErrorMessage(error) });
        }
    });
    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.name)
            return;
        if (tab === 'url') {
            if (!form.originalUrl || !form.domain)
                return;
            await createMutation.mutateAsync({ name: form.name, originalUrl: form.originalUrl, domain: form.domain });
        }
        else {
            if (!form.linkId)
                return;
            await createMutation.mutateAsync({ name: form.name, linkId: form.linkId });
        }
    };
    const handleDownload = async (qr, format) => {
        const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`;
        await downloadQr(sanitizeDesign(qr.design), target, format, qr.name);
    };
    const handleCopy = async (qr) => {
        const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`;
        try {
            await navigator.clipboard.writeText(target);
            push({ title: t('deeplinks.copySuccess', 'Lien copié'), description: target });
        }
        catch (error) {
            push({ title: t('deeplinks.copyError', 'Erreur de copie'), description: String(error) });
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('qr.title') }), _jsx("p", { className: "text-sm text-muted", children: "G\u00E9n\u00E9rez des QR codes personnalis\u00E9s en temps r\u00E9el" })] }), _jsx("div", { className: "ml-auto flex gap-2", children: _jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: "Rechercher", className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" }) })] }), _jsxs("form", { onSubmit: handleCreate, className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsx("button", { type: "button", onClick: () => setTab('link'), className: `rounded-full px-4 py-1 ${tab === 'link' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`, children: "Depuis un lien" }), _jsx("button", { type: "button", onClick: () => setTab('url'), className: `rounded-full px-4 py-1 ${tab === 'url' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`, children: "Depuis une URL" })] }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Nom" }), _jsx("input", { value: form.name, onChange: event => setForm(prev => ({ ...prev, name: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" })] }), tab === 'url' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs text-muted", children: "URL d'origine" }), _jsx("input", { value: form.originalUrl, onChange: event => setForm(prev => ({ ...prev, originalUrl: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Domaine" }), _jsx("select", { value: form.domain, onChange: event => setForm(prev => ({ ...prev, domain: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: domainOptions.map(domain => (_jsx("option", { value: domain.domain, children: domain.domain }, domain.id))) })] })] })) : (_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs text-muted", children: "Lien" }), _jsxs("select", { value: form.linkId, onChange: event => setForm(prev => ({ ...prev, linkId: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "", children: "S\u00E9lectionner un lien" }), linkQuery.data?.map(link => (_jsx("option", { value: link.id, children: link.slug }, link.id)))] })] }))] }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { type: "submit", className: "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white", disabled: createMutation.isPending, children: t('qr.create') }) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [qrQuery.data?.map(qr => {
                        const design = sanitizeDesign(qr.design);
                        const target = `${baseUrl.replace(/\/$/, '')}/qr/${qr.code}`;
                        return (_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-100", children: qr.name }), _jsxs("span", { className: "text-xs text-muted", children: [qr.totalScans, " scans"] })] }), _jsx("div", { className: "mt-4 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 p-4", children: _jsx(QrPreview, { data: target, design: design, size: 180 }) }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => handleDownload(qr, 'png'), className: "rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent", children: "T\u00E9l\u00E9charger PNG" }), _jsx("button", { onClick: () => handleDownload(qr, 'svg'), className: "rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent", children: "T\u00E9l\u00E9charger SVG" }), _jsx("button", { onClick: () => handleCopy(qr), className: "rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent", children: "Copier le lien" }), _jsx("button", { onClick: () => navigate(`/qr-codes/${qr.id}/design`), className: "rounded-md border border-accent px-3 py-2 text-xs text-accent hover:bg-accent/10", children: "Personnaliser" })] })] }, qr.id));
                    }), qrQuery.data?.length === 0 && (_jsx("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted", children: "Aucun QR code pour le moment" }))] })] }));
};
export default QrCodesPage;
