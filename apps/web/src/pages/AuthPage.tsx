import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../stores/auth'
import { registerRequest, fetchAuthFeatures } from '../api/auth'
import { Card } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { getApiErrorMessage } from '../lib/apiError'

export const AuthPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, token } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const envSignupDisabled = String(import.meta.env.VITE_DISABLE_SIGNUP ?? '').toLowerCase() === 'true'
  const [remoteSignupDisabled, setRemoteSignupDisabled] = useState(false)
  const signupDisabled = envSignupDisabled || remoteSignupDisabled

  const isFormValid = (() => {
    const email = form.email.trim()
    const password = form.password.trim()
    const name = form.name.trim()
    if (!email || !password) return false
    if (!email.includes('@')) return false
    if (mode === 'register') {
      if (signupDisabled) return false
      if (!name) return false
    }
    return true
  })()

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const email = form.email.trim()
    const password = form.password.trim()
    const name = form.name.trim()

    if (mode === 'register' && signupDisabled) {
      setError('Les inscriptions sont désactivées sur cette instance.')
      return
    }

    if (!email || !password || (mode === 'register' && !name)) {
      setError('Veuillez renseigner les champs requis')
      return
    }

    if (!email.includes('@')) {
      setError('Adresse e-mail invalide')
      return
    }

    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await registerRequest({ email, password, name })
        await login({ email, password })
      }
      navigate('/')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Authentication failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  useEffect(() => {
    let active = true
    const loadFeatures = async () => {
      try {
        const response = await fetchAuthFeatures()
        if (!active) return
        const disabled = Boolean(response?.features?.disableSignup)
        setRemoteSignupDisabled(disabled)
      } catch (error) {
        // swallow errors, features endpoint is optional
      }
    }
    loadFeatures()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (signupDisabled) {
      setMode('login')
    }
  }, [signupDisabled])

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1120] via-[#1b1640] to-[#2d0f3a] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(44,182,125,0.22),_transparent_50%)]" />
      <div className="pointer-events-none absolute -left-[20%] top-1/3 h-72 w-72 rounded-full bg-accent/40 blur-[140px]" />
      <div className="pointer-events-none absolute -right-[10%] bottom-1/4 h-64 w-64 rounded-full bg-emerald-500/30 blur-[160px]" />

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <div className="hidden flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 shadow-lg backdrop-blur-xl lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-accent">
              Deeplinks Insight par SorokDva
            </div>
            <h1 className="mt-6 text-4xl font-semibold text-white">La plateforme analytics pensée pour vos liens</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Centralisez la gestion de vos liens courts, suivez chaque interaction en temps réel et activez des scénarios de redirection intelligents pour vos campagnes.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <StatusBadge label="Temps réel" tone="success" />
              <span>Tableau de bord rafraîchi à chaque clic</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label="Équipes" tone="neutral" />
              <span>Espaces de travail et rôles pour toute l'organisation</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label="Automations" tone="warning" />
              <span>Redirections géo, QR codes et webhooks prêts à l'emploi</span>
            </div>
          </div>
        </div>

        <Card padding={false}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-10">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-accent">Deeplinks Insight</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{mode === 'login' ? t('auth.signin') : t('auth.signup')}</h2>
              <p className="mt-2 text-sm text-slate-400">Authentifiez-vous pour accéder à votre tableau de bord et analysez vos liens en direct.</p>
              {signupDisabled && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                  Inscriptions fermées par l'administrateur.
                </div>
              )}
            </div>

            {mode === 'register' && !signupDisabled && (
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nom complet
                <input
                  value={form.name}
                  onChange={event => handleChange('name', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('auth.email')}
              <input
                type="email"
                value={form.email}
                onChange={event => handleChange('email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('auth.password')}
              <input
                type="password"
                value={form.password}
                onChange={event => handleChange('password', event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </label>

            {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p>}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-accent/20 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Processing...' : mode === 'login' ? t('auth.signin') : t('auth.signup')}
            </button>

            {!signupDisabled && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{mode === 'login' ? "Besoin d'un compte ?" : 'Déjà inscrit ?'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setMode(mode === 'login' ? 'register' : 'login')
                  }}
                  className="text-accent hover:underline"
                >
                  {mode === 'login' ? t('auth.signup') : t('auth.signin')}
                </button>
              </div>
            )}

          </form>
        </Card>
      </div>
    </div>
  )
}
