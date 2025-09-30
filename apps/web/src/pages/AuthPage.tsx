import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../stores/auth'
import { registerRequest } from '../api/auth'
import { Card } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'

export const AuthPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, token } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        await registerRequest({ email: form.email, password: form.password, name: form.name })
        await login({ email: form.email, password: form.password })
      }
      navigate('/')
    } catch (err) {
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1120] via-[#1b1640] to-[#2d0f3a] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(44,182,125,0.22),_transparent_50%)]" />
      <div className="pointer-events-none absolute -left-[20%] top-1/3 h-72 w-72 rounded-full bg-accent/40 blur-[140px]" />
      <div className="pointer-events-none absolute -right-[10%] bottom-1/4 h-64 w-64 rounded-full bg-emerald-500/30 blur-[160px]" />

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <div className="hidden flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 shadow-lg backdrop-blur-xl lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-accent">
              MIR-ALPHA
            </div>
            <h1 className="mt-6 text-4xl font-semibold text-white">Metric Intelligence Radar</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {t('auth.subtitle')} • Optimisez vos campagnes avec des analytics ultra rapides, un ciblage géographique avancé et des QR codes design synchronisés en temps réel.
            </p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <StatusBadge label="Realtime" tone="success" />
              <span>Socket.io push analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label="Multi-workspace" tone="neutral" />
              <span>Roles &amp; access control out of the box</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label="MIR-ALPHA" tone="warning" />
              <span>Link intelligence tailored for scale</span>
            </div>
          </div>
        </div>

        <Card padding={false}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-10">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-accent">P42 | MIR-ALPHA</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{mode === 'login' ? t('auth.signin') : t('auth.signup')}</h2>
              <p className="mt-2 text-sm text-slate-400">{t('auth.subtitle')}</p>
            </div>

            {mode === 'register' && (
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nom complet
                <input
                  value={form.name}
                  onChange={event => handleChange('name', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-accent focus:outline-none"
                  placeholder="Jane Doe"
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
              />
            </label>

            {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-accent/20 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Processing...' : mode === 'login' ? t('auth.signin') : t('auth.signup')}
            </button>

            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{mode === 'login' ? "Besoin d'un compte ?" : 'Déjà inscrit ?'}</span>
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-accent hover:underline">
                {mode === 'login' ? t('auth.signup') : t('auth.signin')}
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 transition hover:border-accent"
              >
                {t('auth.oauthGithub')}
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 transition hover:border-accent"
              >
                {t('auth.oauthDiscord')}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
