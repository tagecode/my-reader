import { useEffect, useState } from 'react'
import type { Book } from '@/types/electron'

interface BookCoverProps {
  book: Book
  className?: string
}

export function BookCover({ book, className }: BookCoverProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!book.cover_path || !window.electronAPI) {
      setSrc(null)
      return
    }
    let cancelled = false
    void window.electronAPI.getCover(book.id).then((data) => {
      if (!cancelled) setSrc(data)
    })
    return () => {
      cancelled = true
    }
  }, [book.id, book.cover_path])

  if (src) {
    return (
      <img
        src={src}
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
