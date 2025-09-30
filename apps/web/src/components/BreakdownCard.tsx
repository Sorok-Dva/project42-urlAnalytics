import type { ReactNode } from 'react'

interface BreakdownItem {
  label: string
  total: number
  percentage: number
  value?: string
}

interface BreakdownCardProps {
  title: string
  items: BreakdownItem[]
  maxItems?: number
  emptyLabel?: string
  footer?: ReactNode
}

const numberFormatter = new Intl.NumberFormat('fr-FR')

export const BreakdownCard = ({ title, items, maxItems = 6, emptyLabel = 'Aucune donnée', footer }: BreakdownCardProps) => {
  const visible = items.slice(0, maxItems)

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      {visible.length === 0 ? (
        <p className="mt-4 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {visible.map(item => (
            <li key={`${item.label}-${item.value ?? item.label}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-200">{item.label}</span>
                <span className="whitespace-nowrap text-slate-300">
                  {numberFormatter.format(item.total)} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70">
                <div
                  className="h-full rounded-full bg-accent/80"
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-4 text-xs text-muted">{footer}</div>}
    </div>
  )
}
