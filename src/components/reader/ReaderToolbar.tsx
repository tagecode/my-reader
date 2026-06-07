import {
  ArrowLeftIcon,
  BookmarkPlusIcon,
  ListIcon,
  Settings2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn, formatPercent } from '@/lib/utils'
import type { Book } from '@/types/electron'

interface ReaderToolbarProps {
  book: Book
  subtitle?: string
  progressPercent: number
  onBack: () => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  onAddBookmark?: () => void
  onToggleSettings?: () => void
}

export function ReaderToolbar({
  book,
  subtitle,
  progressPercent,
  onBack,
  onToggleSidebar,
  sidebarOpen,
  onAddBookmark,
  onToggleSettings,
}: ReaderToolbarProps) {
  const { t } = useTranslation()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        aria-label={t('reader.backToLibrary')}
      >
        <ArrowLeftIcon />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-medium">{book.title}</h1>
        <p className="truncate text-xs text-muted-foreground">
          {subtitle ?? book.author ?? t('common.unknownAuthor')} ·{' '}
          {formatPercent(progressPercent)}
        </p>
      </div>
      {onAddBookmark && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddBookmark}
          aria-label={t('reader.addBookmark')}
        >
          <BookmarkPlusIcon />
        </Button>
      )}
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={t('reader.sidebar')}
          className={cn(sidebarOpen && 'bg-accent')}
        >
          <ListIcon />
        </Button>
      )}
      {onToggleSettings && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSettings}
          aria-label={t('reader.readerSettings')}
        >
          <Settings2Icon />
        </Button>
      )}
    </header>
  )
}
