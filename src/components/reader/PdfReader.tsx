import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageError } from '@/components/ui/page-state'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { getPdfjsDocumentOptions } from '@/lib/pdfjsConfig'
import { ensurePdfjsChineseFonts } from '@/lib/pdfjsFonts'
import type { Book } from '@/types/electron'
import type { BookmarkPosition, ReaderNavigationHandle } from '@/types/reader-navigation'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfReaderProps {
  book: Book
  onProgress: (percent: number) => void
  onLocationLabel: (label: string) => void
  onBack?: () => void
}

export const PdfReader = forwardRef<ReaderNavigationHandle, PdfReaderProps>(
  function PdfReader(
    {
      book,
      onProgress,
      onLocationLabel,
      onBack,
    },
    ref,
  ) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(null)
  const scaleRef = useRef(1.2)
  const prevScaleRef = useRef(1.2)
  const isReadyRef = useRef(false)
  const rerenderingRef = useRef(false)
  const renderGenRef = useRef(0)
  const paintingRef = useRef(new Set<number>())
  const scaleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPageRef = useRef(1)
  const restoreScrollRef = useRef<number | null>(null)
  const initialMountedRef = useRef(false)

  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [pageInput, setPageInput] = useState('1')
  const [docLoading, setDocLoading] = useState(true)
  const [docReady, setDocReady] = useState(false)
  const [rerendering, setRerendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { loadProgress, saveProgress } = useReadingProgress(book.id)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const paintPage = useCallback(
    async (pageNum: number, targetScale: number, generation: number) => {
      const pdf = pdfRef.current
      if (!pdf || generation !== renderGenRef.current) return null

      try {
        const page = await pdf.getPage(pageNum)
        if (generation !== renderGenRef.current) return null

        const viewport = page.getViewport({ scale: targetScale })
        const pixelRatio = window.devicePixelRatio || 1
        const renderViewport = page.getViewport({
          scale: targetScale * pixelRatio,
        })
        const canvas = document.createElement('canvas')
        canvas.dataset.page = String(pageNum)
        canvas.className = 'mx-auto mb-4 max-w-full shadow-sm'
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        canvas.width = renderViewport.width
        canvas.height = renderViewport.height
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        const task = page.render({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        })
        await task.promise
        if (generation !== renderGenRef.current) return null
        return canvas
      } catch (err) {
        console.error(`PDF page ${pageNum} render failed`, err)
        return null
      }
    },
    [],
  )

  const mountPage = useCallback(
    async (pageNum: number, replace = false) => {
      if (pageNum < 1) return
      const pdf = pdfRef.current
      const container = containerRef.current
      if (!pdf || !container || pageNum > pdf.numPages) return
      if (paintingRef.current.has(pageNum) && !replace) return

      paintingRef.current.add(pageNum)
      const generation = renderGenRef.current

      try {
        let wrapper = container.querySelector(
          `[data-page-wrapper="${pageNum}"]`,
        ) as HTMLDivElement | null

        if (!wrapper) {
          wrapper = document.createElement('div')
          wrapper.className = 'flex justify-center px-2'
          wrapper.dataset.pageWrapper = String(pageNum)
          const wrappers = Array.from(
            container.querySelectorAll('[data-page-wrapper]'),
          ) as HTMLElement[]
          const insertBefore = wrappers.find(
            (w) => Number(w.dataset.pageWrapper) > pageNum,
          )
          if (insertBefore) {
            container.insertBefore(wrapper, insertBefore)
          } else {
            container.appendChild(wrapper)
          }
        } else if (replace) {
          wrapper.replaceChildren()
        } else if (wrapper.childElementCount > 0) {
          return
        }

        const canvas = await paintPage(pageNum, scaleRef.current, generation)
        if (!canvas || generation !== renderGenRef.current) return

        wrapper.replaceChildren()
        if (canvas.width === 0 || canvas.height === 0) {
          wrapper.textContent = t('reader.pdfPageRenderFailed', { page: pageNum })
          wrapper.className =
            'flex min-h-32 items-center justify-center px-2 text-sm text-muted-foreground'
        } else {
          wrapper.appendChild(canvas)
        }
      } finally {
        paintingRef.current.delete(pageNum)
      }
    },
    [paintPage, t],
  )

  const getMountedPageNumbers = useCallback((): number[] => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll('[data-page-wrapper]'))
      .map((el) => Number((el as HTMLElement).dataset.pageWrapper))
      .filter((n) => n > 0)
  }, [])

  const getCurrentPage = useCallback(() => {
    const container = containerRef.current
    if (!container || numPages === 0) return 1

    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll > 0) {
      const ratio = container.scrollTop / maxScroll
      return Math.min(numPages, Math.max(1, Math.round(ratio * numPages) || 1))
    }

    const pages = getMountedPageNumbers()
    if (pages.length === 0) return 1

    const containerRect = container.getBoundingClientRect()
    const centerY = containerRect.top + container.clientHeight / 2
    let bestPage = pages[0]!
    let bestDist = Infinity

    for (const page of pages) {
      const wrapper = container.querySelector(
        `[data-page-wrapper="${page}"]`,
      ) as HTMLElement | null
      if (!wrapper) continue
      const rect = wrapper.getBoundingClientRect()
      const pageCenter = rect.top + rect.height / 2
      const dist = Math.abs(pageCenter - centerY)
      if (dist < bestDist) {
        bestDist = dist
        bestPage = page
      }
    }
    return bestPage
  }, [numPages, getMountedPageNumbers])

  const updateProgressFromScrollRef = useRef<(() => void) | null>(null)

  const updateProgressFromScroll = useCallback(() => {
    const container = containerRef.current
    const pdf = pdfRef.current
    if (!container || !pdf || numPages === 0) return

    const scrollTop = container.scrollTop
    const currentPage = getCurrentPage()
    const percent = (currentPage / numPages) * 100

    onLocationLabel(
      t('reader.pdfPageLabel', { current: currentPage, total: numPages }),
    )
    onProgress(percent)
    setPageInput(String(currentPage))
    saveProgress({
      position: { page: currentPage, scrollTop, scale: scaleRef.current },
      progressPercent: percent,
    })
  }, [getCurrentPage, numPages, onLocationLabel, onProgress, saveProgress, t])

  useEffect(() => {
    updateProgressFromScrollRef.current = updateProgressFromScroll
  }, [updateProgressFromScroll])

  const rerenderAtCurrentScale = useCallback(async () => {
    const container = containerRef.current
    if (!container || rerenderingRef.current) return

    const pages = getMountedPageNumbers()
    if (pages.length === 0) return

    rerenderingRef.current = true
    renderGenRef.current += 1
    setRerendering(true)

    const maxScroll = container.scrollHeight - container.clientHeight
    const scrollRatio = maxScroll > 0 ? container.scrollTop / maxScroll : 0

    for (const p of pages) {
      await mountPage(p, true)
    }

    requestAnimationFrame(() => {
      const newMax = container.scrollHeight - container.clientHeight
      container.scrollTop = scrollRatio * newMax
      updateProgressFromScrollRef.current?.()
      rerenderingRef.current = false
      setRerendering(false)
    })
  }, [getMountedPageNumbers, mountPage])

  useEffect(() => {
    let cancelled = false
    isReadyRef.current = false
    initialMountedRef.current = false
    renderGenRef.current += 1

    const load = async () => {
      setDocLoading(true)
      setDocReady(false)
      setError(null)
      try {
        if (!window.electronAPI?.readPdfBuffer) {
          throw new Error(i18n.t('reader.pdfReadFailed'))
        }

        const bytes = await window.electronAPI.readPdfBuffer(book.file_path)
        if (cancelled) return
        if (!bytes?.length) {
          throw new Error(i18n.t('reader.pdfEmpty'))
        }

        await ensurePdfjsChineseFonts()

        const task = pdfjs.getDocument(getPdfjsDocumentOptions(bytes))
        const pdf = await task.promise
        if (cancelled) return

        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        onLocationLabel(t('reader.pdfTotalPages', { count: pdf.numPages }))

        if (pdf.numPages === 0) {
          throw new Error(i18n.t('reader.pdfNoPages'))
        }

        const saved = await loadProgress()
        let startPage = 1
        restoreScrollRef.current = null
        if (saved?.position) {
          try {
            const pos = JSON.parse(saved.position) as {
              page?: number
              scrollTop?: number
              scale?: number
            }
            if (pos.page) startPage = Math.min(pdf.numPages, Math.max(1, pos.page))
            if (typeof pos.scrollTop === 'number') {
              restoreScrollRef.current = pos.scrollTop
            }
            if (
              typeof pos.scale === 'number' &&
              pos.scale >= 0.6 &&
              pos.scale <= 2.5
            ) {
              scaleRef.current = pos.scale
              prevScaleRef.current = pos.scale
              setScale(pos.scale)
            }
          } catch {
            /* ignore */
          }
        }
        startPageRef.current = startPage

        if (!cancelled) setDocReady(true)
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : i18n.t('reader.pdfLoadFailed')
          setError(msg)
          console.error('PDF load error', err)
        }
      } finally {
        if (!cancelled) setDocLoading(false)
      }
    }

    const painting = paintingRef.current

    void load()
    return () => {
      cancelled = true
      isReadyRef.current = false
      initialMountedRef.current = false
      setDocReady(false)
      renderGenRef.current += 1
      painting.clear()
      pdfRef.current?.destroy()
      pdfRef.current = null
    }
  }, [book.file_path, book.id, loadProgress, onLocationLabel, t])

  /** 文档解析完成后，在滚动容器已挂载到 DOM 再绘制页面 */
  useEffect(() => {
    if (!docReady || error || initialMountedRef.current) return

    const mountInitial = async () => {
      const container = containerRef.current
      const pdf = pdfRef.current
      if (!container || !pdf) return

      initialMountedRef.current = true
      container.innerHTML = ''

      const start = startPageRef.current
      for (
        let p = Math.max(1, start - 1);
        p <= Math.min(pdf.numPages, start + 2);
        p++
      ) {
        await mountPage(p)
      }

      if (!container.querySelector('[data-page-wrapper] canvas')) {
        await mountPage(start, true)
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollTop = restoreScrollRef.current
          if (typeof scrollTop === 'number') {
            container.scrollTop = scrollTop
          } else if (start > 1) {
            container
              .querySelector(`[data-page-wrapper="${start}"]`)
              ?.scrollIntoView({ block: 'start' })
          } else {
            container.scrollTop = 0
          }
          updateProgressFromScrollRef.current?.()
          isReadyRef.current = true
          container.focus({ preventScroll: true })
        })
      })
    }

    void mountInitial()
  }, [docReady, error, mountPage])

  useEffect(() => {
    if (!isReadyRef.current || docLoading || numPages === 0) return
    if (prevScaleRef.current === scale) return

    prevScaleRef.current = scale
    if (scaleDebounceRef.current) clearTimeout(scaleDebounceRef.current)
    scaleDebounceRef.current = setTimeout(() => {
      void rerenderAtCurrentScale()
    }, 200)

    return () => {
      if (scaleDebounceRef.current) clearTimeout(scaleDebounceRef.current)
    }
  }, [scale, docLoading, numPages, rerenderAtCurrentScale])

  useEffect(() => {
    const container = containerRef.current
    if (!container || numPages === 0 || docLoading || !docReady) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (rerenderingRef.current) return
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const page = Number(
            (entry.target as HTMLElement).dataset.pageWrapper,
          )
          if (page > 0) {
            void mountPage(page + 1)
            void mountPage(page - 1)
          }
        }
      },
      { root: container, rootMargin: '200px' },
    )

    const observeWrappers = () => {
      if (rerenderingRef.current) return
      container
        .querySelectorAll('[data-page-wrapper]')
        .forEach((w) => observer.observe(w))
    }

    observeWrappers()
    const mo = new MutationObserver(() => {
      if (!rerenderingRef.current) observeWrappers()
    })
    mo.observe(container, { childList: true })

    return () => {
      observer.disconnect()
      mo.disconnect()
    }
  }, [docLoading, docReady, numPages, mountPage])

  const changeScale = (next: number) => {
    setScale(Math.min(2.5, Math.max(0.6, next)))
  }

  const goToPage = useCallback(
    async (target: number, smooth = true) => {
      const page = Math.min(numPages, Math.max(1, target))
      await mountPage(page)
      if (page > 1) await mountPage(page - 1)
      if (page < numPages) await mountPage(page + 1)

      containerRef.current
        ?.querySelector(`[data-page-wrapper="${page}"]`)
        ?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })

      setPageInput(String(page))
      requestAnimationFrame(() => updateProgressFromScroll())
    },
    [numPages, mountPage, updateProgressFromScroll],
  )

  const jumpToPage = () => {
    void goToPage(Number(pageInput) || 1)
  }

  useImperativeHandle(
    ref,
    () => ({
      getBookmarkSnapshot: (): BookmarkPosition | null => {
        const container = containerRef.current
        if (!container || numPages === 0) return null
        const currentPage = getCurrentPage()
        return {
          format: 'pdf',
          page: currentPage,
          scrollTop: container.scrollTop,
          scale: scaleRef.current,
          label: t('reader.pdfPageLabel', {
            current: currentPage,
            total: numPages,
          }),
        }
      },
      goToBookmark: async (position: BookmarkPosition) => {
        if (
          typeof position.scale === 'number' &&
          position.scale >= 0.6 &&
          position.scale <= 2.5
        ) {
          scaleRef.current = position.scale
          prevScaleRef.current = position.scale
          setScale(position.scale)
        }
        if (typeof position.page === 'number') {
          await goToPage(position.page, false)
        }
        if (
          typeof position.scrollTop === 'number' &&
          containerRef.current
        ) {
          containerRef.current.scrollTop = position.scrollTop
          updateProgressFromScroll()
        }
      },
    }),
    [getCurrentPage, goToPage, numPages, t, updateProgressFromScroll],
  )

  useEffect(() => {
    if (!isReadyRef.current || docLoading || numPages === 0) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const current = getCurrentPage()

      if (e.key === 'Home') {
        e.preventDefault()
        void goToPage(1)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        void goToPage(numPages)
        return
      }
      if (
        e.key === 'PageDown' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === ' '
      ) {
        e.preventDefault()
        void goToPage(current + 1)
        return
      }
      if (e.key === 'PageUp' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        void goToPage(current - 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [docLoading, numPages, getCurrentPage, goToPage])

  if (error) {
    return (
      <PageError
        title={t('reader.pdfCannotRead')}
        message={error}
        detail={book.file_path}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Button
          size="sm"
          variant="outline"
          disabled={rerendering}
          onClick={() => changeScale(scale - 0.1)}
        >
          {t('common.zoomOut')}
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {rerendering ? t('common.rerendering') : `${Math.round(scale * 100)}%`}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={rerendering}
          onClick={() => changeScale(scale + 0.1)}
        >
          {t('common.zoomIn')}
        </Button>
        <div className="flex items-center gap-1">
          <Input
            className="h-8 w-14 px-2 text-center"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && jumpToPage()}
          />
          <span className="text-xs text-muted-foreground">/ {numPages}</span>
          <Button size="sm" variant="secondary" onClick={jumpToPage}>
            {t('common.jump')}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{t('reader.pdfKeysHint')}</span>
      </div>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-y-auto bg-muted/30 py-4 outline-none"
        tabIndex={0}
        title={t('reader.pdfKeysHintFull')}
        onScroll={updateProgressFromScroll}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          changeScale(scale + (e.deltaY > 0 ? -0.1 : 0.1))
        }}
      >
        {docLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-muted-foreground">
            {t('reader.pdfLoading')}
          </div>
        )}
      </div>
    </div>
  )
},
)
