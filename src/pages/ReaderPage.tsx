import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EpubReader } from '@/components/reader/EpubReader'
import { PdfReader } from '@/components/reader/PdfReader'
import {
  ReaderSidebar,
  type ReaderSidebarTab,
} from '@/components/reader/ReaderSidebar'
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel'
import { ReaderToolbar } from '@/components/reader/ReaderToolbar'
import { TxtReader } from '@/components/reader/TxtReader'
import { PageError, PageLoading } from '@/components/ui/page-state'
import { parseBookmarkPosition, useBookmarks } from '@/hooks/useBookmarks'
import { useAppStore } from '@/stores/app-store'
import type { Book, Bookmark } from '@/types/electron'
import type { ReaderNavigationHandle, TocItem } from '@/types/reader-navigation'

type LoadState = 'loading' | 'ready' | 'error'

function patchSetting(key: string, value: string) {
  useAppStore.setState((state) => ({
    settings: { ...state.settings, [key]: value },
  }))
  void window.electronAPI?.setSetting(key, value)
}

function ReaderContent({ bookId }: { bookId: string }) {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const setPage = useAppStore((s) => s.setPage)
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId)

  const fontSize = Number(settings.fontSize ?? 18)
  const readingWidth = Number(settings.readingWidth ?? 720)

  const navRef = useRef<ReaderNavigationHandle>(null)

  const [book, setBook] = useState<Book | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [locationLabel, setLocationLabel] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<ReaderSidebarTab>('bookmarks')
  const [toc, setToc] = useState<TocItem[]>([])

  const {
    bookmarks,
    loading: bookmarksLoading,
    addBookmark,
    removeBookmark,
  } = useBookmarks(bookId)

  const showToc = book?.format === 'epub' && toc.length > 0

  const handleBack = useCallback(() => {
    setCurrentBookId(null)
    setPage('library')
  }, [setCurrentBookId, setPage])

  const handleToggleSidebar = useCallback(() => {
    setShowSidebar((open) => {
      if (!open && book?.format === 'epub' && toc.length > 0) {
        setSidebarTab('toc')
      }
      return !open
    })
  }, [book?.format, toc.length])

  const handleAddBookmark = useCallback(async () => {
    const snapshot = navRef.current?.getBookmarkSnapshot()
    if (!snapshot) return

    const label =
      snapshot.label?.trim() ||
      locationLabel.trim() ||
      t('reader.bookmarkDefault', { percent: Math.round(progressPercent) })

    await addBookmark(label, snapshot, progressPercent)
    setShowSidebar(true)
    setSidebarTab('bookmarks')
  }, [addBookmark, locationLabel, progressPercent, t])

  const handleTocSelect = useCallback(async (href: string) => {
    await navRef.current?.goToBookmark({ format: 'epub', href })
  }, [])

  const handleBookmarkSelect = useCallback(async (bookmark: Bookmark) => {
    const position = parseBookmarkPosition(bookmark.position)
    if (!position) return
    await navRef.current?.goToBookmark(position)
  }, [])

  const handleOpenError = useCallback((msg: string) => {
    setLoadState('error')
    setLoadError(msg)
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return

    let cancelled = false

    const load = async () => {
      try {
        const data = await window.electronAPI.getBook(bookId)
        const b = data as Book | null
        if (cancelled) return

        if (!b) {
          setLoadState('error')
          setLoadError(t('reader.bookMissing'))
          return
        }

        setBook(b)
        setProgressPercent(b.progress_percent ?? 0)
        setToc([])
        setShowSidebar(false)
        setSidebarTab(b.format === 'epub' ? 'toc' : 'bookmarks')
        void window.electronAPI.touchLastRead(bookId)

        if (b.format === 'epub') {
          const url = await window.electronAPI.toFileUrl(b.file_path)
          if (cancelled) return
          if (!url) {
            setLoadState('error')
            setLoadError(t('reader.epubMissing'))
            return
          }
          setFileUrl(url)
        }

        setLoadState('ready')
      } catch (err) {
        if (cancelled) return
        setLoadState('error')
        setLoadError(
          err instanceof Error ? err.message : t('reader.openFailed'),
        )
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [bookId, t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleBack])

  if (loadState === 'loading') {
    return <PageLoading message={t('reader.opening')} />
  }

  if (loadState === 'error' || !book) {
    return (
      <PageError
        title={t('reader.cannotOpen')}
        message={loadError ?? t('common.unknownError')}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ReaderToolbar
        book={book}
        subtitle={locationLabel || book.author || undefined}
        progressPercent={progressPercent}
        onBack={handleBack}
        onToggleSidebar={handleToggleSidebar}
        sidebarOpen={showSidebar}
        onAddBookmark={() => void handleAddBookmark()}
        onToggleSettings={() => setShowSettings((v) => !v)}
      />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
          {book.format === 'epub' && fileUrl && (
            <EpubReader
              ref={navRef}
              book={book}
              fileUrl={fileUrl}
              fontSize={fontSize}
              readingWidth={readingWidth}
              onProgress={setProgressPercent}
              onLocationLabel={setLocationLabel}
              onTocReady={setToc}
              onOpenError={handleOpenError}
            />
          )}
          {book.format === 'txt' && (
            <TxtReader
              ref={navRef}
              book={book}
              fontSize={fontSize}
              readingWidth={readingWidth}
              onProgress={setProgressPercent}
              onBack={handleBack}
            />
          )}
          {book.format === 'pdf' && (
            <PdfReader
              ref={navRef}
              book={book}
              onProgress={setProgressPercent}
              onLocationLabel={setLocationLabel}
              onBack={handleBack}
            />
          )}
        </div>

        {(showSidebar || showSettings) && (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/20"
            aria-label={t('common.close')}
            onClick={() => {
              setShowSidebar(false)
              setShowSettings(false)
            }}
          />
        )}

        {showSidebar && (
          <div className="absolute inset-y-0 left-0 z-20 flex shadow-lg">
            <ReaderSidebar
              toc={toc}
              showToc={showToc}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              bookmarks={bookmarks}
              bookmarksLoading={bookmarksLoading}
              onTocSelect={(href) => void handleTocSelect(href)}
              onBookmarkSelect={(b) => void handleBookmarkSelect(b)}
              onBookmarkRemove={(id) => void removeBookmark(id)}
            />
          </div>
        )}

        {showSettings && (
          <div className="absolute inset-y-0 right-0 z-20 flex shadow-lg">
            <ReaderSettingsPanel
              fontSize={fontSize}
              readingWidth={readingWidth}
              onFontSizeChange={(v) => patchSetting('fontSize', String(v))}
              onReadingWidthChange={(v) =>
                patchSetting('readingWidth', String(v))
              }
            />
          </div>
        )}
      </div>
      <footer className="h-1 shrink-0 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </footer>
    </div>
  )
}

export function ReaderPage() {
  const { t } = useTranslation()
  const currentBookId = useAppStore((s) => s.currentBookId)
  const setPage = useAppStore((s) => s.setPage)
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId)

  const handleBack = useCallback(() => {
    setCurrentBookId(null)
    setPage('library')
  }, [setCurrentBookId, setPage])

  if (!currentBookId || !window.electronAPI) {
    return (
      <PageError
        title={t('reader.cannotOpen')}
        message={t('reader.notSelected')}
        onBack={handleBack}
      />
    )
  }

  return <ReaderContent key={currentBookId} bookId={currentBookId} />
}
