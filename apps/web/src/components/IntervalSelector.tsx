import type { AggregationInterval } from '@p42/shared'

const intervals: AggregationInterval[] = ['all', '1y', '3m', '1m', '1w', '1d']

interface IntervalSelectorProps {
  value: AggregationInterval
  onChange: (value: AggregationInterval) => void
}

export const IntervalSelector = ({ value, onChange }: IntervalSelectorProps) => {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-xs">
      {intervals.map(option => (
        <button
          key={option}
          className={`rounded-full px-3 py-1 transition ${
            option === value ? 'bg-accent text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          onClick={() => onChange(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
