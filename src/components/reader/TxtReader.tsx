import { useCallback, useEffect, useRef, useState } from 'react'
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

export function TxtReader({
  book,
  fontSize,
  readingWidth,
  onProgress,
  onBack,
}: TxtReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [encoding, setEncoding] = useState('UTF-8')
  const [loading, setLoading] = useState(true)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { loadProgress, saveProgress } = useReadingProgress(book.id)

  const loadText = useCallback(
    async (enc: string) => {
      if (!window.electronAPI) return
      setLoading(true)
      setError(null)
      try {
        const result = await window.electronAPI.readTxt(book.file_path, enc)
        setText(result.text)
        setEncoding(result.encoding)
        setTruncated(result.truncated)
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取失败')
      } finally {
        setLoading(false)
      }
    },
    [book.file_path],
  )

  useEffect(() => {
    const init = async () => {
      if (!window.electronAPI) return
      const saved = await loadProgress()
      let enc = 'UTF-8'
      if (saved?.position) {
        try {
          const pos = JSON.parse(saved.position) as { encoding?: string }
          if (pos.encoding) enc = pos.encoding
        } catch {
          /* ignore */
        }
      } else {
        enc = await window.electronAPI.detectTxtEncoding(book.file_path)
      }
      setEncoding(enc)
      await loadText(enc)
    }
    void init()
  }, [book.file_path, loadProgress, loadText])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || loading || !text) return

    const saved = async () => {
      const progress = await loadProgress()
      if (!progress?.position) return
      try {
        const pos = JSON.parse(progress.position) as { scrollTop?: number }
        if (typeof pos.scrollTop === 'number') {
          el.scrollTop = pos.scrollTop
          const max = el.scrollHeight - el.clientHeight
          onProgress(max > 0 ? (pos.scrollTop / max) * 100 : 0)
        }
      } catch {
        /* ignore */
      }
    }
    void saved()
  }, [loading, text, loadProgress, onProgress])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const percent = max > 0 ? (el.scrollTop / max) * 100 : 0
    onProgress(percent)
    saveProgress({
      position: { scrollTop: el.scrollTop, encoding },
      progressPercent: percent,
    })
  }, [encoding, onProgress, saveProgress])

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
    if (loading || !text) return

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
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        requestAnimationFrame(() => handleScroll())
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
  }, [loading, text, handleScroll, scrollByPage])

  useEffect(() => {
    if (!loading && text) {
      scrollRef.current?.focus({ preventScroll: true })
    }
  }, [loading, text])

  if (loading) {
    return <PageLoading message="正在解码 TXT…" />
  }

  if (error) {
    return (
      <PageError
        title="无法阅读此 TXT"
        message={error}
        detail={book.file_path}
        onRetry={() => void loadText(encoding)}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">编码</span>
        {TXT_ENCODINGS.map((enc) => (
          <Button
            key={enc}
            size="sm"
            variant={encoding === enc ? 'secondary' : 'outline'}
            onClick={() => void loadText(enc)}
          >
            {enc}
          </Button>
        ))}
        {truncated && (
          <span className="text-xs text-amber-600">文件较大，已截断显示前 12MB</span>
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
          {text}
        </pre>
      </div>
    </div>
  )
}
