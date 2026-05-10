'use client'

import { cn } from '@/lib/utils'

interface AbstentionDotsProps {
  total: number
  used: number
}

export function AbstentionDots({ total, used }: AbstentionDotsProps) {
  if (total === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Astensioni:</span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              i < used ? 'bg-black/20 dark:bg-white/20' : 'bg-accent'
            )}
          />
        ))}
      </div>
    </div>
  )
}
