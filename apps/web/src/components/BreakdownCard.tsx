import type { ReactNode } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, CartesianGrid } from 'recharts'

const numberFormatter = new Intl.NumberFormat('fr-FR')

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

export const BreakdownCard = ({ title, items, maxItems = 6, emptyLabel = 'Aucune donnée', footer }: BreakdownCardProps) => {
  const visible = items.slice(0, maxItems)
  const chartData = visible.map(item => ({
    ...item,
    percentageLabel: `${item.percentage.toFixed(1)}%`
  }))

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      {visible.length === 0 ? (
        <p className="mt-4 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 12, right: 24, left: 0, bottom: 12 }}
            >
              <CartesianGrid horizontal={false} stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={value => numberFormatter.format(Number(value))}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={140}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: '#0f172a' }}
                contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number | string, _name, entry) => {
                  const raw = typeof value === 'number' ? value : Number(value ?? 0)
                  const percentage = entry?.payload?.percentage ?? 0
                  return [`${numberFormatter.format(raw)} (${percentage.toFixed(1)}%)`, entry?.payload?.label ?? '']
                }}
              />
              <Bar dataKey="total" fill="#38bdf8" radius={[0, 8, 8, 0]}>
                <LabelList
                  dataKey="percentage"
                  position="right"
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  className="fill-slate-200 text-[11px]"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {footer && <div className="mt-4 text-xs text-muted">{footer}</div>}
    </div>
  )
}
