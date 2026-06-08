import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(d|h|m|s)$/)
  if (!match) return parseInt(duration, 10) || 604800
  const val = parseInt(match[1], 10)
  const unit = match[2]
  if (unit === 'd') return val * 24 * 60 * 60
  if (unit === 'h') return val * 60 * 60
  if (unit === 'm') return val * 60
  return val
}
