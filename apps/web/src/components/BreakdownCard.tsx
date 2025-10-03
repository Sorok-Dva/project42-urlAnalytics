
import type { ReactNode } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import type { LegendProps } from 'recharts'

const numberFormatter = new Intl.NumberFormat('fr-FR')
const palette = ['#38bdf8', '#7f5af0', '#ec4899', '#f97316', '#22c55e', '#facc15', '#a855f7', '#14b8a6'] as const

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
  variant?: 'bar' | 'pie'
}

export const BreakdownCard = ({
  title,
  items,
  maxItems = 6,
  emptyLabel = 'Aucune donnée',
  footer,
  variant = 'bar'
}: BreakdownCardProps) => {
  const visible = items.slice(0, maxItems)
  const chartData = visible.map(item => ({
    ...item,
    percentageLabel: `${item.percentage.toFixed(1)}%`
  }))

  const renderBarChart = () => (
    <ResponsiveContainer>
      <BarChart layout="vertical" data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 12 }}>
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
            fill="#e2e8f0"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  const BreakdownLegend = ({ payload }: LegendProps) => {
    if (!payload) return null
    return (
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-slate-200">
        {payload.map(entry => {
          const label = typeof entry.value === 'string' ? entry.value : String(entry.value ?? '—')
          return (
            <span key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color ?? '#94a3b8' }} />
              <span>{label}</span>
            </span>
          )
        })}
      </div>
    )
  }

  const renderPieChart = () => (
    <ResponsiveContainer>
      <RechartsPieChart>
        <Tooltip
          cursor={false}
          contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
          formatter={(value: number | string, _name, entry) => {
            const raw = typeof value === 'number' ? value : Number(value ?? 0)
            const percentage = entry?.payload?.percentage ?? 0
            return [`${numberFormatter.format(raw)} (${percentage.toFixed(1)}%)`, entry?.payload?.label ?? '']
          }}
        />
        <Legend verticalAlign="bottom" height={40} content={<BreakdownLegend />} />
        <Pie data={chartData} dataKey="total" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={4}>
          {chartData.map((entry, index) => (
            <Cell key={entry.value ?? index} fill={palette[index % palette.length]} />
          ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  )

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6">
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      {visible.length === 0 ? (
        <p className="mt-4 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 h-64">{variant === 'pie' ? renderPieChart() : renderBarChart()}</div>
      )}
      {footer && <div className="mt-4 text-xs text-muted">{footer}</div>}
    </div>
  )
}
