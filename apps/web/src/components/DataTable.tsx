import type { ReactNode } from 'react'

interface Column<T> {
  key: keyof T
  label: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
}

export const DataTable = <T extends Record<string, unknown>>({ data, columns, emptyMessage }: DataTableProps<T>) => {
  if (data.length === 0) {
    return <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted">{emptyMessage ?? 'No data'}</div>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/40">
      <table className="min-w-full divide-y divide-slate-800/50 text-sm">
        <thead className="bg-slate-900/60">
          <tr>
            {columns.map(column => (
              <th key={String(column.key)} className="px-4 py-3 text-left font-semibold text-slate-300">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-slate-800/40">
              {columns.map(column => (
                <td key={String(column.key)} className="px-4 py-3 text-slate-200">
                  {column.render ? column.render(row) : (row[column.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
