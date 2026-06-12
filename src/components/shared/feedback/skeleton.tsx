import React from "react"
import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-muted/70", className)}
      {...props}
    />
  )
}

interface TableSkeletonProps {
  rows?: number
  cols?: number
  className?: string
}

export function TableSkeleton({ rows = 5, cols = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-4 py-3", className)}>
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 px-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-5", 
              i === 0 ? "w-1/4 flex-none" : "flex-1",
              i === cols - 1 ? "w-20 flex-none" : ""
            )} 
          />
        ))}
      </div>
      
      {/* Divider */}
      <div className="border-t border-border/40" />
      
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex items-center gap-4 py-3 px-2 rounded-lg border border-border/10 bg-card/40"
          >
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4", 
                  colIndex === 0 ? "w-1/3 flex-none" : "flex-1",
                  colIndex === cols - 1 ? "w-16 flex-none h-6 rounded-lg" : ""
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border/40 bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-6 border-b border-border/40">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="space-y-2 w-full max-w-xs">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 shrink-0" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="p-4 rounded-xl border border-border/40 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <div className="border-t border-border/10 pt-3 flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border/10">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
