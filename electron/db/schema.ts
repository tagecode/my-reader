export const DB_VERSION = 2

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    format TEXT NOT NULL CHECK (format IN ('epub', 'txt', 'pdf')),
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL DEFAULT 0,
    cover_path TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    imported_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reading_progress (
    book_id TEXT PRIMARY KEY NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    position TEXT NOT NULL DEFAULT '{}',
    progress_percent REAL NOT NULL DEFAULT 0,
    last_read_at INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)`,
  `CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`,
]
