import React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: React.ReactNode
  containerClassName?: string
}

/**
 * SearchInput – barra de busqueda con icono Search integrado.
 *
 * Reemplaza las instancias repetidas de:
 *   <div className="relative w-full sm:max-w-xs">
 *     <Search className="absolute left-3 top-3 ..." />
 *     <input ... />
 *   </div>
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ icon, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("relative w-full sm:max-w-xs", containerClassName)}>
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          ref={ref}
          className={cn(
            "w-full text-sm pl-9 pr-3 h-10 py-2 rounded-lg border border-border/60 bg-card hover:border-border focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all text-foreground",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"
