import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLoading } from '@/components/ui/page-state'
import i18n from '@/lib/i18n'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import type { Book } from '@/types/electron'

interface FoliateViewElement extends HTMLElement {
  open: (url: string) => Promise<void>
  init: (opts: { lastLocation?: unknown; showTextStart?: boolean }) => Promise<void>
  goTo: (target: unknown) => Promise<void>
  next: (distance?: number) => Promise<void>
  prev: (distance?: number) => Promise<void>
  book?: { toc?: TocItem[]; metadata?: { title?: string } }
  addEventListener: HTMLElement['addEventListener']
}

interface TocItem {
  label: string
  href: string
  subitems?: TocItem[]
}

interface EpubReaderProps {
  book: Book
  fileUrl: string
  fontSize: number
  readingWidth: number
  onProgress: (percent: number) => void
  onLocationLabel: (label: string) => void
  onOpenError?: (message: string) => void
}

export function EpubReader({
  book,
  fileUrl,
  fontSize,
  readingWidth,
  onProgress,
  onLocationLabel,
  onOpenError,
}: EpubReaderProps) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<FoliateViewElement | null>(null)
  const [toc, setToc] = useState<TocItem[]>([])
  const [viewReady, setViewReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const { loadProgress, saveProgress } = useReadingProgress(book.id)

  useEffect(() => {
    let view: FoliateViewElement | null = null
    let cancelled = false

    const setup = async () => {
      try {
        setLoading(true)
        await import('foliate-js/view.js')
        if (cancelled || !hostRef.current) return

        view = document.createElement('foliate-view') as FoliateViewElement
        view.style.flex = '1'
        view.style.minHeight = '0'
        viewRef.current = view
        hostRef.current.appendChild(view)

        await view.open(fileUrl)
        const saved = await loadProgress()
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

        setToc(view.book?.toc ?? [])
        onLocationLabel(view.book?.metadata?.title ?? book.title)

        if (typeof saved?.progress_percent === 'number') {
          onProgress(saved.progress_percent)
        }

        view.addEventListener('relocate', ((e: CustomEvent) => {
          const detail = e.detail as {
            fraction?: number
            cfi?: string
            tocItem?: { label?: string }
          }
          const fraction = detail.fraction ?? 0
          onProgress(fraction * 100)
          if (detail.tocItem?.label) onLocationLabel(detail.tocItem.label)
          saveProgress({
            position: { cfi: detail.cfi, fraction },
            progressPercent: fraction * 100,
          })
        }) as EventListener)

        if (!cancelled) {
          setViewReady(true)
          setLoading(false)
        }
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : i18n.t('reader.epubParseFailed')
        onOpenError?.(msg)
      }
    }

    void setup()

    return () => {
      cancelled = true
      setViewReady(false)
      view?.remove()
      viewRef.current = null
    }
  }, [
    book.id,
    book.title,
    fileUrl,
    loadProgress,
    onLocationLabel,
    onOpenError,
    onProgress,
    saveProgress,
  ])

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
  }, [fontSize, readingWidth])

  const goToHref = async (href: string) => {
    await viewRef.current?.goTo(href)
  }

  if (loading) {
    return <PageLoading message={t('reader.epubLoading')} />
  }

  return (
    <div className="flex min-h-0 flex-1 bg-background">
      {toc.length > 0 && (
        <aside className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r p-2 text-sm">
          <p className="px-2 py-1 font-medium text-muted-foreground">
            {t('reader.toc')}
          </p>
          <TocTree items={toc} onSelect={goToHref} />
        </aside>
      )}
      <div
        ref={hostRef}
        className="reader-host flex min-h-0 min-w-0 flex-1 [&_foliate-view]:size-full"
        style={{ fontSize: `${fontSize}px` }}
        tabIndex={0}
        title={t('reader.epubKeysHint')}
      />
    </div>
  )
}

function TocTree({
  items,
  onSelect,
  depth = 0,
}: {
  items: TocItem[]
  onSelect: (href: string) => void
  depth?: number
}) {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <li key={`${depth}-${i}-${item.href}`}>
          <button
            type="button"
            className="w-full truncate rounded px-2 py-1 text-left hover:bg-accent"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() => void onSelect(item.href)}
          >
            {item.label || t('common.chapter')}
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <TocTree items={item.subitems} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}
