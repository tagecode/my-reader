import { useCallback, useEffect, useState } from 'react'
import type { Bookmark } from '@/types/electron'
import type { BookmarkPosition } from '@/types/reader-navigation'

export function parseBookmarkPosition(raw: string): BookmarkPosition | null {
  try {
    return JSON.parse(raw) as BookmarkPosition
  } catch {
    return null
  }
}

export function useBookmarks(bookId: string | null) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!bookId || !window.electronAPI) {
      setBookmarks([])
      return
    }
    setLoading(true)
    try {
      const data = await window.electronAPI.listBookmarks(bookId)
      setBookmarks(data as Bookmark[])
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bookId 变化时拉取书签
    void refresh()
  }, [refresh])

  const addBookmark = useCallback(
    async (
      label: string,
      position: BookmarkPosition,
      progressPercent?: number,
    ) => {
      if (!bookId || !window.electronAPI) return null
      const created = await window.electronAPI.createBookmark(
        bookId,
        label,
        position as unknown as Record<string, unknown>,
        progressPercent,
      )
      await refresh()
      return created as Bookmark
    },
    [bookId, refresh],
  )

  const removeBookmark = useCallback(
    async (id: string) => {
      if (!window.electronAPI) return
      await window.electronAPI.removeBookmark(id)
      await refresh()
    },
    [refresh],
  )

  return { bookmarks, loading, refresh, addBookmark, removeBookmark }
}
