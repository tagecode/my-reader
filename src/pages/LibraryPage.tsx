import {
  GridIcon,
  ListIcon,
  SearchIcon,
  UploadIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookCard } from '@/components/library/BookCard'
import { EmptyLibrary } from '@/components/library/EmptyLibrary'
import { LibraryFilters } from '@/components/library/LibraryFilters'
import { RecentReadingSection } from '@/components/library/RecentReadingSection'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptySearch, PageLoading } from '@/components/ui/page-state'
import { StatusMessage } from '@/components/ui/status-message'
import {
  formatImportFeedback,
  importBookPaths,
  importFromDialog,
} from '@/lib/importBooks'
import { generateMissingPdfCovers } from '@/lib/generatePdfCovers'
import { useAppStore } from '@/stores/app-store'
import { isDefaultLibraryFilters } from '@/types/library'
import type { Book } from '@/types/electron'
import type { StatusVariant } from '@/components/ui/status-message'

type ImportFeedback = {
  variant: StatusVariant
  title?: string
  message: string
  details: string[]
}

function CoverSyncBanner({
  refreshLibrary,
}: {
  refreshLibrary: () => Promise<void>
}) {
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let cancelled = false
    void generateMissingPdfCovers()
      .then((n) => {
        if (cancelled || n === 0) return
        void refreshLibrary()
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshLibrary])

  const { t } = useTranslation()

  if (!syncing) return null

  return (
    <p className="text-center text-xs text-muted-foreground">
      {t('library.pdfCoverSync')}
    </p>
  )
}

export function LibraryPage() {
  const { t } = useTranslation()
  const books = useAppStore((s) => s.books)
  const recentBooks = useAppStore((s) => s.recentBooks)
  const loading = useAppStore((s) => s.loading)
  const importing = useAppStore((s) => s.importing)
  const error = useAppStore((s) => s.error)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const libraryView = useAppStore((s) => s.libraryView)
  const libraryFormatFilter = useAppStore((s) => s.libraryFormatFilter)
  const libraryStatusFilter = useAppStore((s) => s.libraryStatusFilter)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setLibraryView = useAppStore((s) => s.setLibraryView)
  const refreshLibrary = useAppStore((s) => s.refreshLibrary)
  const loadBooks = useAppStore((s) => s.loadBooks)
  const setImporting = useAppStore((s) => s.setImporting)
  const setPage = useAppStore((s) => s.setPage)
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const clearRecentReading = useAppStore((s) => s.clearRecentReading)

  const [dragActive, setDragActive] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Book | null>(null)
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(
    null,
  )

  const showRecentSection = isDefaultLibraryFilters({
    searchQuery,
    libraryFormatFilter,
    libraryStatusFilter,
  })
  const showLibrarySectionHeader =
    showRecentSection && recentBooks.length > 0 && books.length > 0

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBooks()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, loadBooks])

  const runImport = useCallback(
    async (runner: () => Promise<ImportFeedback | null>) => {
      setImportFeedback(null)
      setImporting(true)
      try {
        const feedback = await runner()
        if (feedback) setImportFeedback(feedback)
        await refreshLibrary()
      } finally {
        setImporting(false)
      }
    },
    [refreshLibrary, setImporting],
  )

  const handleImport = useCallback(async () => {
    await runImport(async () => {
      const result = await importFromDialog()
      if (!result) return null
      return formatImportFeedback(result)
    })
  }, [runImport])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (!window.electronAPI) return

      const paths = Array.from(e.dataTransfer.files)
        .map((f) => window.electronAPI.getPathForFile(f))
        .filter(Boolean)
      if (paths.length === 0) return

      await runImport(async () => {
        const result = await importBookPaths(paths)
        return formatImportFeedback(result)
      })
    },
    [runImport],
  )

  const handleOpen = (book: Book) => {
    setCurrentBookId(book.id)
    setPage('reader')
  }

  const handleToggleFavorite = (book: Book) => {
    void toggleFavorite(book.id, (book.is_favorite ?? 0) !== 1)
  }

  const handleClearRecent = (book: Book) => {
    void clearRecentReading(book.id)
  }

  const handleRemoveConfirm = async () => {
    if (!removeTarget || !window.electronAPI) return
    await window.electronAPI.removeBook(removeTarget.id)
    setRemoveTarget(null)
    await refreshLibrary()
  }

  const hasActiveFilters =
    libraryFormatFilter !== 'all' || libraryStatusFilter !== 'all'
  const showEmptyLibrary =
    !loading &&
    !importing &&
    books.length === 0 &&
    !searchQuery.trim() &&
    !hasActiveFilters
  const showEmptySearch =
    !loading && !importing && books.length === 0 && !!searchQuery.trim()
  const showEmptyFilter =
    !loading &&
    !importing &&
    books.length === 0 &&
    !searchQuery.trim() &&
    hasActiveFilters

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-4 p-4"
      onDragOver={(e) => {
        e.preventDefault()
        if (!importing) setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        if (!importing) void handleDrop(e)
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('library.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={importing}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            size="icon"
            variant={libraryView === 'grid' ? 'secondary' : 'ghost'}
            onClick={() => void setLibraryView('grid')}
            aria-label={t('library.gridView')}
            disabled={importing}
          >
            <GridIcon />
          </Button>
          <Button
            size="icon"
            variant={libraryView === 'list' ? 'secondary' : 'ghost'}
            onClick={() => void setLibraryView('list')}
            aria-label={t('library.listView')}
            disabled={importing}
          >
            <ListIcon />
          </Button>
        </div>
        <Button onClick={() => void handleImport()} disabled={importing}>
          <UploadIcon />
          {importing ? t('common.importing') : t('common.import')}
        </Button>
      </div>

      <LibraryFilters />

      {importing && (
        <StatusMessage variant="info" title={t('library.importingTitle')}>
          {t('library.importingMessage')}
        </StatusMessage>
      )}

      {importFeedback && !importing && (
        <StatusMessage
          variant={importFeedback.variant}
          title={importFeedback.title}
        >
          <p>{importFeedback.message}</p>
          {importFeedback.details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              {importFeedback.details.slice(0, 5).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {importFeedback.details.length > 5 && (
                <li>
                  {t('common.moreItems', {
                    count: importFeedback.details.length - 5,
                  })}
                </li>
              )}
            </ul>
          )}
        </StatusMessage>
      )}

      {error && (
        <StatusMessage variant="error" title={t('library.loadFailed')}>
          {error}
        </StatusMessage>
      )}

      {loading && books.length === 0 && recentBooks.length === 0 ? (
        <PageLoading message={t('library.loading')} />
      ) : showEmptyLibrary ? (
        <EmptyLibrary
          onImport={() => void handleImport()}
          dragActive={dragActive}
          disabled={importing}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          {showRecentSection && recentBooks.length > 0 && (
            <RecentReadingSection
              books={recentBooks}
              view={libraryView}
              onOpen={handleOpen}
              onToggleFavorite={handleToggleFavorite}
              onClearRecent={handleClearRecent}
            />
          )}

          {showEmptySearch ? (
            <EmptySearch query={searchQuery.trim()} />
          ) : showEmptyFilter ? (
            <StatusMessage variant="info" title={t('library.filterEmptyTitle')}>
              {t('library.filterEmptyDescription')}
            </StatusMessage>
          ) : books.length > 0 ? (
            <section aria-labelledby="library-all-heading" className="flex flex-col gap-3">
              {showLibrarySectionHeader && (
                <header className="flex items-baseline justify-between gap-2 border-b pb-2">
                  <h2 id="library-all-heading" className="text-sm font-semibold">
                    {t('library.allBooksTitle')}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {t('library.bookCount', { count: books.length })}
                  </span>
                </header>
              )}
              <div
                className={
                  libraryView === 'grid'
                    ? 'grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    view={libraryView}
                    onOpen={handleOpen}
                    onRemove={setRemoveTarget}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <CoverSyncBanner refreshLibrary={refreshLibrary} />

      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('library.removeTitle')}</DialogTitle>
            <DialogDescription>
              {t('library.removeDescription', { title: removeTarget?.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void handleRemoveConfirm()}>
              {t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
