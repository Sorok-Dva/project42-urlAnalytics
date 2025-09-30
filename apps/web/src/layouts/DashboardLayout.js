import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';
import { useTheme } from '../providers/ThemeProvider';
import { setAuthToken } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
const navItems = [
    { to: '/', key: 'nav.home', icon: '🏠' },
    { to: '/statistics', key: 'nav.statistics', icon: '📊' },
    { to: '/deeplinks', key: 'nav.deeplinks', icon: '🔗' },
    { to: '/qr-codes', key: 'nav.qr', icon: '🌀' }
];
export const DashboardLayout = () => {
    const { t } = useTranslation();
    const { token, logout, loadSession, user, workspaceId } = useAuth();
    const { theme, toggle } = useTheme();
    useEffect(() => {
        loadSession();
    }, [loadSession]);
    useEffect(() => {
        setAuthToken(token);
    }, [token]);
    return (_jsxs("div", { className: "relative flex min-h-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e1b4b] text-slate-100", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(44,182,125,0.15),_transparent_40%)]" }), _jsxs("aside", { className: "relative z-10 flex w-72 flex-col border-r border-white/5 bg-white/5/ backdrop-blur-xl", children: [_jsxs("div", { className: "px-6 pb-6 pt-8", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent", children: "P42" }), _jsx("span", { className: "text-sm text-slate-400", children: "MIR-ALPHA" })] }), _jsx("h1", { className: "mt-4 text-2xl font-semibold text-white", children: t('app.name') }), _jsx("p", { className: "mt-2 text-xs text-slate-400", children: "Metric Intelligence & Redirection Hub" }), user && (_jsxs("div", { className: "mt-6 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs", children: [_jsx("p", { className: "font-medium text-slate-200", children: user.name }), _jsx("p", { className: "text-slate-400", children: user.email }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(StatusBadge, { label: "Workspace", tone: "neutral" }), workspaceId && _jsx("code", { className: "rounded bg-black/40 px-2 py-1 text-[10px] text-slate-300", children: workspaceId.slice(0, 8) })] })] }))] }), _jsx("nav", { className: "flex flex-1 flex-col gap-1 px-4", children: navItems.map(item => (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                ? 'bg-accent/20 text-accent shadow-inner shadow-accent/20'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'}`, end: item.to === '/', children: [_jsx("span", { className: "text-lg leading-none", children: item.icon }), t(item.key)] }, item.to))) }), _jsxs("div", { className: "mt-auto space-y-3 px-4 pb-8", children: [_jsx("button", { onClick: toggle, className: "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10", children: theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre' }), _jsx("button", { onClick: logout, className: "w-full rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20", children: t('nav.logout') })] })] }), _jsxs("main", { className: "relative z-10 flex flex-1 flex-col", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-white/5 bg-white/5 px-10 py-6 backdrop-blur-xl", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.4em] text-accent", children: "P42 MIR-ALPHA" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold text-white", children: "Command Center" })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]" }), _jsx("span", { children: "Realtime analytics synchronised" })] })] }), _jsx("section", { className: "flex-1 overflow-y-auto px-10 py-8", children: _jsx(Outlet, {}) })] })] }));
};
