import { randomUUID } from 'node:crypto'
import { getDatabase } from './index'

export interface BookmarkRecord {
  id: string
  book_id: string
  label: string
  position: string
  progress_percent: number | null
  created_at: number
  updated_at: number
}

export interface CreateBookmarkInput {
  book_id: string
  label: string
  position: Record<string, unknown>
  progress_percent?: number | null
}

export function listBookmarks(bookId: string): BookmarkRecord[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT * FROM bookmarks
       WHERE book_id = ?
       ORDER BY created_at DESC`,
    )
    .all(bookId) as BookmarkRecord[]
}

export function createBookmark(input: CreateBookmarkInput): BookmarkRecord {
  const db = getDatabase()
  const now = Date.now()
  const id = randomUUID()

  db.prepare(
    `INSERT INTO bookmarks (id, book_id, label, position, progress_percent, created_at, updated_at)
     VALUES (@id, @book_id, @label, @position, @progress_percent, @created_at, @updated_at)`,
  ).run({
    id,
    book_id: input.book_id,
    label: input.label,
    position: JSON.stringify(input.position),
    progress_percent:
      input.progress_percent == null ? null : input.progress_percent,
    created_at: now,
    updated_at: now,
  })

  return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRecord
}

export function removeBookmark(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
}
