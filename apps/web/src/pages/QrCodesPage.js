import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchQrCodes, createQrCode, downloadQrCode } from '../api/qr';
import { useToast } from '../providers/ToastProvider';
import { fetchLinks } from '../api/links';
import { fetchDomains } from '../api/domains';
export const QrCodesPage = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { push } = useToast();
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('url');
    const [form, setForm] = useState({ name: '', originalUrl: '', linkId: '', design: 'dots', domain: '' });
    const qrQuery = useQuery({ queryKey: ['qr', search], queryFn: () => fetchQrCodes({ search }) });
    const linkQuery = useQuery({ queryKey: ['links'], queryFn: () => fetchLinks({ status: 'active' }) });
    const domainsQuery = useQuery({ queryKey: ['domains'], queryFn: fetchDomains });
    useEffect(() => {
        if (!form.domain && domainsQuery.data?.length) {
            setForm(prev => ({ ...prev, domain: domainsQuery.data[0].domain }));
        }
    }, [domainsQuery.data]);
    const createMutation = useMutation({
        mutationFn: createQrCode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr'] });
            setForm({ name: '', originalUrl: '', linkId: '', design: 'dots', domain: domainsQuery.data?.[0]?.domain ?? '' });
            push({ title: 'QR generated', description: 'Ready to share or download' });
        }
    });
    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.name)
            return;
        if (tab === 'url' && (!form.originalUrl || !form.domain))
            return;
        if (tab === 'link' && !form.linkId)
            return;
        await createMutation.mutateAsync(tab === 'url'
            ? { name: form.name, originalUrl: form.originalUrl, domain: form.domain, design: { preset: form.design } }
            : { name: form.name, linkId: form.linkId, design: { preset: form.design } });
    };
    const handleDownload = async (id, name) => {
        const svg = await downloadQrCode(id);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: t('qr.title') }), _jsx("p", { className: "text-sm text-muted", children: "Branded QR codes with analytics" })] }), _jsx("div", { className: "ml-auto flex gap-2", children: _jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: "Search", className: "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" }) })] }), _jsxs("form", { onSubmit: handleCreate, className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 text-sm", children: [_jsx("button", { type: "button", onClick: () => setTab('url'), className: `rounded-full px-4 py-1 ${tab === 'url' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`, children: "From URL" }), _jsx("button", { type: "button", onClick: () => setTab('link'), className: `rounded-full px-4 py-1 ${tab === 'link' ? 'bg-accent text-white' : 'border border-slate-700 text-slate-200'}`, children: "From Link" })] }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Name" }), _jsx("input", { value: form.name, onChange: event => setForm(prev => ({ ...prev, name: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" })] }), tab === 'url' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs text-muted", children: "Original URL" }), _jsx("input", { value: form.originalUrl, onChange: event => setForm(prev => ({ ...prev, originalUrl: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Domain" }), _jsx("select", { value: form.domain, onChange: event => setForm(prev => ({ ...prev, domain: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: domainsQuery.data?.map(domain => (_jsx("option", { value: domain.domain, children: domain.domain }, domain.id))) })] })] })) : (_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "text-xs text-muted", children: "Link" }), _jsxs("select", { value: form.linkId, onChange: event => setForm(prev => ({ ...prev, linkId: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "", children: "Select link" }), linkQuery.data?.map(link => (_jsx("option", { value: link.id, children: link.slug }, link.id)))] })] })), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Design" }), _jsxs("select", { value: form.design, onChange: event => setForm(prev => ({ ...prev, design: event.target.value })), className: "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100", children: [_jsx("option", { value: "dots", children: "Dots" }), _jsx("option", { value: "square", children: "Square" }), _jsx("option", { value: "mono", children: "Mono" })] })] })] }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { type: "submit", className: "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white", disabled: createMutation.isPending, children: t('qr.create') }) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [qrQuery.data?.map(qr => (_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-100", children: qr.name }), _jsxs("span", { className: "text-xs text-muted", children: [qr.totalScans, " scans"] })] }), _jsx("div", { className: "mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-800/60 p-6 text-center text-sm text-muted", children: "Preview unavailable in CLI" }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { onClick: () => handleDownload(qr.id, qr.name), className: "rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent", children: "Download" }), _jsx("button", { onClick: () => navigator.clipboard.writeText(`${import.meta.env.VITE_PUBLIC_BASE_URL ?? ''}/qr/${qr.code}`), className: "rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-accent", children: "Copy link" })] })] }, qr.id))), qrQuery.data?.length === 0 && _jsx("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted", children: "No QR codes yet" })] })] }));
};
