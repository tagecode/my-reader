import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { getDatabase } from './index'

export type BookFormat = 'epub' | 'txt' | 'pdf'

export type LibrarySortField =
  | 'recentRead'
  | 'recentImport'
  | 'title'
  | 'author'
  | 'progress'

export type LibrarySortOrder = 'asc' | 'desc'
export type LibraryFormatFilter = 'all' | BookFormat
export type LibraryStatusFilter =
  | 'all'
  | 'unread'
  | 'reading'
  | 'read'
  | 'favorite'

export interface ListBooksQuery {
  search?: string
  sort?: LibrarySortField
  sortOrder?: LibrarySortOrder
  format?: LibraryFormatFilter
  status?: LibraryStatusFilter
}

export interface BookRecord {
  id: string
  title: string
  author: string | null
  format: BookFormat
  file_path: string
  file_size: number
  cover_path: string | null
  is_favorite: number
  imported_at: number
  updated_at: number
  progress_percent?: number
  last_read_at?: number | null
}

const SUPPORTED_EXTENSIONS: Record<string, BookFormat> = {
  '.epub': 'epub',
  '.txt': 'txt',
  '.pdf': 'pdf',
}

const BOOK_SELECT = `
  SELECT
    b.*,
    COALESCE(r.progress_percent, 0) AS progress_percent,
    r.last_read_at
  FROM books b
  LEFT JOIN reading_progress r ON r.book_id = b.id
`

export function detectFormat(filePath: string): BookFormat | null {
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_EXTENSIONS[ext] ?? null
}

function normalizeQuery(input?: ListBooksQuery | string): ListBooksQuery {
  if (typeof input === 'string') {
    return { search: input }
  }
  return input ?? {}
}

function buildOrderClause(
  sort: LibrarySortField,
  sortOrder: LibrarySortOrder,
): string {
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC'
  switch (sort) {
    case 'recentRead':
      return `(r.last_read_at IS NULL), r.last_read_at ${dir}, b.imported_at DESC`
    case 'recentImport':
      return `b.imported_at ${dir}`
    case 'title':
      return `b.title COLLATE NOCASE ${dir}`
    case 'author':
      return `COALESCE(b.author, '') COLLATE NOCASE ${dir}`
    case 'progress':
      return `COALESCE(r.progress_percent, 0) ${dir}, b.title COLLATE NOCASE ASC`
    default:
      return `b.imported_at DESC`
  }
}

function defaultSortOrder(
  sort: LibrarySortField,
  sortOrder?: LibrarySortOrder,
): LibrarySortOrder {
  if (sortOrder) return sortOrder
  return sort === 'title' || sort === 'author' ? 'asc' : 'desc'
}

export function listBooks(input?: ListBooksQuery | string): BookRecord[] {
  const query = normalizeQuery(input)
  const db = getDatabase()
  const conditions: string[] = []
  const params: Record<string, unknown> = {}

  if (query.search?.trim()) {
    conditions.push(
      `(b.title LIKE @search OR COALESCE(b.author, '') LIKE @search)`,
    )
    params.search = `%${query.search.trim()}%`
  }

  if (query.format && query.format !== 'all') {
    conditions.push('b.format = @format')
    params.format = query.format
  }

  switch (query.status) {
    case 'favorite':
      conditions.push('b.is_favorite = 1')
      break
    case 'unread':
      conditions.push(
        `r.last_read_at IS NULL AND COALESCE(r.progress_percent, 0) < 99.9`,
      )
      break
    case 'reading':
      conditions.push(
        `r.last_read_at IS NOT NULL AND COALESCE(r.progress_percent, 0) > 0 AND COALESCE(r.progress_percent, 0) < 99.9`,
      )
      break
    case 'read':
      conditions.push(`COALESCE(r.progress_percent, 0) >= 99.9`)
      break
    default:
      break
  }

  const sort = query.sort ?? 'recentImport'
  const sortOrder = defaultSortOrder(sort, query.sortOrder)
  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = buildOrderClause(sort, sortOrder)

  const sql = `${BOOK_SELECT} ${where} ORDER BY ${orderBy}`
  return db.prepare(sql).all(params) as BookRecord[]
}

export function listRecentBooks(limit = 8): BookRecord[] {
  const db = getDatabase()
  const safeLimit = Math.min(Math.max(1, limit), 24)
  return db
    .prepare(
      `${BOOK_SELECT}
       WHERE r.last_read_at IS NOT NULL
       ORDER BY r.last_read_at DESC
       LIMIT ?`,
    )
    .all(safeLimit) as BookRecord[]
}

export function getBookById(id: string): BookRecord | null {
  const db = getDatabase()
  const row = db
    .prepare(`${BOOK_SELECT} WHERE b.id = ?`)
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
    `INSERT INTO books (id, title, author, format, file_path, file_size, cover_path, is_favorite, imported_at, updated_at)
     VALUES (@id, @title, @author, @format, @file_path, @file_size, @cover_path, 0, @imported_at, @updated_at)`,
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
    `INSERT INTO reading_progress (book_id, position, progress_percent, last_read_at, updated_at)
     VALUES (?, '{}', 0, NULL, ?)`,
  ).run(id, now)

  return getBookById(id)!
}

export function removeBook(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM books WHERE id = ?').run(id)
}

export function setBookFavorite(id: string, favorite: boolean): BookRecord | null {
  const db = getDatabase()
  const now = Date.now()
  db.prepare(
    'UPDATE books SET is_favorite = @is_favorite, updated_at = @updated_at WHERE id = @id',
  ).run({ id, is_favorite: favorite ? 1 : 0, updated_at: now })
  return getBookById(id)
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
