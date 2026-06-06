import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EpubReader } from '@/components/reader/EpubReader'
import { PdfReader } from '@/components/reader/PdfReader'
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel'
import { ReaderToolbar } from '@/components/reader/ReaderToolbar'
import { TxtReader } from '@/components/reader/TxtReader'
import { PageError, PageLoading } from '@/components/ui/page-state'
import { useAppStore } from '@/stores/app-store'
import type { Book } from '@/types/electron'

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

  const [book, setBook] = useState<Book | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [locationLabel, setLocationLabel] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const handleBack = useCallback(() => {
    setCurrentBookId(null)
    setPage('library')
  }, [setCurrentBookId, setPage])

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
        onToggleSettings={() => setShowSettings((v) => !v)}
        showToc={book.format === 'epub'}
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {book.format === 'epub' && fileUrl && (
            <EpubReader
              book={book}
              fileUrl={fileUrl}
              fontSize={fontSize}
              readingWidth={readingWidth}
              onProgress={setProgressPercent}
              onLocationLabel={setLocationLabel}
              onOpenError={(msg) => {
                setLoadState('error')
                setLoadError(msg)
              }}
            />
          )}
          {book.format === 'txt' && (
            <TxtReader
              book={book}
              fontSize={fontSize}
              readingWidth={readingWidth}
              onProgress={setProgressPercent}
              onBack={handleBack}
            />
          )}
          {book.format === 'pdf' && (
            <PdfReader
              book={book}
              onProgress={setProgressPercent}
              onLocationLabel={setLocationLabel}
              onBack={handleBack}
            />
          )}
        </div>
        {showSettings && (
          <ReaderSettingsPanel
            fontSize={fontSize}
            readingWidth={readingWidth}
            onFontSizeChange={(v) => patchSetting('fontSize', String(v))}
            onReadingWidthChange={(v) =>
              patchSetting('readingWidth', String(v))
            }
          />
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
