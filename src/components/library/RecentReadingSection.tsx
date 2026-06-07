import { ClockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BookCard } from '@/components/library/BookCard'
import { cn } from '@/lib/utils'
import type { LibraryView } from '@/stores/app-store'
import type { Book } from '@/types/electron'

interface RecentReadingSectionProps {
  books: Book[]
  view: LibraryView
  onOpen: (book: Book) => void
  onToggleFavorite: (book: Book) => void
  onClearRecent: (book: Book) => void
}

export function RecentReadingSection({
  books,
  view,
  onOpen,
  onToggleFavorite,
  onClearRecent,
}: RecentReadingSectionProps) {
  const { t } = useTranslation()

  if (books.length === 0) return null

  return (
    <section
      aria-labelledby="library-recent-heading"
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10"
    >
      <header className="mb-4 flex items-start gap-3 border-b border-primary/15 pb-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
          aria-hidden
        >
          <ClockIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="library-recent-heading" className="text-sm font-semibold">
              {t('library.recentTitle')}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t('library.recentCount', { count: books.length })}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('library.recentDescription')}
          </p>
        </div>
      </header>

      <div
        className={cn(
          view === 'grid'
            ? 'grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4'
            : 'flex flex-col gap-3',
        )}
      >
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            view={view}
            section="recent"
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onClearRecent={onClearRecent}
          />
        ))}
      </div>
    </section>
  )
}
