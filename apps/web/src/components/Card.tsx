import type { PropsWithChildren, ReactNode } from 'react'

interface CardProps extends PropsWithChildren {
  title?: string
  description?: string
  actions?: ReactNode
  padding?: boolean
}

export const Card = ({ title, description, actions, padding = true, children }: CardProps) => (
  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 backdrop-blur-sm shadow-lg shadow-slate-950/30">
    {(title || actions || description) && (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/60 px-6 py-4">
        <div>
          {title && <h3 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h3>}
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 text-xs text-slate-300">{actions}</div>}
      </div>
    )}
    <div className={padding ? 'p-6' : undefined}>{children}</div>
  </div>
)
