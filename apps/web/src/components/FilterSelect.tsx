import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnalyticsFilterOption } from '../types'
import { Check, ChevronDown, X } from 'lucide-react'

interface FilterSelectProps {
  label: string
  options: AnalyticsFilterOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
}

const formatSummary = (selected: string[], options: AnalyticsFilterOption[]) => {
  if (selected.length === 0) return null
  if (selected.length === 1) {
    const match = options.find(option => option.value === selected[0])
    return match?.label ?? selected[0]
  }
  return `${selected.length} filtres`
}

export const FilterSelect = ({ label, options, value, onChange, placeholder = 'Sélectionner', disabled = false }: FilterSelectProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const normalized = query.trim().toLowerCase()
    return options.filter(option => option.label.toLowerCase().includes(normalized) || option.value.toLowerCase().includes(normalized))
  }, [options, query])

  const toggleValue = (candidate: string) => {
    if (value.includes(candidate)) {
      onChange(value.filter(entry => entry !== candidate))
    } else {
      onChange([...value, candidate])
    }
  }

  const handleClear = () => {
    if (value.length === 0) return
    onChange([])
  }

  const summary = formatSummary(value, options)

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-2 text-sm ${disabled ? 'opacity-50' : ''}`}>
      <span className="font-medium uppercase tracking-wide text-xs text-blue-300">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border border-blue-500/40 bg-slate-900/60 px-3 py-2 text-left text-blue-100 transition ${
          disabled ? 'cursor-not-allowed' : 'hover:border-blue-400/60 hover:text-white'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-xs text-blue-100/90">
          {summary ?? <span className="text-blue-300/70">{placeholder}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-blue-500/40 bg-slate-900/95 shadow-2xl ring-1 ring-blue-500/30">
          <div className="flex items-center justify-between gap-2 border-b border-blue-500/20 px-3 py-2">
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-md border border-blue-500/20 bg-slate-900 px-3 py-1.5 text-xs text-blue-100 placeholder:text-blue-300/60 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleClear}
              className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-wide transition ${
                value.length === 0
                  ? 'border-blue-500/10 text-blue-300/50'
                  : 'border-blue-500/40 text-blue-200 hover:border-blue-400 hover:text-white'
              }`}
              disabled={value.length === 0}
            >
              <span className="flex items-center gap-1">
                <X className="h-3 w-3" />
                Reset
              </span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-blue-300/70">Aucun résultat</div>
            ) : (
              filteredOptions.map(option => {
                const selected = value.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 transition ${
                      selected ? 'bg-blue-500/20 text-white' : 'text-blue-100 hover:bg-blue-500/10 hover:text-white'
                    }`}
                  >
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-[11px] text-blue-200/80">
                        {option.count.toLocaleString('fr-FR')} · {option.percentage.toFixed(1)}%
                      </span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-blue-300 bg-blue-500/60 text-white' : 'border-blue-500/30 text-transparent'}`}>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterSelect
