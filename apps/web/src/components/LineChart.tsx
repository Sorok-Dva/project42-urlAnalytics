import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, Area } from 'recharts'
import type { AnalyticsPoint } from '../types'

interface Props {
  data: AnalyticsPoint[]
}

export const LineChart = ({ data }: Props) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RechartsLineChart data={data} margin={{ top: 12, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="p42Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7f5af0" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#7f5af0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide tick={{ fill: '#94a3b8' }} />
          <YAxis hide tick={{ fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Area type="monotone" dataKey="total" stroke="#7f5af0" fill="url(#p42Gradient)" />
          <Line type="monotone" dataKey="total" stroke="#7f5af0" strokeWidth={2} dot={false} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
