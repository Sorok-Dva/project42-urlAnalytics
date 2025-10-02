import type { DashboardTimeRange } from '@p42/shared'

const options: Array<{ value: DashboardTimeRange; label: string }> = [
  { value: '1min', label: '1 min' },
  { value: '5min', label: '5 min' },
  { value: '15min', label: '15 min' },
  { value: '30min', label: '30 min' },
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '12h', label: '12 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 jours' },
  { value: '14d', label: '14 jours' },
  { value: '1mo', label: '1 mois' },
  { value: '3mo', label: '3 mois' },
  { value: '6mo', label: '6 mois' },
  { value: '1y', label: '1 an' },
  { value: 'all', label: 'Tout' }
]

interface IntervalSelectorProps {
  value: DashboardTimeRange
  onChange: (value: DashboardTimeRange) => void
}

export const IntervalSelector = ({ value, onChange }: IntervalSelectorProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-xs">
      {options.map(option => (
        <button
          key={option.value}
          className={`rounded-full px-3 py-1 transition ${
            option.value === value ? 'bg-accent text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
