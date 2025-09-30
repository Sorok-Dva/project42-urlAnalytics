import { useMemo, useState } from 'react'
import type { AnalyticsFilterGroup, AnalyticsFilters } from '../types'

interface AnalyticsFiltersPanelProps {
  groups: AnalyticsFilterGroup[]
  active: AnalyticsFilters
  onToggle: (groupId: keyof AnalyticsFilters, value: string) => void
  onClearGroup: (groupId: keyof AnalyticsFilters) => void
  onClearAll: () => void
}

const isSelected = (active: AnalyticsFilters, groupId: keyof AnalyticsFilters, value: string) => {
  const current = active[groupId]
  if (!Array.isArray(current)) return false
  return current.includes(value as never)
}

const hasSelection = (active: AnalyticsFilters, groupId: keyof AnalyticsFilters) => {
  const current = active[groupId]
  return Array.isArray(current) && current.length > 0
}

export const AnalyticsFiltersPanel = ({ groups, active, onToggle, onClearGroup, onClearAll }: AnalyticsFiltersPanelProps) => {
  const [query, setQuery] = useState('')

  const anyActive = Object.values(active).some(values => Array.isArray(values) && values.length > 0)
  const normalizedQuery = query.trim().toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups
    return groups
      .map(group => {
        const matchingOptions = group.options.filter(option => {
          const label = option.label.toLowerCase()
          const value = option.value.toLowerCase()
          return label.includes(normalizedQuery) || value.includes(normalizedQuery)
        })
        return {
          ...group,
          options: matchingOptions
        }
      })
      .filter(group => group.options.length > 0 || hasSelection(active, group.id))
  }, [groups, normalizedQuery, active])

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Filtres avancés</h3>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Rechercher un filtre"
            className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
        </div>
        {anyActive && (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-accent hover:text-accent"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {filteredGroups.length === 0 && (
          <p className="text-xs text-muted">Aucun filtre ne correspond à votre recherche.</p>
        )}
        {filteredGroups.map(group => (
          <div key={group.id as string} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
              <span>{group.label}</span>
              {hasSelection(active, group.id) && (
                <button
                  type="button"
                  onClick={() => onClearGroup(group.id)}
                  className="text-[10px] text-accent hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.length === 0 ? (
                <span className="text-[11px] text-slate-500">Aucun résultat pour cette recherche.</span>
              ) : (
                group.options.map(option => {
                  const selected = isSelected(active, group.id, option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onToggle(group.id, option.value)}
                      className={`rounded-full px-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        selected
                          ? 'bg-accent/20 text-accent ring-1 ring-accent/60'
                          : 'border border-slate-700 text-slate-300 hover:border-accent/40 hover:text-accent'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="ml-2 text-[10px] text-slate-400">
                        {option.count.toLocaleString('fr-FR')} ({option.percentage.toFixed(1)}%)
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
