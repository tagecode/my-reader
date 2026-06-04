import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { PageError, PageLoading } from '@/components/ui/page-state'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { TXT_ENCODINGS } from '@/lib/txt-encoding'
import type { Book } from '@/types/electron'

interface TxtReaderProps {
  book: Book
  fontSize: number
  readingWidth: number
  onProgress: (percent: number) => void
  onBack?: () => void
}

interface TxtSegment {
  byteOffset: number
  byteLength: number
  text: string
}

interface TxtSavedPosition {
  encoding?: string
  scrollTop?: number
  firstByte?: number
}

const MAX_SEGMENTS = 8
const EDGE_THRESHOLD = 480

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseSavedPosition(raw: string | undefined): TxtSavedPosition {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as TxtSavedPosition
  } catch {
    return {}
  }
}

export function TxtReader({
  book,
  fontSize,
  readingWidth,
  onProgress,
  onBack,
}: TxtReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const segmentRefs = useRef<Map<number, HTMLSpanElement>>(new Map())
  const loadingLock = useRef(false)
  const restoredRef = useRef(false)
  const pendingScrollRef = useRef<number | 'bottom' | null>(null)
  const scrollAdjustRef = useRef(0)
  const viewportFilledRef = useRef(false)

  const [segments, setSegments] = useState<TxtSegment[]>([])
  const [encoding, setEncoding] = useState('UTF-8')
  const [totalBytes, setTotalBytes] = useState(0)
  const [chunkBytes, setChunkBytes] = useState(512 * 1024)
  const [chunked, setChunked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingEdge, setLoadingEdge] = useState<'prev' | 'next' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { loadProgress, saveProgress } = useReadingProgress(book.id)

  const computeProgress = useCallback(() => {
    if (segments.length === 0 || totalBytes === 0) return 0
    const el = scrollRef.current
    if (!el) return 0
    const first = segments[0]!.byteOffset
    const last = segments[segments.length - 1]!
    const loadedEnd = last.byteOffset + last.byteLength
    const maxScroll = el.scrollHeight - el.clientHeight

    if (maxScroll <= 0) {
      if (first === 0 && loadedEnd >= totalBytes) return 100
      return Math.min(100, (loadedEnd / totalBytes) * 100)
    }

    const ratio = el.scrollTop / maxScroll
    const readByte = first + (loadedEnd - first) * ratio
    return Math.min(100, (readByte / totalBytes) * 100)
  }, [segments, totalBytes])

  const saveScrollProgress = useCallback(() => {
    const el = scrollRef.current
    if (!el || segments.length === 0) return
    const percent = computeProgress()
    onProgress(percent)
    saveProgress({
      position: {
        encoding,
        firstByte: segments[0]!.byteOffset,
        scrollTop: el.scrollTop,
      },
      progressPercent: percent,
    })
  }, [computeProgress, encoding, onProgress, saveProgress, segments])

  const fetchChunk = useCallback(
    async (enc: string, byteOffset: number, size: number) => {
      if (!window.electronAPI) {
        throw new Error('应用未就绪')
      }
      return window.electronAPI.readTxtChunk(
        book.file_path,
        enc,
        byteOffset,
        size,
      )
    },
    [book.file_path],
  )

  const fillViewport = useCallback(
    async (
      enc: string,
      size: number,
      fileSize: number,
      current: TxtSegment[],
    ) => {
      const el = scrollRef.current
      if (!el) return current

      let merged = [...current]
      let last = merged[merged.length - 1]
      while (
        last &&
        last.byteOffset + last.byteLength < fileSize &&
        el.scrollHeight < el.clientHeight * 1.5
      ) {
        const chunk = await fetchChunk(enc, last.byteOffset + last.byteLength, size)
        if (!chunk.text) break
        merged = [...merged, {
          byteOffset: chunk.byteOffset,
          byteLength: chunk.byteLength,
          text: chunk.text,
        }]
        last = merged[merged.length - 1]
      }
      return merged
    },
    [fetchChunk],
  )

  const bootstrap = useCallback(
    async (enc: string, startByte = 0, scrollTop = 0) => {
      if (!window.electronAPI) return

      setError(null)
      setSegments([])
      restoredRef.current = false
      viewportFilledRef.current = false
      pendingScrollRef.current = scrollTop

      const info = await window.electronAPI.getTxtInfo(book.file_path)
      setTotalBytes(info.totalBytes)
      setChunkBytes(info.chunkBytes)
      const useChunks = info.totalBytes > info.chunkBytes
      setChunked(useChunks)

      if (!useChunks) {
        const full = await window.electronAPI.readTxt(book.file_path, enc)
        setSegments([
          {
            byteOffset: 0,
            byteLength: info.totalBytes,
            text: full.text,
          },
        ])
        return
      }

      const chunk = await fetchChunk(enc, startByte, info.chunkBytes)
      let initial: TxtSegment[] = chunk.text
        ? [{
            byteOffset: chunk.byteOffset,
            byteLength: chunk.byteLength,
            text: chunk.text,
          }]
        : []

      initial = await fillViewport(enc, info.chunkBytes, info.totalBytes, initial)
      setSegments(initial)
    },
    [book.file_path, fetchChunk, fillViewport],
  )

  const appendNext = useCallback(async () => {
    if (loadingLock.current || segments.length === 0) return
    const last = segments[segments.length - 1]!
    if (last.byteOffset + last.byteLength >= totalBytes) return

    loadingLock.current = true
    setLoadingEdge('next')
    try {
      const chunk = await fetchChunk(
        encoding,
        last.byteOffset + last.byteLength,
        chunkBytes,
      )
      if (!chunk.text) return

      setSegments((prev) => {
        const next: TxtSegment[] = [
          ...prev,
          {
            byteOffset: chunk.byteOffset,
            byteLength: chunk.byteLength,
            text: chunk.text,
          },
        ]
        if (next.length <= MAX_SEGMENTS) return next

        const removed = next[0]!
        const removedEl = segmentRefs.current.get(removed.byteOffset)
        scrollAdjustRef.current = removedEl?.offsetHeight ?? 0
        return next.slice(1)
      })
    } finally {
      loadingLock.current = false
      setLoadingEdge(null)
    }
  }, [chunkBytes, encoding, fetchChunk, segments, totalBytes])

  const prependPrev = useCallback(async () => {
    if (loadingLock.current || segments.length === 0) return
    const first = segments[0]!
    if (first.byteOffset === 0) return

    loadingLock.current = true
    setLoadingEdge('prev')
    const el = scrollRef.current
    const prevScrollHeight = el?.scrollHeight ?? 0

    try {
      const start = Math.max(0, first.byteOffset - chunkBytes)
      const chunk = await fetchChunk(encoding, start, chunkBytes)
      if (!chunk.text) return

      setSegments((prev) => {
        const next: TxtSegment[] = [
          {
            byteOffset: chunk.byteOffset,
            byteLength: chunk.byteLength,
            text: chunk.text,
          },
          ...prev,
        ]
        if (next.length <= MAX_SEGMENTS) return next
        return next.slice(0, MAX_SEGMENTS)
      })

      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop += el.scrollHeight - prevScrollHeight
        }
      })
    } finally {
      loadingLock.current = false
      setLoadingEdge(null)
    }
  }, [chunkBytes, encoding, fetchChunk, segments])

  const jumpToEnd = useCallback(async () => {
    if (!chunked || !window.electronAPI) return
    loadingLock.current = true
    setLoadingEdge('next')
    try {
      const start = Math.max(0, totalBytes - chunkBytes)
      const chunk = await fetchChunk(encoding, start, chunkBytes)
      setSegments(
        chunk.text
          ? [{
              byteOffset: chunk.byteOffset,
              byteLength: chunk.byteLength,
              text: chunk.text,
            }]
          : [],
      )
      pendingScrollRef.current = 'bottom'
    } finally {
      loadingLock.current = false
      setLoadingEdge(null)
    }
  }, [chunkBytes, chunked, encoding, fetchChunk, totalBytes])

  const reloadWithEncoding = useCallback(
    async (enc: string) => {
      setEncoding(enc)
      setLoading(true)
      try {
        await bootstrap(enc, 0, 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取失败')
      } finally {
        setLoading(false)
      }
    },
    [bootstrap],
  )

  useEffect(() => {
    const init = async () => {
      if (!window.electronAPI) return
      setLoading(true)
      setError(null)
      try {
        const saved = await loadProgress()
        const pos = parseSavedPosition(saved?.position)
        let enc = 'UTF-8'
        if (pos.encoding) {
          enc = pos.encoding
        } else {
          enc = await window.electronAPI.detectTxtEncoding(book.file_path)
        }
        setEncoding(enc)
        await bootstrap(enc, pos.firstByte ?? 0, pos.scrollTop ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [book.file_path, bootstrap, loadProgress])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || loading || segments.length === 0) return

    if (scrollAdjustRef.current > 0) {
      el.scrollTop = Math.max(0, el.scrollTop - scrollAdjustRef.current)
      scrollAdjustRef.current = 0
    }

    if (pendingScrollRef.current !== null && !restoredRef.current) {
      if (pendingScrollRef.current === 'bottom') {
        el.scrollTop = el.scrollHeight
      } else {
        el.scrollTop = pendingScrollRef.current
      }
      pendingScrollRef.current = null
      restoredRef.current = true
      saveScrollProgress()
    }
  }, [loading, saveScrollProgress, segments])

  useEffect(() => {
    if (loading || !chunked || viewportFilledRef.current || segments.length === 0) {
      return
    }
    const el = scrollRef.current
    if (!el) return

    viewportFilledRef.current = true
    void fillViewport(encoding, chunkBytes, totalBytes, segments).then((filled) => {
      if (filled.length > segments.length) {
        setSegments(filled)
      }
    })
  }, [
    chunked,
    chunkBytes,
    encoding,
    fillViewport,
    loading,
    segments,
    totalBytes,
  ])

  useEffect(() => {
    if (loading || segments.length === 0) return
    const id = requestAnimationFrame(() => {
      saveScrollProgress()
    })
    return () => cancelAnimationFrame(id)
  }, [loading, segments.length, saveScrollProgress])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || loading) return

    saveScrollProgress()

    if (!chunked || loadingLock.current) return

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_THRESHOLD
    const nearTop = el.scrollTop < EDGE_THRESHOLD

    if (nearBottom) void appendNext()
    if (nearTop) void prependPrev()
  }, [appendNext, chunked, loading, prependPrev, saveScrollProgress])

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const el = scrollRef.current
      if (!el) return
      const step = Math.max(120, Math.floor(el.clientHeight * 0.88))
      el.scrollBy({ top: direction * step, behavior: 'smooth' })
      requestAnimationFrame(() => handleScroll())
    },
    [handleScroll],
  )

  useEffect(() => {
    if (loading || segments.length === 0) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const el = scrollRef.current
      if (!el) return

      if (e.key === 'Home') {
        e.preventDefault()
        el.scrollTo({ top: 0, behavior: 'smooth' })
        requestAnimationFrame(() => handleScroll())
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        if (chunked) {
          void jumpToEnd()
        } else {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          requestAnimationFrame(() => handleScroll())
        }
        return
      }
      if (
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' '
      ) {
        e.preventDefault()
        scrollByPage(1)
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollByPage(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [chunked, handleScroll, jumpToEnd, loading, scrollByPage, segments.length])

  useEffect(() => {
    if (!loading && segments.length > 0) {
      scrollRef.current?.focus({ preventScroll: true })
    }
  }, [loading, segments.length])

  if (loading) {
    return <PageLoading message="正在解码 TXT…" />
  }

  if (error) {
    return (
      <PageError
        title="无法阅读此 TXT"
        message={error}
        detail={book.file_path}
        onRetry={() => void reloadWithEncoding(encoding)}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">编码</span>
        {TXT_ENCODINGS.map((enc) => (
          <Button
            key={enc}
            size="sm"
            variant={encoding === enc ? 'secondary' : 'outline'}
            onClick={() => void reloadWithEncoding(enc)}
          >
            {enc}
          </Button>
        ))}
        {chunked && (
          <span className="text-xs text-muted-foreground">
            大文件分块 · {formatBytes(totalBytes)}
            {loadingEdge === 'next' && ' · 向下加载…'}
            {loadingEdge === 'prev' && ' · 向上加载…'}
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-8 outline-none"
        tabIndex={0}
        title="方向键 / 空格 / PageUp·PageDown 翻页，Home·End 首尾"
        onScroll={handleScroll}
      >
        <pre
          className="mx-auto whitespace-pre-wrap font-serif leading-relaxed wrap-break-word"
          style={{
            fontSize: `${fontSize}px`,
            maxWidth: `${readingWidth}px`,
          }}
        >
          {segments.map((seg) => (
            <span
              key={seg.byteOffset}
              ref={(node) => {
                if (node) segmentRefs.current.set(seg.byteOffset, node)
                else segmentRefs.current.delete(seg.byteOffset)
              }}
            >
              {seg.text}
            </span>
          ))}
        </pre>
      </div>
    </div>
  )
}
