import type { ReactNode } from 'react'
interface MetricCardProps {
  label: string
  value: string | number
  trend?: string
  action?: ReactNode
}

export const MetricCard = ({ label, value, trend, action }: MetricCardProps) => {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {action}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-100">{value}</div>
      {trend && <div className="mt-1 text-xs text-accent">{trend}</div>}
    </div>
  )
}
