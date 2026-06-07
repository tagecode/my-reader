import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageLoadingProps {
  message?: string
  hint?: string
  className?: string
}

export function PageLoading({
  message,
  hint,
  className,
}: PageLoadingProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground',
        className,
      )}
    >
      <Loader2Icon className="size-8 animate-spin" aria-hidden />
      <div className="flex max-w-sm flex-col items-center gap-1 text-center">
        <p className="text-sm">{message ?? t('common.loading')}</p>
        {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
      </div>
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
  title,
  message,
  detail,
  onRetry,
  onBack,
  className,
}: PageErrorProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center',
        className,
      )}
    >
      <AlertCircleIcon className="size-10 text-destructive" aria-hidden />
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-semibold">{title ?? t('page.errorTitle')}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        {detail && (
          <p className="break-all text-xs text-muted-foreground/80">{detail}</p>
        )}
      </div>
      {(onRetry || onBack) && (
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )}
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              {t('common.backToLibrary')}
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
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground',
        className,
      )}
    >
      <p className="text-sm">{t('search.noResults', { query })}</p>
      <p className="text-xs">{t('search.hint')}</p>
    </div>
  )
}
