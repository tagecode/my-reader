import { BookOpenIcon, Trash2Icon } from 'lucide-react'
import { BookCover } from '@/components/library/BookCover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/utils'
import type { Book } from '@/types/electron'

interface BookCardProps {
  book: Book
  view: 'grid' | 'list'
  onOpen: (book: Book) => void
  onRemove: (book: Book) => void
}

export function BookCard({ book, view, onOpen, onRemove }: BookCardProps) {
  const progress = book.progress_percent ?? 0
  const openLabel = `阅读《${book.title}》`

  if (view === 'list') {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card p-3">
        <button
          type="button"
          className="size-14 shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpen(book)}
          aria-label={openLabel}
        >
          <BookCover book={book} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="truncate font-medium">{book.title}</div>
          <div className="truncate text-sm text-muted-foreground">
            {book.author ?? '未知作者'}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{book.format.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">
              进度 {formatPercent(progress)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={() => onOpen(book)}>
            <BookOpenIcon />
            阅读
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRemove(book)}>
            <Trash2Icon />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden py-0">
      <button
        type="button"
        className="aspect-[3/4] w-full overflow-hidden border-b transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => onOpen(book)}
        aria-label={openLabel}
      >
        <BookCover book={book} />
      </button>
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="line-clamp-2 text-base">{book.title}</CardTitle>
        <p className="truncate text-sm text-muted-foreground">
          {book.author ?? '未知作者'}
        </p>
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
          阅读
        </Button>
        <Button size="icon" variant="outline" onClick={() => onRemove(book)}>
          <Trash2Icon />
        </Button>
      </CardFooter>
    </Card>
  )
}
