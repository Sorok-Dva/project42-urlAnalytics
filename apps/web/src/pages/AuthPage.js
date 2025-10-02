import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';
import { registerRequest, fetchAuthFeatures } from '../api/auth';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { getApiErrorMessage } from '../lib/apiError';
export const AuthPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, token } = useAuth();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signupDisabled, setSignupDisabled] = useState(false);
    const isFormValid = (() => {
        const email = form.email.trim();
        const password = form.password.trim();
        const name = form.name.trim();
        if (!email || !password)
            return false;
        if (!email.includes('@'))
            return false;
        if (mode === 'register') {
            if (signupDisabled)
                return false;
            if (!name)
                return false;
        }
        return true;
    })();
    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        const email = form.email.trim();
        const password = form.password.trim();
        const name = form.name.trim();
        if (mode === 'register' && signupDisabled) {
            setError('Les inscriptions sont désactivées sur cette instance.');
            return;
        }
        if (!email || !password || (mode === 'register' && !name)) {
            setError('Veuillez renseigner les champs requis');
            return;
        }
        if (!email.includes('@')) {
            setError('Adresse e-mail invalide');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (mode === 'login') {
                await login({ email, password });
            }
            else {
                await registerRequest({ email, password, name });
                await login({ email, password });
            }
            navigate('/');
        }
        catch (err) {
            setError(getApiErrorMessage(err, 'Authentication failed'));
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (token)
            navigate('/');
    }, [token, navigate]);
    useEffect(() => {
        let active = true;
        const loadFeatures = async () => {
            try {
                const response = await fetchAuthFeatures();
                if (!active)
                    return;
                const disabled = Boolean(response?.features?.disableSignup);
                setSignupDisabled(disabled);
                if (disabled) {
                    setMode('login');
                }
            }
            catch (error) {
                // swallow errors, features endpoint is optional
            }
        };
        loadFeatures();
        return () => {
            active = false;
        };
    }, []);
    return (_jsxs("div", { className: "relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1120] via-[#1b1640] to-[#2d0f3a] px-6 py-12 text-slate-100", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(44,182,125,0.22),_transparent_50%)]" }), _jsx("div", { className: "pointer-events-none absolute -left-[20%] top-1/3 h-72 w-72 rounded-full bg-accent/40 blur-[140px]" }), _jsx("div", { className: "pointer-events-none absolute -right-[10%] bottom-1/4 h-64 w-64 rounded-full bg-emerald-500/30 blur-[160px]" }), _jsxs("div", { className: "relative grid w-full max-w-5xl gap-8 lg:grid-cols-2", children: [_jsxs("div", { className: "hidden flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 shadow-lg backdrop-blur-xl lg:flex", children: [_jsxs("div", { children: [_jsx("div", { className: "inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-accent", children: "MIR-ALPHA" }), _jsx("h1", { className: "mt-6 text-4xl font-semibold text-white", children: "Metric Intelligence Radar" }), _jsxs("p", { className: "mt-4 text-sm leading-relaxed text-slate-300", children: [t('auth.subtitle'), " \u2022 Optimisez vos campagnes avec des analytics ultra rapides, un ciblage g\u00E9ographique avanc\u00E9 et des QR codes design synchronis\u00E9s en temps r\u00E9el."] })] }), _jsxs("div", { className: "mt-10 space-y-4 text-sm text-slate-300", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusBadge, { label: "Realtime", tone: "success" }), _jsx("span", { children: "Socket.io push analytics" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusBadge, { label: "Multi-workspace", tone: "neutral" }), _jsx("span", { children: "Roles & access control out of the box" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusBadge, { label: "MIR-ALPHA", tone: "warning" }), _jsx("span", { children: "Link intelligence tailored for scale" })] })] })] }), _jsx(Card, { padding: false, children: _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-6 p-10", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.4em] text-accent", children: "P42 | MIR-ALPHA" }), _jsx("h2", { className: "mt-2 text-3xl font-semibold text-white", children: mode === 'login' ? t('auth.signin') : t('auth.signup') }), _jsx("p", { className: "mt-2 text-sm text-slate-400", children: t('auth.subtitle') }), signupDisabled && (_jsx("div", { className: "mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200", children: "Inscriptions ferm\u00E9es par l'administrateur." }))] }), mode === 'register' && !signupDisabled && (_jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: ["Nom complet", _jsx("input", { value: form.name, onChange: event => handleChange('name', event.target.value), className: "mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none", placeholder: "Jane Doe", autoComplete: "name", required: true })] })), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: [t('auth.email'), _jsx("input", { type: "email", value: form.email, onChange: event => handleChange('email', event.target.value), className: "mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none", placeholder: "you@example.com", autoComplete: "email", required: true })] }), _jsxs("label", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: [t('auth.password'), _jsx("input", { type: "password", value: form.password, onChange: event => handleChange('password', event.target.value), className: "mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: mode === 'login' ? 'current-password' : 'new-password', minLength: 6, required: true })] }), error && _jsx("p", { className: "rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200", children: error }), _jsx("button", { type: "submit", disabled: loading || !isFormValid, className: "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-accent/20 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60", children: loading ? 'Processing...' : mode === 'login' ? t('auth.signin') : t('auth.signup') }), _jsxs("div", { className: "flex items-center justify-between text-sm text-slate-400", children: [_jsx("span", { children: signupDisabled
                                                ? 'Les inscriptions sont désactivées.'
                                                : mode === 'login'
                                                    ? "Besoin d'un compte ?"
                                                    : 'Déjà inscrit ?' }), !signupDisabled && (_jsx("button", { type: "button", onClick: () => {
                                                setError(null);
                                                setMode(mode === 'login' ? 'register' : 'login');
                                            }, className: "text-accent hover:underline", children: mode === 'login' ? t('auth.signup') : t('auth.signin') }))] }), _jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("button", { type: "button", className: "w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 transition hover:border-accent", children: t('auth.oauthGithub') }), _jsx("button", { type: "button", className: "w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 transition hover:border-accent", children: t('auth.oauthDiscord') })] })] }) })] })] }));
};
