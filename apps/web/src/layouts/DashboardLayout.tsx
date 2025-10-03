import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../stores/auth'
import { useTheme } from '../providers/ThemeProvider'
import { setAuthToken } from '../api/client'
import { StatusBadge } from '../components/StatusBadge'

const navItems = [
  { to: '/', key: 'nav.home', icon: '🏠' },
  { to: '/statistics', key: 'nav.statistics', icon: '📊' },
  { to: '/deeplinks', key: 'nav.deeplinks', icon: '🔗' },
  { to: '/qr-codes', key: 'nav.qr', icon: '🌀' }
]

export const DashboardLayout = () => {
  const { t } = useTranslation()
  const { token, logout, loadSession, user, workspaceId } = useAuth()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  return (
    <div className="relative flex h-screen bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e1b4b] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(127,90,240,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(44,182,125,0.15),_transparent_40%)]" />
      <aside className="relative z-10 flex h-full w-72 flex-col overflow-hidden border-r border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="flex-shrink-0 px-6 pb-6 pt-8">
          <img
            src="/logo192.png"
            alt={t('app.name')}
            className="mt-4 h-12 w-auto drop-shadow-[0_8px_20px_rgba(127,90,240,0.35)]"
          />
          <p className="mt-2 text-xs text-slate-400">Centre d’Analyse des Métriques et de Redirection</p>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">Développé par <a href="https://p-42.fr/sorok-from-deeplinks">SorokDva</a></div>
          </div>
          {user && (
            <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs">
              <p className="font-medium text-slate-200">{user.name}</p>
              <p className="text-slate-400">{user.email}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label="Workspace" tone="neutral" />
                {workspaceId && <code className="rounded bg-black/40 px-2 py-1 text-[10px] text-slate-300">{workspaceId.slice(0, 8)}</code>}
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-6">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/20 text-accent shadow-inner shadow-accent/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
              end={item.to === '/'}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex-shrink-0 space-y-3 px-4 pb-8 pt-4">
          <button
            onClick={toggle}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            {theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
          </button>
          <button
            onClick={logout}
            className="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>
      <main className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/5 bg-white/5 px-10 py-6 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-accent">Deeeplinks Analytics</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tableau de bord</h2>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]" />
            <span>Realtime analytics synchronised</span>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto px-10 py-8">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
