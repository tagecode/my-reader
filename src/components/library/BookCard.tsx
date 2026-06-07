import { BookOpenIcon, ListXIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BookCover } from '@/components/library/BookCover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatPercent } from '@/lib/utils'
import type { Book } from '@/types/electron'

interface BookCardProps {
  book: Book
  view: 'grid' | 'list'
  onOpen: (book: Book) => void
  onRemove?: (book: Book) => void
  onToggleFavorite?: (book: Book) => void
  /** 仅从最近阅读列表移除，不删除书库记录 */
  onClearRecent?: (book: Book) => void
  /** 最近阅读区：样式与操作与书库略有区分 */
  section?: 'library' | 'recent'
}

interface BookCoverButtonProps {
  book: Book
  openLabel: string
  onOpen: () => void
  variant: 'grid' | 'list'
}

function BookCoverButton({
  book,
  openLabel,
  onOpen,
  variant,
}: BookCoverButtonProps) {
  const { t } = useTranslation()
  const isList = variant === 'list'

  return (
    <button
      type="button"
      className={cn(
        'group/cover relative shrink-0 cursor-pointer overflow-hidden border bg-muted',
        'transition-[box-shadow,transform] duration-200 ease-out',
        'hover:z-10 hover:shadow-md hover:ring-2 hover:ring-primary/50',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isList ? 'size-14 rounded-md' : 'aspect-[3/4] w-full border-b',
      )}
      onClick={onOpen}
      aria-label={openLabel}
    >
      <BookCover
        book={book}
        className="size-full object-cover transition-transform duration-200 group-hover/cover:scale-105"
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center',
          'bg-black/0 transition-colors duration-200 group-hover/cover:bg-black/45',
          isList ? 'flex-col gap-0.5' : 'flex-col gap-1.5',
        )}
      >
        <BookOpenIcon
          className={cn(
            'text-white opacity-0 transition-opacity duration-200 group-hover/cover:opacity-100',
            isList ? 'size-4' : 'size-8',
          )}
        />
        {!isList && (
          <span className="text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover/cover:opacity-100">
            {t('common.read')}
          </span>
        )}
      </span>
    </button>
  )
}

export function BookCard({
  book,
  view,
  onOpen,
  onRemove,
  onToggleFavorite,
  onClearRecent,
  section = 'library',
}: BookCardProps) {
  const { t } = useTranslation()
  const progress = book.progress_percent ?? 0
  const openLabel = t('library.openBookLabel', { title: book.title })
  const author = book.author ?? t('common.unknownAuthor')
  const handleOpen = () => onOpen(book)
  const isRecent = section === 'recent'
  const readLabel = isRecent ? t('common.continueReading') : t('common.read')
  const isFavorite = (book.is_favorite ?? 0) === 1
  const favoriteLabel = isFavorite
    ? t('library.unfavoriteLabel', { title: book.title })
    : t('library.favoriteLabel', { title: book.title })

  const favoriteButton = onToggleFavorite ? (
    <Button
      size="icon"
      variant={isFavorite ? 'secondary' : 'outline'}
      aria-label={favoriteLabel}
      aria-pressed={isFavorite}
      onClick={() => onToggleFavorite(book)}
    >
      <StarIcon className={isFavorite ? 'fill-current' : undefined} />
    </Button>
  ) : null

  const clearRecentButton =
    isRecent && onClearRecent ? (
      <Button
        size="icon"
        variant="outline"
        aria-label={t('library.clearRecentLabel', { title: book.title })}
        title={t('library.clearRecentHint')}
        onClick={() => onClearRecent(book)}
      >
        <ListXIcon />
      </Button>
    ) : null

  if (view === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-lg border p-3',
          isRecent
            ? 'border-primary/25 bg-primary/5 dark:bg-primary/10'
            : 'bg-card',
        )}
      >
        <BookCoverButton
          book={book}
          openLabel={openLabel}
          onOpen={handleOpen}
          variant="list"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="truncate font-medium">{book.title}</div>
          <div className="truncate text-sm text-muted-foreground">{author}</div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{book.format.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">
              {t('common.progress')} {formatPercent(progress)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={() => onOpen(book)}>
            <BookOpenIcon />
            {readLabel}
          </Button>
          {favoriteButton}
          {clearRecentButton}
          {onRemove && !isRecent && (
            <Button size="sm" variant="outline" onClick={() => onRemove(book)}>
              <Trash2Icon />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'overflow-hidden py-0',
        isRecent && 'border-primary/25 bg-primary/5 dark:bg-primary/10',
      )}
    >
      <BookCoverButton
        book={book}
        openLabel={openLabel}
        onOpen={handleOpen}
        variant="grid"
      />
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="line-clamp-2 text-base">{book.title}</CardTitle>
        <p className="truncate text-sm text-muted-foreground">{author}</p>
      </CardHeader>
      <CardContent className="flex items-center gap-2 pt-0 pb-2">
        <Badge variant="secondary">{book.format.toUpperCase()}</Badge>
        <span className="text-xs text-muted-foreground">
          {formatPercent(progress)}
        </span>
      </CardContent>
      <CardFooter className="gap-2 pb-4">
        <Button className="flex-1" size="sm" onClick={() => onOpen(book)}>
          <BookOpenIcon />
          {readLabel}
        </Button>
        {favoriteButton}
        {clearRecentButton}
        {onRemove && !isRecent && (
          <Button size="icon" variant="outline" onClick={() => onRemove(book)}>
            <Trash2Icon />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
