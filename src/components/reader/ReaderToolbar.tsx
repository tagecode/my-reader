import {
  ArrowLeftIcon,
  ListIcon,
  Settings2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPercent } from '@/lib/utils'
import type { Book } from '@/types/electron'

interface ReaderToolbarProps {
  book: Book
  subtitle?: string
  progressPercent: number
  onBack: () => void
  onToggleToc?: () => void
  onToggleSettings?: () => void
  showToc?: boolean
}

export function ReaderToolbar({
  book,
  subtitle,
  progressPercent,
  onBack,
  onToggleToc,
  onToggleSettings,
  showToc,
}: ReaderToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="返回书库">
        <ArrowLeftIcon />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-medium">{book.title}</h1>
        <p className="truncate text-xs text-muted-foreground">
          {subtitle ?? book.author ?? '未知作者'} · {formatPercent(progressPercent)}
        </p>
      </div>
      {showToc && onToggleToc && (
        <Button variant="ghost" size="icon" onClick={onToggleToc} aria-label="目录">
          <ListIcon />
        </Button>
      )}
      {onToggleSettings && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSettings}
          aria-label="阅读设置"
        >
          <Settings2Icon />
        </Button>
      )}
    </header>
  )
}
