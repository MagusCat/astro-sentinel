import React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataTablePagination {
  currentPage: number
  totalPages: number
  totalCount?: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: {
    key: string
    header: string
    render?: (row: T) => React.ReactNode
    className?: string
  }[]
  keyExtractor: (row: T, index: number) => string | number
  emptyState?: React.ReactNode
  className?: string
  rowClassName?: (row: T) => string
  tableClassName?: string
  pagination?: DataTablePagination
}

/**
 * DataTable – tabla estilizada con headers fijos y estado vacio.
 *
 * Reemplaza las implementaciones inline de tablas repetidas en:
 *   client-registry.tsx, user-management.tsx, etc.
 */
export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyState,
  className,
  rowClassName,
  tableClassName,
  pagination,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn("w-full flex flex-col flex-1 min-h-0", className)}>
      {/* Phones and portrait tablets: one card per row, first column as the title */}
      <div className="md:hidden flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-3 stagger-children">
        {data.map((row, index) => (
          <div
            key={keyExtractor(row, index)}
            className={cn("rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-2", rowClassName && rowClassName(row))}
          >
            {columns.map((col, colIndex) => {
              const value = col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode
              if (colIndex === 0) {
                return <div key={col.key} className="text-base font-semibold text-foreground">{value}</div>
              }
              if (!col.header) {
                return <div key={col.key} className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border/40">{value}</div>
              }
              return (
                <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">{col.header}</span>
                  <span className="text-foreground/90 text-right min-w-0">{value}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="hidden md:block w-full overflow-auto flex-1 min-h-0">
        <table className={cn("w-full h-full text-left border-collapse text-xs relative", tableClassName || "min-w-max")}>
          <thead className="sticky top-0 z-10 shadow-sm bg-card">
            <tr className="bg-primary/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-sm font-semibold text-primary border-b border-border/60 border-r border-border/40 last:border-r-0 whitespace-nowrap tracking-wide",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  rowClassName && rowClassName(row)
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 border-r border-border/40 last:border-r-0 text-sm text-foreground/90", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
            {/* Fila espaciadora para extender las líneas verticales hasta el final del contenedor */}
            <tr className="h-full">
              {columns.map((col, i) => (
                <td key={`filler-${i}`} className="border-r border-border/40 last:border-r-0 p-0 m-0" />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-t border-border/40 bg-muted/5 mt-auto shrink-0">
          <span className="text-sm font-medium text-muted-foreground">
            Mostrando página {pagination.currentPage} de {pagination.totalPages}
            {pagination.totalCount !== undefined && ` (${pagination.totalCount} registros)`}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              aria-label="Página anterior"
              disabled={pagination.currentPage === 1 || pagination.disabled}
              className="size-10 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              aria-label="Página siguiente"
              disabled={pagination.currentPage === pagination.totalPages || pagination.disabled}
              className="size-10 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

