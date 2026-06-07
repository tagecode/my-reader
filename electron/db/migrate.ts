import type Database from 'better-sqlite3'

function columnExists(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
  }[]
  return rows.some((row) => row.name === column)
}

function migrateToV2(db: Database.Database): void {
  if (!columnExists(db, 'reading_progress', 'last_read_at')) {
    db.exec(`ALTER TABLE reading_progress ADD COLUMN last_read_at INTEGER`)
  }
  if (!columnExists(db, 'books', 'is_favorite')) {
    db.exec(
      `ALTER TABLE books ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
    )
  }
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON reading_progress(last_read_at)`,
  )
  db.prepare(
    `UPDATE reading_progress
     SET last_read_at = updated_at
     WHERE last_read_at IS NULL
       AND (progress_percent > 0 OR position != '{}')`,
  ).run()
}

const STEPS: Record<number, (db: Database.Database) => void> = {
  2: migrateToV2,
}

export function applyPendingMigrations(
  db: Database.Database,
  targetVersion: number,
): void {
  const row = db
    .prepare('SELECT version FROM schema_version LIMIT 1')
    .get() as { version: number } | undefined

  let current = row?.version ?? 0
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run()
    current = 0
  }

  while (current < targetVersion) {
    const next = current + 1
    const step = STEPS[next]
    if (step) step(db)
    db.prepare('UPDATE schema_version SET version = ?').run(next)
    current = next
  }
}
