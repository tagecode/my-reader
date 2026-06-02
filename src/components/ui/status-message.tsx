import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant = 'info' | 'success' | 'warning' | 'error'

const variantClass: Record<StatusVariant, string> = {
  info: 'bg-muted text-foreground',
  success: 'border border-primary/20 bg-primary/10 text-foreground',
  warning:
    'border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
  error: 'border border-destructive/30 bg-destructive/10 text-destructive',
}

interface StatusMessageProps {
  variant?: StatusVariant
  title?: string
  children: ReactNode
  className?: string
}

export function StatusMessage({
  variant = 'info',
  title,
  children,
  className,
}: StatusMessageProps) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-md px-3 py-2 text-sm',
        variantClass[variant],
        className,
      )}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      <div className="text-[0.8125rem] leading-relaxed">{children}</div>
    </div>
  )
}
