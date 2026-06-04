import { useEffect, useState } from 'react'
import type { Book } from '@/types/electron'

interface BookCoverProps {
  book: Book
  className?: string
}

export function BookCover({ book, className }: BookCoverProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [loadedBookId, setLoadedBookId] = useState<string | null>(null)

  useEffect(() => {
    if (!book.cover_path || !window.electronAPI) return
    let cancelled = false
    void window.electronAPI.getCover(book.id).then((data) => {
      if (!cancelled) {
        setLoadedBookId(book.id)
        setSrc(data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [book.id, book.cover_path])

  const displaySrc =
    book.cover_path && loadedBookId === book.id ? src : null

  if (displaySrc) {
    return (
      <img
        src={displaySrc}
        alt={book.title}
        className={className ?? 'size-full object-cover'}
      />
    )
  }

  return (
    <div
      className={
        className ??
        'flex size-full items-center justify-center bg-muted text-muted-foreground'
      }
    >
      <span className="text-xs font-medium uppercase">{book.format}</span>
    </div>
  )
}
