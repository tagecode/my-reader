import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { PageLoading } from '@/components/ui/page-state'
import i18n from '@/lib/i18n'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import type { Book } from '@/types/electron'
import type {
  BookmarkPosition,
  ReaderNavigationHandle,
  TocItem,
} from '@/types/reader-navigation'

interface FoliateViewElement extends HTMLElement {
  open: (url: string) => Promise<void>
  init: (opts: { lastLocation?: unknown; showTextStart?: boolean }) => Promise<void>
  goTo: (target: unknown) => Promise<void>
  next: (distance?: number) => Promise<void>
  prev: (distance?: number) => Promise<void>
  book?: { toc?: TocItem[]; metadata?: { title?: string } }
  addEventListener: HTMLElement['addEventListener']
}

interface EpubReaderProps {
  book: Book
  fileUrl: string
  fontSize: number
  readingWidth: number
  onProgress: (percent: number) => void
  onLocationLabel: (label: string) => void
  onTocReady?: (toc: TocItem[]) => void
  onOpenError?: (message: string) => void
}

export const EpubReader = forwardRef<ReaderNavigationHandle, EpubReaderProps>(
  function EpubReader(
    {
      book,
      fileUrl,
      fontSize,
      readingWidth,
      onProgress,
      onLocationLabel,
      onTocReady,
      onOpenError,
    },
    ref,
  ) {
    const { t } = useTranslation()
    const hostRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<FoliateViewElement | null>(null)
    const lastLocationRef = useRef<{
      cfi?: string
      fraction?: number
      label?: string
    }>({})
    const [viewReady, setViewReady] = useState(false)
    const [loading, setLoading] = useState(true)

    const onProgressRef = useRef(onProgress)
    const onLocationLabelRef = useRef(onLocationLabel)
    const onTocReadyRef = useRef(onTocReady)
    const onOpenErrorRef = useRef(onOpenError)

    onProgressRef.current = onProgress
    onLocationLabelRef.current = onLocationLabel
    onTocReadyRef.current = onTocReady
    onOpenErrorRef.current = onOpenError

    const { loadProgress, saveProgress } = useReadingProgress(book.id)
    const saveProgressRef = useRef(saveProgress)
    saveProgressRef.current = saveProgress

    useImperativeHandle(
      ref,
      () => ({
        getBookmarkSnapshot: (): BookmarkPosition | null => {
          if (!viewReady) return null
          const loc = lastLocationRef.current
          return {
            format: 'epub',
            cfi: loc.cfi,
            fraction: loc.fraction,
            label: loc.label,
          }
        },
        goToBookmark: async (position: BookmarkPosition) => {
          const view = viewRef.current
          if (!view) return
          if (position.cfi) await view.goTo(position.cfi)
          else if (typeof position.fraction === 'number') {
            await view.goTo({ fraction: position.fraction })
          } else if (position.href) await view.goTo(position.href)
        },
      }),
      [viewReady],
    )

    useEffect(() => {
      let view: FoliateViewElement | null = null
      let cancelled = false

      const setup = async () => {
        try {
          setLoading(true)
          setViewReady(false)
          await import('foliate-js/view.js')
          if (cancelled) return
          if (!hostRef.current) {
            throw new Error('EPUB reader container not mounted')
          }

          hostRef.current.replaceChildren()

          view = document.createElement('foliate-view') as FoliateViewElement
          view.style.flex = '1'
          view.style.minHeight = '0'
          view.style.width = '100%'
          view.style.height = '100%'
          viewRef.current = view
          hostRef.current.appendChild(view)

          await view.open(fileUrl)
          if (cancelled) return

          const saved = await loadProgress()
          if (cancelled) return

          let lastLocation: unknown
          if (saved?.position) {
            try {
              const pos = JSON.parse(saved.position) as {
                cfi?: string
                fraction?: number
              }
              if (pos.cfi) lastLocation = pos.cfi
              else if (typeof pos.fraction === 'number') {
                lastLocation = { fraction: pos.fraction }
              }
            } catch {
              /* ignore */
            }
          }
          await view.init({ lastLocation, showTextStart: !lastLocation })
          if (cancelled) return

          const toc = view.book?.toc ?? []
          onTocReadyRef.current?.(toc)
          onLocationLabelRef.current(
            view.book?.metadata?.title ?? book.title,
          )

          if (typeof saved?.progress_percent === 'number') {
            onProgressRef.current(saved.progress_percent)
          }

          view.addEventListener('relocate', ((e: CustomEvent) => {
            const detail = e.detail as {
              fraction?: number
              cfi?: string
              tocItem?: { label?: string }
            }
            const fraction = detail.fraction ?? 0
            lastLocationRef.current = {
              cfi: detail.cfi,
              fraction,
              label: detail.tocItem?.label,
            }
            onProgressRef.current(fraction * 100)
            if (detail.tocItem?.label) {
              onLocationLabelRef.current(detail.tocItem.label)
            }
            saveProgressRef.current({
              position: { cfi: detail.cfi, fraction },
              progressPercent: fraction * 100,
            })
          }) as EventListener)

          setViewReady(true)
          setLoading(false)
        } catch (err) {
          if (cancelled) return
          setLoading(false)
          const msg =
            err instanceof Error
              ? err.message
              : i18n.t('reader.epubParseFailed')
          onOpenErrorRef.current?.(msg)
        }
      }

      void setup()

      return () => {
        cancelled = true
        setViewReady(false)
        view?.remove()
        viewRef.current = null
        hostRef.current?.replaceChildren()
      }
    }, [book.id, book.title, fileUrl, loadProgress])

    useEffect(() => {
      if (!viewReady) return

      const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }

        const v = viewRef.current
        if (!v) return

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault()
          void v.prev()
          return
        }
        if (
          e.key === 'ArrowRight' ||
          e.key === 'ArrowDown' ||
          e.key === 'PageDown' ||
          e.key === ' '
        ) {
          e.preventDefault()
          void v.next()
        }
      }

      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [viewReady])

    useEffect(() => {
      const root = hostRef.current
      if (!root) return
      root.style.setProperty('--reader-font-size', `${fontSize}px`)
      root.style.setProperty('--reader-max-width', `${readingWidth}px`)
    }, [fontSize, readingWidth, loading])

    return (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <PageLoading message={t('reader.epubLoading')} />
          </div>
        )}
        <div
          ref={hostRef}
          className="reader-host flex min-h-0 min-w-0 flex-1 [&_foliate-view]:size-full"
          style={{ fontSize: `${fontSize}px` }}
          tabIndex={loading ? -1 : 0}
          title={t('reader.epubKeysHint')}
        />
      </div>
    )
  },
)
