import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 px-10 py-16 text-center">
    <div className="rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">Deeplink</div>
    <div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
    </div>
    {action}
  </div>
)
