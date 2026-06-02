import { useCallback, useEffect, useRef } from 'react'
import type { ReadingProgress } from '@/types/electron'

export interface ProgressPayload {
  position: Record<string, unknown>
  progressPercent: number
}

export function useReadingProgress(bookId: string | null) {
  const loadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadProgress = useCallback(async (): Promise<ReadingProgress | null> => {
    if (!bookId || !window.electronAPI) return null
    const data = await window.electronAPI.getProgress(bookId)
    return data as ReadingProgress | null
  }, [bookId])

  const saveProgress = useCallback(
    (payload: ProgressPayload) => {
      if (!bookId || !window.electronAPI) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void window.electronAPI.saveProgress(
          bookId,
          payload.position,
          payload.progressPercent,
        )
      }, 400)
    },
    [bookId],
  )

  const saveProgressImmediate = useCallback(
    async (payload: ProgressPayload) => {
      if (!bookId || !window.electronAPI) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await window.electronAPI.saveProgress(
        bookId,
        payload.position,
        payload.progressPercent,
      )
    },
    [bookId],
  )

  useEffect(() => {
    loadedRef.current = false
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [bookId])

  return {
    loadProgress,
    saveProgress,
    saveProgressImmediate,
    markLoaded: () => {
      loadedRef.current = true
    },
    isLoaded: () => loadedRef.current,
  }
}
