interface StatusBadgeProps {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const toneClasses: Record<string, string> = {
  neutral: 'bg-slate-800/80 text-slate-200 border border-slate-700/70',
  success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
  warning: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
  danger: 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
}

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${toneClasses[tone]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {label}
  </span>
)
