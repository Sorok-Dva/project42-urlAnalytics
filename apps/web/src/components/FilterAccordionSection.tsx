import type { ReactNode } from 'react'

interface FilterAccordionSectionProps {
  title: string
  description?: string
  contentClassName?: string
  children: ReactNode
}

export const FilterAccordionSection = ({ title, description, contentClassName, children }: FilterAccordionSectionProps) => (
  <div className="space-y-3 rounded-xl border border-blue-500/20 bg-slate-900/60 p-4">
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-200">{title}</h4>
      {description && <p className="mt-1 text-[11px] text-blue-300/80">{description}</p>}
    </div>
    <div className={contentClassName ?? 'space-y-3'}>{children}</div>
  </div>
)

export default FilterAccordionSection
