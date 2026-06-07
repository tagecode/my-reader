import { getDatabase } from './index'

export interface ReadingProgressRecord {
  book_id: string
  position: string
  progress_percent: number
  last_read_at: number | null
  updated_at: number
}

export function touchLastRead(bookId: string): ReadingProgressRecord | null {
  const db = getDatabase()
  const now = Date.now()
  const existing = getProgress(bookId)
  if (!existing) return null

  db.prepare(
    `UPDATE reading_progress
     SET last_read_at = @last_read_at, updated_at = @updated_at
     WHERE book_id = @book_id`,
  ).run({ book_id: bookId, last_read_at: now, updated_at: now })

  return getProgress(bookId)
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
    `INSERT INTO reading_progress (book_id, position, progress_percent, last_read_at, updated_at)
     VALUES (@book_id, @position, @progress_percent, @last_read_at, @updated_at)
     ON CONFLICT(book_id) DO UPDATE SET
       position = excluded.position,
       progress_percent = excluded.progress_percent,
       last_read_at = COALESCE(excluded.last_read_at, reading_progress.last_read_at),
       updated_at = excluded.updated_at`,
  ).run({
    book_id: bookId,
    position: positionJson,
    progress_percent: Math.min(100, Math.max(0, progressPercent)),
    last_read_at: now,
    updated_at: now,
  })

  return getProgress(bookId)!
}

export function clearRecentReading(bookId: string): ReadingProgressRecord | null {
  const db = getDatabase()
  const existing = getProgress(bookId)
  if (!existing) return null

  const now = Date.now()
  db.prepare(
    `UPDATE reading_progress
     SET last_read_at = NULL, updated_at = @updated_at
     WHERE book_id = @book_id`,
  ).run({ book_id: bookId, updated_at: now })

  return getProgress(bookId)
}
