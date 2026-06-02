import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { getDatabase } from './index'

export type BookFormat = 'epub' | 'txt' | 'pdf'

export interface BookRecord {
  id: string
  title: string
  author: string | null
  format: BookFormat
  file_path: string
  file_size: number
  cover_path: string | null
  imported_at: number
  updated_at: number
  progress_percent?: number
}

const SUPPORTED_EXTENSIONS: Record<string, BookFormat> = {
  '.epub': 'epub',
  '.txt': 'txt',
  '.pdf': 'pdf',
}

export function detectFormat(filePath: string): BookFormat | null {
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_EXTENSIONS[ext] ?? null
}

export function listBooks(search?: string): BookRecord[] {
  const db = getDatabase()
  const query = search?.trim()
    ? `
      SELECT b.*, COALESCE(r.progress_percent, 0) AS progress_percent
      FROM books b
      LEFT JOIN reading_progress r ON r.book_id = b.id
      WHERE b.title LIKE @q OR COALESCE(b.author, '') LIKE @q
      ORDER BY b.imported_at DESC
    `
    : `
      SELECT b.*, COALESCE(r.progress_percent, 0) AS progress_percent
      FROM books b
      LEFT JOIN reading_progress r ON r.book_id = b.id
      ORDER BY b.imported_at DESC
    `

  const stmt = db.prepare(query)
  const rows = query
    ? stmt.all({ q: `%${query}%` })
    : stmt.all()

  return rows as BookRecord[]
}

export function getBookById(id: string): BookRecord | null {
  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT b.*, COALESCE(r.progress_percent, 0) AS progress_percent
       FROM books b
       LEFT JOIN reading_progress r ON r.book_id = b.id
       WHERE b.id = ?`,
    )
    .get(id) as BookRecord | undefined
  return row ?? null
}

export interface CreateBookInput {
  id?: string
  title: string
  author?: string | null
  format: BookFormat
  file_path: string
  file_size: number
  cover_path?: string | null
}

export function createBook(input: CreateBookInput): BookRecord {
  const db = getDatabase()
  const now = Date.now()
  const id = input.id ?? randomUUID()

  db.prepare(
    `INSERT INTO books (id, title, author, format, file_path, file_size, cover_path, imported_at, updated_at)
     VALUES (@id, @title, @author, @format, @file_path, @file_size, @cover_path, @imported_at, @updated_at)`,
  ).run({
    id,
    title: input.title,
    author: input.author ?? null,
    format: input.format,
    file_path: input.file_path,
    file_size: input.file_size,
    cover_path: input.cover_path ?? null,
    imported_at: now,
    updated_at: now,
  })

  db.prepare(
    `INSERT INTO reading_progress (book_id, position, progress_percent, updated_at)
     VALUES (?, '{}', 0, ?)`,
  ).run(id, now)

  return getBookById(id)!
}

export function removeBook(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM books WHERE id = ?').run(id)
}

export function getBookCoverPath(id: string): string | null {
  const book = getBookById(id)
  return book?.cover_path ?? null
}

export function updateBookCoverPath(id: string, coverPath: string): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare(
    'UPDATE books SET cover_path = @cover_path, updated_at = @updated_at WHERE id = @id',
  ).run({ id, cover_path: coverPath, updated_at: now })
}
