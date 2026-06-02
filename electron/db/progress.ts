import { getDatabase } from './index'

export interface ReadingProgressRecord {
  book_id: string
  position: string
  progress_percent: number
  updated_at: number
}

export function getProgress(bookId: string): ReadingProgressRecord | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM reading_progress WHERE book_id = ?')
    .get(bookId) as ReadingProgressRecord | undefined
  return row ?? null
}

export function saveProgress(
  bookId: string,
  position: Record<string, unknown>,
  progressPercent: number,
): ReadingProgressRecord {
  const db = getDatabase()
  const now = Date.now()
  const positionJson = JSON.stringify(position)

  db.prepare(
    `INSERT INTO reading_progress (book_id, position, progress_percent, updated_at)
     VALUES (@book_id, @position, @progress_percent, @updated_at)
     ON CONFLICT(book_id) DO UPDATE SET
       position = excluded.position,
       progress_percent = excluded.progress_percent,
       updated_at = excluded.updated_at`,
  ).run({
    book_id: bookId,
    position: positionJson,
    progress_percent: Math.min(100, Math.max(0, progressPercent)),
    updated_at: now,
  })

  return getProgress(bookId)!
}
