import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageLoadingProps {
  message?: string
  className?: string
}

export function PageLoading({
  message = '加载中…',
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground',
        className,
      )}
    >
      <Loader2Icon className="size-8 animate-spin" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  )
}

interface PageErrorProps {
  title?: string
  message: string
  detail?: string
  onRetry?: () => void
  onBack?: () => void
  className?: string
}

export function PageError({
  title = '出错了',
  message,
  detail,
  onRetry,
  onBack,
  className,
}: PageErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center',
        className,
      )}
    >
      <AlertCircleIcon className="size-10 text-destructive" aria-hidden />
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        {detail && (
          <p className="break-all text-xs text-muted-foreground/80">{detail}</p>
        )}
      </div>
      {(onRetry || onBack) && (
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              重试
            </Button>
          )}
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              返回书库
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface EmptySearchProps {
  query: string
  className?: string
}

export function EmptySearch({ query, className }: EmptySearchProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground',
        className,
      )}
    >
      <p className="text-sm">没有找到与「{query}」相关的书籍</p>
      <p className="text-xs">试试其他关键词，或清空搜索框</p>
    </div>
  )
}
